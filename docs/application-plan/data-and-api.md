# Data and API Design

## Locality And Room Identity

Amazon Location responses must be normalized to a canonical locality before creating or joining a room.

```json
{
  "roomId": "AU#NSW#NEWTOWN",
  "suburb": "Newtown",
  "state": "NSW",
  "country": "AU"
}
```

`roomId` is the immutable machine key. Display labels such as `Newtown, NSW` are derived from locality fields. Normalization should trim whitespace, use consistent casing, and use stable country and state codes where Amazon Location supplies them. If reverse geocoding cannot supply country and state reliably, do not join a room; return a clear resolution error instead.

## Should Rooms Have Records?

Yes. Since Tea Time needs room metadata and an explicit application reference, create a room record when a locality is first successfully resolved for a user. Use an idempotent conditional write so simultaneous first users do not create duplicates.

This is a lazy materialization model:

- No room record is created for every possible locality in advance.
- A room is created only when a user first enters its resolved locality.
- The record is permanent unless a future lifecycle policy archives it.
- A room record does not contain raw coordinates or member lists.

## DynamoDB Data Model

| Entity | PK | SK | Important attributes | TTL |
| --- | --- | --- | --- | --- |
| Room | `ROOM#AU#NSW#NEWTOWN` | `META` | `roomId`, `suburb`, `state`, `country`, `createdAt` | None |
| Message | `ROOM#AU#NSW#NEWTOWN` | `MSG#<epoch-ms>#<uuid>` | `messageId`, `userId`, `message`, `sentAt`, `expiresAt` | 24 hours |
| Active connection | `CONN#<connection-id>` | `META` | `connectionId`, `userId`, `roomId`, `expiresAt`, `GSI1PK`, `GSI1SK` | Connection TTL |
| User profile | `userId` in `ProfilesTable` | None | `userId`, `username`, `updatedAt` | None |

For connections, set `GSI1PK` to `ROOM#<roomId>` and `GSI1SK` to `CONN#<connection-id>`. This preserves efficient fan-out by room. For message history, query the primary partition with `ScanIndexForward: false` and `Limit: 10`, then reverse the returned records before sending them to the client.

TTL deletion is asynchronous. The history endpoint must still enforce the 24-hour cutoff in its DynamoDB query or application filtering so messages do not remain visible after retention expires.

## Location API

### Request

```http
POST /location
Authorization: Bearer <jwt>
Content-Type: application/json

{"latitude":-33.8981,"longitude":151.1749}
```

### Successful response

```json
{
  "roomId": "AU#NSW#NEWTOWN",
  "suburb": "Newtown",
  "state": "NSW",
  "country": "AU"
}
```

### Errors

| Status | Meaning |
| --- | --- |
| 400 | Invalid or missing coordinates. |
| 401 | Missing, expired, or invalid JWT. |
| 404 | Coordinates could not be resolved to a sufficiently specific locality. |
| 500 | Amazon Location Service or room creation failure. |

The app uses the response only to determine the room. It must not persist, log, or send raw coordinate values beyond this request except for appropriately protected operational diagnostics.

## User Profile API

Cognito remains responsible for authentication and email-based login. The editable username is application data keyed by the verified Cognito `sub`, so changing it never changes the Cognito login identifier. Usernames are currently display names: they are trimmed, limited to 32 characters, and do not need to be globally unique.

### Read profile

```http
GET /profile
Authorization: Bearer <jwt>
```

```json
{"username":"Tea Friend"}
```

### Update profile

```http
PUT /profile
Authorization: Bearer <jwt>
Content-Type: application/json

{"username":"Tea Friend"}
```

Messages store only the stable `userId`. The send and history handlers resolve current usernames from `ProfilesTable`; if a profile is unavailable, the client falls back to displaying the `userId`.

## Message History API

### Request

```http
GET /rooms/AU%23NSW%23NEWTOWN/messages?limit=10
Authorization: Bearer <jwt>
```

The server enforces a maximum limit of ten for v1.

### Response

```json
{
  "roomId": "AU#NSW#NEWTOWN",
  "messages": [
    {
      "messageId": "...",
      "userId": "...",
      "username": "Tea Friend",
      "message": "Hello",
      "sentAt": "2026-09-13T12:00:00.000Z"
    }
  ]
}
```

The frontend converts the API response into its `ChatMessage` view model and then appends WebSocket broadcasts. The message list must deduplicate records by `messageId`, because a message can appear both in a history response and in a live broadcast during a room transition.

## WebSocket Contract

Connection parameters should contain `roomId` and an authenticated token, for example:

```text
wss://<api-id>.execute-api.<region>.amazonaws.com/Prod?roomId=AU%23NSW%23NEWTOWN&token=<jwt>
```

The client sends:

```json
{"message":"sendMessage","data":"Hello"}
```

The server broadcasts:

```json
{
  "messageId": "...",
  "message": "Hello",
  "userId": "...",
  "username": "Tea Friend",
  "roomId": "AU#NSW#NEWTOWN",
  "messageTime": "2026-09-13T12:00:00.000Z"
}
```

The server derives the room from the authenticated connection record for sends. It must not trust a client-provided room in a message payload.

## DynamoDB Fit

DynamoDB is an appropriate v1 database because the required access patterns are direct: connect by connection ID, fan out by room, and read the most recent messages by room. It is cost-efficient and scales well for this workload.

Reconsider the storage design if requirements expand to full-text search, complicated social graphs, multi-room membership views, rich moderation queries, or long-lived high-volume history. A practical future path is DynamoDB for active chat and room metadata, S3 for archived messages, and OpenSearch only when real search is a verified product requirement.
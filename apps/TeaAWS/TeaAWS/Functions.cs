using Amazon.ApiGatewayManagementApi;
using Amazon.ApiGatewayManagementApi.Model;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.LocationService;
using Amazon.LocationService.Model;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;


// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace TeaAWS;

public record TokenValidationResult(bool IsValid, string? UserId, string? Error);

public interface IJwtTokenValidator
{
    Task<TokenValidationResult> ValidateAsync(string token, CancellationToken cancellationToken = default);
}

public sealed class CognitoJwtTokenValidator : IJwtTokenValidator
{
    private readonly string _issuer;
    private readonly string? _expectedClientId;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configurationManager;

    public CognitoJwtTokenValidator(string region, string userPoolId, string? expectedClientId)
    {
        _issuer = $"https://cognito-idp.{region}.amazonaws.com/{userPoolId}";
        _expectedClientId = expectedClientId;
        var metadataAddress = $"{_issuer}/.well-known/openid-configuration";
        _configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            new OpenIdConnectConfigurationRetriever());
    }

    public async Task<TokenValidationResult> ValidateAsync(string token, CancellationToken cancellationToken = default)
    {
        try
        {
            var openIdConfig = await _configurationManager.GetConfigurationAsync(cancellationToken);
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = openIdConfig.SigningKeys,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),
                ValidateAudience = !string.IsNullOrWhiteSpace(_expectedClientId),
                ValidAudience = _expectedClientId
            };

            var handler = new JwtSecurityTokenHandler();
            ClaimsPrincipal principal = handler.ValidateToken(token, validationParameters, out _);
            string? userId = principal.FindFirst("sub")?.Value ??
                principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userId))
            {
                return new TokenValidationResult(false, null, "Missing sub claim in token");
            }

            return new TokenValidationResult(true, userId, null);
        }
        catch (Exception ex)
        {
            return new TokenValidationResult(false, null, ex.Message);
        }
    }
}

public record LocalityInfo(string RoomId, string Suburb, string State, string Country);

public record ProfileRequest(string? Username);
public record AvatarUploadRequest(string? ContentType, long? ContentLength);
public record AvatarCompleteRequest(string? ObjectKey);
public record ChatProfile(string Username, string? AvatarUrl);

public interface ILocalityResolver
{
    Task<LocalityInfo?> ResolveAsync(double latitude, double longitude, CancellationToken cancellationToken = default);
}

public sealed class AmazonLocationLocalityResolver : ILocalityResolver
{
    private readonly IAmazonLocationService _locationClient;
    private readonly string _placeIndexName;

    public AmazonLocationLocalityResolver(IAmazonLocationService locationClient, string placeIndexName)
    {
        _locationClient = locationClient;
        _placeIndexName = placeIndexName;
    }

    public async Task<LocalityInfo?> ResolveAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        var response = await _locationClient.SearchPlaceIndexForPositionAsync(new SearchPlaceIndexForPositionRequest
        {
            IndexName = _placeIndexName,
            Position = [longitude, latitude]
        }, cancellationToken);

        foreach (var result in response.Results)
        {
            var suburb = result.Place.Neighborhood ?? result.Place.Municipality;
            var state = result.Place.Region;
            var country = result.Place.Country;

            if (!string.IsNullOrWhiteSpace(suburb) &&
                !string.IsNullOrWhiteSpace(state) &&
                !string.IsNullOrWhiteSpace(country))
            {
                return CreateLocality(suburb, state, country);
            }
        }

        return null;
    }

    private static LocalityInfo? CreateLocality(string suburb, string state, string country)
    {
        var normalizedSuburb = NormalizeSegment(suburb);
        var normalizedState = NormalizeSegment(state);
        var normalizedCountry = NormalizeCountry(country);

        if (string.IsNullOrWhiteSpace(normalizedSuburb) ||
            string.IsNullOrWhiteSpace(normalizedState) ||
            string.IsNullOrWhiteSpace(normalizedCountry))
        {
            return null;
        }

        return new LocalityInfo(
            $"{normalizedCountry}#{normalizedState}#{normalizedSuburb}",
            suburb.Trim(),
            state.Trim(),
            country.Trim());
    }

    private static string NormalizeCountry(string country) => country.Trim().ToUpperInvariant() switch
    {
        "AUSTRALIA" or "AUS" => "AU",
        _ => NormalizeSegment(country)
    };

    private static string NormalizeSegment(string value) =>
        Regex.Replace(value.Trim().ToUpperInvariant(), "[^A-Z0-9]+", "_").Trim('_');
}

public class Functions
{
    private const string TableNameEnv = "CHAT_TABLE";
    private const string ProfileTableNameEnv = "PROFILE_TABLE";
    private const string AnnouncementsTableNameEnv = "ANNOUNCEMENTS_TABLE";
    private const string CognitoUserPoolIdEnv = "COGNITO_USER_POOL_ID";
    private const string CognitoRegionEnv = "COGNITO_REGION";
    private const string CognitoClientIdEnv = "COGNITO_CLIENT_ID";
    private const string ConnectionTtlSecondsEnv = "CONNECTION_TTL_SECONDS";
    private const string PersistHistoryEnv = "PERSIST_MESSAGE_HISTORY";
    private const string PlaceIndexNameEnv = "PLACE_INDEX_NAME";
    private const string AvatarBucketNameEnv = "AVATAR_BUCKET";
    private const int MessageHistoryLimit = 10;
    private const int AnnouncementLimit = 50;
    private const int MaxUsernameLength = 32;
    private const long MaxAvatarBytes = 5 * 1024 * 1024;
    private static readonly TimeSpan AvatarUploadUrlLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan AvatarReadUrlLifetime = TimeSpan.FromMinutes(15);
    private static readonly IReadOnlyDictionary<string, string> AvatarExtensions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp"
    };
    private static readonly TimeSpan MessageRetention = TimeSpan.FromHours(24);

    public const string PK = "PK";
    public const string SK = "SK";
    public const string GSI1PK = "GSI1PK";
    public const string GSI1SK = "GSI1SK";
    public const string ConnectionIdField = "connectionId";
    public const string UserIdField = "userId";
    public const string RoomIdField = "roomId";
    public const string SuburbField = "suburb";
    public const string StateField = "state";
    public const string CountryField = "country";
    public const string ExpiresAtField = "expiresAt";
    public const string UsernameField = "username";
    public const string AvatarKeyField = "avatarKey";
    public const string MessageCountField = "messageCount";
    public const string LastChatRoomIdField = "lastChatRoomId";
    public const string LastMessageAtField = "lastMessageAt";

    private readonly string _chatTable;
    private readonly string _profileTable;
    private readonly string? _announcementsTable;
    private readonly IAmazonDynamoDB _ddbClient;
    private readonly IAmazonS3? _s3Client;
    private readonly string? _avatarBucket;
    private readonly Func<string, IAmazonApiGatewayManagementApi> _apiGatewayManagementApiClientFactory;
    private readonly IJwtTokenValidator _tokenValidator;
    private readonly int _connectionTtlSeconds;
    private readonly bool _persistMessageHistory;
    private readonly ILocalityResolver? _localityResolver;


    /// <summary>
    /// Default constructor that Lambda will invoke.
    /// </summary>
    public Functions()
    {
        _ddbClient = new AmazonDynamoDBClient();
        _s3Client = new AmazonS3Client();
        _chatTable = Environment.GetEnvironmentVariable(TableNameEnv)
            ?? throw new InvalidOperationException($"{TableNameEnv} not set");
        _profileTable = Environment.GetEnvironmentVariable(ProfileTableNameEnv)
            ?? throw new InvalidOperationException($"{ProfileTableNameEnv} not set");
        _announcementsTable = Environment.GetEnvironmentVariable(AnnouncementsTableNameEnv);

        string userPoolId = Environment.GetEnvironmentVariable(CognitoUserPoolIdEnv)
            ?? throw new InvalidOperationException($"{CognitoUserPoolIdEnv} not set");
        string region = Environment.GetEnvironmentVariable(CognitoRegionEnv)
            ?? throw new InvalidOperationException($"{CognitoRegionEnv} not set");
        string? clientId = Environment.GetEnvironmentVariable(CognitoClientIdEnv);
        _tokenValidator = new CognitoJwtTokenValidator(region, userPoolId, clientId);

        _connectionTtlSeconds = ParseIntFromEnv(ConnectionTtlSecondsEnv, 900);
        _persistMessageHistory = ParseBoolFromEnv(PersistHistoryEnv, true);
        _avatarBucket = Environment.GetEnvironmentVariable(AvatarBucketNameEnv);

        var placeIndexName = Environment.GetEnvironmentVariable(PlaceIndexNameEnv);
        if (!string.IsNullOrWhiteSpace(placeIndexName))
        {
            _localityResolver = new AmazonLocationLocalityResolver(new AmazonLocationServiceClient(), placeIndexName);
        }

        _apiGatewayManagementApiClientFactory = endpoint => new AmazonApiGatewayManagementApiClient(
            new AmazonApiGatewayManagementApiConfig
            {
                ServiceURL = endpoint
            });
    }

    /// <summary>
    /// Constructor used for testing allow tests to pass in moq versions of the service clients.
    /// </summary>
    /// <param name="ddbClient">The service client for accessing Amazon DynamoDB.</param>
    /// <param name="apiGatewayManagementApiClientFactory">The service client for accessing Amazon API Gateway.</param>
    /// <param name="chatTable">Name of the DynamoDB table to store chat records.</param>
    /// <param name="profileTable">Name of the DynamoDB table to store profile records.</param>
    /// <param name="tokenValidator">JWT token validator used by OnConnect.</param>
    /// <param name="connectionTtlSeconds">TTL for websocket connection records.</param>
    /// <param name="persistMessageHistory">Controls whether messages are persisted.</param>
    public Functions(
        IAmazonDynamoDB ddbClient,
        Func<string, IAmazonApiGatewayManagementApi> apiGatewayManagementApiClientFactory,
        string chatTable,
        IJwtTokenValidator tokenValidator,
        int connectionTtlSeconds = 900,
        bool persistMessageHistory = true,
        ILocalityResolver? localityResolver = null,
        string? profileTable = null,
        IAmazonS3? s3Client = null,
        string? avatarBucket = null,
        string? announcementsTable = null)
    {
        _ddbClient = ddbClient;
        _apiGatewayManagementApiClientFactory = apiGatewayManagementApiClientFactory;
        _chatTable = chatTable;
        _profileTable = profileTable ?? chatTable;
        _announcementsTable = announcementsTable;
        _tokenValidator = tokenValidator;
        _connectionTtlSeconds = connectionTtlSeconds;
        _persistMessageHistory = persistMessageHistory;
        _localityResolver = localityResolver;
        _s3Client = s3Client;
        _avatarBucket = avatarBucket;
    }

    public async Task<APIGatewayProxyResponse> OnConnectHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var connectionId = request.RequestContext.ConnectionId;
            var roomId = NormalizeRoomId(GetDictionaryValue(request.QueryStringParameters, "roomId"));
            var token = TryReadToken(request);

            if (string.IsNullOrWhiteSpace(connectionId) || string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(token))
            {
                context.Logger.LogInformation($"route=$connect connectionId={connectionId} reason=missing_required_values");
                return new APIGatewayProxyResponse { StatusCode = 401, Body = "Unauthorized" };
            }

            TokenValidationResult validation = await _tokenValidator.ValidateAsync(token);
            if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
            {
                context.Logger.LogInformation($"route=$connect connectionId={connectionId} reason=invalid_token error={validation.Error}");
                return new APIGatewayProxyResponse { StatusCode = 401, Body = "Unauthorized" };
            }

            var now = DateTimeOffset.UtcNow;
            var pk = BuildConnectionPk(connectionId);

            var ddbRequest = new PutItemRequest
            {
                TableName = _chatTable,
                Item = new Dictionary<string, AttributeValue>
                {
                    { PK, new AttributeValue { S = pk } },
                    { SK, new AttributeValue { S = "META" } },
                    { ConnectionIdField, new AttributeValue { S = connectionId } },
                    { UserIdField, new AttributeValue { S = validation.UserId } },
                    { RoomIdField, new AttributeValue { S = roomId } },
                    { "connectedAt", new AttributeValue { S = now.ToString("O") } },
                    { ExpiresAtField, new AttributeValue { N = (now.ToUnixTimeSeconds() + _connectionTtlSeconds).ToString() } },
                    { GSI1PK, new AttributeValue { S = BuildRoomPk(roomId) } },
                    { GSI1SK, new AttributeValue { S = BuildConnectionPk(connectionId) } }
                }
            };

            await _ddbClient.PutItemAsync(ddbRequest);
            context.Logger.LogInformation($"route=$connect connectionId={connectionId} userId={validation.UserId} roomId={roomId}");

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = "Connected."
            };
        }
        catch (Exception e)
        {
            context.Logger.LogInformation("Error connecting: " + e.Message);
            context.Logger.LogInformation(e.StackTrace);
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Failed to connect: {e.Message}"
            };
        }
    }


    public async Task<APIGatewayProxyResponse> SendMessageHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var senderConnectionId = request.RequestContext.ConnectionId;
            if (string.IsNullOrWhiteSpace(senderConnectionId))
            {
                return new APIGatewayProxyResponse { StatusCode = (int)HttpStatusCode.BadRequest, Body = "Missing connection id" };
            }

            var senderRecord = await _ddbClient.GetItemAsync(new GetItemRequest
            {
                TableName = _chatTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { PK, new AttributeValue { S = BuildConnectionPk(senderConnectionId) } },
                    { SK, new AttributeValue { S = "META" } }
                }
            });

            if (senderRecord.Item == null || senderRecord.Item.Count == 0)
            {
                context.Logger.LogInformation($"route=sendMessage connectionId={senderConnectionId} reason=unknown_connection");
                return new APIGatewayProxyResponse { StatusCode = (int)HttpStatusCode.Forbidden, Body = "Connection not registered" };
            }

            var senderUserId = GetAttributeString(senderRecord.Item, UserIdField) ?? "unknown";
            var roomId = GetAttributeString(senderRecord.Item, RoomIdField);
            if (string.IsNullOrWhiteSpace(roomId))
            {
                return new APIGatewayProxyResponse { StatusCode = (int)HttpStatusCode.BadRequest, Body = "Connection has no room" };
            }

            var senderProfile = await GetChatProfileAsync(senderUserId);

            // Construct the API Gateway endpoint that incoming message will be broadcasted to.
            var domainName = request.RequestContext.DomainName;
            var stage = request.RequestContext.Stage;
            var endpoint = $"https://{domainName}/{stage}";
            context.Logger.LogInformation($"route=sendMessage connectionId={senderConnectionId} userId={senderUserId} roomId={roomId} endpoint={endpoint}");

            // The body will look something like this: {"message":"sendmessage", "data":"What are you doing?"}
            JsonDocument message = JsonDocument.Parse(request.Body);

            // Grab the data from the JSON body which is the message to broadcasted.
            JsonElement dataProperty;
            if (!message.RootElement.TryGetProperty("data", out dataProperty) || dataProperty.GetString() == null)
            {
                context.Logger.LogInformation("Failed to find data element in JSON document");
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest
                };
            }

            var data = dataProperty.GetString() ?? "";
            var now = DateTimeOffset.UtcNow;
            var messageId = Guid.NewGuid().ToString("N");

            if (_persistMessageHistory)
            {
                var roomPk = BuildRoomPk(roomId);
                await _ddbClient.PutItemAsync(new PutItemRequest
                {
                    TableName = _chatTable,
                    Item = new Dictionary<string, AttributeValue>
                    {
                        { PK, new AttributeValue { S = roomPk } },
                        { SK, new AttributeValue { S = $"MSG#{now.ToUnixTimeMilliseconds()}#{messageId}" } },
                        { "messageId", new AttributeValue { S = messageId } },
                        { "message", new AttributeValue { S = data } },
                        { UserIdField, new AttributeValue { S = senderUserId } },
                        { RoomIdField, new AttributeValue { S = roomId } },
                        { "sentAt", new AttributeValue { S = now.ToString("O") } },
                        { ExpiresAtField, new AttributeValue { N = now.Add(MessageRetention).ToUnixTimeSeconds().ToString() } }
                    }
                });
            }

            await TrackMessageStatsAsync(senderUserId, roomId, now, context);

            var queryRequest = new QueryRequest
            {
                TableName = _chatTable,
                IndexName = "GSI1",
                KeyConditionExpression = "GSI1PK = :room",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":room", new AttributeValue { S = BuildRoomPk(roomId) } }
                },
                ProjectionExpression = "connectionId"
            };

            var queryResponse = await _ddbClient.QueryAsync(queryRequest);

            // Construct the IAmazonApiGatewayManagementApi which will be used to send the message to.
            var apiClient = _apiGatewayManagementApiClientFactory(endpoint);

            var outbound = JsonSerializer.Serialize(new
            {
                messageId,
                message = data,
                userId = senderUserId,
                username = senderProfile?.Username ?? senderUserId,
                avatarUrl = senderProfile?.AvatarUrl,
                roomId,
                messageTime = now.ToString("O")
            });

            // Loop through all of the connections and broadcast the message out to the connections.
            var count = 0;
            foreach (var item in queryResponse.Items)
            {
                var targetConnectionId = GetAttributeString(item, ConnectionIdField);
                if (string.IsNullOrWhiteSpace(targetConnectionId))
                {
                    continue;
                }

                var postConnectionRequest = new PostToConnectionRequest
                {
                    ConnectionId = targetConnectionId,
                    Data = new MemoryStream(Encoding.UTF8.GetBytes(outbound))
                };

                try
                {
                    context.Logger.LogInformation($"route=sendMessage action=post connectionId={targetConnectionId} roomId={roomId}");
                    await apiClient.PostToConnectionAsync(postConnectionRequest);
                    count++;
                }
                catch (AmazonServiceException e)
                {
                    // API Gateway returns a status of 410 GONE then the connection is no longer available. If this happens, delete the identifier from our DynamoDB table.
                    if (e.StatusCode == HttpStatusCode.Gone)
                    {
                        context.Logger.LogInformation($"route=sendMessage action=cleanup_gone connectionId={targetConnectionId}");
                        await DeleteConnectionRecordAsync(targetConnectionId);
                    }
                    else
                    {
                        context.Logger.LogInformation($"route=sendMessage action=post_error connectionId={targetConnectionId} error={e.Message}");
                        context.Logger.LogInformation(e.StackTrace);
                    }
                }
            }

            await RefreshConnectionTtlAsync(senderConnectionId);

            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.OK,
                Body = "Data sent to " + count + " connection" + (count == 1 ? "" : "s")
            };
        }
        catch (Exception e)
        {
            context.Logger.LogInformation("Error disconnecting: " + e.Message);
            context.Logger.LogInformation(e.StackTrace);
            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.InternalServerError,
                Body = $"Failed to send message: {e.Message}"
            };
        }
    }

    public async Task<APIGatewayProxyResponse> OnDisconnectHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var connectionId = request.RequestContext.ConnectionId;
            context.Logger.LogInformation($"route=$disconnect connectionId={connectionId}");
            await DeleteConnectionRecordAsync(connectionId);

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = "Disconnected."
            };
        }
        catch (Exception e)
        {
            context.Logger.LogInformation("Error disconnecting: " + e.Message);
            context.Logger.LogInformation(e.StackTrace);
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Failed to disconnect: {e.Message}"
            };
        }
    }

    public async Task<APIGatewayProxyResponse> OnHeartbeatHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var connectionId = request.RequestContext.ConnectionId;
        if (string.IsNullOrWhiteSpace(connectionId))
        {
            return BadRequest("Missing connection id");
        }

        await RefreshConnectionTtlAsync(connectionId);
        context.Logger.LogInformation($"route=heartbeat connectionId={connectionId} action=ttl_refreshed");
        return Ok("Heartbeat accepted");
    }

    public async Task<APIGatewayProxyResponse> GetRecentMessagesHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var token = TryReadToken(request);
        if (string.IsNullOrWhiteSpace(token))
        {
            return Unauthorized();
        }

        TokenValidationResult validation = await _tokenValidator.ValidateAsync(token);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            context.Logger.LogInformation($"route=recentMessages reason=invalid_token error={validation.Error}");
            return Unauthorized();
        }

        var roomId = NormalizeRoomId(GetDictionaryValue(request.PathParameters, "roomId"));
        if (string.IsNullOrWhiteSpace(roomId))
        {
            return BadRequest("Room id is invalid");
        }

        var limit = ParseMessageLimit(GetDictionaryValue(request.QueryStringParameters, "limit"));
        if (limit is null)
        {
            return BadRequest($"Limit must be between 1 and {MessageHistoryLimit}");
        }

        var cutoff = DateTimeOffset.UtcNow.Subtract(MessageRetention).ToUnixTimeMilliseconds();
        var queryResponse = await _ddbClient.QueryAsync(new QueryRequest
        {
            TableName = _chatTable,
            KeyConditionExpression = "PK = :pk AND SK >= :cutoff",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":pk", new AttributeValue { S = BuildRoomPk(roomId) } },
                { ":cutoff", new AttributeValue { S = $"MSG#{cutoff}" } }
            },
            ScanIndexForward = false,
            Limit = limit.Value
        });

        var storedMessages = queryResponse.Items
            .Where(item => GetAttributeString(item, SK)?.StartsWith("MSG#", StringComparison.Ordinal) == true)
            .Select(item => new
            {
                messageId = GetAttributeString(item, "messageId"),
                message = GetAttributeString(item, "message"),
                userId = GetAttributeString(item, UserIdField),
                messageTime = GetAttributeString(item, "sentAt")
            })
            .Where(message => !string.IsNullOrWhiteSpace(message.messageId) &&
                !string.IsNullOrWhiteSpace(message.message) &&
                !string.IsNullOrWhiteSpace(message.userId) &&
                !string.IsNullOrWhiteSpace(message.messageTime))
            .ToArray();

        var profiles = await GetChatProfilesAsync(storedMessages.Select(message => message.userId));
        var messages = storedMessages
            .Select(message => new
            {
                message.messageId,
                message.message,
                message.userId,
                username = profiles.TryGetValue(message.userId!, out var profile)
                    ? profile.Username
                    : message.userId,
                avatarUrl = profiles.TryGetValue(message.userId!, out profile)
                    ? profile.AvatarUrl
                    : null,
                message.messageTime
            })
            .Reverse()
            .ToArray();

        context.Logger.LogInformation($"route=recentMessages userId={validation.UserId} roomId={roomId} count={messages.Length}");
        return JsonResponse(HttpStatusCode.OK, new { roomId, messages });
    }

    public async Task<APIGatewayProxyResponse> GetProfileHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        var response = await _ddbClient.GetItemAsync(new GetItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(validation.UserId)
        });

        return JsonResponse(HttpStatusCode.OK, new
        {
            username = GetAttributeString(response.Item, UsernameField),
            avatarUrl = CreateAvatarReadUrl(GetAttributeString(response.Item, AvatarKeyField)),
            messageCount = GetAttributeLong(response.Item, MessageCountField),
            lastChatRoomId = GetAttributeString(response.Item, LastChatRoomIdField),
            lastMessageAt = GetAttributeString(response.Item, LastMessageAtField)
        });
    }

    public async Task<APIGatewayProxyResponse> GetAnnouncementsHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(_announcementsTable))
        {
            context.Logger.LogInformation("route=getAnnouncements reason=table_not_configured");
            return ServerError("Announcements are not configured");
        }

        try
        {
            var announcements = new List<Dictionary<string, string>>();
            Dictionary<string, AttributeValue>? lastEvaluatedKey = null;
            var now = DateTime.UtcNow.ToString("O");

            do
            {
                var query = await _ddbClient.QueryAsync(new QueryRequest
                {
                    TableName = _announcementsTable,
                    IndexName = "PublishedAnnouncementsIndex",
                    KeyConditionExpression = "GSI1PK = :published",
                    FilterExpression = "attribute_not_exists(#expiresAt) OR #expiresAt > :now",
                    ExpressionAttributeNames = new Dictionary<string, string>
                    {
                        ["#expiresAt"] = ExpiresAtField
                    },
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        [":published"] = new AttributeValue { S = "PUBLISHED" },
                        [":now"] = new AttributeValue { S = now }
                    },
                    ScanIndexForward = false,
                    Limit = AnnouncementLimit,
                    ExclusiveStartKey = lastEvaluatedKey
                });

                foreach (var item in query.Items)
                {
                    var id = GetAttributeString(item, "announcementId");
                    var title = GetAttributeString(item, "title");
                    var text = GetAttributeString(item, "text");
                    var publishedAt = GetAttributeString(item, "publishedAt");
                    if (id is null || title is null || text is null || publishedAt is null)
                    {
                        context.Logger.LogInformation("route=getAnnouncements reason=invalid_announcement_item");
                        continue;
                    }

                    announcements.Add(new Dictionary<string, string>
                    {
                        ["id"] = id,
                        ["title"] = title,
                        ["text"] = text,
                        ["publishedAt"] = publishedAt
                    });

                    if (announcements.Count == AnnouncementLimit)
                    {
                        break;
                    }
                }

                lastEvaluatedKey = query.LastEvaluatedKey;
            }
            while (announcements.Count < AnnouncementLimit &&
                   lastEvaluatedKey is { Count: > 0 });

            return JsonResponse(HttpStatusCode.OK, new { announcements });
        }
        catch (Exception exception)
        {
            context.Logger.LogInformation($"route=getAnnouncements userId={validation.UserId} reason=query_failed error={exception.Message}");
            return ServerError("Unable to load announcements");
        }
    }

    public async Task<APIGatewayProxyResponse> UpdateProfileHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        ProfileRequest? profile;
        try
        {
            profile = JsonSerializer.Deserialize<ProfileRequest>(request.Body ?? string.Empty, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            return BadRequest("Invalid profile payload");
        }

        var username = NormalizeUsername(profile?.Username);
        if (username is null)
        {
            return BadRequest($"Username must be between 1 and {MaxUsernameLength} characters and cannot contain control characters");
        }

        var now = DateTimeOffset.UtcNow;
        try
        {
            await _ddbClient.UpdateItemAsync(new UpdateItemRequest
            {
                TableName = _profileTable,
                Key = BuildProfileKey(validation.UserId),
                UpdateExpression = "SET #username = :username, #updatedAt = :updatedAt",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    ["#username"] = UsernameField,
                    ["#updatedAt"] = "updatedAt"
                },
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":username"] = new AttributeValue { S = username },
                    [":updatedAt"] = new AttributeValue { S = now.ToString("O") }
                }
            });
        }
        catch (Exception exception)
        {
            context.Logger.LogInformation($"route=updateProfile userId={validation.UserId} reason=update_failed error={exception.Message}");
            return ServerError("Unable to save username");
        }

        return JsonResponse(HttpStatusCode.OK, new { username });
    }

    public async Task<APIGatewayProxyResponse> DeleteProfileHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        var currentProfile = await _ddbClient.GetItemAsync(new GetItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(validation.UserId),
            ProjectionExpression = AvatarKeyField
        });
        var avatarKey = GetAttributeString(currentProfile.Item, AvatarKeyField);

        try
        {
            await _ddbClient.DeleteItemAsync(new DeleteItemRequest
            {
                TableName = _profileTable,
                Key = BuildProfileKey(validation.UserId)
            });

            if (IsAvatarStorageConfigured() && IsUsersAvatarKey(validation.UserId, avatarKey))
            {
                await _s3Client!.DeleteObjectAsync(_avatarBucket!, avatarKey!);
            }
        }
        catch (Exception exception)
        {
            context.Logger.LogInformation($"route=deleteProfile userId={validation.UserId} reason=delete_failed error={exception.Message}");
            return ServerError("Unable to delete profile");
        }

        return new APIGatewayProxyResponse { StatusCode = (int)HttpStatusCode.NoContent };
    }

    public async Task<APIGatewayProxyResponse> CreateAvatarUploadUrlHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        if (!IsAvatarStorageConfigured())
            return ServerError("Avatar storage is not configured");

        AvatarUploadRequest? upload;
        try
        {
            upload = JsonSerializer.Deserialize<AvatarUploadRequest>(request.Body ?? string.Empty, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            return BadRequest("Invalid avatar upload payload");
        }

        if (upload?.ContentLength is not > 0 or > MaxAvatarBytes ||
            string.IsNullOrWhiteSpace(upload.ContentType) ||
            !AvatarExtensions.TryGetValue(upload.ContentType, out var extension))
        {
            return BadRequest("Avatar must be a JPEG, PNG, or WebP image no larger than 5 MB");
        }

        var key = $"profiles/{validation.UserId}/{Guid.NewGuid():N}{extension}";
        var uploadUrl = _s3Client!.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _avatarBucket,
            Key = key,
            Verb = HttpVerb.PUT,
            ContentType = upload.ContentType,
            Expires = DateTime.UtcNow.Add(AvatarUploadUrlLifetime)
        });

        context.Logger.LogInformation($"route=createAvatarUploadUrl userId={validation.UserId} contentType={upload.ContentType} contentLength={upload.ContentLength} objectKey={key}");

        return JsonResponse(HttpStatusCode.OK, new
        {
            uploadUrl,
            objectKey = key,
            expiresAt = DateTimeOffset.UtcNow.Add(AvatarUploadUrlLifetime).ToString("O")
        });
    }

    public async Task<APIGatewayProxyResponse> CompleteAvatarUploadHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        if (!IsAvatarStorageConfigured())
        {
            return ServerError("Avatar storage is not configured");
        }

        AvatarCompleteRequest? completion;
        try
        {
            completion = JsonSerializer.Deserialize<AvatarCompleteRequest>(request.Body ?? string.Empty, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            return BadRequest("Invalid avatar completion payload");
        }

        var objectKey = completion?.ObjectKey;
        if (!IsUsersAvatarKey(validation.UserId, objectKey))
        {
            return BadRequest("Avatar object key is invalid");
        }

        GetObjectMetadataResponse metadata;
        try
        {
            metadata = await _s3Client!.GetObjectMetadataAsync(_avatarBucket!, objectKey!);
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == HttpStatusCode.NotFound)
        {
            return NotFound("Uploaded avatar was not found");
        }

        if (metadata.ContentLength is <= 0 or > MaxAvatarBytes)
        {
            return BadRequest("Uploaded avatar is empty or exceeds the 5 MB limit");
        }

        var contentType = GetAvatarContentType(objectKey!);
        if (contentType is null)
        {
            return BadRequest("Uploaded avatar has an invalid file type");
        }

        await _s3Client.CopyObjectAsync(new CopyObjectRequest
        {
            SourceBucket = _avatarBucket,
            SourceKey = objectKey,
            DestinationBucket = _avatarBucket,
            DestinationKey = objectKey,
            MetadataDirective = S3MetadataDirective.REPLACE,
            ContentType = contentType
        });

        var currentProfile = await _ddbClient.GetItemAsync(new GetItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(validation.UserId),
            ProjectionExpression = AvatarKeyField
        });
        var previousAvatarKey = GetAttributeString(currentProfile.Item, AvatarKeyField);
        var now = DateTimeOffset.UtcNow;

        await _ddbClient.UpdateItemAsync(new UpdateItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(validation.UserId),
            UpdateExpression = "SET #avatarKey = :avatarKey, #updatedAt = :updatedAt",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                ["#avatarKey"] = AvatarKeyField,
                ["#updatedAt"] = "updatedAt"
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":avatarKey"] = new AttributeValue { S = objectKey },
                [":updatedAt"] = new AttributeValue { S = now.ToString("O") }
            }
        });

        if (IsUsersAvatarKey(validation.UserId, previousAvatarKey) && previousAvatarKey != objectKey)
        {
            await _s3Client.DeleteObjectAsync(_avatarBucket!, previousAvatarKey!);
        }

        return JsonResponse(HttpStatusCode.OK, new { avatarUrl = CreateAvatarReadUrl(objectKey) });
    }

    public async Task<APIGatewayProxyResponse> DeleteAvatarHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var validation = await ValidateAuthenticatedRequestAsync(request);
        if (!validation.IsValid || string.IsNullOrWhiteSpace(validation.UserId))
        {
            return Unauthorized();
        }

        if (!IsAvatarStorageConfigured())
        {
            return ServerError("Avatar storage is not configured");
        }

        var currentProfile = await _ddbClient.GetItemAsync(new GetItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(validation.UserId),
            ProjectionExpression = AvatarKeyField
        });
        var avatarKey = GetAttributeString(currentProfile.Item, AvatarKeyField);

        await _ddbClient.UpdateItemAsync(new UpdateItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(validation.UserId),
            UpdateExpression = "SET #updatedAt = :updatedAt REMOVE #avatarKey",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                ["#avatarKey"] = AvatarKeyField,
                ["#updatedAt"] = "updatedAt"
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":updatedAt"] = new AttributeValue { S = DateTimeOffset.UtcNow.ToString("O") }
            }
        });

        if (IsUsersAvatarKey(validation.UserId, avatarKey))
        {
            await _s3Client!.DeleteObjectAsync(_avatarBucket!, avatarKey!);
        }

        return new APIGatewayProxyResponse { StatusCode = (int)HttpStatusCode.NoContent };
    }

    public async Task<APIGatewayProxyResponse> SetLocationHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var token = TryReadToken(request);
        if (string.IsNullOrWhiteSpace(token))
        {
            context.Logger.LogInformation("route=location reason=missing_token");
            return Unauthorized();
        }

        TokenValidationResult validation = await _tokenValidator.ValidateAsync(token);
        if (!validation.IsValid)
        {
            context.Logger.LogInformation($"route=location reason=invalid_token error={validation.Error}");
            return Unauthorized();
        }

        LocationRequest? location;
        try
        {
            location = JsonSerializer.Deserialize<LocationRequest>(request.Body ?? string.Empty, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            return BadRequest("Invalid location payload");
        }

        if (location is null || !IsValidCoordinate(location.Latitude, location.Longitude))
        {
            return BadRequest("Latitude or longitude is invalid");
        }

        if (_localityResolver is null)
        {
            context.Logger.LogInformation("route=location reason=geocoding_not_configured");
            return ServerError("Location service is not configured");
        }

        try
        {
            var locality = await _localityResolver.ResolveAsync(location.Latitude, location.Longitude);
            if (locality is null)
            {
                return NotFound("No complete locality found for this location");
            }

            await CreateRoomMetadataIfMissingAsync(locality);
            context.Logger.LogInformation($"route=location userId={validation.UserId} roomId={locality.RoomId}");
            return JsonResponse(HttpStatusCode.OK, new
            {
                roomId = locality.RoomId,
                suburb = locality.Suburb,
                state = locality.State,
                country = locality.Country
            });
        }
        catch (AmazonLocationServiceException exception)
        {
            context.Logger.LogInformation($"route=location reason=geocoding_failed error={exception.Message}");
            return ServerError("Unable to resolve suburb");
        }
    }

    private static APIGatewayProxyResponse Ok(string message) =>
        new APIGatewayProxyResponse { StatusCode = 200, Body = message };

    private static APIGatewayProxyResponse BadRequest(string message) =>
        new APIGatewayProxyResponse { StatusCode = 400, Body = message };

    private static APIGatewayProxyResponse Unauthorized() =>
        new APIGatewayProxyResponse { StatusCode = 401, Body = "Unauthorized" };

    private static APIGatewayProxyResponse NotFound(string message) =>
        new APIGatewayProxyResponse { StatusCode = 404, Body = message };

    private static APIGatewayProxyResponse ServerError(string message) =>
        new APIGatewayProxyResponse { StatusCode = 500, Body = message };

    private static APIGatewayProxyResponse JsonResponse(HttpStatusCode statusCode, object body) =>
        new APIGatewayProxyResponse
        {
            StatusCode = (int)statusCode,
            Body = JsonSerializer.Serialize(body),
            Headers = new Dictionary<string, string> { ["Content-Type"] = "application/json" }
        };

    private static bool IsValidCoordinate(double latitude, double longitude) =>
        !double.IsNaN(latitude) &&
        !double.IsInfinity(latitude) &&
        !double.IsNaN(longitude) &&
        !double.IsInfinity(longitude) &&
        latitude is >= -90 and <= 90 &&
        longitude is >= -180 and <= 180;

    private static int ParseIntFromEnv(string key, int defaultValue)
    {
        var raw = Environment.GetEnvironmentVariable(key);
        return int.TryParse(raw, out var parsed) ? parsed : defaultValue;
    }

    private static bool ParseBoolFromEnv(string key, bool defaultValue)
    {
        var raw = Environment.GetEnvironmentVariable(key);
        return bool.TryParse(raw, out var parsed) ? parsed : defaultValue;
    }

    private static int? ParseMessageLimit(string? rawLimit)
    {
        if (string.IsNullOrWhiteSpace(rawLimit))
        {
            return MessageHistoryLimit;
        }

        return int.TryParse(rawLimit, out var parsed) && parsed is >= 1 and <= MessageHistoryLimit
            ? parsed
            : null;
    }

    private async Task CreateRoomMetadataIfMissingAsync(LocalityInfo locality)
    {
        var now = DateTimeOffset.UtcNow;

        try
        {
            await _ddbClient.PutItemAsync(new PutItemRequest
            {
                TableName = _chatTable,
                Item = new Dictionary<string, AttributeValue>
                {
                    { PK, new AttributeValue { S = BuildRoomPk(locality.RoomId) } },
                    { SK, new AttributeValue { S = "META" } },
                    { RoomIdField, new AttributeValue { S = locality.RoomId } },
                    { SuburbField, new AttributeValue { S = locality.Suburb } },
                    { StateField, new AttributeValue { S = locality.State } },
                    { CountryField, new AttributeValue { S = locality.Country } },
                    { "createdAt", new AttributeValue { S = now.ToString("O") } }
                },
                ConditionExpression = "attribute_not_exists(PK)"
            });
        }
        catch (ConditionalCheckFailedException)
        {
            // A prior request already created this permanent room record.
        }
    }

    private static string BuildConnectionPk(string connectionId) => $"CONN#{connectionId}";
    private static string BuildRoomPk(string roomId) => $"ROOM#{roomId}";

    private static Dictionary<string, AttributeValue> BuildProfileKey(string userId) => new()
    {
        { UserIdField, new AttributeValue { S = userId } }
    };

    private static string? NormalizeUsername(string? username)
    {
        var normalized = username?.Trim();
        return !string.IsNullOrWhiteSpace(normalized) &&
            normalized.Length <= MaxUsernameLength &&
            normalized.All(character => !char.IsControl(character))
            ? normalized
            : null;
    }

    private bool IsAvatarStorageConfigured() =>
        _s3Client is not null && !string.IsNullOrWhiteSpace(_avatarBucket);

    private static bool IsUsersAvatarKey(string userId, string? objectKey) =>
        !string.IsNullOrWhiteSpace(objectKey) &&
        objectKey.StartsWith($"profiles/{userId}/", StringComparison.Ordinal) &&
        AvatarExtensions.Values.Any(extension => objectKey.EndsWith(extension, StringComparison.OrdinalIgnoreCase));

    private static string? GetAvatarContentType(string objectKey) =>
        AvatarExtensions.FirstOrDefault(pair => objectKey.EndsWith(pair.Value, StringComparison.OrdinalIgnoreCase)).Key;

    private string? CreateAvatarReadUrl(string? objectKey)
    {
        if (!IsAvatarStorageConfigured() || string.IsNullOrWhiteSpace(objectKey))
        {
            return null;
        }

        return _s3Client!.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _avatarBucket,
            Key = objectKey,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(AvatarReadUrlLifetime)
        });
    }

    private async Task<ChatProfile?> GetChatProfileAsync(string userId)
    {
        var response = await _ddbClient.GetItemAsync(new GetItemRequest
        {
            TableName = _profileTable,
            Key = BuildProfileKey(userId),
            ProjectionExpression = $"{UsernameField}, {AvatarKeyField}"
        });

        var username = GetAttributeString(response.Item, UsernameField);
        return string.IsNullOrWhiteSpace(username)
            ? null
            : new ChatProfile(username, CreateAvatarReadUrl(GetAttributeString(response.Item, AvatarKeyField)));
    }

    private async Task<IReadOnlyDictionary<string, ChatProfile>> GetChatProfilesAsync(IEnumerable<string?> userIds)
    {
        var keys = userIds
            .Where(userId => !string.IsNullOrWhiteSpace(userId))
            .Select(userId => BuildProfileKey(userId!))
            .DistinctBy(key => key[UserIdField].S)
            .ToList();

        if (keys.Count == 0)
        {
            return new Dictionary<string, ChatProfile>();
        }

        var request = new BatchGetItemRequest
        {
            RequestItems = new Dictionary<string, KeysAndAttributes>
            {
                {
                    _profileTable,
                    new KeysAndAttributes
                    {
                        Keys = keys,
                        ProjectionExpression = $"{UserIdField}, {UsernameField}, {AvatarKeyField}"
                    }
                }
            }
        };
        var profiles = new Dictionary<string, ChatProfile>();

        do
        {
            var response = await _ddbClient.BatchGetItemAsync(request) ?? new BatchGetItemResponse();
            if (response.Responses?.TryGetValue(_profileTable, out var profileItems) == true)
            {
                foreach (var profileItem in profileItems)
                {
                    var userId = GetAttributeString(profileItem, UserIdField);
                    var username = GetAttributeString(profileItem, UsernameField);
                    if (!string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(username))
                    {
                        profiles[userId] = new ChatProfile(
                            username,
                            CreateAvatarReadUrl(GetAttributeString(profileItem, AvatarKeyField)));
                    }
                }
            }

            request.RequestItems = response.UnprocessedKeys ?? new Dictionary<string, KeysAndAttributes>();
        }
        while (request.RequestItems.Count > 0);

        return profiles;
    }

    private async Task<TokenValidationResult> ValidateAuthenticatedRequestAsync(APIGatewayProxyRequest request)
    {
        var token = TryReadToken(request);
        return string.IsNullOrWhiteSpace(token)
            ? new TokenValidationResult(false, null, "Missing token")
            : await _tokenValidator.ValidateAsync(token);
    }

    private static string? NormalizeRoomId(string? roomId)
    {
        var normalized = roomId is null
            ? null
            : Uri.UnescapeDataString(roomId).Trim().ToUpperInvariant();
        return !string.IsNullOrWhiteSpace(normalized) &&
            Regex.IsMatch(normalized, "^[A-Z0-9_]+#[A-Z0-9_]+#[A-Z0-9_]+$")
            ? normalized
            : null;
    }

    private static string? TryReadToken(APIGatewayProxyRequest request)
    {
        var authHeader = request.Headers?.FirstOrDefault(h =>
            string.Equals(h.Key, "Authorization", StringComparison.OrdinalIgnoreCase)).Value;

        if (!string.IsNullOrWhiteSpace(authHeader))
        {
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return authHeader.Substring("Bearer ".Length).Trim();
            }

            return authHeader.Trim();
        }

        if (request.QueryStringParameters?.TryGetValue("token", out var token) == true)
        {
            return token;
        }

        return null;
    }

    private static string? GetDictionaryValue(IDictionary<string, string>? dictionary, string key)
    {
        if (dictionary == null)
        {
            return null;
        }

        return dictionary.TryGetValue(key, out var value) ? value : null;
    }

    private static string? GetAttributeString(IDictionary<string, AttributeValue>? item, string key)
    {
        if (item == null)
        {
            return null;
        }

        return item.TryGetValue(key, out var value) ? value.S : null;
    }

    private static long GetAttributeLong(IDictionary<string, AttributeValue>? item, string key) =>
        item != null && item.TryGetValue(key, out var value) && long.TryParse(value.N, out var result)
            ? result
            : 0;

    private async Task TrackMessageStatsAsync(string userId, string roomId, DateTimeOffset sentAt, ILambdaContext context)
    {
        try
        {
            await _ddbClient.UpdateItemAsync(new UpdateItemRequest
            {
                TableName = _profileTable,
                Key = BuildProfileKey(userId),
                UpdateExpression = "ADD #messageCount :one SET #lastChatRoomId = :roomId, #lastMessageAt = :sentAt",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    ["#messageCount"] = MessageCountField,
                    ["#lastChatRoomId"] = LastChatRoomIdField,
                    ["#lastMessageAt"] = LastMessageAtField
                },
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":one"] = new AttributeValue { N = "1" },
                    [":roomId"] = new AttributeValue { S = roomId },
                    [":sentAt"] = new AttributeValue { S = sentAt.ToString("O") }
                }
            });
        }
        catch (Exception exception)
        {
            context.Logger.LogInformation($"route=sendMessage userId={userId} reason=stats_update_failed error={exception.Message}");
        }
    }

    private async Task DeleteConnectionRecordAsync(string? connectionId)
    {
        if (string.IsNullOrWhiteSpace(connectionId))
        {
            return;
        }

        await _ddbClient.DeleteItemAsync(new DeleteItemRequest
        {
            TableName = _chatTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { PK, new AttributeValue { S = BuildConnectionPk(connectionId) } },
                { SK, new AttributeValue { S = "META" } }
            }
        });
    }

    private async Task RefreshConnectionTtlAsync(string connectionId)
    {
        var expiresAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + _connectionTtlSeconds;
        await _ddbClient.UpdateItemAsync(new UpdateItemRequest
        {
            TableName = _chatTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { PK, new AttributeValue { S = BuildConnectionPk(connectionId) } },
                { SK, new AttributeValue { S = "META" } }
            },
            UpdateExpression = "SET expiresAt = :expiresAt",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":expiresAt", new AttributeValue { N = expiresAt.ToString() } }
            }
        });
    }

    private sealed record LocationRequest(double Latitude, double Longitude);
}
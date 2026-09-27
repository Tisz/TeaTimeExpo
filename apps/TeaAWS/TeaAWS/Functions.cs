using Amazon.ApiGatewayManagementApi;
using Amazon.ApiGatewayManagementApi.Model;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.LocationService;
using Amazon.LocationService.Model;
using Amazon.Runtime;
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
    private const string CognitoUserPoolIdEnv = "COGNITO_USER_POOL_ID";
    private const string CognitoRegionEnv = "COGNITO_REGION";
    private const string CognitoClientIdEnv = "COGNITO_CLIENT_ID";
    private const string ConnectionTtlSecondsEnv = "CONNECTION_TTL_SECONDS";
    private const string PersistHistoryEnv = "PERSIST_MESSAGE_HISTORY";
    private const string PlaceIndexNameEnv = "PLACE_INDEX_NAME";
    private const int MessageHistoryLimit = 10;
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

    private readonly string _chatTable;
    private readonly IAmazonDynamoDB _ddbClient;
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
        _chatTable = Environment.GetEnvironmentVariable(TableNameEnv)
            ?? throw new InvalidOperationException($"{TableNameEnv} not set");

        string userPoolId = Environment.GetEnvironmentVariable(CognitoUserPoolIdEnv)
            ?? throw new InvalidOperationException($"{CognitoUserPoolIdEnv} not set");
        string region = Environment.GetEnvironmentVariable(CognitoRegionEnv)
            ?? throw new InvalidOperationException($"{CognitoRegionEnv} not set");
        string? clientId = Environment.GetEnvironmentVariable(CognitoClientIdEnv);
        _tokenValidator = new CognitoJwtTokenValidator(region, userPoolId, clientId);

        _connectionTtlSeconds = ParseIntFromEnv(ConnectionTtlSecondsEnv, 900);
        _persistMessageHistory = ParseBoolFromEnv(PersistHistoryEnv, true);

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
    /// <param name="chatTable">Name of the DynamoDB table to store websocket records.</param>
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
        ILocalityResolver? localityResolver = null)
    {
        _ddbClient = ddbClient;
        _apiGatewayManagementApiClientFactory = apiGatewayManagementApiClientFactory;
        _chatTable = chatTable;
        _tokenValidator = tokenValidator;
        _connectionTtlSeconds = connectionTtlSeconds;
        _persistMessageHistory = persistMessageHistory;
        _localityResolver = localityResolver;
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

        var messages = queryResponse.Items
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
                !string.IsNullOrWhiteSpace(message.messageTime))
            .Reverse()
            .ToArray();

        context.Logger.LogInformation($"route=recentMessages userId={validation.UserId} roomId={roomId} count={messages.Length}");
        return JsonResponse(HttpStatusCode.OK, new { roomId, messages });
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
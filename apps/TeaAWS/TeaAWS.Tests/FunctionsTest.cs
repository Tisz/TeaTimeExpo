using Amazon.ApiGatewayManagementApi;
using Amazon.ApiGatewayManagementApi.Model;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.TestUtilities;
using Amazon.Runtime;
using Moq;
using System.Net;
using Xunit;

namespace TeaAWS.Tests;

public class FunctionsTest
{
    private const string TableName = "mocktable";

    private static Functions BuildFunctions(
        Mock<IAmazonDynamoDB> ddb,
        Mock<IAmazonApiGatewayManagementApi> api,
        Mock<IJwtTokenValidator> validator,
        bool persistMessageHistory = true,
        ILocalityResolver? localityResolver = null)
    {
        return new Functions(
            ddb.Object,
            _ => api.Object,
            TableName,
            validator.Object,
            connectionTtlSeconds: 900,
            persistMessageHistory: persistMessageHistory,
            localityResolver: localityResolver);
    }

    [Fact]
    public async Task TestConnect_PersistsVerifiedUserAndRoom()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var mockApiGatewayClient = new Mock<IAmazonApiGatewayManagementApi>();
        var validator = new Mock<IJwtTokenValidator>();
        var connectionId = "test-id";
        var verifiedUserId = "verified-user";

        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, verifiedUserId, null));

        mockDdbClient
            .Setup(client => client.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()))
            .Callback<PutItemRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal(TableName, request.TableName);
                Assert.Equal($"CONN#{connectionId}", request.Item[Functions.PK].S);
                Assert.Equal("META", request.Item[Functions.SK].S);
                Assert.Equal(connectionId, request.Item[Functions.ConnectionIdField].S);
                Assert.Equal(verifiedUserId, request.Item[Functions.UserIdField].S);
                Assert.Equal("AU#NSW#SYDNEY", request.Item[Functions.RoomIdField].S);
                Assert.Equal("ROOM#AU#NSW#SYDNEY", request.Item[Functions.GSI1PK].S);
            })
            .ReturnsAsync(new PutItemResponse());

        var functions = BuildFunctions(mockDdbClient, mockApiGatewayClient, validator);

        var request = new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string>
            {
                { "Authorization", "Bearer token-123" }
            },
            QueryStringParameters = new Dictionary<string, string>
            {
                { "roomId", "AU#NSW#SYDNEY" }
            },
            RequestContext = new APIGatewayProxyRequest.ProxyRequestContext
            {
                ConnectionId = connectionId
            }
        };

        var response = await functions.OnConnectHandler(request, new TestLambdaContext());
        Assert.Equal(200, response.StatusCode);
    }

    [Fact]
    public async Task TestConnect_RejectsMissingToken()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var mockApiGatewayClient = new Mock<IAmazonApiGatewayManagementApi>();
        var validator = new Mock<IJwtTokenValidator>();

        var functions = BuildFunctions(mockDdbClient, mockApiGatewayClient, validator);
        var request = new APIGatewayProxyRequest
        {
            QueryStringParameters = new Dictionary<string, string>
            {
                { "roomId", "AU#NSW#SYDNEY" }
            },
            RequestContext = new APIGatewayProxyRequest.ProxyRequestContext
            {
                ConnectionId = "test-id"
            }
        };

        var response = await functions.OnConnectHandler(request, new TestLambdaContext());
        Assert.Equal(401, response.StatusCode);
        mockDdbClient.Verify(d => d.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SetLocation_RejectsMissingToken()
    {
        var functions = BuildFunctions(
            new Mock<IAmazonDynamoDB>(),
            new Mock<IAmazonApiGatewayManagementApi>(),
            new Mock<IJwtTokenValidator>());

        var response = await functions.SetLocationHandler(new APIGatewayProxyRequest
        {
            Body = "{\"latitude\":-33.8688,\"longitude\":151.2093}"
        }, new TestLambdaContext());

        Assert.Equal(401, response.StatusCode);
    }

    [Fact]
    public async Task SetLocation_RejectsInvalidCoordinates()
    {
        var validator = new Mock<IJwtTokenValidator>();
        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, "user-1", null));

        var functions = BuildFunctions(
            new Mock<IAmazonDynamoDB>(),
            new Mock<IAmazonApiGatewayManagementApi>(),
            validator);

        var response = await functions.SetLocationHandler(new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token-123" },
            Body = "{\"latitude\":91,\"longitude\":151.2093}"
        }, new TestLambdaContext());

        Assert.Equal(400, response.StatusCode);
    }

    [Fact]
    public async Task SetLocation_ReturnsResolvedLocality()
    {
        var validator = new Mock<IJwtTokenValidator>();
        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, "user-1", null));
        var localityResolver = new Mock<ILocalityResolver>();
        localityResolver
            .Setup(resolver => resolver.ResolveAsync(-33.8688, 151.2093, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LocalityInfo("AU#NSW#SYDNEY", "Sydney", "NSW", "AU"));

        var functions = BuildFunctions(
            new Mock<IAmazonDynamoDB>(),
            new Mock<IAmazonApiGatewayManagementApi>(),
            validator,
            localityResolver: localityResolver.Object);

        var response = await functions.SetLocationHandler(new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token-123" },
            Body = "{\"latitude\":-33.8688,\"longitude\":151.2093}"
        }, new TestLambdaContext());

        Assert.Equal(200, response.StatusCode);
        Assert.Equal("{\"roomId\":\"AU#NSW#SYDNEY\",\"suburb\":\"Sydney\",\"state\":\"NSW\",\"country\":\"AU\"}", response.Body);
    }

    [Fact]
    public async Task SetLocation_CreatesRoomMetadataWhenItDoesNotExist()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var validator = new Mock<IJwtTokenValidator>();
        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, "user-1", null));
        var localityResolver = new Mock<ILocalityResolver>();
        localityResolver
            .Setup(resolver => resolver.ResolveAsync(-33.8688, 151.2093, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LocalityInfo("AU#NSW#SYDNEY", "Sydney", "NSW", "AU"));

        mockDdbClient
            .Setup(client => client.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()))
            .Callback<PutItemRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal(TableName, request.TableName);
                Assert.Equal("attribute_not_exists(PK)", request.ConditionExpression);
                Assert.Equal("ROOM#AU#NSW#SYDNEY", request.Item[Functions.PK].S);
                Assert.Equal("META", request.Item[Functions.SK].S);
                Assert.Equal("AU#NSW#SYDNEY", request.Item[Functions.RoomIdField].S);
                Assert.Equal("Sydney", request.Item[Functions.SuburbField].S);
                Assert.Equal("NSW", request.Item[Functions.StateField].S);
                Assert.Equal("AU", request.Item[Functions.CountryField].S);
                Assert.True(request.Item.ContainsKey("createdAt"));
            })
            .ReturnsAsync(new PutItemResponse());

        var functions = BuildFunctions(
            mockDdbClient,
            new Mock<IAmazonApiGatewayManagementApi>(),
            validator,
            localityResolver: localityResolver.Object);

        var response = await functions.SetLocationHandler(new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token-123" },
            Body = "{\"latitude\":-33.8688,\"longitude\":151.2093}"
        }, new TestLambdaContext());

        Assert.Equal(200, response.StatusCode);
        mockDdbClient.Verify(client => client.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetLocation_SucceedsWhenRoomMetadataAlreadyExists()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var validator = new Mock<IJwtTokenValidator>();
        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, "user-1", null));
        var localityResolver = new Mock<ILocalityResolver>();
        localityResolver
            .Setup(resolver => resolver.ResolveAsync(-33.8688, 151.2093, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LocalityInfo("AU#NSW#SYDNEY", "Sydney", "NSW", "AU"));

        mockDdbClient
            .Setup(client => client.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ConditionalCheckFailedException("Room already exists"));

        var functions = BuildFunctions(
            mockDdbClient,
            new Mock<IAmazonApiGatewayManagementApi>(),
            validator,
            localityResolver: localityResolver.Object);

        var response = await functions.SetLocationHandler(new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token-123" },
            Body = "{\"latitude\":-33.8688,\"longitude\":151.2093}"
        }, new TestLambdaContext());

        Assert.Equal(200, response.StatusCode);
        mockDdbClient.Verify(client => client.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetRecentMessages_ReturnsTenRecentMessagesInChronologicalOrder()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var validator = new Mock<IJwtTokenValidator>();
        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, "user-1", null));

        mockDdbClient
            .Setup(client => client.QueryAsync(It.IsAny<QueryRequest>(), It.IsAny<CancellationToken>()))
            .Callback<QueryRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal(TableName, request.TableName);
                Assert.Equal("PK = :pk AND SK >= :cutoff", request.KeyConditionExpression);
                Assert.Equal("ROOM#AU#NSW#SYDNEY", request.ExpressionAttributeValues[":pk"].S);
                Assert.Equal(10, request.Limit);
                Assert.False(request.ScanIndexForward);
            })
            .ReturnsAsync(new QueryResponse
            {
                Items = new List<Dictionary<string, AttributeValue>>
                {
                    MessageItem("newer", "Newer", "2026-09-19T12:01:00.0000000+00:00"),
                    MessageItem("older", "Older", "2026-09-19T12:00:00.0000000+00:00")
                }
            });

        var functions = BuildFunctions(mockDdbClient, new Mock<IAmazonApiGatewayManagementApi>(), validator);
        var response = await functions.GetRecentMessagesHandler(new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token-123" },
            PathParameters = new Dictionary<string, string> { ["roomId"] = "AU#NSW#SYDNEY" }
        }, new TestLambdaContext());

        Assert.Equal(200, response.StatusCode);
        Assert.Contains("\"messageId\":\"older\"", response.Body);
        Assert.True(response.Body.IndexOf("older", StringComparison.Ordinal) < response.Body.IndexOf("newer", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetRecentMessages_RejectsInvalidRoomId()
    {
        var validator = new Mock<IJwtTokenValidator>();
        validator
            .Setup(v => v.ValidateAsync("token-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenValidationResult(true, "user-1", null));
        var functions = BuildFunctions(new Mock<IAmazonDynamoDB>(), new Mock<IAmazonApiGatewayManagementApi>(), validator);

        var response = await functions.GetRecentMessagesHandler(new APIGatewayProxyRequest
        {
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token-123" },
            PathParameters = new Dictionary<string, string> { ["roomId"] = "not-a-room" }
        }, new TestLambdaContext());

        Assert.Equal(400, response.StatusCode);
    }

    private static Dictionary<string, AttributeValue> MessageItem(string messageId, string message, string sentAt) => new()
    {
        { Functions.SK, new AttributeValue { S = $"MSG#1#{messageId}" } },
        { "messageId", new AttributeValue { S = messageId } },
        { "message", new AttributeValue { S = message } },
        { Functions.UserIdField, new AttributeValue { S = "user-1" } },
        { "sentAt", new AttributeValue { S = sentAt } }
    };

    [Fact]
    public async Task TestDisconnect_DeletesConnectionRecord()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var mockApiGatewayClient = new Mock<IAmazonApiGatewayManagementApi>();
        var validator = new Mock<IJwtTokenValidator>();
        var connectionId = "test-id";

        mockDdbClient
            .Setup(client => client.DeleteItemAsync(It.IsAny<DeleteItemRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DeleteItemRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal(TableName, request.TableName);
                Assert.Equal($"CONN#{connectionId}", request.Key[Functions.PK].S);
                Assert.Equal("META", request.Key[Functions.SK].S);
            })
            .ReturnsAsync(new DeleteItemResponse());

        var functions = BuildFunctions(mockDdbClient, mockApiGatewayClient, validator);

        var request = new APIGatewayProxyRequest
        {
            RequestContext = new APIGatewayProxyRequest.ProxyRequestContext
            {
                ConnectionId = connectionId
            }
        };

        var response = await functions.OnDisconnectHandler(request, new TestLambdaContext());
        Assert.Equal(200, response.StatusCode);
    }

    [Fact]
    public async Task TestSendMessage_BroadcastsWithinRoom_AndCleansGoneConnections()
    {
        var mockDdbClient = new Mock<IAmazonDynamoDB>();
        var mockApiGatewayClient = new Mock<IAmazonApiGatewayManagementApi>();
        var validator = new Mock<IJwtTokenValidator>();
        var senderConnectionId = "sender-conn";

        mockDdbClient
            .Setup(client => client.GetItemAsync(It.IsAny<GetItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GetItemResponse
            {
                Item = new Dictionary<string, AttributeValue>
                {
                    { Functions.UserIdField, new AttributeValue { S = "user-1" } },
                    { Functions.RoomIdField, new AttributeValue { S = "AU#NSW#SYDNEY" } }
                }
            });

        mockDdbClient
            .Setup(client => client.QueryAsync(It.IsAny<QueryRequest>(), It.IsAny<CancellationToken>()))
            .Callback<QueryRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal(TableName, request.TableName);
                Assert.Equal("GSI1", request.IndexName);
                Assert.Equal("ROOM#AU#NSW#SYDNEY", request.ExpressionAttributeValues[":room"].S);
            })
            .ReturnsAsync(new QueryResponse
            {
                Items = new List<Dictionary<string, AttributeValue>>
                {
                    new() { { Functions.ConnectionIdField, new AttributeValue { S = "conn-a" } } },
                    new() { { Functions.ConnectionIdField, new AttributeValue { S = "conn-stale" } } }
                }
            });

        mockApiGatewayClient
            .Setup(client => client.PostToConnectionAsync(
                It.Is<PostToConnectionRequest>(r => r.ConnectionId == "conn-a"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PostToConnectionResponse());

        mockApiGatewayClient
            .Setup(client => client.PostToConnectionAsync(
                It.Is<PostToConnectionRequest>(r => r.ConnectionId == "conn-stale"),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AmazonServiceException("gone") { StatusCode = HttpStatusCode.Gone });

        mockDdbClient
            .Setup(client => client.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()))
            .Callback<PutItemRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal(TableName, request.TableName);
                Assert.Equal("ROOM#AU#NSW#SYDNEY", request.Item[Functions.PK].S);
            })
            .ReturnsAsync(new PutItemResponse());

        mockDdbClient
            .Setup(client => client.DeleteItemAsync(It.IsAny<DeleteItemRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DeleteItemRequest, CancellationToken>((request, _) =>
            {
                Assert.Equal("CONN#conn-stale", request.Key[Functions.PK].S);
            })
            .ReturnsAsync(new DeleteItemResponse());

        mockDdbClient
            .Setup(client => client.UpdateItemAsync(It.IsAny<UpdateItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UpdateItemResponse());

        var functions = BuildFunctions(mockDdbClient, mockApiGatewayClient, validator, persistMessageHistory: true);

        var request = new APIGatewayProxyRequest
        {
            RequestContext = new APIGatewayProxyRequest.ProxyRequestContext
            {
                ConnectionId = senderConnectionId,
                DomainName = "test-domain",
                Stage = "test-stage"
            },
            Body = "{\"message\":\"sendMessage\",\"data\":\"hello world\"}"
        };

        var response = await functions.SendMessageHandler(request, new TestLambdaContext());
        Assert.Equal(200, response.StatusCode);
        mockApiGatewayClient.Verify(c => c.PostToConnectionAsync(It.IsAny<PostToConnectionRequest>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        mockDdbClient.Verify(c => c.DeleteItemAsync(It.IsAny<DeleteItemRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

const appConfig = require('./app.json');

const { expo } = appConfig;

const getEnvironmentValue = (name, fallback) => {
  const value = process.env[name]?.trim();
  return value || fallback;
};

module.exports = {
  expo: {
    ...expo,
    extra: {
      ...expo.extra,
      cognitoRegion: getEnvironmentValue('EXPO_PUBLIC_COGNITO_REGION', expo.extra.cognitoRegion),
      cognitoUserPoolId: getEnvironmentValue('EXPO_PUBLIC_COGNITO_USER_POOL_ID', expo.extra.cognitoUserPoolId),
      cognitoUserPoolClientId: getEnvironmentValue(
        'EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID',
        expo.extra.cognitoUserPoolClientId,
      ),
      locationApiBaseUrl: getEnvironmentValue(
        'EXPO_PUBLIC_LOCATION_API_BASE_URL',
        expo.extra.locationApiBaseUrl,
      ),
      chatApiBaseUrl: getEnvironmentValue('EXPO_PUBLIC_CHAT_API_BASE_URL', expo.extra.chatApiBaseUrl),
      webSocketBaseUrl: getEnvironmentValue('EXPO_PUBLIC_WEB_SOCKET_BASE_URL', expo.extra.webSocketBaseUrl),
    },
  },
};

import Constants from 'expo-constants';

type AwsEndpointConfig = {
  locationApiBaseUrl?: string;
  chatApiBaseUrl?: string;
  webSocketBaseUrl?: string;
};

const config = (Constants.expoConfig?.extra ?? {}) as AwsEndpointConfig;

const requiredUrl = (name: keyof AwsEndpointConfig, protocol: 'https:' | 'wss:'): string => {
  const value = config[name];

  if (!value) {
    throw new Error(`Missing Expo configuration value: ${name}`);
  }

  const url = new URL(value);
  if (url.protocol !== protocol) {
    throw new Error(`${name} must use the ${protocol} protocol.`);
  }

  return value.replace(/\/$/, '');
};

export const locationApiBaseUrl = requiredUrl('locationApiBaseUrl', 'https:');
export const chatApiBaseUrl = requiredUrl('chatApiBaseUrl', 'https:');
export const webSocketBaseUrl = requiredUrl('webSocketBaseUrl', 'wss:');
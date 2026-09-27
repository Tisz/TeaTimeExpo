import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { UserAPI } from './userAPI';
import { locationApiBaseUrl } from '../../config/awsEndpoints';

export const apiResponseHandler = async (response: Response) => {
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  if (!body || !contentType.includes('application/json')) {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

export const createBaseQueryWithAuth = (baseUrl: string) => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      const token = await UserAPI.getStoredToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        console.warn('[API] No Cognito ID token was available for an authenticated request.');
      }
      return headers;
    },
  });

  return async (args: Parameters<typeof rawBaseQuery>[0], api: Parameters<typeof rawBaseQuery>[1], extraOptions: Parameters<typeof rawBaseQuery>[2]) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const refreshedToken = await UserAPI.getStoredToken(true);
      if (refreshedToken) {
        result = await rawBaseQuery(args, api, extraOptions);
      }
    }

    return result;
  };
};

export const baseQueryWithAuth = createBaseQueryWithAuth(locationApiBaseUrl);
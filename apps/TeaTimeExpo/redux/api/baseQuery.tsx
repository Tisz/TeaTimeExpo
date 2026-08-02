import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { UserAPI } from './userAPI';
import { APIBaseURL } from '../../data/constants/DataConstants';

export const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: APIBaseURL,
  prepareHeaders: async (headers) => {
    const token = await UserAPI.getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
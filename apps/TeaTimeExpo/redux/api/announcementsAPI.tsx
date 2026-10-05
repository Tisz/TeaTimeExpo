import { createApi } from '@reduxjs/toolkit/query/react';
import { locationApiBaseUrl } from '../../config/awsEndpoints';
import { apiResponseHandler, createBaseQueryWithAuth } from './baseQuery';

export type Announcement = {
  id: string;
  title: string;
  text: string;
  publishedAt: string;
};

type AnnouncementsResponse = {
  announcements: Announcement[];
};

export const announcementsApi = createApi({
  reducerPath: 'announcementsApi',
  baseQuery: createBaseQueryWithAuth(locationApiBaseUrl),
  endpoints: (builder) => ({
    getAnnouncements: builder.query<AnnouncementsResponse, void>({
      query: () => ({
        url: '/announcements',
        responseHandler: apiResponseHandler,
      }),
    }),
  }),
});

export const { useGetAnnouncementsQuery } = announcementsApi;

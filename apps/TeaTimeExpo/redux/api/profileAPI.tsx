import { createApi } from '@reduxjs/toolkit/query/react';
import { locationApiBaseUrl } from '../../config/awsEndpoints';
import { apiResponseHandler, createBaseQueryWithAuth } from './baseQuery';

export type Profile = {
  username: string | null;
  avatarUrl: string | null;
  messageCount: number;
  lastChatRoomId: string | null;
  lastMessageAt: string | null;
};

type AvatarUploadUrl = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
};

export const profileApi = createApi({
  reducerPath: 'profileApi',
  baseQuery: createBaseQueryWithAuth(locationApiBaseUrl),
  tagTypes: ['Profile'],
  endpoints: (builder) => ({
    getProfile: builder.query<Profile, void>({
      query: () => ({
        url: '/profile',
        responseHandler: apiResponseHandler,
      }),
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<Profile, { username: string }>({
      query: (profile) => ({
        url: '/profile',
        method: 'PUT',
        body: profile,
        responseHandler: apiResponseHandler,
      }),
      invalidatesTags: ['Profile'],
    }),
    deleteProfile: builder.mutation<void, void>({
      query: () => ({
        url: '/profile',
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    createAvatarUploadUrl: builder.mutation<AvatarUploadUrl, { contentType: string; contentLength: number }>({
      query: (avatar) => ({
        url: '/profile/avatar/upload-url',
        method: 'POST',
        body: avatar,
        responseHandler: apiResponseHandler,
      }),
    }),
    completeAvatarUpload: builder.mutation<Profile, { objectKey: string }>({
      query: (avatar) => ({
        url: '/profile/avatar/complete',
        method: 'POST',
        body: avatar,
        responseHandler: apiResponseHandler,
      }),
      invalidatesTags: ['Profile'],
    }),
    deleteAvatar: builder.mutation<void, void>({
      query: () => ({
        url: '/profile/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
  useCreateAvatarUploadUrlMutation,
  useCompleteAvatarUploadMutation,
  useDeleteAvatarMutation,
} = profileApi;
import { createApi } from '@reduxjs/toolkit/query/react';
import { ChatMessage } from '../../data/types/ChatMessage';
import { chatApiBaseUrl } from '../../config/awsEndpoints';
import { apiResponseHandler, createBaseQueryWithAuth } from './baseQuery';

export type RecentMessage = {
  messageId: string;
  message: string;
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  messageTime: string;
};

export type RecentMessagesResponse = {
  roomId: string;
  messages: RecentMessage[];
};

export const getMockMessages = (channelId: string): ChatMessage[] => {
  return Array.from({ length: 5 }).map((_, i) => ({
    messageId: `mock-${channelId}-${i}`,
    username: `DevUser${i}`,
    message: `Fake message ${i + 1} in #${channelId}`,
    messageTime: new Date(Date.now() - i * 100000).toISOString(),
    sender: 'other'
  }));
};

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: createBaseQueryWithAuth(chatApiBaseUrl),
  endpoints: (builder) => ({
    getRecentMessages: builder.query<RecentMessagesResponse, string>({
      query: (roomId) => ({
        url: `/rooms/${encodeURIComponent(roomId)}/messages?limit=10`,
        responseHandler: apiResponseHandler,
      }),
    }),
  }),
});

export const { useLazyGetRecentMessagesQuery } = chatApi;
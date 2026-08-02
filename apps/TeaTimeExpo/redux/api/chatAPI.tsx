import { createApi } from '@reduxjs/toolkit/query/react';
import { ChatMessage } from '../../data/types/ChatMessage';
import { baseQueryWithAuth } from './baseQuery';

export const getMockMessages = (channelId: string): ChatMessage[] => {
  return Array.from({ length: 5 }).map((_, i) => ({
    username: `DevUser${i}`,
    message: `Fake message ${i + 1} in #${channelId}`,
    messageTime: new Date(Date.now() - i * 100000).toISOString(),
    sender: 'other'
  }));
};

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getMessagesByChannel: builder.query<ChatMessage[], string>({
      query: (channelId) => `/channels/${channelId}/messages`,
    }),
  }),
});

export const { useGetMessagesByChannelQuery } = chatApi;
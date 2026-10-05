import { configureStore } from '@reduxjs/toolkit';
import settingsSlice from './slices/settingsSlice';
import chatSlice from './slices/chatSlice';
import { chatApi } from './api/chatAPI';
import { locationApi } from './api/locationAPI';
import { profileApi } from './api/profileAPI';
import { announcementsApi } from './api/announcementsAPI';

export const store = configureStore({
  reducer: {
    setting: settingsSlice,
    chat: chatSlice,
    [chatApi.reducerPath]: chatApi.reducer,
    [locationApi.reducerPath]: locationApi.reducer,
    [profileApi.reducerPath]: profileApi.reducer,
    [announcementsApi.reducerPath]: announcementsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(chatApi.middleware, locationApi.middleware, profileApi.middleware, announcementsApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
import { configureStore } from '@reduxjs/toolkit';
import settingsSlice from './slices/settingsSlice';
import chatSlice from './slices/chatSlice';
import { chatApi } from './api/chatAPI';
import { locationApi } from './api/locationAPI';

export const store = configureStore({
  reducer: {
    setting: settingsSlice,
    chat: chatSlice,
    [chatApi.reducerPath]: chatApi.reducer,
    [locationApi.reducerPath]: locationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(chatApi.middleware, locationApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
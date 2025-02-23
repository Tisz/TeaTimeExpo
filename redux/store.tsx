import { configureStore } from '@reduxjs/toolkit';
import settingsSlice from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    setting: settingsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
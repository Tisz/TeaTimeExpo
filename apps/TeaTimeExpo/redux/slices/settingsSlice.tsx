import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingState {
    isDarkMode: boolean;
}

const initialState: SettingState = {
  isDarkMode: false,
};

const settingSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      AsyncStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    },
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
  },
});

export const { toggleTheme, setTheme } = settingSlice.actions;
export default settingSlice.reducer;
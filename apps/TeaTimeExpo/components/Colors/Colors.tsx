import { DefaultTheme } from 'styled-components/native';

export type ThemeType = typeof lightTheme;
export const lightTheme : DefaultTheme = {
    primary: '#B5D3FF',
    secondary: '#fff',
    tertiary: '#000',
    accent: '#00ADB5',
    darkAccent: '#008084',
    darkGrey: '#6B7280',
    lightGrey: '#6B7280',
    white: '#fff',
    black: '#000',
    success: '#22C55E',
    fail: '#EF4444'
};

export const darkTheme : DefaultTheme = {
    primary: '#222831',
    secondary: '#393E46',
    tertiary: '#EEEEEE',
    accent: '#00ADB5',
    darkAccent: '#008084',
    darkGrey: '#111827',
    lightGrey: '#6B7280',
    white: '#fff',
    black: '#000',
    success: '#22C55E',
    fail: '#EF4444'
};
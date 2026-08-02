import React, {useEffect, useState} from 'react';
import { ThemeProvider } from 'styled-components/native';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../components/Colors/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { AuthContext} from '../context/AuthContext';
import { RootState, store } from '../redux/store';
import { AppNav } from '../navigators/AppNav';
import { setTheme } from '../redux/slices/settingsSlice';

export const ThemeWrapper = () => {
    const [authState, setAuthState] = useState({
      id:'',
      token:'',
      signedIn:false
    });

    const dispatch = useDispatch();
    const isDarkTheme = useSelector((state: RootState) => state.setting.isDarkMode);
  
    useEffect(() => {
      const loadTheme = async () => {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          dispatch(setTheme(savedTheme === 'dark'));
        }
      };
      loadTheme();
    }, [dispatch]);
  
    return (
      <ThemeProvider theme={isDarkTheme ? darkTheme : lightTheme}>
        <AuthContext.Provider value={{ authState, setAuthState }}>
          <AppNav/>
        </AuthContext.Provider>
      </ThemeProvider>
    );
  };
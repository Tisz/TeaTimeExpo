import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';

const Stack = createStackNavigator();

const LoginStack = () => {
    const theme = useTheme() as ThemeType;
    return <NavigationContainer>
        <Stack.Navigator
            screenOptions={{
                headerTintColor: theme.accent,
                headerStyle: {
                    height: 100,
                    backgroundColor: theme.secondary,
                    borderBottomWidth: 0,
                    shadowColor: 'transparent',
                    shadowOpacity: 0,
                    elevation: 0
                },
                headerLeftContainerStyle: {
                    paddingLeft: 10
                },
                headerRightContainerStyle: {
                    paddingRight: 25
                }
        }}
        initialRouteName='Login'
        
        >

        </Stack.Navigator>
    </NavigationContainer>;
}

export default LoginStack;
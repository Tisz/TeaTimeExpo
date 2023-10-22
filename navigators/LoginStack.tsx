import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// styled components
import { colors } from '../components/colors';
const { accent, secondary, } = colors;

//components
const Stack = createStackNavigator();

const LoginStack = () => {
    return <NavigationContainer>
        <Stack.Navigator
            screenOptions={{
                headerTintColor: accent,
                headerStyle: {
                    height: 100,
                    backgroundColor: secondary,
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
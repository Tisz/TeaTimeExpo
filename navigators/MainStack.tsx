import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// styled components
import { colors } from '../components/colors';
const { accent, secondary, darkGrey } = colors;

//screens
import Dashboard from '../screens/Dashboard';

const Stack = createStackNavigator();

const MainStack = () => {
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
        initialRouteName='Dashboard'     
        >
            <Stack.Screen name="Dashboard" component={Dashboard} options={{
                headerStyle: {
                    height: 100,
                    backgroundColor: darkGrey,
                    borderBottomWidth: 0,
                    shadowColor: 'transparent',
                    shadowOpacity: 0,
                    elevation: 0
                },
                headerRight: () => <AvatarButton />
            }}/>
        </Stack.Navigator>
    </NavigationContainer>;
}

export default MainStack;
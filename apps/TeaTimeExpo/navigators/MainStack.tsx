import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../screens/Dashboard';
import NotificationSettings from '../screens/NotificationSettings';
import Chatroom from '../screens/Chatroom';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';

const Tab = createBottomTabNavigator();

const MainStack = () => {
    const theme = useTheme() as ThemeType;
    return (
      <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return (
            <MaterialCommunityIcons name={iconName} color={color} size={size} />
          );
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: theme.primary, // or any custom color
          borderTopColor: theme.lightGrey,     // optional: to match your design
        },
        headerShown: false,
      })}
    >
        <Tab.Screen name="Home" component={Dashboard} />
        <Tab.Screen name="Chat" component={Chatroom} />
        <Tab.Screen name="Settings" component={NotificationSettings} />
      </Tab.Navigator>
    )
}

export default MainStack;
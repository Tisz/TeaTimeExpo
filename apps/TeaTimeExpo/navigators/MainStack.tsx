import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dashboard from '../screens/Dashboard';
import NotificationSettings from '../screens/NotificationSettings';
import Chatroom from '../screens/Chatroom';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const Tab = createBottomTabNavigator();

const TabIconContainer = styled.View`
  align-items: center;
  height: 32px;
  justify-content: center;
  width: 48px;
`;

const ActiveIndicator = styled.View`
  background-color: ${(props) => props.theme.accent};
  border-radius: 2px;
  height: 3px;
  position: absolute;
  top: -6px;
  width: 24px;
`;

const MainStack = () => {
    const theme = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();
    return (
      <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: IconName = 'home';
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return (
            <TabIconContainer>
              {focused && <ActiveIndicator />}
              <MaterialCommunityIcons name={iconName} color={color} size={size} />
            </TabIconContainer>
          );
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.lightGrey,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0,
        },
        tabBarItemStyle: {
          paddingTop: 5,
        },
        tabBarStyle: {
          backgroundColor: theme.secondary,
          borderTopColor: theme.lightGrey,
          borderTopWidth: 1,
          elevation: 0,
          height: 61 + insets.bottom,
          paddingBottom: insets.bottom + 3,
          paddingTop: 3,
          shadowOpacity: 0,
        },
        headerShown: false,
      })}
    >
        <Tab.Screen name="Home" component={Dashboard} options={{ tabBarAccessibilityLabel: 'Open home' }} />
        <Tab.Screen name="Chat" component={Chatroom} options={{ tabBarAccessibilityLabel: 'Open chat' }} />
        <Tab.Screen name="Settings" component={NotificationSettings} options={{ tabBarAccessibilityLabel: 'Open settings' }} />
      </Tab.Navigator>
    )
}

export default MainStack;
import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// styled components
import { colors } from '../components/colors';
const { accent, secondary, darkGrey } = colors;

//screens
import Dashboard from '../screens/Dashboard';
import NotificationSettings from '../screens/NotificationSettings';
import Notifications from '../screens/Notifications';

const Tab = createBottomTabNavigator();

const MainStack = () => {
    return (
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard" component={Dashboard} />
        <Tab.Screen name="Settings" component={NotificationSettings} />
      </Tab.Navigator>
    )
}

export default MainStack;
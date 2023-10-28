import React, {useState, useEffect, useContext} from 'react';
import { StatusBar } from 'expo-status-bar';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { colors } from '../components/colors';
const { accent, secondary, darkGrey } = colors;

//screens
import Login from '../screens/Login';
import Signup from '../screens/Signup';
import EmailVerification from '../screens/EmailVerification';
import ForgotPassword from '../screens/ForgotPassword';
import ResetPassword from '../screens/ResetPassword';
import Dashboard from '../screens/Dashboard';

//components
import AvatarButton from '../components/Buttons/AvatarButton';
import { AuthContext } from '../context/AuthContext';
import MainStack from './MainStack';

//context

export function AppNav() {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useContext(AuthContext);
  const Stack = createStackNavigator();

  const getUserToken = async () => {
    // testing purposes
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      // custom logic
      await sleep(2000);
      //try getting user token and setting it!
      
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUserToken();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
          <Stack.Navigator
              screenOptions={{
                  headerTintColor: authState.token == "" ? accent : 'transparent' ,
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
                  },
              }}
          initialRouteName='Login'     
          >
            {authState.token == "" ? (             // No token found, user isn't signed in
                <>
                  <Stack.Screen name="Login" component={Login}/>
                  <Stack.Screen name="Signup" component={Signup} options={{headerTitle: 'Sign Up'}}/>
                  <Stack.Screen name="EmailVerification" component={EmailVerification} options={{headerTitle: 'Email Verification'}}/>
                  <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{headerTitle: 'Forgot Password'}}/>
                  <Stack.Screen name="ResetPassword" component={ResetPassword} options={{headerTitle: 'Reset Password'}}/>
                </>
              ) : (
                // User is signed in
                <>
                  <Stack.Screen name="Main" component={MainStack} 
                    options={{
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
                </>
              )}

          </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default AppNav;
import React, {useState, useContext} from 'react';
import { Formik } from 'formik';
import { ActivityIndicator, Image } from 'react-native'
import styled from 'styled-components/native';

import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';
//custom components
import MainContainer from '../components/Containers/MainContainer';
import KeyboardAvoidingContainer from '../components/Containers/KeyboardAvoidingContainer';
import RegularText from '../components/Texts/RegularText';
import StyledTextInput from '../components/Inputs/StyledTextInput';
import MessageBox from '../components/Texts/MessageBox';
import RegularButton from '../components/Buttons/RegularButton';
import PressableText from '../components/Texts/PressableText';
import { UserAPI } from '../redux/api/userAPI';


//context
import { AuthContext} from '../context/AuthContext';

const LoginHeader = styled.View`
    align-items: center;
    background-color: ${(props) => props.theme.darkGrey};
    min-height: 220px;
    padding: 42px 25px 34px;
`;

const HeaderTitle = styled.Text`
    color: ${(props) => props.theme.white};
    font-size: 26px;
    font-weight: bold;
    margin-top: 8px;
`;

const HeaderSubtitle = styled.Text`
    color: ${(props) => props.theme.white};
    font-size: 15px;
    margin-top: 6px;
    opacity: 0.85;
    text-align: center;
`;

const FormSurface = styled.View`
    background-color: ${(props) => props.theme.secondary};
    border-radius: 8px;
    margin: -20px 20px 24px;
    padding: 22px 18px;
`;

const FormTitle = styled.Text`
    color: ${(props) => props.theme.tertiary};
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 6px;
`;

const FormSubtitle = styled.Text`
    color: ${(props) => props.theme.lightGrey};
    font-size: 14px;
    margin-bottom: 22px;
`;

const PasswordActions = styled.View`
    align-items: flex-end;
    margin-top: -14px;
    margin-bottom: 16px;
`;

const SignupPrompt = styled.View`
    align-items: center;
    flex-direction: row;
    justify-content: center;
    margin-top: 20px;
`;

const Login = ({navigation, route}) => {
    const theme = useTheme() as ThemeType;
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const { authState, setAuthState } = useContext(AuthContext);

    const moveTo = (screen, payload = null) => {
        navigation.navigate(screen, {...payload});
    }

    const handleLogin = async (credentials, setSubmitting) => {
        try 
        {
            setMessage(null);

            const token = await UserAPI.login({
                email: credentials.email,
                password: credentials.password,
            });

            setIsSuccessMessage(true);
            setMessage("Success! Loading dashboard");

            setAuthState({
                id: credentials.email.trim().toLowerCase(),
                token,
                signedIn: true,
            });

            setSubmitting(false);
        }
        catch (error: any) {
            setIsSuccessMessage(false);
            setMessage("Login Failed: " + (error?.message ?? 'Unknown error'));
            setSubmitting(false);
        }
    }

    return <MainContainer style={{padding: 0}}>
        <KeyboardAvoidingContainer>
            <LoginHeader>
                <Image
                    source={require('../assets/Tea_Logo.png')}
                    style={{width: 190, height: 70}}
                    resizeMode="contain"
                />
                <HeaderTitle>Welcome back</HeaderTitle>
                <HeaderSubtitle>Share the tea.</HeaderSubtitle>
            </LoginHeader>

            <FormSurface>
                <FormTitle>Sign in</FormTitle>
                <FormSubtitle>Enter your account details to continue.</FormSubtitle>
                <Formik initialValues={{email: '', password: ''}}
                    onSubmit={(values, {setSubmitting}) => {
                        if (values.email == "" || values.password == ""){
                            setMessage("Please enter all fields");
                            setSubmitting(false);
                        }
                        else {
                            handleLogin(values, setSubmitting);
                        }
                    }}>
                    {({handleChange, handleBlur, handleSubmit, values, isSubmitting}) => (
                        <>
                        <StyledTextInput 
                            label="Email" 
                            icon="email-variant" 
                            placeholder="you@example.com" 
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                            autoComplete="email"
                            onChangeText={handleChange('email')}
                            onBlur={handleBlur('email')}
                            value={values.email}
                            style={{marginBottom: 25}}
                        />

                        <StyledTextInput 
                            label="Password" 
                            icon="lock-open" 
                            placeholder="Enter your password" 
                            textContentType="password"
                            autoComplete="password"
                            onChangeText={handleChange('password')}
                            onBlur={handleBlur('password')}
                            value={values.password}
                            isPassword={true}
                            style={{marginBottom: 25}}
                        />

                        <PasswordActions>
                            <PressableText onPress={() => {moveTo('ForgotPassword')}}>Forgot password?</PressableText>
                        </PasswordActions>

                        {!!message && <MessageBox success={isSuccessMessage} style={{marginBottom: 16}}>
                            {message}
                        </MessageBox>}
                        {!isSubmitting && <RegularButton onPress={handleSubmit}>Login</RegularButton>}
                        {isSubmitting && (<RegularButton disabled={true}><ActivityIndicator size="small" color={theme.primary}/></RegularButton>)}

                        <SignupPrompt>
                            <RegularText>New to Tea Time? </RegularText>
                            <PressableText onPress={() => {moveTo('Signup')}}>Create account</PressableText>
                        </SignupPrompt>

                        </>
                    )}
                </Formik>
            </FormSurface>

        </KeyboardAvoidingContainer>
    </MainContainer>
}

export default Login;
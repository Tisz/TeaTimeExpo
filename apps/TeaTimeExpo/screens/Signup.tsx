import React, {useState} from 'react';
import { Formik } from 'formik';
import { ActivityIndicator } from 'react-native'

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

const Signup = ({navigation}) => {
    const theme = useTheme() as ThemeType;
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);

    const moveTo = (screen, payload = null) => {
        navigation.navigate(screen, {...payload});
    }

    const handleSignup = async (credentials, setSubmitting) => {
        try 
        {
            setMessage(null);
            setIsSuccessMessage(false);

            await UserAPI.signup({
                email: credentials.email,
                password: credentials.password,
            });

            setIsSuccessMessage(true);
            setMessage('Verification code sent. Check your email.');

            moveTo('EmailVerification', {
                email: credentials.email.trim().toLowerCase(),
                username: credentials.username.trim(),
            });

            setSubmitting(false);
        }
        catch (error: any) {
            setIsSuccessMessage(false);
            setMessage("Signup Failed: " + (error?.message ?? 'Unknown error'));
            setSubmitting(false);
        }
    }

    return <MainContainer>
        <KeyboardAvoidingContainer>
            <RegularText style={{marginBottom: 15}}>
                Enter your account details
            </RegularText>

            <Formik initialValues={{username: '', email: '', password: '', verifyPassword: ''}}
                onSubmit={(values, {setSubmitting}) => {
                    const username = values.username.trim();
                    if (username === "" || values.email.trim() === "" || values.password === "" || values.verifyPassword === ""){
                        setMessage("Please enter all fields");
                        setSubmitting(false);
                    }
                    else if (username.length > 32 || /[\x00-\x1F\x7F]/.test(username)){
                        setMessage("Username must be between 1 and 32 characters and cannot contain control characters");
                        setSubmitting(false);
                    }
                    else if (values.password != values.verifyPassword){
                        setMessage("Passwords do not match");
                        setSubmitting(false);
                    }
                    else {
                        handleSignup(values, setSubmitting);
                    }
                }}>
                {({handleChange, handleBlur, handleSubmit, values, isSubmitting}) => (
                    <>
                        <StyledTextInput 
                            label="Username" 
                            icon="account" 
                            placeholder="How people will see you" 
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="username"
                            onChangeText={handleChange('username')}
                            onBlur={handleBlur('username')}
                            value={values.username}
                            isPassword={false}
                            style={{marginBottom: 15}}
                        />

                        <StyledTextInput 
                            label="Email" 
                            icon="email-variant" 
                            placeholder="hello@bello.com" 
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                            autoComplete="email"
                            onChangeText={handleChange('email')}
                            onBlur={handleBlur('email')}
                            value={values.email}
                            isPassword={false}
                            style={{marginBottom: 15}}
                        />

                        <StyledTextInput 
                            label="Password" 
                            icon="lock-open" 
                            placeholder="* * * * * * * *" 
                            textContentType="newPassword"
                            autoComplete="new-password"
                            onChangeText={handleChange('password')}
                            onBlur={handleBlur('password')}
                            value={values.password}
                            isPassword={true}
                            style={{marginBottom: 15}}
                        />

                        <StyledTextInput 
                            label="Confirm Password" 
                            icon="lock-open" 
                            placeholder="* * * * * * * *" 
                            textContentType="newPassword"
                            autoComplete="new-password"
                            onChangeText={handleChange('verifyPassword')}
                            onBlur={handleBlur('verifyPassword')}
                            value={values.verifyPassword}
                            isPassword={true}
                            style={{marginBottom: 15}}
                        />

                        <MessageBox success={isSuccessMessage} style={{marginBottom: 15}}>
                            { message  || " "}
                        </MessageBox>
                        {!isSubmitting && <RegularButton onPress={handleSubmit}>Sign Up</RegularButton>}
                        {isSubmitting && (<RegularButton disabled={true}><ActivityIndicator size="small" color={theme.primary}></ActivityIndicator>Sign up</RegularButton>)}

                        <PressableText style={{ paddingVertical: 15 }} onPress={() => {moveTo('Login')}}>Use Existing Account</PressableText>

                    </>
                )}
            </Formik>


        </KeyboardAvoidingContainer>
    </MainContainer>
}

export default Signup;
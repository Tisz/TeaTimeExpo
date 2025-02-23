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

            //call backend

            //next page

            moveTo('EmailVerification')

            setSubmitting(false);
        }
        catch (error) {
            setMessage("Signup Failed: " + error.Message);
            setSubmitting(false);
        }
    }

    return <MainContainer>
        <KeyboardAvoidingContainer>
            <RegularText style={{marginBottom: 15}}>
                Enter your account details
            </RegularText>

            <Formik initialValues={{firstName: '', lastName: '', email: '', password: '', verifyPassword: ''}}
                onSubmit={(values, {setSubmitting}) => {
                    if (values.firstName == "" || values.lastName == "" || values.email == "" || values.password == "" || values.verifyPassword == ""){
                        setMessage("Please enter all fields");
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
                            label="First Name" 
                            icon="account" 
                            placeholder="Paul" 
                            keyboardType="email-address"
                            onChangeText={handleChange('firstName')}
                            onBlur={handleBlur('firstName')}
                            value={values.firstName}
                            isPassword={false}
                            style={{marginBottom: 15}}
                        />

                        <StyledTextInput 
                            label="Last Name" 
                            icon="account" 
                            placeholder="Brown" 
                            keyboardType="email-address"
                            onChangeText={handleChange('lastName')}
                            onBlur={handleBlur('lastName')}
                            value={values.lastName}
                            isPassword={false}
                            style={{marginBottom: 15}}
                        />

                        <StyledTextInput 
                            label="Email" 
                            icon="email-variant" 
                            placeholder="hello@bello.com" 
                            keyboardType="email-address"
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
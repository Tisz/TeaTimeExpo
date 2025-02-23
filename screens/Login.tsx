import React, {useState, useContext} from 'react';
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
import RowContainer from '../components/Containers/RowContainer';


//context
import { AuthContext} from '../context/AuthContext';

const Login = ({navigation, route}) => {
    const theme = useTheme() as ThemeType;
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const { authState, setAuthState } = useContext(AuthContext);

    const moveTo = (screen, payload = null) => {
        navigation.navigate(screen, {...payload});
    }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const handleLogin = async (credentials, setSubmitting) => {
        try 
        {
            setMessage(null);

            //call backend
            await sleep(1500); //pretend backend doing something

            setIsSuccessMessage(true)
            setMessage("Checking credentials...");
            await sleep(1000);
            setMessage("Success! Loading dashboard");
            await sleep(1000);
            //next page
            if (authState){
                setAuthState({
                    id:"some id",
                    token:"my token", 
                    signedIn:true,
                })
            }
            else {
                  setMessage("User has not been set");
            }

            setSubmitting(false);
        }
        catch (error) {
            setMessage("Login Failed: " + error.Message);
            setSubmitting(false);
        }
    }

    return <MainContainer>
        <KeyboardAvoidingContainer>
            <RegularText style={{marginBottom: 25}}>
                Enter your account details
            </RegularText>

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
                            placeholder="hello@bello.com" 
                            keyboardType="email-address"
                            onChangeText={handleChange('email')}
                            onBlur={handleBlur('email')}
                            value={values.email}
                            style={{marginBottom: 25}}
                        />

                        <StyledTextInput 
                            label="Password" 
                            icon="lock-open" 
                            placeholder="* * * * * * * *" 
                            onChangeText={handleChange('password')}
                            onBlur={handleBlur('password')}
                            value={values.password}
                            isPassword={true}
                            style={{marginBottom: 25}}
                        />

                        <MessageBox success={isSuccessMessage} style={{marginBottom: 25}}>
                            { message  || " "}
                        </MessageBox>
                        {!isSubmitting && <RegularButton onPress={handleSubmit}>Login</RegularButton>}
                        {isSubmitting && (<RegularButton disabled={true}><ActivityIndicator size="small" color={theme.primary}/></RegularButton>)}

                        <RowContainer>                        
                            <PressableText onPress={() => {moveTo('Signup')}}>New Account?</PressableText>
                            <PressableText onPress={() => {moveTo('ForgotPassword')}}>Forgot Password?</PressableText>
                        </RowContainer>

                    </>
                )}
            </Formik>


        </KeyboardAvoidingContainer>
    </MainContainer>
}

export default Login;
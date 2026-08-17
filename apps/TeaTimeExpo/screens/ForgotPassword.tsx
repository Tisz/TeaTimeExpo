import React, {useState} from 'react';
import { Formik } from 'formik';
import { ActivityIndicator } from 'react-native'
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';
import MainContainer from '../components/Containers/MainContainer';
import KeyboardAvoidingContainer from '../components/Containers/KeyboardAvoidingContainer';
import RegularText from '../components/Texts/RegularText';
import StyledTextInput from '../components/Inputs/StyledTextInput';
import MessageBox from '../components/Texts/MessageBox';
import RegularButton from '../components/Buttons/RegularButton';
import PressableText from '../components/Texts/PressableText';
import IconHeader from '../components/Icons/IconHeader';
import { UserAPI } from '../redux/api/userAPI';


const ForgotPassword = ({navigation}: {navigation: any}) => {
    const theme = useTheme() as ThemeType;
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);

    const moveTo = (screen: string, payload: Record<string, any> | null = null) => {
        navigation.navigate(screen, {...(payload ?? {})});
    }

    const [isCheckingCode, setIsCheckingCode] = useState(false);

    const handleForgotPasswordSend = async (credentials: {email: string}, setSubmitting: (value: boolean) => void) => {
        try 
        {
            setMessage('');
            setIsSuccessMessage(false);

            await UserAPI.requestPasswordReset(credentials.email);

            setIsSuccessMessage(true);
            setMessage('Reset code sent. Check your email.');

            moveTo('ResetPassword', { email: credentials.email.trim().toLowerCase() });

            setSubmitting(false);
        }
        catch (error: any) {
            setIsSuccessMessage(false);
            setMessage("Request Failed: " + (error?.message ?? 'Unknown error'));
            setSubmitting(false);
        }
    }

    const handleAlreadyHaveCode = (credentials: {email: string}) => {
        if (credentials.email == "") {
            setMessage("Please enter your email");
            return;
        }

        setIsCheckingCode(true);
        moveTo('ResetPassword', { email: credentials.email.trim().toLowerCase() });
        setIsCheckingCode(false);
    }

    return <MainContainer>
        <KeyboardAvoidingContainer>
            <IconHeader name="key" style={{marginBottom: 30}}/>
            <RegularText style={{marginBottom: 25}}>
                Enter your email to reset your password
            </RegularText>

            <Formik initialValues={{email: ''}}
                onSubmit={(values, {setSubmitting}) => {
                    if (values.email == ""){
                        setMessage("Please enter all fields");
                        setSubmitting(false);
                    }
                    else {
                        handleForgotPasswordSend(values, setSubmitting);
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

                        <MessageBox success={isSuccessMessage} style={{marginBottom: 25}}>
                            { message  || " "}
                        </MessageBox>
                        {!isSubmitting && <RegularButton onPress={handleSubmit}>Send Code</RegularButton>}
                        {isSubmitting && (<RegularButton disabled={true}><ActivityIndicator size="small" color={theme.primary}></ActivityIndicator>Send Code</RegularButton>)}

                        <RegularButton style={{marginTop: 15}} disabled={isSubmitting || isCheckingCode} onPress={() => handleAlreadyHaveCode(values)}>Already Have a Code</RegularButton>

                        <PressableText style={{marginTop: 30}} onPress={() => {moveTo('Login')}}>Back</PressableText>


                    </>
                )}
            </Formik>


        </KeyboardAvoidingContainer>
    </MainContainer>
}

export default ForgotPassword;
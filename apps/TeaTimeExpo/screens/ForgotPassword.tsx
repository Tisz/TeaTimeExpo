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


const ForgotPassword = ({navigation}) => {
    const theme = useTheme() as ThemeType;
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);

    const moveTo = (screen, payload = null) => {
        navigation.navigate(screen, {...payload});
    }

    const handleForgotPasswordSend = async (credentials, setSubmitting) => {
        try 
        {
            setMessage(null);

            //call backend

            //next page
            moveTo('ResendPassword');

            setSubmitting(false);
        }
        catch (error) {
            setMessage("Request Failed: " + error.Message);
            setSubmitting(false);
        }
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
                        {!isSubmitting && <RegularButton onPress={handleSubmit}>Login</RegularButton>}
                        {isSubmitting && (<RegularButton disabled={true}><ActivityIndicator size="small" color={theme.primary}></ActivityIndicator>Send Request</RegularButton>)}
               
                        <PressableText style={{marginTop: 30}} onPress={() => {}}>Back</PressableText>


                    </>
                )}
            </Formik>


        </KeyboardAvoidingContainer>
    </MainContainer>
}

export default ForgotPassword;
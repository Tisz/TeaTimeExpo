import React, {useState} from 'react';
import { Formik } from 'formik';
import { ActivityIndicator } from 'react-native'

import { colors } from '../components/colors';
const {primary, accent} = colors

//custom components
import MainContainer from '../components/Containers/MainContainer';
import KeyboardAvoidingContainer from '../components/Containers/KeyboardAvoidingContainer';
import RegularText from '../components/Texts/RegularText';
import StyledTextInput from '../components/Inputs/StyledTextInput';
import MessageBox from '../components/Texts/MessageBox';
import RegularButton from '../components/Buttons/RegularButton';
import PressableText from '../components/Texts/PressableText';
import RowContainer from '../components/Containers/RowContainer';
import StyledCodeInput from '../components/Inputs/StyledCodeInput';
import ResendTimer from '../components/Timers/ResendTimer';
import IconHeader from '../components/Icons/IconHeader';

import styled from 'styled-components/native'
import MessageModel from '../components/Modals/MessageModal';

const FormWrapper = styled.View`
    ${(props) => {
        return props.pinReady ? 'opacity: 1' : 'opacity: 0.3';
    }}
`

const ResetPassword = ({navigation}) => {
    const MAX_CODE_LENGTH = 4;
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const [code, setCode] = useState('')
    const [pinReady, setPinReady] = useState(false)

    const [verifying, setVerifying] = useState(false);
    const [activeResend, setActiveResend] = useState(false);
    const [resendStatus, setResendStatus] = useState('Resend');
    const [resendingEmail, setResendingEmail] = useState(false);

    const moveTo = (screen, payload = null) => {
        navigation.navigate(screen, {...payload});
    }

    const handleNewPassword = async (passwords, setSubmitting) => {
        try 
        {
            setMessage(null);

            //call backend
            return showModal('success', 'Reset Complete', 'Your password has been reset', 'Go to login');


            setSubmitting(false);
        }
        catch (error) {
            setMessage("Login Failed: " + error.Message);
            setSubmitting(false);
            return showModal('failed', 'Reset Failed', 'Your code was incorrect. Please try again.', 'Close');
        }
    }

    const resendEmail = async (triggerTimer) => {
        try 
        {
            setResendingEmail(true);
            //backend request
            //setResendStatus() to failed or sent

            setActiveResend(false);
            setResendingEmail(false);
            triggerTimer();

            setTimeout(() => {
                setResendStatus('Resend');
                setActiveResend(false);
            }, 5000)
        }
        catch (error) {
            setMessage("Sending Failed: " + error.Message);
            setResendingEmail(false);
            setResendStatus('Failed!');
        }
    }

    //modal
    const [modalVisibile, setModalVisibile] = useState(false)
    const [modalMesagetype, setModalMessageType] = useState('')
    const [modalHeaderText, setModalHeaderText] = useState('')
    const [modalMessage, setModalMessage] = useState('')
    const [modalButtonText, setModalButtonText] = useState('')

    const modalButtonHandler = () => {
        if (modalMesagetype == 'success'){
            moveTo('Login');
        }

        setModalVisibile(false);
    }

    const showModal = (type, headerText, message, buttonText) => {
        setModalMessageType(type);
        setModalHeaderText(headerText);
        setModalMessage(message);
        setModalButtonText(buttonText);
        setModalVisibile(true);
    }

    return <MainContainer>
        <KeyboardAvoidingContainer>
            <IconHeader color={accent} name="lock-open" style={{ marginBottom: 20}}/> 

            <RegularText style={{textAlign: 'center'}}>
                Enter the 4-digit code sent to your email
            </RegularText>

            <StyledCodeInput maxLength={MAX_CODE_LENGTH} code={code} setCode={setCode} setPinReady={setPinReady}/>

            <ResendTimer 
                activeResend={activeResend} 
                setActiveResend={setActiveResend} 
                resendStatus={resendStatus} 
                resendingEmail={resendingEmail} 
                resendEmail={resendEmail}
                targetTimerInSeconds={20}
                style={{marginBottom:15}}
            />

            <Formik initialValues={{newPassword: '', verifyPassword: ''}}
                onSubmit={(values, {setSubmitting}) => {
                    if (values.newPassword == "" || values.verifyPassword == ""){
                        setMessage("Please enter all fields");
                        setSubmitting(false);
                    }
                    if (values.newPassword != values.verifyPassword){
                        setMessage("Passwords do not match");
                        setSubmitting(false);
                    }
                    else {
                        handleNewPassword(values, setSubmitting);
                    }
                }}>
                {({handleChange, handleBlur, handleSubmit, values, isSubmitting}) => (
                    <>
                    <FormWrapper pinReady={pinReady}>
                        <StyledTextInput 
                            label="New Password" 
                            icon="lock-open-variant" 
                            placeholder="* * * * * * * *" 
                            onChangeText={handleChange('newPassword')}
                            onBlur={handleBlur('newPassword')}
                            value={values.newPassword}
                            isPassword={true}
                            style={{marginBottom: 25}}
                            editable={pinReady}
                        />

<                       StyledTextInput 
                            label="Verify Password" 
                            icon="lock-open-variant" 
                            placeholder="* * * * * * * *" 
                            onChangeText={handleChange('verifyPassword')}
                            onBlur={handleBlur('verifyPassword')}
                            value={values.verifyPassword}
                            isPassword={true}
                            style={{marginBottom: 15}}
                            editable={pinReady}
                        />

                        <MessageBox success={isSuccessMessage} style={{marginBottom: 20}}>
                            { message  || " "}
                        </MessageBox>
                        {!isSubmitting && <RegularButton disabled={!pinReady} onPress={handleSubmit}>Login</RegularButton>}
                        {isSubmitting && (<RegularButton disabled={true}><ActivityIndicator size="small" color={primary}></ActivityIndicator>Login</RegularButton>)}

                        <PressableText style={{marginTop: 15}} onPress={() => {}}>Back</PressableText>
                    </FormWrapper>
                    </>
                )}
            </Formik>

            <MessageModel modalVisibile={modalVisibile} buttonHandler={modalButtonHandler} type={modalMesagetype} headerText={modalHeaderText} message={modalMessage} buttonText={modalButtonText}/>
        </KeyboardAvoidingContainer>
    </MainContainer>
}

export default ResetPassword;
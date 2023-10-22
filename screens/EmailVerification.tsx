import React, {useState} from 'react';
import { Formik } from 'formik';
import { ActivityIndicator } from 'react-native'

import { colors } from '../components/colors';
const {primary, accent, secondary, lightGrey} = colors

//custom components
import MainContainer from '../components/Containers/MainContainer';
import KeyboardAvoidingContainer from '../components/Containers/KeyboardAvoidingContainer';
import RegularText from '../components/Texts/RegularText';
import StyledTextInput from '../components/Inputs/StyledTextInput';
import MessageBox from '../components/Texts/MessageBox';
import RegularButton from '../components/Buttons/RegularButton';
import PressableText from '../components/Texts/PressableText';
import RowContainer from '../components/Containers/RowContainer';
import IconHeader from '../components/Icons/IconHeader';
import StyledCodeInput from '../components/Inputs/StyledCodeInput';
import ResendTimer from '../components/Timers/ResendTimer';
import MessageModel from '../components/Modals/MessageModal';

const EmailVerification = ({navigation}) => {

    const MAX_CODE_LENGTH = 4;
    const [code, setCode] = useState('')
    const [pinReady, setPinReady] = useState(false)

    const [verifying, setVerifying] = useState(false);
    const [activeResend, setActiveResend] = useState(false);
    const [resendStatus, setResendStatus] = useState('Resend');
    const [resendingEmail, setResendingEmail] = useState(false);

    //modal
    const [modalVisibile, setModalVisibile] = useState(false)
    const [modalMesagetype, setModalMessageType] = useState('')
    const [modalHeaderText, setModalHeaderText] = useState('')
    const [modalMessage, setModalMessage] = useState('')
    const [modalButtonText, setModalButtonText] = useState('')

    const moveTo = (screen, payload = null) => {
        navigation.navigate(screen, {...payload});
    }

    const modalButtonHandler = () => {
        if (modalMesagetype == 'success'){
            moveTo("Login");
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

    const handleEmailVerification = async (credentials, setSubmitting) => {
        try 
        {
            setVerifying(true);
            //backend call
            setVerifying(false);
            return showModal('success', 'Verification Complete', 'Your account has been verified', 'Go to login');
        }
        catch (error) {
            setVerifying(false);
            return showModal('failed', 'Verification Failed', 'Your code was incorrect. Please try again.', 'Close');
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
            setResendingEmail(false);
            setResendStatus('Failed!');
        }
    }

    return (
    <MainContainer>
        <KeyboardAvoidingContainer>

            <IconHeader color={accent} name="lock-open" style={{ marginBottom: 30}}/> 

            <RegularText style={{marginBottom: 25,  textAlign: 'center'}}>
                Enter the 4-digit code sent to your email
            </RegularText>

            <StyledCodeInput maxLength={MAX_CODE_LENGTH} code={code} setCode={setCode} setPinReady={setPinReady}/>


            {!verifying && pinReady && <RegularButton onPress={handleEmailVerification}>Verify</RegularButton>}
            {!verifying && !pinReady && <RegularButton disabled={true} style={{backgroundColor: secondary}} textStyle={{color: lightGrey}}>Verify</RegularButton>}

            <ResendTimer 
                activeResend={activeResend} 
                setActiveResend={setActiveResend} 
                resendStatus={resendStatus} 
                resendingEmail={resendingEmail} 
                resendEmail={resendEmail}
                targetTimerInSeconds={20}
            />

            <MessageModel modalVisibile={modalVisibile} buttonHandler={modalButtonHandler} type={modalMesagetype} headerText={modalHeaderText} message={modalMessage} buttonText={modalButtonText}/>
        </KeyboardAvoidingContainer>
    </MainContainer>
    )
}

export default EmailVerification;
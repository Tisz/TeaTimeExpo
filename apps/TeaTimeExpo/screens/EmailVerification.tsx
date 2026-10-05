import React, { useState } from "react";
import MainContainer from "../components/Containers/MainContainer";
import KeyboardAvoidingContainer from "../components/Containers/KeyboardAvoidingContainer";
import RegularText from "../components/Texts/RegularText";
import RegularButton from "../components/Buttons/RegularButton";
import IconHeader from "../components/Icons/IconHeader";
import StyledCodeInput from "../components/Inputs/StyledCodeInput";
import ResendTimer from "../components/Timers/ResendTimer";
import MessageModel from "../components/Modals/MessageModal";
import { useTheme } from "styled-components/native";
import { ThemeType } from "../components/Colors/Colors";
import { UserAPI } from "../redux/api/userAPI";

const EmailVerification = ({ navigation, route }) => {
  const theme = useTheme() as ThemeType;
  const email = route?.params?.email ?? "";
  const username = route?.params?.username ?? "";

  const MAX_CODE_LENGTH = 6;
  const [code, setCode] = useState("");
  const [pinReady, setPinReady] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [activeResend, setActiveResend] = useState(false);
  const [resendStatus, setResendStatus] = useState("Resend");
  const [resendingEmail, setResendingEmail] = useState(false);

  //modal
  const [modalVisibile, setModalVisibile] = useState(false);
  const [modalMesagetype, setModalMessageType] = useState("");
  const [modalHeaderText, setModalHeaderText] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalButtonText, setModalButtonText] = useState("");

  const moveTo = (screen, payload = null) => {
    navigation.navigate(screen, { ...payload });
  };

  const modalButtonHandler = () => {
    if (modalMesagetype == "success") {
      moveTo("Login", { email, pendingUsername: username });
    }

    setModalVisibile(false);
  };

  const showModal = (type, headerText, message, buttonText) => {
    setModalMessageType(type);
    setModalHeaderText(headerText);
    setModalMessage(message);
    setModalButtonText(buttonText);
    setModalVisibile(true);
  };

  const handleEmailVerification = async () => {
    if (!email) {
      return showModal(
        "failed",
        "Missing Email",
        "Go back to signup and provide your email again.",
        "Close"
      );
    }

    try {
      setVerifying(true);
      await UserAPI.confirmSignup({ email, code });
      setVerifying(false);
      return showModal(
        "success",
        "Verification Complete",
        "Your account has been verified",
        "Go to login"
      );
    } catch (error: any) {
      setVerifying(false);
      return showModal(
        "failed",
        "Verification Failed",
        error?.message ?? "Your code was incorrect. Please try again.",
        "Close"
      );
    }
  };

  const resendEmail = async (triggerTimer) => {
    if (!email) {
      setResendStatus("Failed!");
      return;
    }

    try {
      setResendingEmail(true);
      await UserAPI.resendSignupCode(email);
      setResendStatus("Sent");

      setActiveResend(false);
      setResendingEmail(false);
      triggerTimer();

      setTimeout(() => {
        setResendStatus("Resend");
        setActiveResend(false);
      }, 5000);
    } catch {
      setResendingEmail(false);
      setResendStatus("Failed!");
    }
  };

  return (
    <MainContainer>
      <KeyboardAvoidingContainer>
        <IconHeader
          color={theme.accent}
          name="lock-open"
          style={{ marginBottom: 30 }}
        />

        <RegularText style={{ marginBottom: 25, textAlign: "center" }}>
          Enter the 6-digit code sent to your email
        </RegularText>

        <StyledCodeInput
          maxLength={MAX_CODE_LENGTH}
          code={code}
          setCode={setCode}
          setPinReady={setPinReady}
        />

        {!verifying && pinReady && (
          <RegularButton onPress={handleEmailVerification}>
            Verify
          </RegularButton>
        )}
        {!verifying && !pinReady && (
          <RegularButton
            disabled={true}
            style={{ backgroundColor: theme.secondary }}
            textStyle={{ color: theme.lightGrey }}
          >
            Verify
          </RegularButton>
        )}

        <ResendTimer
          activeResend={activeResend}
          setActiveResend={setActiveResend}
          resendStatus={resendStatus}
          resendingEmail={resendingEmail}
          resendEmail={resendEmail}
          targetTimerInSeconds={20}
        />

        <MessageModel
          modalVisibile={modalVisibile}
          buttonHandler={modalButtonHandler}
          type={modalMesagetype}
          headerText={modalHeaderText}
          message={modalMessage}
          buttonText={modalButtonText}
        />
      </KeyboardAvoidingContainer>
    </MainContainer>
  );
};

export default EmailVerification;

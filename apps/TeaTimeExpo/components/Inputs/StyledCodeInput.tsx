import React, {useRef,useState,useEffect} from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native'

const CodeInputSection = styled.View`
    flex: 1;
    align-items: center;
    justify-content: center;
    margin-vertical: 25px;
    `;

const CodeInputsContainer = styled.Pressable`
    width: 70%;
    flex-direction: row;
    justify-content: space-between;
`;

const CodeInput = styled.View`
    min-width: 10%;
    padding: 12px;
    border-bottom-width: 5px;
    border-radius: 10px;
    border-color: ${(props) => props.theme.secondary};
`;

const CodeInputText = styled.Text`
    font-size: 22px;
    font-weight: bold;
    text-align: center;
    color:  ${(props) => props.theme.tertiary};
`;

const CodeInputFocused = styled(CodeInput)`
    border-color:  ${(props) => props.theme.accent};
`;

interface StyledCodeInputProps {
    code: string;
    setCode: (value: string) => void;
    maxLength: number;
    setPinReady: (value: boolean) => void;
}

const StyledCodeInput = ({code, setCode, maxLength, setPinReady}: StyledCodeInputProps) => {

    const [inputContainerIsFocused, setInputContainerIsFocused] = useState(false);

    const codeDigitsArray = new Array(maxLength).fill(0);

    const textInputRef = useRef<TextInput | null>(null);

    const handleOnSubmitEditing = () => {
        setInputContainerIsFocused(false);
    }

    const handleOnPress = () => {
        setInputContainerIsFocused(true);
        textInputRef?.current?.focus();
    }

    useEffect(() => {
        //toggle pin ready
        setPinReady(code.length == maxLength);
        return () => setPinReady(false);
    }, [code])

    const toCodeDigitInput = (_value: number, index: number) => {
        const emptyInputChar = ' ';
        const digit = code[index] || emptyInputChar;

        //formatting
        const isCurrentDigit = index === code.length;
        const isLastDigit = index === maxLength - 1;
        const isCodeFull = code.length === maxLength;

        const isdigitFocused = isCurrentDigit || (isLastDigit && isCodeFull);

        const StyledCodeInput = inputContainerIsFocused && isdigitFocused ? CodeInputFocused : CodeInput;

        return (
            <StyledCodeInput key={index}>
                <CodeInputText>{digit}</CodeInputText>
            </StyledCodeInput>
        );
    };

    return <CodeInputSection>
        <CodeInputsContainer onPress={handleOnPress}>{ codeDigitsArray.map(toCodeDigitInput) }</CodeInputsContainer>
        <TextInput
            style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            textContentType="oneTimeCode"
            ref={textInputRef}
            value={code}
            onChangeText={setCode}
            maxLength={maxLength}
            onSubmitEditing={handleOnSubmitEditing}
            />
    </CodeInputSection>
}

export default StyledCodeInput;
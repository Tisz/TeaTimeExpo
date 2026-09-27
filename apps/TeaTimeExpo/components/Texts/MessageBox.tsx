import React from 'react';
import { TextProps } from 'react-native';
import styled from 'styled-components/native'

interface MessageBoxProps extends TextProps {
    success?: boolean;
}

const StyledText = styled.Text<{success?: boolean}>`
    font-size: 13px;
    color: ${(props) => (props.success ? props.theme.success : props.theme.fail)};
    text-align: center;
    `;


const MessageBox = (props: MessageBoxProps) => {
    return <StyledText {...props}>{props.children}</StyledText>
}

export default MessageBox;
import React from 'react';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
const { fail, success } = colors;

const StyledText = styled.Text`
    font-size: 13px;
    color: ${(props) => (props.success ? success : fail)};
    text-align: center;
    `;


const MessageBox = (props) => {
    return <StyledText {...props}>{props.children}</StyledText>
}

export default MessageBox;
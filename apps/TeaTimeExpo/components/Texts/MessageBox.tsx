import React from 'react';
import styled from 'styled-components/native'

const StyledText = styled.Text`
    font-size: 13px;
    color: ${(props) => (props.success ? props.theme.success : props.theme.fail)};
    text-align: center;
    `;


const MessageBox = (props) => {
    return <StyledText {...props}>{props.children}</StyledText>
}

export default MessageBox;
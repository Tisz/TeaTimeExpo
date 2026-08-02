import React from 'react';
import styled from 'styled-components/native'

const StyledText = styled.Text`
    font-size: 13px;
    color: ${(props) => props.theme.tertiary};
    text-align: left;
    `;


const SmallText = (props) => {
    return <StyledText {...props}>{props.children}</StyledText>
}

export default SmallText;
import React from 'react';
import styled from 'styled-components/native'

const StyledText = styled.Text`
    font-size: 15px;
    color: ${(props) => props.theme.tertiary};
    text-align: left;
    `;


const RegularText = (props) => {
    return <StyledText {...props}>{props.children}</StyledText>
}

export default RegularText;
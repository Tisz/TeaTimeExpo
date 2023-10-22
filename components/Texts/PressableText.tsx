import React from 'react';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import SmallText from '../Texts/SmallText';
const { accent } = colors;

const StylePressable = styled.Pressable`
    padding-vertical: 5px;
    align-self: center
    `;


const PressableText = (props) => {
    return <StylePressable onPress={props.onPress} {...props}>
        <SmallText style={{color: accent}}>{props.children}</SmallText>
        </StylePressable>
}

export default PressableText;
import React from 'react';
import styled from 'styled-components/native'
import SmallText from '../Texts/SmallText';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';

const StylePressable = styled.Pressable`
    padding-vertical: 5px;
    align-self: center
    `;


const PressableText = (props) => {
    const theme = useTheme() as ThemeType;
    return <StylePressable onPress={props.onPress} {...props}>
            <SmallText style={{color: theme.accent}}>{props.children}</SmallText>
        </StylePressable>
}

export default PressableText;
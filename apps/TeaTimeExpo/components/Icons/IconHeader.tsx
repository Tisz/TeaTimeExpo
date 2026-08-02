import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import styled from 'styled-components/native'
import { ScreenHeight } from '../shared';

const IconBackground = styled.View`
    background-color: ${(props) => props.theme.secondary};
    width: ${ScreenHeight * 0.10}px;
    height: ${ScreenHeight * 0.10}px;
    border-radius: ${ScreenHeight * 0.2}px;
    justify-content: center;
    align-items: center;
    align-self: center;
    `;


const IconHeader = ({name, color = null, ...props}) => {
    const theme = useTheme() as ThemeType;
    return <IconBackground style={{...props.style}} {...props}><MaterialCommunityIcons name={name} size={ScreenHeight * 0.05} color={color ? color : theme.accent}/></IconBackground>
}

export default IconHeader;
import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';

// styled components
import styled from 'styled-components/native'
import { ScreenHeight } from '../shared';
import { colors } from '../colors';
const { secondary, accent } = colors;

const IconBackground = styled.View`
    background-color: ${secondary};
    width: ${ScreenHeight * 0.10}px;
    height: ${ScreenHeight * 0.10}px;
    border-radius: ${ScreenHeight * 0.2}px;
    justify-content: center;
    align-items: center;
    align-self: center;
    `;


const IconHeader = ({name, color = accent, ...props}) => {
    return <IconBackground style={{...props.style}} {...props}><MaterialCommunityIcons name={name} size={ScreenHeight * 0.05} color={color ? color : accent}/></IconBackground>
}

export default IconHeader;
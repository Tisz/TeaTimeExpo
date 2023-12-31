import React, {useState} from 'react';
import { View } from 'react-native';

import {MaterialCommunityIcons} from '@expo/vector-icons';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import SmallText from '../Texts/SmallText';
const { primary, secondary, tertiary, accent, lightGrey } = colors;

const InputField = styled.TextInput`
    background-color: ${primary};
    padding: 10px;
    padding-left: 50px;
    padding-right: 55px;
    border-radius: 10px;
    font-size: 16px;
    height: 40px;
    margin-top: 3px;
    margin-bottom: 10px;
    color: ${tertiary};
    border-color: ${secondary}; 
    border-width: 2px;
    `;

const LeftIcon = styled.View`
    position: absolute;
    top: 25px;
    left: 5px;
    z-index: 1;
    border-right-width: 2px;
    border-color: ${secondary};
    padding-right: 4px;
`;


const SmallStyledTextInput = ({icon = null, label, ...props}) => {
    const [inputBackgroundColor, setInputBackgroundColor] = useState(primary);

    const customOnBlur = () => {
        props?.Onblur;
        setInputBackgroundColor(primary);
    }

    const customOnFocus = () => {
        props?.onFocus;
        setInputBackgroundColor(secondary);
    }

    return (<View>

        {icon != null && <LeftIcon>
            <MaterialCommunityIcons name={icon} size={30} color={accent}/>
        </LeftIcon>}


        <SmallText>{label}</SmallText>
        <InputField
            {...props}
            placeholderTextColor={lightGrey}
            style={{backgroundColor: inputBackgroundColor, ...props?.style}}
            onBlur={customOnBlur}
            onFocus={customOnFocus}
        />
    </View>)
}

export default SmallStyledTextInput;
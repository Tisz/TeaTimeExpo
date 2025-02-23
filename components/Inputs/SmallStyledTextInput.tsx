import React, {useState} from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import styled from 'styled-components/native'
import SmallText from '../Texts/SmallText';

const InputField = styled.TextInput`
    background-color: ${(props) => props.theme.primary};
    padding: 10px;
    padding-left: 50px;
    padding-right: 55px;
    border-radius: 10px;
    font-size: 16px;
    height: 40px;
    margin-top: 3px;
    margin-bottom: 10px;
    color: ${(props) => props.theme.tertiary};
    border-color: ${(props) => props.theme.secondary};
    border-width: 2px;
    `;

const LeftIcon = styled.View`
    position: absolute;
    top: 25px;
    left: 5px;
    z-index: 1;
    border-right-width: 2px;
    border-color: ${(props) => props.theme.secondary};
    padding-right: 4px;
`;


const SmallStyledTextInput = ({icon = null, label, ...props}) => {
    const theme = useTheme() as ThemeType;
    const [inputBackgroundColor, setInputBackgroundColor] = useState(theme.primary);

    const customOnBlur = () => {
        props?.Onblur;
        setInputBackgroundColor(theme.primary);
    }

    const customOnFocus = () => {
        props?.onFocus;
        setInputBackgroundColor(theme.secondary);
    }

    return (<View>

        {icon != null && <LeftIcon>
            <MaterialCommunityIcons name={icon} size={30} color={theme.accent}/>
        </LeftIcon>}


        <SmallText>{label}</SmallText>
        <InputField
            {...props}
            placeholderTextColor={theme.lightGrey}
            style={{backgroundColor: inputBackgroundColor, ...props?.style}}
            onBlur={customOnBlur}
            onFocus={customOnFocus}
        />
    </View>)
}

export default SmallStyledTextInput;
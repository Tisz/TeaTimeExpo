import React, {useState} from 'react';
import { View } from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import styled from 'styled-components/native'
import SmallText from '../Texts/SmallText';

const InputField = styled.TextInput`
    background-color: ${(props) => props.theme.primary};
    padding: 15px;
    padding-left: 65px;
    padding-right: 55px;
    border-radius: 10px;
    font-size: 16px;
    height: 60px;
    margin-top: 3px;
    margin-bottom: 10px;
    color: ${(props) => props.theme.tertiary};
    border-color: ${(props) => props.theme.secondary}; 
    border-width: 2px;
    `;

const LeftIcon = styled.View`
    position: absolute;
    top: 35px;
    left: 15px;
    z-index: 1;
    border-right-width: 2px;
    border-color: ${(props) => props.theme.secondary};
    padding-right: 10px;
`;

const RightIcon = styled.TouchableOpacity`
    position: absolute;
    top: 35px;
    right: 15px;
    z-index: 1;
`;


const StyledTextInput = ({icon = null, label, isPassword = false,
        overrideHeight=60, overrideFontSize=16, ...props}) => {
    const theme = useTheme() as ThemeType;
    const [inputBackgroundColor, setInputBackgroundColor] = useState(theme.primary);
    const [hidePassword, setHidePassword] = useState(true);

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
            style={{backgroundColor: inputBackgroundColor, height: overrideHeight, fontSize: overrideFontSize, ...props?.style}}
            onBlur={customOnBlur}
            onFocus={customOnFocus}
            secureTextEntry={isPassword && hidePassword}
        />
        {isPassword && 
            <RightIcon onPress={() => {
                setHidePassword(!hidePassword);
            }}>
                <MaterialCommunityIcons name={hidePassword ? 'eye-off' : 'eye'} size={30} color={theme.tertiary}/>
            </RightIcon>}

    </View>)
}

export default StyledTextInput;
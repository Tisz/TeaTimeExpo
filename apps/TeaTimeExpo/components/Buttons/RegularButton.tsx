import React from 'react';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import RegularText from '../Texts/RegularText';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';

const ButtonView = styled.TouchableOpacity`
    padding: 15px;
    background-color: ${(props) => props.theme.accent};
    width: 100%;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    height: 60px;
    `;


const RegularButton = (props) => {
    const theme = useTheme() as ThemeType;
    return <ButtonView onPress={props.onPress} {...props}>
        <RegularText style={[{color: theme.primary}, {...props?.textStyle}]}>{props.children}</RegularText>
        </ButtonView>
}

export default RegularButton;
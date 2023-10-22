import React from 'react';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import RegularText from '../Texts/RegularText';
const { primary, accent } = colors;

const ButtonView = styled.TouchableOpacity`
    padding: 15px;
    background-color: ${accent};
    width: 100%;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    height: 60px;
    `;


const RegularButton = (props) => {
    return <ButtonView onPress={props.onPress} {...props}>
        <RegularText style={[{color: primary}, {...props?.textStyle}]}>{props.children}</RegularText>
        </ButtonView>
}

export default RegularButton;
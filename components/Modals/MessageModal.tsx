import React from 'react';
import { Modal } from 'react-native'
import {MaterialCommunityIcons} from '@expo/vector-icons';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import BigText from '../Texts/BigText';
import RegularText from '../Texts/RegularText';
import RegularButton from '../Buttons/RegularButton';
const { primary, black, success, fail, tertiary } = colors;


export const ModalPressableContainer = styled.Pressable`
    flex: 1;
    padding: 25px;
    background-color: rgba(0, 0, 0, 0.7);
    justify-content: center;
    align-items: center;
    `;

export const ModalView = styled.View`
    background-color: ${primary};
    border-radius: 20px;
    width: 100%;
    padding: 35px;
    align-items: center;
    elevation: 5;
    shadow-color: ${black};
    shadow-offset: 0px 2px;
    shadow-opacity: 0.25;
    shadow-radius: 4px;
`

const BigTextCentered = styled(BigText)`
    align-items: center;
`

const MessageModel = ({modalVisibile, buttonHandler, type, headerText, message, buttonText}) => {
    return <Modal animationType='slide' visible={modalVisibile} transparent={true}>
        <ModalPressableContainer onPress={buttonHandler}>
            <ModalView>
                <MaterialCommunityIcons name={type == 'success' ? 'check-circle' : 'close-circle'} size={100} color={type == 'success' ? success : fail}/>
                <BigTextCentered style={{fontSize: 25, color: tertiary, marginVertical: 10, textAlign: "center"}}>{headerText}</BigTextCentered>
                <RegularText style={{marginBottom: 20}}>{message}</RegularText>
                <RegularButton onPress={buttonHandler}>{buttonText || 'Done'}</RegularButton>
            </ModalView>
        </ModalPressableContainer>
    </Modal>
}

export default MessageModel;
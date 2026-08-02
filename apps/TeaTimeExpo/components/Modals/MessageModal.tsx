import React from 'react';
import { Modal } from 'react-native'
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import styled from 'styled-components/native'
import BigText from '../Texts/BigText';
import RegularText from '../Texts/RegularText';
import RegularButton from '../Buttons/RegularButton';


export const ModalPressableContainer = styled.Pressable`
    flex: 1;
    padding: 25px;
    background-color: ${(props) => props.theme.black};
    justify-content: center;
    align-items: center;
    `;

export const ModalView = styled.View`
    background-color: ${(props) => props.theme.primary};
    border-radius: 20px;
    width: 100%;
    padding: 35px;
    align-items: center;
    elevation: 5;
    shadow-color: ${(props) => props.theme.black};
    shadow-offset: 0px 2px;
    shadow-opacity: 0.25;
    shadow-radius: 4px;
`

const BigTextCentered = styled(BigText)`
    align-items: center;
`

const MessageModel = ({modalVisibile, buttonHandler, type, headerText, message, buttonText}) => {
    const theme = useTheme() as ThemeType;
    return <Modal animationType='slide' visible={modalVisibile} transparent={true}>
        <ModalPressableContainer onPress={buttonHandler}>
            <ModalView>
                <MaterialCommunityIcons name={type == 'success' ? 'check-circle' : 'close-circle'} size={100} color={type == 'success' ? theme.success : theme.fail}/>
                <BigTextCentered style={{fontSize: 25, color: theme.tertiary, marginVertical: 10, textAlign: "center"}}>{headerText}</BigTextCentered>
                <RegularText style={{marginBottom: 20}}>{message}</RegularText>
                <RegularButton onPress={buttonHandler}>{buttonText || 'Done'}</RegularButton>
            </ModalView>
        </ModalPressableContainer>
    </Modal>
}

export default MessageModel;
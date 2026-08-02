import React from 'react';
import { Modal, ActivityIndicator } from 'react-native'
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import styled from 'styled-components/native'
import BigText from '../Texts/BigText';
import RegularButton from '../Buttons/RegularButton';

const StyledView = styled.View`
    background-color: ${(props) => props.theme.primary};
    flex-direction: column;
    height: 65px;
    width: 65px;
    border-radius: 15px;
    justify-content: center;
    align-items: center;
    border-width: 2px;
    border-color: ${(props) => props.theme.secondary};
`;

import { ModalView, ModalPressableContainer } from './MessageModal'

const ProfileModal = ({modalVisibile, buttonHandler, hideModal, headerText, loggingOut}) => {
    const theme = useTheme() as ThemeType;

    return <Modal animationType='slide' visible={modalVisibile} transparent={true}>
        <ModalPressableContainer onPress={hideModal}>
            <ModalView>
                <StyledView>
                    <MaterialCommunityIcons 
                        name={'account'} 
                        size={55} 
                        color={theme.accent}
                    />
                </StyledView>
                <BigText style={{fontSize: 25, color: theme.tertiary, marginVertical: 20, textAlign: "center"}}>{headerText}</BigText>

                {!loggingOut && <RegularButton onPress={buttonHandler}>{'Logout'}</RegularButton>}
                {loggingOut && <RegularButton disabled={true}>
                    <ActivityIndicator size="small" color={theme.primary}/>
                </RegularButton>}

            </ModalView>
        </ModalPressableContainer>
    </Modal>
}

export default ProfileModal;
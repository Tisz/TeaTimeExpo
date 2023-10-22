import React from 'react';
import { Modal, ActivityIndicator } from 'react-native'
import {MaterialCommunityIcons} from '@expo/vector-icons';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import BigText from '../Texts/BigText';
import RegularButton from '../Buttons/RegularButton';
const { primary, secondary, tertiary, accent } = colors;


const BigTextCentered = styled(BigText)`
    align-items: center;
`


const StyledView = styled.View`
    background-color: ${primary};
    flex-direction: column;
    height: 65px;
    width: 65px;
    border-radius: 15px;
    justify-content: center;
    align-items: center;
    border-width: 2px;
    border-color: ${secondary};
`;

import { ModalView, ModalPressableContainer } from './MessageModal'

const ProfileModal = ({modalVisibile, buttonHandler, hideModal, headerText, loggingOut}) => {
    return <Modal animationType='slide' visible={modalVisibile} transparent={true}>
        <ModalPressableContainer onPress={hideModal}>
            <ModalView>
                <StyledView>
                    <MaterialCommunityIcons 
                        name={'account'} 
                        size={55} 
                        color={accent}
                    />
                </StyledView>
                <BigText style={{fontSize: 25, color: tertiary, marginVertical: 20, textAlign: "center"}}>{headerText}</BigText>

                {!loggingOut && <RegularButton onPress={buttonHandler}>{'Logout'}</RegularButton>}
                {loggingOut && <RegularButton disabled={true}>
                    <ActivityIndicator size="small" color={primary}/>
                </RegularButton>}

            </ModalView>
        </ModalPressableContainer>
    </Modal>
}

export default ProfileModal;
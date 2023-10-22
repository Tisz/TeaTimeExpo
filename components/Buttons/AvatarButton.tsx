import React, {useContext, useState} from 'react';

import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// styled components
import styled from 'styled-components/native'
import { colors } from '../colors';
import ProfileModal from '../Modals/ProfileModal';
import { AuthContext } from '../../context/AuthContext';
const { primary, accent, secondary } = colors;

const StyledView = styled.TouchableOpacity`
    background-color: ${primary};
    flex-direction: column;
    height: 45px;
    width: 45px;
    border-radius: 15px;
    justify-content: center;
    align-items: center;
    border-width: 2px;
    border-color: ${secondary};
    `;

const AvatarButton = (props) => {
    //modal
    const [modalVisibile, setModalVisibile] = useState(false);
    const [modalHeaderText, setModalHeaderText] = useState('');
    const [authState, setAuthState] = useContext(AuthContext);

    const [loggingOut, setLoggingOut] = useState(false);

    const onLogout = async () => {
        setLoggingOut(true);

        //clear credentials 
        setAuthState({
            id:"",
            token:"", 
            signedIn:true,
        })

        setLoggingOut(false);
        setModalVisibile(false);
    }

    const hideModal = async () => {
        setModalVisibile(false);
    }

    const showProfileModal = (user) => {
        setModalHeaderText(user);
        setModalVisibile(true);
    }

    const onAvatarPress = () => {
        showProfileModal("Rhys White");
    }


    return (
        <>
        <StyledView onPress={onAvatarPress} style={props.imgContainerStyle}>
            <MaterialCommunityIcons name="account" size={35} color={accent}/>
        </StyledView>
        <ProfileModal 
            modalVisibile={modalVisibile} 
            headerText={modalHeaderText} 
            buttonHandler={onLogout} 
            hideModal={hideModal}
            loggingOut={loggingOut}/>
        </>
    )
}

export default AvatarButton;
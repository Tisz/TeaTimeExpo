import React, {useContext, useState} from 'react';
import { Image } from 'react-native';

import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import styled from 'styled-components/native'
import ProfileModal from '../Modals/ProfileModal';
import { AuthContext } from '../../context/AuthContext';
import { UserAPI } from '../../redux/api/userAPI';
import { useGetProfileQuery } from '../../redux/api/profileAPI';

const StyledView = styled.TouchableOpacity`
    background-color: ${(props) => props.theme.primary};
    flex-direction: column;
    height: 45px;
    width: 45px;
    border-radius: 15px;
    justify-content: center;
    align-items: center;
    border-width: 2px;
    border-color: ${(props) => props.theme.secondary};
    `;

const AvatarImage = styled(Image)`
    height: 41px;
    width: 41px;
    border-radius: 13px;
`;

const AvatarButton = (props) => {
    //modal
    const [modalVisibile, setModalVisibile] = useState(false);
    const [modalHeaderText, setModalHeaderText] = useState('');
    const { authState, setAuthState } = useContext(AuthContext);

    const [loggingOut, setLoggingOut] = useState(false);
    const { data: profile } = useGetProfileQuery();

    const theme = useTheme() as ThemeType;

    const onLogout = async () => {
        setLoggingOut(true);

        try {
            await UserAPI.logout();
        }
        finally {
            setAuthState({
                id:"",
                token:"", 
                signedIn:false,
            });

            setLoggingOut(false);
            setModalVisibile(false);
        }
    }

    const hideModal = async () => {
        setModalVisibile(false);
    }

    const showProfileModal = (user) => {
        setModalHeaderText(user);
        setModalVisibile(true);
    }

    const onAvatarPress = () => {
        showProfileModal(profile?.username ?? "Profile");
    }


    return (
        <>
        <StyledView onPress={onAvatarPress} style={props.imgContainerStyle}>
            {profile?.avatarUrl
                ? <AvatarImage source={{ uri: profile.avatarUrl }} accessibilityLabel="Profile photo" />
                : <MaterialCommunityIcons name="account" size={35} color={theme.accent}/>
            }
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
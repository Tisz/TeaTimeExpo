import React, {useContext, useState} from 'react';
import { Alert, Image } from 'react-native';

import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import styled from 'styled-components/native'
import ProfileModal from '../Modals/ProfileModal';
import { AuthContext } from '../../context/AuthContext';
import { UserAPI } from '../../redux/api/userAPI';
import { useDeleteProfileMutation, useGetProfileQuery } from '../../redux/api/profileAPI';
import { logError } from '../../utils/errorLogger';

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
    const [deleteProfile, { isLoading: deletingAccount }] = useDeleteProfileMutation();
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

    const deleteAccount = async () => {
        try {
            await deleteProfile().unwrap();
            await UserAPI.deleteAccount();
            setAuthState({
                id: "",
                token: "",
                signedIn: false,
            });
            setModalVisibile(false);
        }
        catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : 'Your account could not be deleted. Please try again.';
            Alert.alert('Could not delete account', message);
        }
    }

    const confirmAccountDeletion = () => {
        Alert.alert(
            'Delete account?',
            'Your profile and photo will be permanently deleted. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    style: 'destructive',
                    onPress: () => Alert.alert(
                        'Final confirmation',
                        'Delete your Tea Time account permanently?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
                        ],
                    ),
                },
            ],
        );
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

    const handleAvatarError = (error) => {
        logError('AvatarButton', 'load avatar', error.nativeEvent?.error ?? error, {
            avatarPath: profile?.avatarUrl?.split('?')[0],
        });
    }

    return (
        <>
        <StyledView onPress={onAvatarPress} style={props.imgContainerStyle}>
            {profile?.avatarUrl
                ? <AvatarImage source={{ uri: profile.avatarUrl }} accessibilityLabel="Profile photo" onError={handleAvatarError} />
                : <MaterialCommunityIcons name="account" size={35} color={theme.accent}/>
            }
        </StyledView>
        <ProfileModal 
            modalVisibile={modalVisibile} 
            headerText={modalHeaderText} 
            buttonHandler={onLogout} 
            deleteAccountHandler={confirmAccountDeletion}
            hideModal={hideModal}
            loggingOut={loggingOut}
            deletingAccount={deletingAccount}/>
        </>
    )
}

export default AvatarButton;
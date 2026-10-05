import React, {useCallback, useEffect, useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';
import BoolSettingsCard from '../components/Cards/BoolSettingsCard'
import styled from 'styled-components/native'
import { ActivityIndicator, Alert, Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { toggleTheme } from '../redux/slices/settingsSlice';
import {
    useCompleteAvatarUploadMutation,
    useCreateAvatarUploadUrlMutation,
    useDeleteAvatarMutation,
    useGetProfileQuery,
    useUpdateProfileMutation,
} from '../redux/api/profileAPI';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';
import { logError } from '../utils/errorLogger';

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (error && typeof error === 'object') {
        const requestError = error as { data?: unknown; error?: unknown; status?: unknown };

        if (typeof requestError.data === 'string' && requestError.data) {
            return requestError.data;
        }

        if (requestError.data && typeof requestError.data === 'object' && 'message' in requestError.data) {
            const message = (requestError.data as { message?: unknown }).message;
            if (typeof message === 'string' && message) {
                return message;
            }
        }

        if (typeof requestError.error === 'string' && requestError.error) {
            return requestError.error;
        }

        if (typeof requestError.status === 'number') {
            return `Request failed with status ${requestError.status}.`;
        }
    }

    return fallback;
};

const SettingsHeader = styled.View`
    background-color: ${(props) => props.theme.darkGrey};
    width: 100%;
    padding: 28px 25px 24px;
`;

const HeaderTitle = styled.Text`
    color: ${(props) => props.theme.white};
    font-size: 28px;
    font-weight: bold;
`;

const HeaderSubtitle = styled.Text`
    color: ${(props) => props.theme.white};
    font-size: 14px;
    margin-top: 5px;
    opacity: 0.85;
`;

const SettingsContent = styled.View`
    padding: 24px 20px 36px;
`;

const SectionTitle = styled.Text`
    color: ${(props) => props.theme.tertiary};
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
`;

const ProfileSummary = styled.View`
    align-items: center;
    flex-direction: row;
    margin-bottom: 20px;
`;

const ProfileDetails = styled.View`
    flex: 1;
    margin-left: 14px;
`;

const ProfileName = styled.Text`
    color: ${(props) => props.theme.tertiary};
    font-size: 17px;
    font-weight: bold;
`;

const ProfileLabel = styled.Text`
    color: ${(props) => props.theme.lightGrey};
    font-size: 13px;
    margin-top: 4px;
`;

const ProfileAvatarFallback = styled.View`
    align-items: center;
    background-color: ${(props) => props.theme.secondary};
    border-color: ${(props) => props.theme.accent};
    border-radius: 36px;
    border-width: 1px;
    height: 72px;
    justify-content: center;
    width: 72px;
`;

const UsernameInput = styled(TextInput)`
    background-color: ${(props) => props.theme.secondary};
    border-color: ${(props) => props.theme.lightGrey};
    border-radius: 10px;
    border-width: 1px;
    color: ${(props) => props.theme.tertiary};
    font-size: 16px;
    min-height: 48px;
    padding: 0 14px;
`;

const SaveButton = styled(TouchableOpacity)`
    align-items: center;
    background-color: ${(props) => props.theme.accent};
    border-radius: 10px;
    justify-content: center;
    margin-top: 12px;
    min-height: 44px;
`;

const SaveButtonText = styled.Text`
    color: ${(props) => props.theme.white};
    font-size: 16px;
    font-weight: bold;
`;

const HelperText = styled.Text`
    color: ${(props) => props.theme.lightGrey};
    font-size: 13px;
    margin-bottom: 16px;
    margin-top: 6px;
`;

const AvatarPreview = styled(Image)`
    border-radius: 36px;
    height: 72px;
    width: 72px;
`;

const SectionDivider = styled.View`
    background-color: ${(props) => props.theme.lightGrey};
    height: 1px;
    margin: 26px 0 22px;
    opacity: 0.35;
`;

const SecondaryButton = styled(TouchableOpacity)`
    align-items: center;
    border-color: ${(props) => props.theme.accent};
    border-radius: 10px;
    border-width: 1px;
    justify-content: center;
    margin-top: 10px;
    min-height: 44px;
`;

const SecondaryButtonText = styled.Text`
    color: ${(props) => props.theme.accent};
    font-size: 16px;
    font-weight: bold;
`;


const NotificationSettings = () => {
    const theme = useTheme() as ThemeType;
    const isDarkTheme = useSelector((state: RootState) => state.setting.isDarkMode);
    const appDispatch = useDispatch<AppDispatch>();

    const [alertsOn, setAlertsOn] = useState(false);
    const [username, setUsername] = useState('');
    const { data: profile, isLoading: isProfileLoading } = useGetProfileQuery();
    const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
    const [createAvatarUploadUrl, { isLoading: isPreparingAvatar }] = useCreateAvatarUploadUrlMutation();
    const [completeAvatarUpload, { isLoading: isCompletingAvatar }] = useCompleteAvatarUploadMutation();
    const [deleteAvatar, { isLoading: isDeletingAvatar }] = useDeleteAvatarMutation();

    useEffect(() => {
        if (profile?.username !== undefined) {
            setUsername(profile.username ?? '');
        }
    }, [profile?.username]);

    const handleToggleTheme = useCallback(() => {
        appDispatch(toggleTheme());
      }, [appDispatch]);

    const handleSaveUsername = useCallback(async () => {
        const trimmedUsername = username.trim();
        if (!trimmedUsername || trimmedUsername.length > 32) {
            Alert.alert('Invalid username', 'Use between 1 and 32 characters.');
            return;
        }

        try {
            await updateProfile({ username: trimmedUsername }).unwrap();
            setUsername(trimmedUsername);
            Alert.alert('Saved', 'Your username has been updated.');
        } catch (error) {
            logError('ProfileSettings', 'update username', error, { usernameLength: trimmedUsername.length });
            const message = getRequestErrorMessage(error, 'Unable to update your username.');
            Alert.alert('Could not save username', message);
        }
    }, [updateProfile, username]);

    const handleChooseAvatar = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled) {
            return;
        }

        const asset = result.assets[0];
        if (!asset.mimeType || !asset.fileSize) {
            Alert.alert('Unsupported image', 'Choose a JPEG, PNG, or WebP image under 5 MB.');
            return;
        }

        if (asset.fileSize > 5 * 1024 * 1024) {
            Alert.alert('Image too large', 'Choose an image smaller than 5 MB.');
            return;
        }

        try {
            const upload = await createAvatarUploadUrl({
                contentType: asset.mimeType,
                contentLength: asset.fileSize,
            }).unwrap();
            const uploadResponse = await FileSystem.uploadAsync(upload.uploadUrl, asset.uri, {
                httpMethod: 'PUT',
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                headers: { 'Content-Type': asset.mimeType },
            });

            if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
                const errorCode = uploadResponse.body.match(/<Code>([^<]+)<\/Code>/)?.[1];
                const requestId = uploadResponse.headers['x-amz-request-id'];
                const details = [
                    errorCode ? `S3 error: ${errorCode}` : null,
                    `HTTP ${uploadResponse.status}`,
                    requestId ? `request ID: ${requestId}` : null,
                ].filter(Boolean).join(', ');

                throw new Error(`The image upload was rejected (${details}).`);
            }

            await completeAvatarUpload({ objectKey: upload.objectKey }).unwrap();
            Alert.alert('Saved', 'Your profile photo has been updated.');
        } catch (error) {
            logError('ProfileSettings', 'update avatar', error, {
                contentLength: asset.fileSize,
                contentType: asset.mimeType,
            });
            const message = getRequestErrorMessage(error, 'Unable to update your profile photo.');
            Alert.alert('Could not update photo', message);
        }
    }, [completeAvatarUpload, createAvatarUploadUrl]);

    const handleDeleteAvatar = useCallback(async () => {
        try {
            await deleteAvatar().unwrap();
        } catch (error) {
            logError('ProfileSettings', 'delete avatar', error);
            Alert.alert('Could not remove photo', getRequestErrorMessage(error, 'Try again shortly.'));
        }
    }, [deleteAvatar]);

    const isAvatarBusy = isPreparingAvatar || isCompletingAvatar || isDeletingAvatar;

    return <MainContainer style={{padding: 0}}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 24}}>
            <SettingsHeader>
                <HeaderTitle>Settings</HeaderTitle>
                <HeaderSubtitle>Profile and preferences</HeaderSubtitle>
            </SettingsHeader>
            <SettingsContent>
            <SectionTitle>Profile</SectionTitle>
            <ProfileSummary>
                {profile?.avatarUrl
                    ? <AvatarPreview source={{ uri: profile.avatarUrl }} accessibilityLabel="Profile photo" />
                    : <ProfileAvatarFallback accessibilityLabel="Profile photo unavailable">
                        <MaterialCommunityIcons name="account" size={38} color={theme.accent} />
                    </ProfileAvatarFallback>
                }
                <ProfileDetails>
                    <ProfileName>{profile?.username || 'Your profile'}</ProfileName>
                    <ProfileLabel>Visible in local chat</ProfileLabel>
                </ProfileDetails>
            </ProfileSummary>
            <SaveButton
                onPress={handleChooseAvatar}
                disabled={isProfileLoading || isAvatarBusy}
                accessibilityRole="button"
                accessibilityLabel="Choose profile photo"
            >
                {isAvatarBusy ? <ActivityIndicator color={theme.white} /> : <SaveButtonText>Choose profile photo</SaveButtonText>}
            </SaveButton>
            {profile?.avatarUrl ? <SecondaryButton
                onPress={handleDeleteAvatar}
                disabled={isAvatarBusy}
                accessibilityRole="button"
                accessibilityLabel="Remove profile photo"
            >
                <SecondaryButtonText>Remove profile photo</SecondaryButtonText>
            </SecondaryButton> : null}
            <ProfileLabel style={{marginTop: 22, marginBottom: 8}}>Display name</ProfileLabel>
            <UsernameInput
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                placeholderTextColor={theme.lightGrey}
                maxLength={32}
                editable={!isProfileLoading && !isSaving}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <HelperText>Shown beside your messages in local chat.</HelperText>
            <SaveButton
                onPress={handleSaveUsername}
                disabled={isProfileLoading || isSaving}
                accessibilityRole="button"
                accessibilityLabel="Save username"
            >
                {isSaving ? <ActivityIndicator color={theme.white} /> : <SaveButtonText>Save username</SaveButtonText>}
            </SaveButton>
            <SectionDivider />
            <SectionTitle>Preferences</SectionTitle>
            <BoolSettingsCard icon="bell-check" title="Enable Notifications" value={alertsOn} onValueChange={() => setAlertsOn((alertsOn) => !alertsOn)} style={{marginBottom: 25}}/>
            <BoolSettingsCard icon="moon-waxing-crescent" title="Dark Mode" value={isDarkTheme} onValueChange={handleToggleTheme} style={{marginBottom: 25}}/>

            </SettingsContent>
        </ScrollView>
    </MainContainer>
}

export default NotificationSettings;
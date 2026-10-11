import React, { useCallback } from 'react';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';
import InfoCard from '../components/Cards/InfoCard';
import styled, { useTheme } from 'styled-components/native'
import { ScreenHeight } from '../components/shared';
import { useGetProfileQuery } from '../redux/api/profileAPI';
import { ThemeType } from '../components/Colors/Colors';

type DashboardNavigation = BottomTabNavigationProp<{
    Home: undefined;
    Chat: undefined;
    Settings: undefined;
}, 'Home'>;

const TopBackground = styled.View`
    background-color: ${(props) => props.theme.darkGrey};
    width: 100%;
    height: ${ScreenHeight * 0.3}px;
    border-radius: 30px;
    position: absolute;
    top: -30px;
    `;

const LoadingContainer = styled.View`
    flex: 1;
    align-items: center;
    justify-content: center;
`;

const LoadingText = styled.Text`
    color: ${(props) => props.theme.tertiary};
    font-size: 15px;
    margin-top: 12px;
`;

const GoToChatButton = styled.TouchableOpacity`
    align-items: center;
    background-color: ${(props) => props.theme.accent};
    border-radius: 12px;
    flex-direction: row;
    justify-content: center;
    margin-top: 4px;
    min-height: 50px;
    padding: 12px 16px;
`;

const GoToChatText = styled.Text`
    color: ${(props) => props.theme.white};
    font-size: 16px;
    font-weight: 600;
    margin-left: 8px;
`;


const formatChatRoomName = (roomId: string | null | undefined): string => {
    if (!roomId) {
        return 'No chats yet';
    }

    const [country, state, ...suburbParts] = roomId.split('#');
    if (!country || !state || suburbParts.length === 0) {
        return roomId;
    }

    const suburb = suburbParts
        .join(' ')
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ');

    return suburb;
};

const Dashboard = () => {
    const theme = useTheme() as ThemeType;
    const navigation = useNavigation<DashboardNavigation>();
    const { data: profile, isLoading, refetch } = useGetProfileQuery();
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const lastMessageDate = profile?.lastMessageAt
        ? `Last message ${new Date(profile.lastMessageAt).toLocaleDateString()}`
        : 'Send a message to begin';

    return <MainContainer style={{paddingTop: 0, paddingLeft: 0, paddingRight: 0}}>
        <TopBackground/>
        <MainContainer style={{backgroundColor: 'transparent'}}>
            {isLoading ? (
                <LoadingContainer accessibilityRole="progressbar" accessibilityLabel="Loading dashboard">
                    <ActivityIndicator size="large" color={theme.accent} />
                    <LoadingText>Loading dashboard...</LoadingText>
                </LoadingContainer>
            ) : (
                <>
                    <BigText style={{marginBottom: 25, fontWeight: 'bold' }}>Hello {profile?.username || 'there'}</BigText>
                    <InfoCard
                        icon="forum"
                        title="Last Chatroom"
                        value={formatChatRoomName(profile?.lastChatRoomId)}
                        date={lastMessageDate}
                        style={{marginBottom: 25}}
                    />
                    <InfoCard
                        icon="message-arrow-right"
                        title="Messages Sent"
                        value={String(profile?.messageCount ?? 0)}
                        date="All time"
                        style={{marginBottom: 25}}
                    />
                    <GoToChatButton
                        onPress={() => navigation.navigate('Chat')}
                        accessibilityRole="button"
                        accessibilityLabel="Go to chat"
                    >
                        <MaterialCommunityIcons name="chat" size={20} color={theme.white} />
                        <GoToChatText>Go to chat</GoToChatText>
                    </GoToChatButton>
                </>
            )}
        </MainContainer>
    </MainContainer>
}

export default Dashboard;
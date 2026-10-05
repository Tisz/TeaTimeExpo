import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';
import InfoCard from '../components/Cards/InfoCard';
import styled from 'styled-components/native'
import { ScreenHeight } from '../components/shared';
import { useGetProfileQuery } from '../redux/api/profileAPI';

const TopBackground = styled.View`
    background-color: ${(props) => props.theme.darkGrey};
    width: 100%;
    height: ${ScreenHeight * 0.3}px;
    border-radius: 30px;
    position: absolute;
    top: -30px;
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
    const { data: profile, refetch } = useGetProfileQuery();
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
        </MainContainer>
    </MainContainer>
}

export default Dashboard;
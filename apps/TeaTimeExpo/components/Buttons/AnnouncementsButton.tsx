import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';
import { Announcement, useGetAnnouncementsQuery } from '../../redux/api/announcementsAPI';
import { logError } from '../../utils/errorLogger';

const HeaderButton = styled.TouchableOpacity`
  align-items: center;
  background-color: ${(props) => props.theme.secondary};
  border-radius: 15px;
  height: 45px;
  justify-content: center;
  margin-right: 12px;
  width: 45px;
`;

const Backdrop = styled(Pressable)`
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
  flex: 1;
  justify-content: center;
  padding: 20px;
`;

const Panel = styled.View`
  background-color: ${(props) => props.theme.primary};
  border-radius: 20px;
  flex-shrink: 1;
  padding: 22px;
`;

const ModalHeader = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ModalTitle = styled.Text`
  color: ${(props) => props.theme.tertiary};
  flex: 1;
  font-size: 24px;
  font-weight: bold;
`;

const CloseButton = styled.TouchableOpacity`
  align-items: center;
  height: 40px;
  justify-content: center;
  margin-left: 10px;
  width: 40px;
`;

const AnnouncementCard = styled.View`
  background-color: ${(props) => props.theme.secondary};
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 16px;
`;

const AnnouncementTitle = styled.Text`
  color: ${(props) => props.theme.tertiary};
  font-size: 17px;
  font-weight: bold;
`;

const AnnouncementDate = styled.Text`
  color: ${(props) => props.theme.lightGrey};
  font-size: 12px;
  margin-top: 5px;
`;

const AnnouncementText = styled.Text`
  color: ${(props) => props.theme.tertiary};
  font-size: 15px;
  line-height: 22px;
  margin-top: 12px;
`;

const StatusContainer = styled.View`
  align-items: center;
  padding: 28px 12px;
`;

const StatusText = styled.Text`
  color: ${(props) => props.theme.lightGrey};
  font-size: 15px;
  margin-top: 10px;
  text-align: center;
`;

const RetryButton = styled.TouchableOpacity`
  align-items: center;
  align-self: center;
  background-color: ${(props) => props.theme.accent};
  border-radius: 9px;
  margin-top: 12px;
  padding: 10px 18px;
`;

const RetryText = styled.Text`
  color: ${(props) => props.theme.white};
  font-size: 14px;
  font-weight: 600;
`;

const formatPublishedDate = (publishedAt: string): string => {
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? publishedAt : date.toLocaleDateString();
};

const AnnouncementsButton = () => {
  const theme = useTheme() as ThemeType;
  const { height: windowHeight } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(false);
  const {
    data,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useGetAnnouncementsQuery(undefined, { refetchOnMountOrArgChange: true });

  React.useEffect(() => {
    if (error) {
      logError('AnnouncementsButton', 'load announcements', error);
    }
  }, [error]);

  const openAnnouncements = () => {
    setModalVisible(true);
    void refetch();
  };

  const renderAnnouncement = (announcement: Announcement) => (
    <AnnouncementCard key={announcement.id}>
      <AnnouncementTitle>{announcement.title}</AnnouncementTitle>
      <AnnouncementDate>{formatPublishedDate(announcement.publishedAt)}</AnnouncementDate>
      <AnnouncementText>{announcement.text}</AnnouncementText>
    </AnnouncementCard>
  );

  return (
    <>
      <HeaderButton
        onPress={openAnnouncements}
        accessibilityRole="button"
        accessibilityLabel="View announcements"
      >
        <MaterialCommunityIcons name="bullhorn-outline" size={25} color={theme.accent} />
      </HeaderButton>
      <Modal
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        transparent
        visible={modalVisible}
      >
        <Backdrop onPress={() => setModalVisible(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ maxHeight: windowHeight * 0.8, width: '100%' }}
          >
            <Panel>
              <ModalHeader>
                <ModalTitle>Announcements</ModalTitle>
                <CloseButton
                  onPress={() => setModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close announcements"
                >
                  <MaterialCommunityIcons name="close" size={26} color={theme.tertiary} />
                </CloseButton>
              </ModalHeader>
              {isLoading || (isFetching && !data) ? (
                <StatusContainer>
                  <ActivityIndicator color={theme.accent} />
                  <StatusText>Loading announcements...</StatusText>
                </StatusContainer>
              ) : error && !data ? (
                <StatusContainer>
                  <StatusText>Announcements couldn't be loaded. Check your connection and try again.</StatusText>
                  <RetryButton onPress={() => void refetch()}>
                    <RetryText>Try again</RetryText>
                  </RetryButton>
                </StatusContainer>
              ) : data?.announcements.length ? (
                <ScrollView>
                  {data.announcements.map(renderAnnouncement)}
                </ScrollView>
              ) : (
                <StatusContainer>
                  <MaterialCommunityIcons name="bullhorn-outline" size={36} color={theme.lightGrey} />
                  <StatusText>No announcements right now.</StatusText>
                </StatusContainer>
              )}
              {error && data && (
                <StatusText>Couldn't refresh announcements. Showing the last loaded list.</StatusText>
              )}
            </Panel>
          </Pressable>
        </Backdrop>
      </Modal>
    </>
  );
};

export default AnnouncementsButton;

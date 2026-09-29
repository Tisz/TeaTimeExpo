
import MainContainer from '../components/Containers/MainContainer';
import styled from 'styled-components/native'
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import React, { useState, useRef } from 'react';
import { Platform, KeyboardAvoidingView, SafeAreaView, TouchableWithoutFeedback, Keyboard, FlatList, Image } from 'react-native';
import { useSuburbSocket } from '../hooks/useSuburbSocket';
import { ChatMessage } from '../data/types/ChatMessage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../components/Colors/Colors';

const MessageList = styled(FlatList<ChatMessage>).attrs({
  contentContainerStyle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
})``;

const MessageContainer = styled.View<{ isUser: boolean }>`
  flex: 1;
  margin-vertical: 4px;
  max-width: 82%;
`;

const MessageRow = styled.View<{ isUser: boolean }>`
  align-items: flex-end;
  flex-direction: ${props => (props.isUser ? 'row-reverse' : 'row')};
  max-width: 100%;
`;

const AvatarImage = styled(Image)`
  border-radius: 16px;
  height: 32px;
  margin: 0 8px;
  width: 32px;
`;

const AvatarFallback = styled.View`
  align-items: center;
  background-color: ${(props) => props.theme.secondary};
  border-radius: 16px;
  height: 32px;
  justify-content: center;
  margin: 0 8px;
  width: 32px;
`;

const MessageBubble = styled.View<{ isUser: boolean }>`
  background-color: ${props => (props.isUser ? props.theme.darkAccent : props.theme.secondary)};
  padding: 11px 14px 9px;
  border-radius: 16px;
  border-bottom-right-radius: ${props => (props.isUser ? '5px' : '16px')};
  border-bottom-left-radius: ${props => (props.isUser ? '16px' : '5px')};
  elevation: 2;
  shadow-color: ${(props) => props.theme.black};
  shadow-offset: 0px 1px;
  shadow-opacity: 0.15;
  shadow-radius: 2px;
`;

const MessageText = styled.Text<{ isUser: boolean }>`
  color: ${props => (props.isUser ? props.theme.white : props.theme.tertiary)};
  font-size: 16px;
  line-height: 22px;
`;

const MessageAuthor = styled.Text<{ isUser: boolean }>`
  color: ${(props) => props.theme.lightGrey};
  font-size: 12px;
  margin-bottom: 2px;
  margin-left: ${(props) => props.isUser ? '0px' : '8px'};
  text-align: ${(props) => props.isUser ? 'right' : 'left'};
`;

const MessageTimestamp = styled.Text<{ isUser: boolean }>`
  align-self: flex-end;
  margin-top: 3px;
  color: ${props => (props.isUser ? props.theme.white : props.theme.lightGrey)};
  font-size: 11px;
  opacity: 0.75;
`;

const InputContainer = styled.View`
  flex-direction: row;
  padding: 10px 12px;
  border-top-width: 1px;
  border-color: ${(props) => props.theme.lightGrey};
  background-color: ${(props) => props.theme.secondary};
  elevation: 6;
  shadow-color: ${(props) => props.theme.black};
  shadow-offset: 0px -2px;
  shadow-opacity: 0.12;
  shadow-radius: 4px;
`;

const StyledTextInput = styled.TextInput<{ isFocused: boolean }>`
  flex: 1;
  min-height: 46px;
  max-height: 100px;
  background-color: ${(props) => props.theme.primary};
  color: ${(props) => props.theme.tertiary};
  padding: 10px 16px;
  border-radius: 20px;
  border-width: 1px;
  border-color: ${(props) => props.isFocused ? props.theme.accent : props.theme.lightGrey};
`;

const SendButton = styled.TouchableOpacity`
  width: 46px;
  height: 46px;
  margin-left: 8px;
  border-radius: 23px;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.accent};
`;

const StatusHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: ${(props) => props.theme.secondary};
`;

const RoomText = styled.Text`
  flex: 1;
  color: ${(props) => props.theme.tertiary};
  font-size: 13px;
  font-weight: 600;
`;

const StatusPill = styled.View<{ statusColor: string }>`
  flex-direction: row;
  align-items: center;
  margin-left: 8px;
  padding: 5px 9px;
  border-radius: 12px;
  background-color: ${(props) => props.statusColor};
`;

const StatusPillText = styled.Text`
  color: ${(props) => props.theme.white};
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
`;

const ErrorText = styled.Text`
  padding: 8px 16px;
  color: ${(props) => props.theme.fail};
  background-color: ${(props) => props.theme.secondary};
  font-size: 13px;
`;

const formatMessageTime = (messageTime: string): string => {
  const parsedTime = new Date(messageTime);
  return Number.isNaN(parsedTime.getTime())
    ? ''
    : parsedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const Chatroom = () => {
    const theme = useTheme() as ThemeType;
    const messages = useSelector((state: RootState) => state.chat.chatHistory);
    const roomDisplay = useSelector((state: RootState) => state.chat.roomDisplay);
    const { socketStatus, activeRoomId, locationError, sendMessage } = useSuburbSocket();

    const [input, setInput] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef<FlatList<ChatMessage>>(null);

    const statusColor = socketStatus === 'connected'
      ? theme.success
      : socketStatus === 'error'
        ? theme.fail
        : theme.accent;

    const handleSend = () => {
        if (!input.trim()) return;

        const sent = sendMessage(input);
        if (sent) {
            setInput('');
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 120}
                >
                    <MainContainer style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
                        <StatusHeader>
                          <RoomText>{roomDisplay || activeRoomId || 'Resolving location'}</RoomText>
                          <StatusPill statusColor={statusColor}>
                            <StatusPillText>{socketStatus}</StatusPillText>
                          </StatusPill>
                        </StatusHeader>
                        {!!locationError && <ErrorText>{locationError}</ErrorText>}
                        <MainContainer style={{backgroundColor: 'transparent', paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: 0}}>
                            <MessageList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(_, index) => index.toString()}
                                renderItem={({ item }) => (
                                  <MessageRow isUser={item.sender === 'user'}>
                                    {item.avatarUrl
                                      ? <AvatarImage source={{ uri: item.avatarUrl }} accessibilityLabel={`${item.username}'s profile photo`} />
                                      : <AvatarFallback accessibilityLabel={`${item.username}'s profile photo unavailable`}>
                                          <MaterialCommunityIcons name="account" size={19} color={theme.accent} />
                                        </AvatarFallback>
                                    }
                                    <MessageContainer isUser={item.sender === 'user'}>
                                      <MessageAuthor isUser={item.sender === 'user'}>{item.username}</MessageAuthor>
                                      <MessageBubble isUser={item.sender === 'user'}>
                                      <MessageText isUser={item.sender === 'user'}>{item.message}</MessageText>
                                      {!!formatMessageTime(item.messageTime) && (
                                        <MessageTimestamp isUser={item.sender === 'user'}>
                                          {formatMessageTime(item.messageTime)}
                                        </MessageTimestamp>
                                      )}
                                      </MessageBubble>
                                    </MessageContainer>
                                  </MessageRow>
                                )}
                            />

                            <InputContainer>
                                <StyledTextInput
                                  isFocused={isInputFocused}
                                    value={input}
                                    onChangeText={setInput}
                                    placeholder="Type a message..."
                                  placeholderTextColor={theme.lightGrey}
                                  onFocus={() => setIsInputFocused(true)}
                                  onBlur={() => setIsInputFocused(false)}
                                    onSubmitEditing={handleSend}
                                    returnKeyType="send"
                                />
                                <SendButton
                                    onPress={handleSend}
                                    accessibilityRole="button"
                                    accessibilityLabel="Send message"
                                >
                                    <MaterialCommunityIcons name="send" size={22} color={theme.white} />
                                  </SendButton>
                            </InputContainer>
                        </MainContainer>
                    </MainContainer>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

export default Chatroom;
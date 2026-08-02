
import MainContainer from '../components/Containers/MainContainer';
import styled from 'styled-components/native'
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import React, { useState, useRef } from 'react';
import { Platform, KeyboardAvoidingView, SafeAreaView, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import { useSuburbSocket } from '../hooks/useSuburbSocket';
import { ChatMessage } from '../data/types/ChatMessage';

const Container = styled.View`
  flex: 1;
  background-color: #f5f5f5;
`;

const MessageList = styled(FlatList<ChatMessage>).attrs({
  contentContainerStyle: {
    paddingLeft: 15,
    paddingRight: 15
  },
})``;

const MessageContainer = styled.View<{ isUser: boolean }>`
  align-self: ${props => (props.isUser ? 'flex-end' : 'flex-start')};
  margin-vertical: 4px;
`;

const MessageBubble = styled.View<{ isUser: boolean }>`
  background-color: ${props => (props.isUser ? '#0078fe' : '#e5e5ea')};
  padding: 10px 14px;
  border-radius: 16px;
  max-width: 75%;
`;

const MessageText = styled.Text`
  color: #000;
`;

const InputContainer = styled.View`
  flex-direction: row;
  padding: 10px;
  border-top-width: 1px;
  border-color: ${(props) => props.theme.darkGrey};
  background-color: ${(props) => props.theme.primary};
`;

const StyledTextInput = styled.TextInput`
  flex: 1;
  background-color: ${(props) => props.theme.lightGrey};
  color: ${(props) => props.theme.tertiary};
  padding: 10px;
  border-radius: 20px;
`;

const StatusText = styled.Text`
  padding: 8px 14px;
  color: ${(props) => props.theme.tertiary};
`;

const Chatroom = () => {
    const messages = useSelector((state: RootState) => state.chat.chatHistory);
    const channelId = useSelector((state: RootState) => state.chat.channelName);
    const { socketStatus, activeSuburb, locationError, sendMessage } = useSuburbSocket();

    const [input, setInput] = useState('');
    const flatListRef = useRef<FlatList<ChatMessage>>(null);

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
                        <StatusText>
                            {`Room: ${activeSuburb || channelId} | Socket: ${socketStatus}`}
                        </StatusText>
                        {!!locationError && <StatusText>{locationError}</StatusText>}
                        <MainContainer style={{backgroundColor: 'transparent', paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: 0}}>
                            <MessageList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(_, index) => index.toString()}
                                renderItem={({ item }) => (
                                <MessageContainer isUser={item.sender === 'user'}>
                                    <MessageBubble isUser={item.sender === 'user'}>
                                        <MessageText>{item.message}</MessageText>
                                    </MessageBubble>
                                </MessageContainer>
                                )}
                            />

                            <InputContainer>
                                <StyledTextInput
                                    value={input}
                                    onChangeText={setInput}
                                    placeholder="Type a message..."
                                    onSubmitEditing={handleSend}
                                    returnKeyType="send"
                                />
                            </InputContainer>
                        </MainContainer>
                    </MainContainer>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

export default Chatroom;
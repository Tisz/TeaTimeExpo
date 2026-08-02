import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../data/types/ChatMessage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatState {
    channelName: string;
    chatHistory: ChatMessage[];
}

const initialState: ChatState = {
    channelName: "general",
    chatHistory: [],
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setChannelName: (state, action: PayloadAction<string>) => {
            state.channelName = action.payload;
            state.chatHistory = []; // clear history on channel switch
        },
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.chatHistory.push(action.payload);
        },
        clearChatHistory: (state) => {
            state.chatHistory = [];
        },
    },
});

export const { setChannelName, addMessage, clearChatHistory } = chatSlice.actions;
export default chatSlice.reducer;
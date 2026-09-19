import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../data/types/ChatMessage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatState {
    roomId: string;
    roomDisplay: string;
    chatHistory: ChatMessage[];
}

const initialState: ChatState = {
    roomId: "",
    roomDisplay: "",
    chatHistory: [],
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setRoom: (state, action: PayloadAction<{ roomId: string; display: string }>) => {
            state.roomId = action.payload.roomId;
            state.roomDisplay = action.payload.display;
            state.chatHistory = []; // clear history on channel switch
        },
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            if (state.chatHistory.some((message) => message.messageId === action.payload.messageId)) {
                return;
            }
            state.chatHistory.push(action.payload);
        },
        setMessageHistory: (state, action: PayloadAction<ChatMessage[]>) => {
            state.chatHistory = action.payload;
        },
        clearChatHistory: (state) => {
            state.chatHistory = [];
        },
    },
});

export const { setRoom, addMessage, setMessageHistory, clearChatHistory } = chatSlice.actions;
export default chatSlice.reducer;
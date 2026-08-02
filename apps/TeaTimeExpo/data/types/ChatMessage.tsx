export type ChatMessage = {
  username: string;
  message: string;
  messageTime: string;
  sender: 'user' | 'other';
};
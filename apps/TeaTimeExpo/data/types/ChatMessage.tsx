export type ChatMessage = {
  messageId: string;
  username: string;
  message: string;
  messageTime: string;
  sender: 'user' | 'other';
};
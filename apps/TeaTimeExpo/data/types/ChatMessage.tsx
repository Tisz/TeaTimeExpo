export type ChatMessage = {
  messageId: string;
  username: string;
  avatarUrl?: string | null;
  message: string;
  messageTime: string;
  sender: 'user' | 'other';
};
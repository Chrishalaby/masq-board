export interface CopilotConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: CopilotMessage[];
}

export interface CopilotMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

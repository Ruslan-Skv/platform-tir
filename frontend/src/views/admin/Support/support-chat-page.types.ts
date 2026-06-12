export interface Conversation {
  id: string;
  userId: string;
  assignedToId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  assignedTo: { id: string; firstName: string | null; lastName: string | null } | null;
  messages: { content: string; createdAt: string }[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
}

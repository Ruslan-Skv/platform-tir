import { type Socket, io } from 'socket.io-client';

import type { MessengerMessage } from './admin-messenger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function socketBaseUrl(): string {
  try {
    const u = new URL(API_URL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3001';
  }
}

export type MessengerSocketHandlers = {
  onMessageNew?: (message: MessengerMessage) => void;
  onConversationUpdated?: (payload: unknown) => void;
};

export function connectMessengerSocket(handlers: MessengerSocketHandlers = {}): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('admin_token');
  if (!token) return null;

  const socket = io(`${socketBaseUrl()}/messenger`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  if (handlers.onMessageNew) {
    socket.on('message:new', handlers.onMessageNew);
  }
  if (handlers.onConversationUpdated) {
    socket.on('conversation:updated', handlers.onConversationUpdated);
  }

  return socket;
}

export function joinMessengerConversation(socket: Socket | null, conversationId: string) {
  if (!socket) return;
  socket.emit('conversation:join', { conversationId });
}

export function leaveMessengerConversation(socket: Socket | null, conversationId: string) {
  if (!socket) return;
  socket.emit('conversation:leave', { conversationId });
}

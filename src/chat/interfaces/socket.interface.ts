import { JsonValue } from '@prisma/client/runtime/library';
import { Socket } from 'socket.io';

export interface SocketMessage {
  type:
    | 'message'
    | 'typing'
    | 'read_receipt'
    | 'chat_update'
    | 'error'
    | 'ping'
    | 'pong';
  data: SocketMessageData;
  timestamp: number;
  messageId?: string;
}

export interface SocketMessageData {
  chatId?: string;
  content?: string;
  agentId?: string;
  messageId?: string;
  userId?: string;
  isTyping?: boolean;
  messageIds?: string[];
  confirmed?: boolean;
  action?: 'join' | 'leave';
  updates?: {
    title?: string;
    messageCount?: number;
    lastMessage?: string;
  };
  message?: {
    id: string;
    chatId: string;
    userId: string;
    agentId: string;
    content: string;
    role: string;
    timestamp: string;
    metadata: JsonValue;
  };
  timestamp?: number;
  errorMessage?: string;
  code?: number;
}

export interface ConnectionInfo {
  userId: number;
  ws: Socket;
  joinedChats: Set<string>;
  lastPing: number;
  connectionId: string;
}

export interface ChatRoom {
  chatId: string;
  connections: Set<string>;
}

export interface TypingEvent {
  chatId: string;
  userId: string;
  agentId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  chatId: string;
  messageIds: string[];
  userId: string;
}

export interface ChatUpdateEvent {
  chatId: string;
  action: 'join' | 'leave';
}

export interface MessageEvent {
  chatId: string;
  content: string;
  agentId: string;
  messageId: string;
}

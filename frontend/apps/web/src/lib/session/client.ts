// Session Management Client for ORION-CORE Chat
// Handles session persistence, retrieval, and management

export interface ChatSession {
  sessionId: string;
  userId: string;
  title: string;
  firstMessage: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const API_BASE = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

/**
 * Create a new chat session
 */
export async function createSession(userId: string, firstMessage?: string): Promise<ChatSession> {
  const response = await fetch(`${API_BASE}/api/sessions/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, firstMessage }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  const response = await fetch(`${API_BASE}/api/sessions/list?userId=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.sessions || [];
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const response = await fetch(`${API_BASE}/api/sessions/get?sessionId=${sessionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Get all messages for a session
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE}/api/sessions/messages?sessionId=${sessionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Save a message to a session
 */
export async function saveMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE}/api/sessions/save-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Failed to save message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update session metadata (title, last message, etc.)
 */
export async function updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession> {
  const response = await fetch(`${API_BASE}/api/sessions/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...updates }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a session and all its messages
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/sessions/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a unique user ID (stored in localStorage)
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'server_user';
  }

  let userId = localStorage.getItem('orion_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('orion_user_id', userId);
  }
  return userId;
}

/**
 * Get or create current session ID
 */
export function getCurrentSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server_session';
  }

  let sessionId = sessionStorage.getItem('orion_current_session');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('orion_current_session', sessionId);
  }
  return sessionId;
}

/**
 * Set current session ID
 */
export function setCurrentSessionId(sessionId: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('orion_current_session', sessionId);
  }
}

/**
 * Clear current session (start new conversation)
 */
export function clearCurrentSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('orion_current_session');
  }
}


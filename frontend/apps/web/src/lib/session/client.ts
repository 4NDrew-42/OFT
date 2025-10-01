/**
 * Session Management Client (HTTP-only)
 * 
 * This client makes HTTP fetch() calls to the ORION-CORE backend API.
 * NO direct Redis or database connections - backend handles all persistence.
 * 
 * Backend: http://192.168.50.79:3002 (ORION-CORE web-portal)
 */

// Types
export interface ChatSession {
  sessionId: string;
  userId: string;
  title: string;
  firstMessage: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Backend API base URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_SESSION_API || 'http://192.168.50.79:3002';

/**
 * Create a new chat session
 */
export async function createSession(userId: string, firstMessage?: string): Promise<ChatSession> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, firstMessage: firstMessage || '' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Create session error:', error);
    throw error;
  }
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/sessions/list?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Get sessions error:', error);
    return [];
  }
}

/**
 * Get all messages for a session
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/sessions/messages?sessionId=${encodeURIComponent(sessionId)}`);

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
}

/**
 * Save a message to a session
 */
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, any>
): Promise<ChatMessage> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/sessions/save-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, role, content, metadata }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Save message error:', error);
    throw error;
  }
}

/**
 * Delete a session and all its messages
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/sessions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Delete session error:', error);
    throw error;
  }
}

// ============================================================================
// LOCAL STORAGE HELPERS (NO REDIS - localStorage only for client-side state)
// ============================================================================

/**
 * Get user ID from localStorage or generate new one
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'server-user';
  
  let userId = localStorage.getItem('orion-user-id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('orion-user-id', userId);
  }
  return userId;
}

/**
 * Get current active session ID from localStorage
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('orion-current-session-id');
}

/**
 * Set current active session ID in localStorage
 */
export function setCurrentSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('orion-current-session-id', sessionId);
}

/**
 * Clear current session from localStorage
 */
export function clearCurrentSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('orion-current-session-id');
}


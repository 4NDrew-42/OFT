/**
 * Session Management Client - SECURED
 *
 * CRITICAL SECURITY UPDATE:
 * - All calls now go through internal Next.js API routes (/api/sessions/*)
 * - Session authentication enforced server-side
 * - No direct backend calls with caller-supplied userId
 * - Single-user authorization enforced
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

/**
 * Options for filtering sessions by date range
 */
export interface SessionFilterOptions {
  /** Start date of the range (inclusive) */
  startDate?: Date;
  /** End date of the range (inclusive) */
  endDate?: Date;
  /** Maximum number of sessions to return */
  limit?: number;
  /** Field to sort by */
  sortBy?: 'createdAt' | 'updatedAt';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}


// CRITICAL: Use internal API routes (authenticated proxies)
const INTERNAL_API_BASE = '/api/sessions';

/**
 * Create a new chat session
 *
 * CRITICAL: No userId parameter - enforced server-side via session
 */
export async function createSession(firstMessage?: string): Promise<ChatSession> {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstMessage: firstMessage || '' }),
      credentials: 'same-origin', // CRITICAL: Include cookies for authentication
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
 * Get all sessions for the authenticated user with optional date filtering
 *
 * CRITICAL: No userId parameter - enforced server-side via session
 *
 * @param options - Optional filtering and sorting options
 * @returns Array of chat sessions matching the criteria
 *
 * @example
 * ```typescript
 * // Get all sessions
 * const sessions = await getUserSessions();
 *
 * // Get sessions from yesterday
 * const yesterday = subDays(new Date(), 1);
 * const sessions = await getUserSessions({
 *   startDate: startOfDay(yesterday),
 *   endDate: endOfDay(yesterday),
 *   limit: 20
 * });
 * ```
 */
export async function getUserSessions(
  options?: SessionFilterOptions
): Promise<ChatSession[]> {
  try {
    const params = new URLSearchParams();
    
    // Add optional date filtering parameters
    if (options?.startDate) {
      params.set('startDate', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params.set('endDate', options.endDate.toISOString());
    }
    if (options?.limit) {
      params.set('limit', options.limit.toString());
    }
    if (options?.sortBy) {
      params.set('sortBy', options.sortBy);
    }
    if (options?.sortOrder) {
      params.set('sortOrder', options.sortOrder);
    }
    
    const response = await fetch(`${INTERNAL_API_BASE}/list?${params.toString()}`, {
      credentials: 'same-origin', // CRITICAL: Include cookies for authentication
    });

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
 *
 * CRITICAL: Session ownership verified server-side
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/messages?sessionId=${encodeURIComponent(sessionId)}`, {
      credentials: 'same-origin', // CRITICAL: Include cookies for authentication
    });

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
    const response = await fetch(`/api/sessions/save-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, role, content, metadata }),
      credentials: 'same-origin', // CRITICAL: Include cookies for authentication
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
    const response = await fetch(`/api/sessions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      credentials: 'same-origin', // CRITICAL: Include cookies for authentication
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


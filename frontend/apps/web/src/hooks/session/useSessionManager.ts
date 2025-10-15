/**
 * Session Manager Hook
 * 
 * Manages single-session-per-user with multiple chat histories
 * Syncs across devices via server-side session management
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatHistory {
  conversationId: string;
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
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SessionState {
  sessionId: string | null;
  userId: string | null;
  currentConversationId: string | null;
  chatHistories: ChatHistory[];
  currentMessages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

const API_BASE = '/api/sessions';
const SYNC_INTERVAL = 10000; // Sync every 10 seconds for cross-device updates

export function useSessionManager(userId: string) {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    userId: null,
    currentConversationId: null,
    chatHistories: [],
    currentMessages: [],
    isLoading: true,
    error: null,
  });
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Initialize session on mount
   */
  useEffect(() => {
    if (userId) {
      initializeSession();
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [userId]);
  
  /**
   * Initialize user session and load chat histories
   */
  const initializeSession = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get or create user session
      const sessionResponse = await fetch(`${API_BASE}/user-session`);
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to initialize session');
      }
      
      const sessionData = await sessionResponse.json();
      
      // Load chat histories
      const historiesResponse = await fetch(`${API_BASE}/chat-histories`);
      
      if (!historiesResponse.ok) {
        throw new Error('Failed to load chat histories');
      }
      
      const historiesData = await historiesResponse.json();
      
      setState(prev => ({
        ...prev,
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        chatHistories: historiesData.histories || [],
        isLoading: false,
      }));
      
      // Start sync interval for cross-device updates
      startSyncInterval();
      
      console.log('✅ Session initialized:', sessionData.sessionId);
      
    } catch (error) {
      console.error('Session initialization error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };
  
  /**
   * Start interval to sync chat histories across devices
   */
  const startSyncInterval = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    syncIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/chat-histories`);
        
        if (response.ok) {
          const data = await response.json();
          
          setState(prev => ({
            ...prev,
            chatHistories: data.histories || [],
          }));
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }, SYNC_INTERVAL);
  };
  
  /**
   * Create new chat history
   */
  const createChatHistory = useCallback(async (title?: string, firstMessage?: string) => {
    try {
      const response = await fetch(`${API_BASE}/chat-history/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, firstMessage }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat history');
      }
      
      const newHistory = await response.json();
      
      setState(prev => ({
        ...prev,
        chatHistories: [newHistory, ...prev.chatHistories],
        currentConversationId: newHistory.conversationId,
        currentMessages: [],
      }));
      
      console.log('✅ Created chat history:', newHistory.conversationId);
      return newHistory;
      
    } catch (error) {
      console.error('Create chat history error:', error);
      throw error;
    }
  }, []);
  
  /**
   * Switch to a different chat history
   */
  const switchChatHistory = useCallback(async (conversationId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch(`${API_BASE}/chat-history/${conversationId}/messages`);
      
      if (!response.ok) {
        throw new Error('Failed to load chat messages');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        currentConversationId: conversationId,
        currentMessages: data.messages || [],
        isLoading: false,
      }));
      
      console.log('✅ Switched to chat history:', conversationId);
      
    } catch (error) {
      console.error('Switch chat history error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);
  
  /**
   * Delete a chat history
   */
  const deleteChatHistory = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/chat-history/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete chat history');
      }
      
      setState(prev => ({
        ...prev,
        chatHistories: prev.chatHistories.filter(h => h.conversationId !== conversationId),
        currentConversationId: prev.currentConversationId === conversationId ? null : prev.currentConversationId,
        currentMessages: prev.currentConversationId === conversationId ? [] : prev.currentMessages,
      }));
      
      console.log('✅ Deleted chat history:', conversationId);
      
    } catch (error) {
      console.error('Delete chat history error:', error);
      throw error;
    }
  }, []);
  
  /**
   * Update chat history title
   */
  const updateChatTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const response = await fetch(`${API_BASE}/chat-history/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update chat title');
      }
      
      setState(prev => ({
        ...prev,
        chatHistories: prev.chatHistories.map(h =>
          h.conversationId === conversationId ? { ...h, title } : h
        ),
      }));
      
      console.log('✅ Updated chat title:', conversationId);
      
    } catch (error) {
      console.error('Update chat title error:', error);
      throw error;
    }
  }, []);
  
  /**
   * Save a message to current chat history
   */
  const saveMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ) => {
    if (!state.currentConversationId) {
      throw new Error('No active conversation');
    }
    
    try {
      const response = await fetch(
        `${API_BASE}/chat-history/${state.currentConversationId}/message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, content, metadata }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to save message');
      }
      
      const message = await response.json();
      
      setState(prev => ({
        ...prev,
        currentMessages: [...prev.currentMessages, message],
      }));
      
      return message;
      
    } catch (error) {
      console.error('Save message error:', error);
      throw error;
    }
  }, [state.currentConversationId]);
  
  return {
    ...state,
    initializeSession,
    createChatHistory,
    switchChatHistory,
    deleteChatHistory,
    updateChatTitle,
    saveMessage,
  };
}


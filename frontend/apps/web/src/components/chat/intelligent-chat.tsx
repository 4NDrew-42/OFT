/**
 * Intelligent Chat Component
 * Replicates ORION-CORE's Intelligent Chat system with mobile optimization
 * Features: Gemini 2.5 Flash, RAG integration, conversation memory
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, Database, Cpu, Zap, Clock, Sparkles, History, Trash2, Copy, Check, ChevronDown, Plus, ShieldAlert, LogOut } from 'lucide-react';
import { GlassPanel, GlassButton, GlassInput, GlassCard, StatusIndicator, NebulaBackground } from '@/components/ui/glass-components';
import { cn } from '@/lib/utils';
import { useEnhancedChatStream } from '@/hooks/useEnhancedChatStream';
import { useSession, signOut } from 'next-auth/react';
import { getUserSessions, getSessionMessages, saveMessage, createSession, setCurrentSessionId, getCurrentSessionId, clearCurrentSession, deleteSession, type ChatSession as SessionType } from '@/lib/session/client';
import { parseTemporalQuery, extractTemporalContext } from '@/lib/temporal/parser';
import { isAuthorizedUser, getAuthorizedUserEmail } from '@/lib/session/identity';

// Types
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: RAGSource[];
  metadata?: ChatMetadata;
}

interface RAGSource {
  id: string;
  content: string;
  category: string;
  relevance: number;
  source: string;
}

interface ChatMetadata {
  tokens: number;
  confidence: number;
  processingTime: number;
  ragMemoriesUsed: number;
  provider: string;
}

interface ChatSession {
  sessionId: string;
  messageCount: number;
  conversationMemory: boolean;
  createdAt: string;
}

type ChatProvider = 'gemini' | 'deepseek';

// Main Intelligent Chat Component
export const IntelligentChat: React.FC = () => {
  const { data: sessionData } = useSession();
  const userEmail = sessionData?.user?.email || '';

  // Initialize all hooks BEFORE any conditional returns (Rules of Hooks)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentProvider, setCurrentProvider] = useState<ChatProvider>('gemini');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'connecting' | 'online' | 'error'>('connecting');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionType[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Use the real enhanced chat stream hook
  const {
    buffer,
    isStreaming,
    error: streamError,
    start: startStream,
    stop: stopStream,
    clearBuffer,
    switchProvider,
    currentProvider: streamProvider
  } = useEnhancedChatStream(userEmail, { provider: currentProvider });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load persisted messages on mount
  useEffect(() => {
    if (userEmail) {
      const savedMessages = localStorage.getItem(`chat-messages-${userEmail}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          setMessages(parsedMessages);
        } catch (error) {
          console.error('Failed to load saved messages:', error);
        }
      }
      initializeSession();
    }
  }, [userEmail]);

  // Persist messages to localStorage
  useEffect(() => {
    if (userEmail && messages.length > 0) {
      localStorage.setItem(`chat-messages-${userEmail}`, JSON.stringify(messages));
    }
  }, [messages, userEmail]);

  // Load session history from backend (useCallback must be before useEffect that uses it)
  const loadSessionHistory = useCallback(async () => {
    if (!userEmail) return;
    try {
      const userId = getUserId();
      const sessions = await getUserSessions(userId);
      setSessionHistory(sessions);
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  }, [userEmail]);

  // Handle streaming response
  useEffect(() => {
    if (!buffer || isStreaming) return;

    // Stream completed, add the full response as a message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'assistant',
      content: buffer,
      timestamp: Date.now(),
      sources: [],
      metadata: {
        tokens: buffer.length,
        confidence: 0.9,
        processingTime: 1.0,
        ragMemoriesUsed: 0,
        provider: streamProvider
      }
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Save assistant message to backend session (async, don't await)
    const currentSessionId = getCurrentSessionId();
    if (currentSessionId && userEmail) {
      saveMessage(currentSessionId, 'assistant', buffer, {
        tokens: buffer.length,
        provider: streamProvider
      }).then(() => {
        console.log('Assistant message saved to session:', currentSessionId);
        loadSessionHistory().catch(err => console.error('Failed to refresh history:', err));
      }).catch(error => {
        console.error('Failed to save assistant message:', error);
      });
    }

    clearBuffer();
  }, [buffer, isStreaming, streamProvider, userEmail, loadSessionHistory, clearBuffer]);

  // Load session history on mount
  useEffect(() => {
    if (userEmail) {
      loadSessionHistory();
    }
  }, [userEmail, loadSessionHistory]);

  // Helper function to get stable user ID
  const getUserId = () => {
    if (!userEmail) throw new Error('No user email available');
    return userEmail.toLowerCase().trim();
  };

  // CRITICAL: Single-user access control (after ALL hooks)
  if (!isAuthorizedUser(userEmail)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="w-16 h-16 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-4">
            This chat interface is restricted to authorized users only.
          </p>
          <p className="text-sm text-gray-400">
            Current user: <span className="font-mono">{userEmail || 'Not signed in'}</span>
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Authorized user: <span className="font-mono">{getAuthorizedUserEmail()}</span>
          </p>
        </GlassCard>
      </div>
    );
  }

  const initializeSession = async () => {
    try {
      // TODO: Replace with actual API call
      const mockSession: ChatSession = {
        sessionId: `session_${Date.now()}`,
        messageCount: 0,
        conversationMemory: true,
        createdAt: new Date().toISOString()
      };
      setSession(mockSession);
      setSystemStatus('online');
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setSystemStatus('error');
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !userEmail) return;

    const messageContent = inputValue.trim();
    
    // Extract temporal context from query
    const { temporal, cleanedQuery } = extractTemporalContext(messageContent);
    let contextPrefix = "";
    let enhancedMessage = messageContent;
    
    // If temporal query detected with high confidence, fetch relevant sessions
    if (temporal && temporal.confidence >= 0.7) {
      try {
        const userId = getUserId();
        const sessions = await getUserSessions(userId, {
          startDate: temporal.startDate,
          endDate: temporal.endDate,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        
        if (sessions.length > 0) {
          // Build context from sessions
          const sessionSummaries = sessions.map(s => {
            const date = new Date(s.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const title = s.title || (s.firstMessage ? s.firstMessage.substring(0, 50) : 'Untitled');
            return `- "${title}" (${s.messageCount} messages, ${date})`;
          }).join('\n');
          
          contextPrefix = `Based on our conversation history from ${temporal.description}, here is what we discussed:\n\n${sessionSummaries}\n\nNow, regarding your question: `;
          enhancedMessage = contextPrefix + cleanedQuery;
          
          console.log(`✅ Temporal query detected: ${temporal.description}`, {
            sessionsFound: sessions.length,
            dateRange: { start: temporal.startDate, end: temporal.endDate }
          });
        } else {
          contextPrefix = `I do not have any conversation history from ${temporal.description}. `;
          enhancedMessage = contextPrefix + cleanedQuery;
          
          console.log(`ℹ️ Temporal query detected but no sessions found: ${temporal.description}`);
        }
      } catch (error) {
        console.error('Error fetching temporal sessions:', error);
        // Fall back to original message on error
        enhancedMessage = messageContent;
      }
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: messageContent, // Show original message to user
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Save message to backend session
    const currentSessionId = getCurrentSessionId();
    if (currentSessionId && userEmail) {
      try {
        await saveMessage(currentSessionId, 'user', messageContent, {
          temporalContext: temporal ? {
            description: temporal.description,
            startDate: temporal.startDate.toISOString(),
            endDate: temporal.endDate.toISOString(),
            confidence: temporal.confidence
          } : undefined
        });
        console.log('User message saved to session:', currentSessionId);
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    } else if (userEmail) {
      // Create new session with first message
      try {
        const userId = getUserId();
        const newSession = await createSession(userId, messageContent);
        setCurrentSessionId(newSession.sessionId);
        console.log('Created new session with first message:', newSession.sessionId);
        await loadSessionHistory();
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    }

    // Clear previous buffer and start streaming
    clearBuffer();

    try {
      // Pass last 10 messages as conversation history for context
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.type,
        content: m.content
      }));
      
      // Use enhanced message (with temporal context) for streaming
      await startStream(enhancedMessage, { 
        provider: currentProvider,
        conversationHistory: recentMessages
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };



  // Provider switching functionality
  const handleProviderSwitch = (provider: ChatProvider) => {
    setCurrentProvider(provider);
    switchProvider(provider);
  };

  const clearChat = () => {
    setMessages([]);
    if (userEmail) {
      localStorage.removeItem(`chat-messages-${userEmail}`);
    }
    if (session) {
      setSession({
        ...session,
        messageCount: 0
      });
    }
    // Also clear any streaming buffer
    clearBuffer();
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowSessionHistory(false);
    if (userEmail) {
      localStorage.removeItem(`chat-messages-${userEmail}`);
    }
    clearBuffer();
  };

  // ============================================================================
  // SESSION MANAGEMENT (HTTP-only - calls ORION-CORE backend)
  // ============================================================================

  // Load messages from a specific session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      console.log('Loading messages for session:', sessionId);
      const msgs = await getSessionMessages(sessionId);
      console.log('Loaded messages:', msgs.length);
      if (msgs.length > 0) {
        setMessages(msgs.map(m => ({
          id: m.id,
          type: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).getTime(),
          ...(m.metadata && { metadata: m.metadata as any })
        })));
      } else {
        // Clear messages if session has no messages
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  };

  // Switch to a different session
  const handleLoadSession = async (sessionId: string) => {
    console.log('Switching to session:', sessionId);
    setCurrentSessionId(sessionId);
    await loadSessionMessages(sessionId);
    setShowSessionHistory(false);
  };

  // Delete a session with confirmation
  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering handleLoadSession
    
    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }
    
    try {
      await deleteSession(sessionId);
      console.log('Session deleted:', sessionId);
      
      // Remove from local state
      setSessionHistory(prev => prev.filter(s => s.sessionId !== sessionId));
      
      // If deleted session was current, create new session
      if (sessionId === getCurrentSessionId()) {
        clearCurrentSession();
        setMessages([]);
        if (userEmail) {
          // Don't create session immediately, wait for first message
          console.log('Deleted current session, cleared messages');
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // Create new session via backend
  const handleNewChatWithSession = async () => {
    if (!userEmail) {
      // Fallback to original behavior if no user
      handleNewChat();
      return;
    }
    
    clearCurrentSession();
    const userId = getUserId();
    try {
      const newSession = await createSession(userId, '');
      setCurrentSessionId(newSession.sessionId);
      setMessages([]);
      await loadSessionHistory();
      setShowSessionHistory(false);
    } catch (error) {
      console.error('Failed to create new session:', error);
      // Fallback to original behavior
      handleNewChat();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Clear local session state
      clearCurrentSession();
      setMessages([]);
      setSessionHistory([]);
      // Sign out with NextAuth and redirect to home
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <NebulaBackground variant="chat" className="p-4">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Compact Header with Session History */}
        <GlassPanel variant="nav" className="mb-4 py-2 px-3 sm:px-4">
          <div className="flex justify-between items-center">
            {/* Left: Title + Connection Status */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              <h1 className="text-base sm:text-lg font-bold text-white">ORION Chat</h1>
              <div className={cn(
                "w-2 h-2 rounded-full",
                systemStatus === 'online' ? 'bg-green-400 animate-pulse' :
                systemStatus === 'error' ? 'bg-red-400' :
                'bg-yellow-400 animate-pulse'
              )} title={systemStatus === 'online' ? 'Connected' : systemStatus === 'connecting' ? 'Connecting' : 'Error'} />
            </div>

            {/* Right: Session History + Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Session History Dropdown */}
              <div className="relative">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                  title="Session history"
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm flex items-center gap-1"
                >
                  <History className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">History</span>
                  <span className="sm:hidden">{messages.length}</span>
                  <ChevronDown className="w-3 h-3" />
                </GlassButton>

                {showSessionHistory && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-gray-900/95 backdrop-blur-md border border-blue-500/40 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden">
                    <div className="p-3 border-b border-blue-500/20 flex justify-between items-center">
                      <h3 className="font-semibold text-white text-sm">Chat History</h3>
                      <GlassButton
                        variant="primary"
                        size="sm"
                        onClick={handleNewChatWithSession}
                        className="px-2 py-1 text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        New
                      </GlassButton>
                    </div>
<div className="overflow-y-auto max-h-80 p-2">
                      {sessionHistory.length === 0 ? (
                        <div className="text-sm text-gray-400 p-4 text-center">
                          No previous chats
                        </div>
                      ) : (
                        sessionHistory.map((sess) => (
                          <div
                            key={sess.sessionId}
                            className={`relative group border-b border-gray-800/50 hover:bg-blue-500/10 transition-colors ${
                              sess.sessionId === getCurrentSessionId() ? 'bg-blue-500/20' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleLoadSession(sess.sessionId)}
                              className="w-full text-left p-3 pr-10"
                            >
                              <div className="font-medium text-white text-sm truncate">{sess.title || 'Untitled Chat'}</div>
                              <div className="text-xs text-gray-300 truncate mt-1">{sess.lastMessage || sess.firstMessage}</div>
                              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                <span>{sess.messageCount} messages</span>
                                <span>{new Date(sess.updatedAt).toLocaleDateString()}</span>
                              </div>
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(sess.sessionId, e)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
                title="Toggle metadata"
                className="hidden sm:flex"
              >
                Details
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </GlassButton>

              {/* Logout Button */}
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm flex items-center gap-1"
                aria-label="Sign out"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </GlassButton>
            </div>
          </div>
        </GlassPanel>

        {/* Messages Area */}
        <GlassPanel className="flex-1 overflow-hidden mb-4">
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-white/60 mt-8">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                <h3 className="text-lg font-semibold mb-2 text-white">ORION Intelligent Chat</h3>
                <p className="mb-2">Claude-like AI assistant with sophisticated reasoning</p>
                <div className="text-sm space-y-1">
                  <p>🧠 Powered by Gemini 2.5 Flash</p>
                  <p>📚 Access to 245 ORION-CORE memories</p>
                  <p>💬 Long-term conversation memory</p>
                  <p>🔧 Intelligent tool integration</p>
                  <p>⚡ Real-time RAG with source attribution</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showMetadata={showMetadata}
                />
              ))
            )}
            
            {isStreaming && (
              <div className="flex items-center gap-2 text-white/60">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-sm">Streaming response...</span>
              </div>
            )}

            {/* Show current streaming buffer */}
            {isStreaming && buffer && (
              <div className="flex justify-start">
                <div className="max-w-[80%] mr-12">
                  <GlassCard variant="elevated" className="bg-white/5 border-white/10">
                    <div className="whitespace-pre-wrap text-white text-sm leading-relaxed select-text">
                      {buffer}
                      <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </GlassPanel>

        {/* Input Area */}
        <GlassPanel className="p-4">
          <div className="flex items-center gap-2">
            <GlassInput
              ref={inputRef}
              variant="chat"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={systemStatus === 'online' ? 'Ask me anything about ORION-CORE...' : 'Connecting...'}
              disabled={isStreaming || systemStatus !== 'online' || !userEmail}
              className="flex-1"
            />
            <GlassButton
              onClick={sendMessage}
              disabled={!inputValue.trim() || isStreaming || systemStatus !== 'online' || !userEmail}
              size="md"
              variant="primary"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </GlassButton>
          </div>
        </GlassPanel>
      </div>
    </NebulaBackground>
  );
};

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage;
  showMetadata: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showMetadata }) => {
  const isUser = message.type === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%]', isUser ? 'ml-12' : 'mr-12')}>
        <GlassCard
          variant={isUser ? 'default' : 'elevated'}
          className={cn(
            'relative group',
            isUser
              ? 'bg-blue-500/20 border-blue-400/30'
              : 'bg-white/5 border-white/10'
          )}
        >
          {/* Copy button for assistant messages */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white/80"
              title={copied ? 'Copied!' : 'Copy response'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <div className="whitespace-pre-wrap text-white text-sm leading-relaxed select-text">
            {message.content}
          </div>
          
          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-white/60 mb-2">Sources:</div>
              <div className="space-y-1">
                {message.sources.map((source) => (
                  <div key={source.id} className="text-xs text-white/50 bg-white/5 rounded p-2">
                    <div className="font-medium">{source.category}</div>
                    <div className="truncate">{source.content}</div>
                    <div className="text-white/40">Relevance: {(source.relevance * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Metadata */}
          {showMetadata && message.metadata && (
            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-white/60">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Tokens: {message.metadata.tokens}
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Confidence: {(message.metadata.confidence * 100).toFixed(0)}%
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time: {message.metadata.processingTime}s
              </div>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                RAG: {message.metadata.ragMemoriesUsed}
              </div>
            </div>
          )}
          
          <div className="mt-2 text-xs text-white/40">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default IntelligentChat;

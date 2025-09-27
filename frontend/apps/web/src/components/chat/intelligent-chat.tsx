/**
 * Intelligent Chat Component
 * Replicates ORION-CORE's Intelligent Chat system with mobile optimization
 * Features: Gemini 2.5 Flash, RAG integration, conversation memory
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Database, Cpu, Zap, Clock, Sparkles, History, Trash2, Copy, Check } from 'lucide-react';
import { GlassPanel, GlassButton, GlassInput, GlassCard, StatusIndicator, NebulaBackground } from '@/components/ui/glass-components';
import { cn } from '@/lib/utils';
import { useEnhancedChatStream } from '@/hooks/useEnhancedChatStream';
import { useSession } from 'next-auth/react';

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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentProvider, setCurrentProvider] = useState<ChatProvider>('gemini');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'connecting' | 'online' | 'error'>('connecting');

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

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputValue.trim();
    setInputValue('');

    // Clear previous buffer and start streaming
    clearBuffer();

    try {
      await startStream(messageContent, { provider: currentProvider });
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

  // Handle streaming response
  useEffect(() => {
    if (buffer && !isStreaming) {
      // Stream completed, add the full response as a message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        type: 'assistant',
        content: buffer,
        timestamp: Date.now(),
        // TODO: Parse sources and metadata from buffer if available
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
      clearBuffer();
    }
  }, [buffer, isStreaming, streamProvider, clearBuffer]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <NebulaBackground variant="chat" className="p-4">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <GlassPanel variant="nav" className="mb-4 p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold text-white">ORION Intelligent Chat</h1>
              <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                Gemini 2.5
              </span>
              <StatusIndicator
                status={systemStatus === 'connecting' ? 'loading' : systemStatus}
                label={systemStatus === 'online' ? 'Connected' : systemStatus === 'connecting' ? 'Connecting' : 'Error'}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
                title="Toggle metadata"
              >
                Show Details
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </GlassButton>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center justify-between text-sm text-white/70">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Brain className="w-4 h-4" />
                Messages: {messages.length}
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4" />
                Session: {session?.sessionId.slice(-8) || 'Loading...'}
              </span>
            </div>
            <div className="text-xs">
              Powered by ORION-CORE Intelligent Orchestrator
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

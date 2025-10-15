/**
 * Chat History Sidebar Component
 * 
 * Displays list of chat histories with create/switch/delete functionality
 * Syncs across devices automatically
 */

import React, { useState } from 'react';
import { useSessionManager, ChatHistory } from '@/hooks/session/useSessionManager';

interface ChatHistorySidebarProps {
  userId: string;
  onChatSelect?: (conversationId: string) => void;
}

export function ChatHistorySidebar({ userId, onChatSelect }: ChatHistorySidebarProps) {
  const {
    sessionId,
    currentConversationId,
    chatHistories,
    isLoading,
    error,
    createChatHistory,
    switchChatHistory,
    deleteChatHistory,
    updateChatTitle,
  } = useSessionManager(userId);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  /**
   * Handle creating new chat
   */
  const handleCreateChat = async () => {
    try {
      setIsCreating(true);
      const newChat = await createChatHistory();
      
      if (onChatSelect) {
        onChatSelect(newChat.conversationId);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create new chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  /**
   * Handle switching to a chat
   */
  const handleSelectChat = async (conversationId: string) => {
    try {
      await switchChatHistory(conversationId);
      
      if (onChatSelect) {
        onChatSelect(conversationId);
      }
    } catch (error) {
      console.error('Failed to switch chat:', error);
      alert('Failed to load chat. Please try again.');
    }
  };
  
  /**
   * Handle deleting a chat
   */
  const handleDeleteChat = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
      return;
    }
    
    try {
      await deleteChatHistory(conversationId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };
  
  /**
   * Handle editing chat title
   */
  const handleStartEdit = (chat: ChatHistory, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(chat.conversationId);
    setEditTitle(chat.title);
  };
  
  const handleSaveEdit = async (conversationId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      await updateChatTitle(conversationId, editTitle.trim());
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update title:', error);
      alert('Failed to update title. Please try again.');
    }
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };
  
  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };
  
  if (isLoading && !sessionId) {
    return (
      <div className="chat-history-sidebar loading">
        <div className="loading-spinner">Loading session...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="chat-history-sidebar error">
        <div className="error-message">
          <p>Failed to load session</p>
          <p className="error-details">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-history-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2>Chat History</h2>
        <button
          className="new-chat-button"
          onClick={handleCreateChat}
          disabled={isCreating}
          aria-label="Create new chat"
        >
          {isCreating ? '...' : '+ New Chat'}
        </button>
      </div>
      
      {/* Session Info */}
      <div className="session-info">
        <div className="session-status">
          <span className="status-indicator active" title="Session active"></span>
          <span className="session-text">Synced across devices</span>
        </div>
      </div>
      
      {/* Chat List */}
      <div className="chat-list">
        {chatHistories.length === 0 ? (
          <div className="empty-state">
            <p>No chat histories yet</p>
            <p className="empty-hint">Click "New Chat" to start</p>
          </div>
        ) : (
          chatHistories.map((chat) => (
            <div
              key={chat.conversationId}
              className={`chat-item ${
                chat.conversationId === currentConversationId ? 'active' : ''
              }`}
              onClick={() => handleSelectChat(chat.conversationId)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSelectChat(chat.conversationId);
              }}
            >
              {/* Title */}
              <div className="chat-title-container">
                {editingId === chat.conversationId ? (
                  <input
                    type="text"
                    className="chat-title-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleSaveEdit(chat.conversationId)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(chat.conversationId);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    aria-label="Edit chat title"
                  />
                ) : (
                  <h3 className="chat-title">{chat.title}</h3>
                )}
              </div>
              
              {/* Metadata */}
              <div className="chat-metadata">
                <span className="message-count">
                  {chat.messageCount} {chat.messageCount === 1 ? 'message' : 'messages'}
                </span>
                <span className="chat-timestamp">
                  {formatTimestamp(chat.updatedAt)}
                </span>
              </div>
              
              {/* Last Message Preview */}
              {chat.lastMessage && (
                <div className="chat-preview">
                  {chat.lastMessage.substring(0, 60)}
                  {chat.lastMessage.length > 60 ? '...' : ''}
                </div>
              )}
              
              {/* Actions */}
              <div className="chat-actions">
                <button
                  className="action-button edit"
                  onClick={(e) => handleStartEdit(chat, e)}
                  aria-label="Edit chat title"
                  title="Edit title"
                >
                  ✏️
                </button>
                <button
                  className="action-button delete"
                  onClick={(e) => handleDeleteChat(chat.conversationId, e)}
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-email">{userId}</span>
        </div>
      </div>
    </div>
  );
}


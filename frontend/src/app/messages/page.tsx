'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Search, Send, Users, MessageCircle, MoreVertical } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  icon?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    avatar?: string;
  };
}

interface Conversation {
  id: string;
  type: 'private' | 'team';
  name?: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  unread_count: number;
  other_participant?: User;
  team?: Team;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Load current user
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }

    // Load conversations
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiClient.get(`/api/conversations/${conversationId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      await apiClient.post(`/api/conversations/${conversationId}/read`);
      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ));
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiClient.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const createPrivateConversation = async (userId: string) => {
    try {
      const response = await apiClient.post('/api/conversations', {
        type: 'private',
        participant_ids: [currentUser?.id, userId]
      });
      
      // Add to conversations if new
      const existingIndex = conversations.findIndex(c => c.id === response.data.id);
      if (existingIndex === -1) {
        setConversations([response.data, ...conversations]);
      }
      
      // Select the conversation
      setSelectedConversation(response.data);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    try {
      setIsSending(true);
      const response = await apiClient.post('/api/messages', {
        conversation_id: selectedConversation.id,
        content: newMessage
      });

      // Add message to list
      setMessages([...messages, response.data]);
      
      // Update conversation's last message
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? {
              ...conv,
              last_message: {
                content: newMessage,
                created_at: response.data.created_at,
                sender_name: currentUser?.full_name || 'You'
              },
              last_message_at: response.data.created_at
            }
          : conv
      ));

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const getConversationDisplay = (conversation: Conversation) => {
    if (conversation.type === 'private') {
      return {
        name: conversation.other_participant?.full_name || 'Unknown User',
        avatar: conversation.other_participant?.username?.charAt(0).toUpperCase() || '?',
        icon: <MessageCircle className="h-4 w-4" />
      };
    } else {
      return {
        name: conversation.team?.name || conversation.name || 'Team Chat',
        avatar: conversation.team?.name?.charAt(0).toUpperCase() || 'T',
        icon: <Users className="h-4 w-4" />
      };
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-secondary shadow-lg glassmorphism-dashboard">
        {/* Conversations List */}
        <div className="w-80 border-r border-secondary flex flex-col bg-card">
          {/* Search Header */}
          <div className="p-4 border-b border-secondary">
            <h2 className="text-lg font-semibold text-primary" style={{ marginBottom: '1rem' }}>Messages</h2>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="pl-10"
                data-testid="user-search-input"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute z-[80] w-72 mt-2 bg-dropdown/95 backdrop-blur-xl border border-dropdown rounded-xl shadow-dropdown overflow-hidden">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => createPrivateConversation(user.id)}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-dropdown-item-hover transition-all duration-200"
                    data-testid={`user-search-result-${user.id}`}
                  >
                    <Avatar
                      src={user.avatar}
                      alt={user.full_name}
                      fallback={user.username.charAt(0).toUpperCase()}
                      size="sm"
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium text-primary">{user.full_name}</div>
                      <div className="text-xs text-muted">@{user.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted stroke-current" />
                  <p className="text-sm text-muted">No conversations yet</p>
                  <p className="text-xs text-muted mt-1">Search for users to start chatting!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map(conversation => {
                  const display = getConversationDisplay(conversation);
                  const isSelected = selectedConversation?.id === conversation.id;
                  
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={cn(
                        "w-full p-3 rounded-xl flex items-start space-x-3 transition-all duration-200",
                        isSelected
                          ? "bg-accent-10 border border-accent-30 shadow-sm"
                          : "hover:bg-interactive-secondary-hover hover:shadow-sm"
                      )}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <Avatar
                        fallback={display.avatar}
                        size="default"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            {display.icon}
                            <span className="font-medium text-sm text-primary truncate">
                              {display.name}
                            </span>
                          </div>
                          {conversation.unread_count > 0 && (
                            <Badge variant="default" size="sm">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conversation.last_message && (
                          <div className="text-xs text-muted truncate">
                            <span className="font-medium">{conversation.last_message.sender_name}:</span>{' '}
                            {conversation.last_message.content}
                          </div>
                        )}
                        {conversation.last_message_at && (
                          <div className="text-xs text-muted mt-1">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-secondary bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      fallback={getConversationDisplay(selectedConversation).avatar}
                      size="default"
                    />
                    <div>
                      <h3 className="font-semibold text-primary">
                        {getConversationDisplay(selectedConversation).name}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-muted">
                        {getConversationDisplay(selectedConversation).icon}
                        <span>{selectedConversation.type === 'private' ? 'Private Chat' : 'Team Chat'}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<MoreVertical className="h-4 w-4" />}
                  />
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-secondary/50">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted stroke-current" />
                      <p className="text-sm text-muted">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                <div className="space-y-4">
                  {messages.map(message => {
                    const isCurrentUser = message.sender_id === currentUser?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-end space-x-2",
                          isCurrentUser && "flex-row-reverse space-x-reverse"
                        )}
                      >
                        <Avatar
                          fallback={message.sender.username.charAt(0).toUpperCase()}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            isCurrentUser
                              ? "bg-interactive-primary text-on-accent"
                              : "bg-card border border-secondary"
                          )}
                        >
                          {!isCurrentUser && (
                            <div className="text-xs font-medium mb-1 text-muted">
                              {message.sender.full_name}
                            </div>
                          )}
                          <div className={cn("text-sm", isCurrentUser && "text-white")}>
                            {message.content}
                          </div>
                          <div className={cn(
                            "text-xs mt-1",
                            isCurrentUser ? "text-white/70" : "text-muted"
                          )}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="px-6 py-4 border-t border-secondary bg-card">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex space-x-2"
                >
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                    className="flex-1"
                    data-testid="message-input"
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    leftIcon={<Send className="h-4 w-4" />}
                    data-testid="send-message-button"
                  >
                    Send
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm p-8 rounded-2xl bg-card/50 backdrop-blur-md border border-secondary">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted stroke-current" />
                <h3 className="text-lg font-medium text-primary mb-2">No conversation selected</h3>
                <p className="text-sm text-muted">
                  Choose a conversation from the list or search for users to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
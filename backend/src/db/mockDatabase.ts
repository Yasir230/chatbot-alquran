// Mock database service untuk testing tanpa PostgreSQL
export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: Date;
}

export interface MockConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface MockMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant';
  message: string;
  created_at: Date;
}

export interface MockMemorizationSession {
  id: string;
  user_id: string;
  current_surah: number;
  current_ayat: number;
  mode: string;
  difficulty: string;
  total_attempts: number;
  correct_attempts: number;
  final_score: number;
  started_at: Date;
  ended_at?: Date;
}

export interface MockMemorizationAttempt {
  id: string;
  session_id: string;
  surah_number: number;
  ayat_number: number;
  user_input: string;
  is_correct: boolean;
  similarity_score: number;
  hints_used: number;
  attempt_time: Date;
}

class MockDatabase {
  private users: MockUser[] = [];
  private conversations: MockConversation[] = [];
  private messages: MockMessage[] = [];
  private memorizationSessions: MockMemorizationSession[] = [];
  private memorizationAttempts: MockMemorizationAttempt[] = [];

  constructor() {
    // Seed dengan user mock
    this.users.push({
      id: 'mock-user-123',
      email: 'test@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', // password: test123
      name: 'Test User',
      created_at: new Date()
    });
  }

  // User methods
  async findUserByEmail(email: string): Promise<MockUser | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async createUser(email: string, password: string, name: string): Promise<MockUser> {
    const user: MockUser = {
      id: `mock-user-${Date.now()}`,
      email,
      password,
      name,
      created_at: new Date()
    };
    this.users.push(user);
    return user;
  }

  // Conversation methods
  async createConversation(userId: string, title: string): Promise<MockConversation> {
    const conversation: MockConversation = {
      id: `mock-conv-${Date.now()}`,
      user_id: userId,
      title,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.conversations.push(conversation);
    return conversation;
  }

  async getConversations(userId: string): Promise<MockConversation[]> {
    return this.conversations
      .filter(conv => conv.user_id === userId)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  async getConversationById(id: string): Promise<MockConversation | null> {
    return this.conversations.find(conv => conv.id === id) || null;
  }

  // Message methods
  async createMessage(conversationId: string, sender: 'user' | 'assistant', message: string): Promise<MockMessage> {
    const msg: MockMessage = {
      id: `mock-msg-${Date.now()}`,
      conversation_id: conversationId,
      sender,
      message,
      created_at: new Date()
    };
    this.messages.push(msg);
    
    // Update conversation updated_at
    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.updated_at = new Date();
    }
    
    return msg;
  }

  async getMessages(conversationId: string): Promise<MockMessage[]> {
    return this.messages
      .filter(msg => msg.conversation_id === conversationId)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  // Memorization methods
  async createMemorizationSession(userId: string, surah: number, ayat: number, mode: string, difficulty: string): Promise<MockMemorizationSession> {
    const session: MockMemorizationSession = {
      id: `mock-session-${Date.now()}`,
      user_id: userId,
      current_surah: surah,
      current_ayat: ayat,
      mode,
      difficulty,
      total_attempts: 0,
      correct_attempts: 0,
      final_score: 0,
      started_at: new Date()
    };
    this.memorizationSessions.push(session);
    return session;
  }

  async getMemorizationSession(id: string): Promise<MockMemorizationSession | null> {
    return this.memorizationSessions.find(s => s.id === id) || null;
  }

  async updateMemorizationSession(id: string, updates: Partial<MockMemorizationSession>): Promise<MockMemorizationSession | null> {
    const session = this.memorizationSessions.find(s => s.id === id);
    if (session) {
      Object.assign(session, updates);
      return session;
    }
    return null;
  }

  async createMemorizationAttempt(sessionId: string, surah: number, ayat: number, userInput: string, isCorrect: boolean, similarity: number, hintsUsed: number): Promise<MockMemorizationAttempt> {
    const attempt: MockMemorizationAttempt = {
      id: `mock-attempt-${Date.now()}`,
      session_id: sessionId,
      surah_number: surah,
      ayat_number: ayat,
      user_input: userInput,
      is_correct: isCorrect,
      similarity_score: similarity,
      hints_used: hintsUsed,
      attempt_time: new Date()
    };
    this.memorizationAttempts.push(attempt);
    
    // Update session stats
    const session = this.memorizationSessions.find(s => s.id === sessionId);
    if (session) {
      session.total_attempts++;
      if (isCorrect) session.correct_attempts++;
    }
    
    return attempt;
  }

  async getMemorizationAttempts(sessionId: string): Promise<MockMemorizationAttempt[]> {
    return this.memorizationAttempts
      .filter(a => a.session_id === sessionId)
      .sort((a, b) => a.attempt_time.getTime() - b.attempt_time.getTime());
  }

  // Additional methods for chat routes
  async deleteMessages(conversationId: string): Promise<void> {
    this.messages = this.messages.filter(msg => msg.conversation_id !== conversationId);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
    // Also delete related messages
    await this.deleteMessages(conversationId);
  }
}

export const mockDb = new MockDatabase();
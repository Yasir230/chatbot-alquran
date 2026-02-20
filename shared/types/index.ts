export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  created_at: string;
}

export interface Citation {
  surah: string;
  surah_number: number;
  ayat: number;
  arab: string;
  terjemahan: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  last_message?: string;
  messages?: Message[];
}

export interface User {
  id: string;
  email: string;
  username: string;
}
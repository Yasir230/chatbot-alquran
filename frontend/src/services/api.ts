import axios, { type AxiosInstance, type AxiosError } from "axios";

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post("/api/auth/register", data),
  
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),
  
  me: () => api.get("/api/auth/me"),
};

// Chat API
export const chatApi = {
  sendMessage: (data: { message: string; conversationId?: string }) =>
    api.post("/api/chat", data),
  
  getConversations: () => api.get("/api/chat/conversations"),
  
  getMessages: (conversationId: string) =>
    api.get(`/api/chat/conversations/${conversationId}/messages`),
  
  deleteConversation: (conversationId: string) =>
    api.delete(`/api/chat/conversations/${conversationId}`),
  
  // Tafsir mode
  startTafsir: (data: { surahNumber: number; ayatNumber: number }) =>
    api.post("/api/chat/tafsir/start", data),
  
  askTafsir: (data: { surahNumber: number; ayatNumber: number; question: string }) =>
    api.post("/api/chat/tafsir/question", data),
  
  // Hafalan mode
  startHafalan: (data: {
    startSurah?: number;
    startAyat?: number;
    mode?: "forward" | "backward" | "random";
    difficulty?: "easy" | "medium" | "hard";
  }) => api.post("/api/chat/hafalan/start", data),
  
  getNextVerse: (sessionId: string) =>
    api.get(`/api/chat/hafalan/next/${sessionId}`),
  
  evaluateHafalan: (data: {
    sessionId: string;
    userInput: string;
    surahNumber: number;
    ayatNumber: number;
  }) => api.post("/api/chat/hafalan/evaluate", data),
  
  getHafalanStats: (sessionId: string) =>
    api.get(`/api/chat/hafalan/stats/${sessionId}`),
  
  endHafalan: (sessionId: string) =>
    api.post("/api/chat/hafalan/end", { sessionId }),
};

// Quran API
export const quranApi = {
  getSurahList: () => api.get("/api/quran/surah"),
  
  getSurahDetail: (surahNumber: number) =>
    api.get(`/api/quran/surah/${surahNumber}`),
  
  searchAyat: (query: string) =>
    api.get(`/api/quran/search?q=${encodeURIComponent(query)}`),
};

// Bookmark API
export const bookmarkApi = {
  getBookmarks: () => api.get("/api/bookmarks"),
  
  addBookmark: (data: { surah: number; ayat: number; note?: string }) =>
    api.post("/api/bookmarks", data),
  
  deleteBookmark: (bookmarkId: string) =>
    api.delete(`/api/bookmarks/${bookmarkId}`),
};

export default api;

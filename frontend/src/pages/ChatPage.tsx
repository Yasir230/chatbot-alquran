import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { chatApi } from "../services/api";
import ChatMessage from "../components/ChatMessage";
import TafsirMode from "../components/TafsirMode";
import HafalanMode from "../components/HafalanMode";
import { Send, Trash2, Loader2, BookOpen, Brain, MessageCircle, LogOut, Plus, Sparkles } from "lucide-react";
import type { Message } from "@shared/types";

function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const { 
    conversations, 
    activeConversation, 
    setConversations, 
    setActiveConversation, 
    addMessage, 
    deleteConversation 
  } = useChatStore();
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showTafsirMode, setShowTafsirMode] = useState(false);
  const [showHafalanMode, setShowHafalanMode] = useState(false);

  // Handle prefill message dari QuranPage
  useEffect(() => {
    const prefillMessage = location.state?.prefillMessage;
    if (prefillMessage) {
      setInput(prefillMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load conversations saat mount
  useEffect(() => {
    if (!token) return;

    loadConversations();
    
    const newSocket = io(API_URL, {
      auth: { token }
    });
    
    newSocket.on("connect", () => {
      console.log("Connected to server");
    });
    
    newSocket.on("new_message", (message: Message) => {
      if (activeConversation?.id) {
        addMessage(activeConversation.id, message);
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [token]);

  // Join room saat conversation aktif berubah
  useEffect(() => {
    if (socket && activeConversation?.id) {
      socket.emit("join_room", `conversation:${activeConversation.id}`);
    }
  }, [socket, activeConversation?.id]);

  // Auto scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await chatApi.getMessages(conversationId);
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation({
          ...activeConversation,
          messages: response.data
        });
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      loadMessages(conversationId);
    }
  };

  const handleNewConversation = () => {
    setActiveConversation(null);
    setInput("");
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Apakah Anda yakin ingin menghapus percakapan ini?")) return;
    
    try {
      await chatApi.deleteConversation(conversationId);
      deleteConversation(conversationId);
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleTafsirMode = () => {
    setShowTafsirMode(true);
  };

  const handleHafalanMode = () => {
    setShowHafalanMode(true);
  };

  const handleSendTafsirMessage = (message: string) => {
    setInput(message);
    setShowTafsirMode(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    setLoading(true);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString()
    };

    if (activeConversation?.id) {
      addMessage(activeConversation.id, userMessage);
    }

    const currentConvId = activeConversation?.id;

    try {
      const response = await chatApi.sendMessage({
        message: input.trim(),
        conversationId: currentConvId
      });

      const { conversationId, message: aiMessage } = response.data;

      if (!currentConvId) {
        await loadConversations();
        const newConv = conversations.find(c => c.id === conversationId) || {
          id: conversationId,
          title: input.trim().slice(0, 50) + (input.trim().length > 50 ? '...' : ''),
          created_at: new Date().toISOString(),
          messages: []
        };
        setActiveConversation(newConv);
      }

      if (activeConversation?.id === conversationId || !currentConvId) {
        addMessage(conversationId, aiMessage);
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      if (activeConversation?.id) {
        const messages = activeConversation.messages?.filter((m: Message) => m.id !== userMessage.id) || [];
        setActiveConversation({ ...activeConversation, messages });
      }
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 flex flex-col glass border-r border-slate-700/30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-islamic-600 to-islamic-800 flex items-center justify-center shadow-islamic">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">Percakapan</h2>
              <p className="text-xs text-slate-500">{conversations.length} pesan</p>
            </div>
          </div>
          <button
            onClick={handleNewConversation}
            className="w-full btn-islamic flex items-center justify-center gap-2 py-2.5"
          >
            <Plus className="w-4 h-4" />
            Percakapan Baru
          </button>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada percakapan</p>
              <p className="text-xs mt-1">Mulai percakapan baru</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group sidebar-item ${
                  activeConversation?.id === conversation.id ? "sidebar-item-active" : ""
                }`}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-slate-200">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {conversation.last_message || "Belum ada pesan"}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-950/50">
        {/* Top Navigation Bar */}
        <header className="glass border-b border-slate-700/30 px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Navigation Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/chat")}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 bg-gradient-to-r from-islamic-600 to-islamic-500 text-white shadow-islamic hover:shadow-islamic-lg transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => navigate("/quran")}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 btn-ghost"
              >
                <BookOpen className="w-4 h-4" />
                Al-Quran
              </button>
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-4">
              {/* User Avatar */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {(user?.username || user?.email || "U")[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-300 hidden sm:block">
                  {user?.username || user?.email}
                </span>
              </div>
              
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="border-b border-slate-700/30 px-6 py-4 flex justify-between items-center bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-islamic-500 to-islamic-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{activeConversation.title}</h3>
                  <p className="text-xs text-slate-500">
                    {activeConversation.messages?.length || 0} pesan
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTafsirMode}
                  className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white shadow-gold hover:shadow-lg transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  Tafsir
                </button>
                <button
                  onClick={handleHafalanMode}
                  className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                >
                  <Brain className="w-4 h-4" />
                  Hafalan
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeConversation.messages?.map((message: Message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {loading && (
                <div className="flex items-center gap-3 text-slate-400 p-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-islamic-500 to-islamic-600 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                  <span className="text-sm">AI sedang mengetik...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-700/30 p-4 bg-slate-900/30">
              <div className="flex gap-3 max-w-4xl mx-auto">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="input-modern flex-1 resize-none"
                  placeholder="Tanyakan tentang Al-Quran, hadits, atau topik Islam lainnya..."
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="btn-islamic px-6 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Tekan Enter untuk mengirim • Shift+Enter untuk baris baru
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {/* Welcome Illustration */}
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-islamic-500/20 to-gold-500/20 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-islamic-400" />
              </div>
              <h2 className="text-2xl font-bold text-gradient-islamic mb-3">
                Selamat Datang
              </h2>
              <p className="text-slate-400 mb-2">
                Chat dengan AI tentang Al-Quran dan Islam
              </p>
              <p className="text-slate-500 text-sm">
                Pilih percakapan atau buat yang baru untuk memulai
              </p>
              <button
                onClick={handleNewConversation}
                className="mt-6 btn-islamic inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Mulai Percakapan
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mode Components */}
      <TafsirMode
        isOpen={showTafsirMode}
        onClose={() => setShowTafsirMode(false)}
        onSendMessage={handleSendTafsirMessage}
      />
      <HafalanMode
        isOpen={showHafalanMode}
        onClose={() => setShowHafalanMode(false)}
      />
    </div>
  );
}

export default ChatPage;

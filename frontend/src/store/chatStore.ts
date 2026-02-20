import { create } from "zustand";
import type { Message, Conversation } from "@shared/types";

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, message: Message) => void;
  deleteConversation: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversation: null,
  
  setConversations: (conversations) => set({ conversations }),
  
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  
  addMessage: (conversationId, message) => {
    set((state) => {
      // Update conversations list
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            last_message: message.content,
            messages: [...(conv.messages || []), message]
          };
        }
        return conv;
      });

      // Update active conversation
      const updatedActiveConversation = state.activeConversation?.id === conversationId
        ? {
            ...state.activeConversation,
            messages: [...(state.activeConversation.messages || []), message]
          }
        : state.activeConversation;

      return {
        conversations: updatedConversations,
        activeConversation: updatedActiveConversation
      };
    });
  },
  
  updateMessage: (conversationId, messageId, message) => {
    set((state) => {
      // Update conversations list
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages?.map((msg: Message) => 
              msg.id === messageId ? message : msg
            ) || []
          };
        }
        return conv;
      });

      // Update active conversation
      const updatedActiveConversation = state.activeConversation?.id === conversationId
        ? {
            ...state.activeConversation,
            messages: state.activeConversation.messages?.map((msg: Message) => 
              msg.id === messageId ? message : msg
            ) || []
          }
        : state.activeConversation;

      return {
        conversations: updatedConversations,
        activeConversation: updatedActiveConversation
      };
    });
  },
  
  deleteConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter(conv => conv.id !== conversationId),
      activeConversation: state.activeConversation?.id === conversationId 
        ? null 
        : state.activeConversation
    }));
  }
}));
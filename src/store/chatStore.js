import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: 'WELCOME', // resolved via i18n key chat.welcome at render time
  timestamp: Date.now(),
};

export const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [WELCOME_MSG],
      isTyping: false,
      error: null,

      addMessage: (role, content) => {
        const msg = { id: Date.now() + Math.random(), role, content, timestamp: Date.now() };
        set((state) => ({ messages: [...state.messages, msg], error: null }));
        return msg.id;
      },

      setTyping: (val) => set({ isTyping: val }),
      setError: (err) => set({ error: err }),
      clearError: () => set({ error: null }),

      clearHistory: () => set({ messages: [WELCOME_MSG], error: null }),

      getHistory: () =>
        get().messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content })),
    }),
    {
      name: 'ks-chat-store',
      partialize: (s) => ({ messages: s.messages.slice(-40) }),
    }
  )
);

import { useCallback, useEffect, useMemo, useState } from 'react';

const CHAT_THREADS_KEY = 'kisanai-chat-conversations';

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createChatMessage(overrides) {
  return {
    id: createId(),
    timestamp: Date.now(),
    sources: [],
    ...overrides,
  };
}

export function useChatHistory({ storageKey, maxMessages = 10, initialMessages = [], language = 'hi' }) {
  const [messages, setMessages] = useState(() => {
    if (typeof window === 'undefined') {
      return initialMessages;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return initialMessages;
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : initialMessages;
    } catch {
      return initialMessages;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const trimmed = messages.slice(-maxMessages);
      window.localStorage.setItem(storageKey, JSON.stringify(trimmed));

      const lastUserMessage = [...trimmed].reverse().find((message) => message.role === 'user');
      const threads = JSON.parse(window.localStorage.getItem(CHAT_THREADS_KEY) || '[]');
      const summary = {
        id: storageKey,
        title: lastUserMessage?.content?.slice(0, 40) || 'Krishi AI chat',
        preview: lastUserMessage ? trimmed.at(-1)?.content?.slice(0, 80) || '' : '',
        updatedAt: trimmed.at(-1)?.timestamp || Date.now(),
        language,
      };

      const nextThreads = [summary, ...threads.filter((thread) => thread.id !== storageKey)].slice(0, 10);
      window.localStorage.setItem(CHAT_THREADS_KEY, JSON.stringify(nextThreads));
    } catch {
      // Browser storage can be unavailable in private or restricted sessions.
    }
  }, [language, messages, maxMessages, storageKey]);

  const appendMessage = useCallback(
    (message) => {
      const nextMessage = createChatMessage(message);
      setMessages((current) => [...current, nextMessage].slice(-maxMessages));
      return nextMessage;
    },
    [maxMessages]
  );

  const updateMessage = useCallback((messageId, updater) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        return typeof updater === 'function' ? updater(message) : { ...message, ...updater };
      })
    );
  }, []);

  const removeMessage = useCallback((messageId) => {
    setMessages((current) => current.filter((message) => message.id !== messageId));
  }, []);

  const replaceMessages = useCallback(
    (nextMessages) => {
      setMessages(nextMessages.slice(-maxMessages));
    },
    [maxMessages]
  );

  const resetMessages = useCallback(
    (nextInitialMessages = initialMessages) => {
      setMessages(nextInitialMessages.slice(-maxMessages));
    },
    [initialMessages, maxMessages]
  );

  const apiMessages = useMemo(
    () =>
      messages
        .filter((message) => !message.error && !message.isWelcome)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  return {
    messages,
    apiMessages,
    appendMessage,
    updateMessage,
    removeMessage,
    replaceMessages,
    resetMessages,
  };
}

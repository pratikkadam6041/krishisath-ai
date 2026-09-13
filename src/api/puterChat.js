function buildSystemPrompt(preferredLanguage, farmContext) {
  const languageName = preferredLanguage === 'mr' ? 'Marathi' : preferredLanguage === 'hi' ? 'Hindi' : 'English';
  return `You are Krishi AI, a practical Indian farming assistant. Reply only in ${languageName}.
Keep the answer short, simple, and useful for a farmer. Use this live farm context when relevant:
${farmContext || 'No farm context available.'}

Important:
- Do not mention API providers, quota, keys, or technical errors.
- Plain text only. No markdown symbols.
- For irrigation or pump control, advise the farmer to use the app confirmation.`;
}

function extractPuterText(response) {
  if (typeof response === 'string') return response.trim();

  const message = response?.message?.content ?? response?.text ?? response?.content;
  if (typeof message === 'string') return message.trim();

  if (Array.isArray(message)) {
    return message
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  return '';
}

function waitForPuter(timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Puter is browser-only'));
      return;
    }

    if (window.puter?.ai?.chat) {
      resolve(window.puter);
      return;
    }

    const startedAt = Date.now();
    const timerId = window.setInterval(() => {
      if (window.puter?.ai?.chat) {
        window.clearInterval(timerId);
        resolve(window.puter);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        window.clearInterval(timerId);
        reject(new Error('Puter AI did not load'));
      }
    }, 100);
  });
}

export async function sendPuterChat({ messages, preferredLanguage, farmContext = '' }) {
  const puter = await waitForPuter();
  const promptMessages = [
    { role: 'system', content: buildSystemPrompt(preferredLanguage, farmContext) },
    ...messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    })),
  ];

  const response = await puter.ai.chat(promptMessages, {
    model: import.meta.env.VITE_PUTER_MODEL || 'gpt-5.6-luna',
  });
  const text = extractPuterText(response);

  if (!text) {
    throw new Error('Empty response from Puter AI');
  }

  return {
    text,
    sources: [],
    grounded: false,
    model: 'puter',
  };
}

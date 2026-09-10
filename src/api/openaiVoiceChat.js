const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const KRISHI_SYSTEM_PROMPT = `You are Krishi, a warm and practical Indian farming voice companion.
Answer in the farmer's language (English, Hindi, or Marathi), using short, conversational sentences that sound natural when spoken aloud.
Use plain text only: never use Markdown, asterisks, headings, or formatting symbols.
You can use the supplied live farm context for soil, crop, weather, and Mandi questions.
Never claim that you have started irrigation, opened a valve, or changed farm hardware. Hardware actions are handled by the app only after an explicit confirmation.`;

function createOpenAiError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * A deliberately session-only browser integration for the local demo.
 * Do not persist the supplied key. Production deployments should proxy this
 * request from a server-side secret instead of calling OpenAI from a browser.
 */
export async function sendOpenAiVoiceChat({ apiKey, messages, farmContext, preferredLanguage }) {
  const key = String(apiKey || '').trim();
  if (!key) {
    throw createOpenAiError('Enter an OpenAI API key to use gpt-4o-mini.');
  }

  const currentDate = new Date().toISOString().slice(0, 10);
  const requestMessages = [
    { role: 'system', content: KRISHI_SYSTEM_PROMPT },
    ...messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    })),
    {
      role: 'system',
      content: `Farmer language: ${String(preferredLanguage || 'en').toUpperCase()}\nCurrent date: ${currentDate}\nLive farm context:\n${farmContext || 'No live farm context available.'}`,
    },
  ];

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: requestMessages,
      temperature: 0.35,
      max_tokens: 450,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw createOpenAiError(payload?.error?.message || 'OpenAI request failed.', response.status);
  }

  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw createOpenAiError('OpenAI returned an empty reply.', response.status);
  }

  return { text, sources: [], grounded: false };
}

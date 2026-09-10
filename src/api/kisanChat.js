const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

const SYSTEM_PROMPT = `You are Krishi AI, a warm, expert Indian agricultural companion. You help farmers with:
- Crop selection, sowing and harvesting timelines
- Pest and disease identification and treatment
- Weather impact on farming
- Government schemes (PM Kisan, crop insurance, MSP rates)
- Mandi prices and market rates
- Soil health, fertilizer, and irrigation advice
Answer in the same language the farmer uses (Hindi, Marathi, or English).
Keep answers practical, simple, and actionable. Always give specific advice relevant to Indian farming conditions.

Additional rules:
- Use live Google Search grounding for every answer, even if you think you already know the answer.
- Treat each answer as a current-information request and verify important facts before responding.
- Mention exact dates when you share time-sensitive information such as weather, market prices, alerts, or scheme updates.
- Prefer short paragraphs or flat bullets that a farmer can act on immediately.
- Write plain text only. Do not use Markdown, asterisks, headings, or formatting symbols because the answer is spoken aloud.
- If current data is unavailable, say that clearly instead of guessing.
- Never invent source links or prices.`;

function createApiError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

function buildTools(model) {
  if (model.startsWith('gemini-1.5')) {
    return [
      {
        google_search_retrieval: {
          dynamic_retrieval_config: {
            mode: 'MODE_DYNAMIC',
            dynamic_threshold: 0,
          },
        },
      },
    ];
  }

  return [{ google_search: {} }];
}

function buildConversation(messages, farmContext, preferredLanguage, forceGroundingNote = '') {
  const today = new Date().toISOString().slice(0, 10);
  const lastUserOffset = [...messages].reverse().findIndex((message) => message.role === 'user');
  const lastUserIndex = lastUserOffset === -1 ? -1 : messages.length - 1 - lastUserOffset;

  return messages.map((message, index) => {
    const blocks = [message.content];

    if (message.role === 'user' && index === lastUserIndex) {
      blocks.push(`Preferred farmer language: ${preferredLanguage.toUpperCase()}`);
      blocks.push(`Current date: ${today}`);

      if (farmContext) {
        blocks.push(`Live farm telemetry from the app:\n${farmContext}`);
      }

      if (forceGroundingNote) {
        blocks.push(forceGroundingNote);
      }
    }

    return {
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: blocks.filter(Boolean).join('\n\n') }],
    };
  });
}

async function runRequest(messages, farmContext, preferredLanguage, forceGroundingNote = '') {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: buildConversation(messages, farmContext, preferredLanguage, forceGroundingNote),
        tools: buildTools(GEMINI_MODEL),
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 900,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Gemini request failed (${response.status})`;
    throw createApiError(message, {
      code: response.status,
      status: errorBody?.error?.status || 'UNKNOWN',
      details: errorBody?.error?.details || [],
    });
  }

  return response.json();
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractSources(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();

  return chunks
    .map((chunk) => chunk.web)
    .filter((item) => item?.uri)
    .filter((item) => {
      if (seen.has(item.uri)) {
        return false;
      }

      seen.add(item.uri);
      return true;
    })
    .slice(0, 5)
    .map((item) => ({
      title: item.title || item.uri,
      url: item.uri,
    }));
}

function extractSearchQueries(data) {
  return data?.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];
}

function isGrounded(data) {
  const metadata = data?.candidates?.[0]?.groundingMetadata;
  return Boolean(
    metadata?.groundingChunks?.length ||
      metadata?.groundingSupports?.length ||
      metadata?.webSearchQueries?.length
  );
}

export async function sendKisanChat({ messages, preferredLanguage, farmContext = '' }) {
  if (!GEMINI_API_KEY) {
    throw createApiError('Missing VITE_GEMINI_API_KEY', {
      code: 401,
      status: 'MISSING_API_KEY',
    });
  }

  let data = await runRequest(messages, farmContext, preferredLanguage);

  if (!isGrounded(data)) {
    data = await runRequest(
      messages,
      farmContext,
      preferredLanguage,
      'Important: this reply must be grounded with live Google Search results and include verifiable current sources.'
    );
  }

  const text = extractText(data);

  if (!text) {
    throw createApiError('Empty response from Gemini', {
      code: 502,
      status: 'EMPTY_RESPONSE',
    });
  }

  return {
    text,
    sources: extractSources(data),
    searchQueries: extractSearchQueries(data),
    grounded: isGrounded(data),
    model: GEMINI_MODEL,
  };
}

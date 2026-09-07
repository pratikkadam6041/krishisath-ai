import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MessageCircle, Send, Volume2, VolumeX, X, WifiOff, Zap, CheckCircle2 } from 'lucide-react';
import { sendKisanChat } from '../api/kisanChat.js';
import { offlineKrishiResponse } from '../ai-ml/offlineKrishi.js';
import { createChatMessage, useChatHistory } from '../hooks/useChatHistory.js';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useChatWidgetStore } from '../store/chatWidgetStore.js';
import { parseFarmerCommand, buildConfirmMessage } from '../ai-ml/voiceCommandParser.js';
import {
  detectLanguage,
  getChatLanguages,
  getSpeechLang,
  isGoodbyeOnly,
  isGreetingOnly,
  isThanksOnly,
} from '../utils/languageDetect.js';
import { getCropMeta } from '../data/appContent.js';
import { localize } from '../utils/formatters.js';
import { showToast } from './Toast/index.jsx';
import MessageBubble from './MessageBubble.jsx';
import QuickReplies from './QuickReplies.jsx';
import VoiceButton from './VoiceButton.jsx';

const CHAT_STORAGE_KEY = 'kisanai-chat-history';
const LANGUAGE_STORAGE_KEY = 'kisanai-chat-language';
const TTS_STORAGE_KEY = 'kisanai-chat-tts';

const UI_COPY = {
  hi: {
    welcome:
      'नमस्ते! मैं KisanAI हूं। अपनी फसल, मंडी भाव, मौसम या सरकारी योजना के बारे में पूछिए।',
    placeholder: 'अपना सवाल लिखें या बोलें...',
    typing: 'KisanAI जवाब तैयार कर रहा है...',
    offline: 'No internet connection',
    retry: 'Retry',
    sources: 'Sources',
    launcher: 'KisanAI',
    subtitle: 'Indian Farming Assistant',
    voiceNotSupported: 'Voice not supported in this browser',
    voiceNotDetected: 'Voice not detected, please try again',
    serverBusy: 'Server busy, please retry',
    micDenied: 'Microphone permission is blocked',
    open: 'Open KisanAI',
    close: 'Close KisanAI',
  },
  en: {
    welcome:
      'Hello! I am KisanAI. Ask me about crops, mandi prices, weather, pests, or government schemes.',
    placeholder: 'Type or speak your farming question...',
    typing: 'KisanAI is preparing a live answer...',
    offline: 'No internet connection',
    retry: 'Retry',
    sources: 'Sources',
    launcher: 'KisanAI',
    subtitle: 'Indian Farming Assistant',
    voiceNotSupported: 'Voice not supported in this browser',
    voiceNotDetected: 'Voice not detected, please try again',
    serverBusy: 'Server busy, please retry',
    micDenied: 'Microphone permission is blocked',
    open: 'Open KisanAI',
    close: 'Close KisanAI',
  },
  mr: {
    welcome:
      'नमस्कार! मी KisanAI आहे. पीक, मंडी भाव, हवामान, रोग किंवा सरकारी योजनांबद्दल विचारा.',
    placeholder: 'तुमचा शेतीचा प्रश्न लिहा किंवा बोला...',
    typing: 'KisanAI थेट माहिती तपासत आहे...',
    offline: 'No internet connection',
    retry: 'Retry',
    sources: 'Sources',
    launcher: 'KisanAI',
    subtitle: 'Indian Farming Assistant',
    voiceNotSupported: 'Voice not supported in this browser',
    voiceNotDetected: 'Voice not detected, please try again',
    serverBusy: 'Server busy, please retry',
    micDenied: 'Microphone permission is blocked',
    open: 'Open KisanAI',
    close: 'Close KisanAI',
  },
};

const QUICK_REPLIES = {
  hi: ['मेरी फसल के लिए सलाह', 'आज का मंडी भाव', 'Pest control tips', 'PM Kisan status'],
  en: ['Advice for my crop', "Today's mandi price", 'Pest control tips', 'PM Kisan status'],
  mr: ['माझ्या पिकासाठी सल्ला', 'आजचा मंडी भाव', 'Pest control tips', 'PM Kisan status'],
};

const NOOP = () => {};

function buildWelcomeMessage(language) {
  return createChatMessage({
    role: 'assistant',
    content: UI_COPY[language]?.welcome || UI_COPY.hi.welcome,
    isWelcome: true,
  });
}

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'hi';
  }

  try {
    return window.sessionStorage.getItem(LANGUAGE_STORAGE_KEY) || 'hi';
  } catch (_) {
    return 'hi';
  }
}

function getInitialTtsValue() {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.sessionStorage.getItem(TTS_STORAGE_KEY) !== 'false';
  } catch (_) {
    return true;
  }
}

function formatZoneContext(zones, settings, language = 'en') {
  const zoneLines = Object.values(zones || {}).map((zone) => {
    const crop = getCropMeta(zone.cropType);
    const cropLabel = localize(crop.name, language);
    return `${zone.id} (${zone.name}, ${cropLabel}): moisture ${zone.moisture ?? '--'}%, temperature ${zone.temperature ?? '--'} C, humidity ${zone.humidity ?? '--'}%, pH ${zone.ph ?? '--'}, EC ${zone.ec ?? '--'}, pump ${zone.pumpOn ? 'ON' : 'OFF'}, valve ${zone.valveOpen ? 'OPEN' : 'CLOSED'}`;
  });

  return [
    settings.farmName ? `Farm: ${settings.farmName}` : '',
    settings.district ? `District: ${settings.district}` : '',
    zoneLines.join('\n'),
  ]
    .filter(Boolean)
    .join('\n');
}

function getChatErrorState(error, copy) {
  const status = error?.status;
  const message = String(error?.message || '');

  if (status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || /quota/i.test(message)) {
    return {
      content: 'Free Gemini quota is exhausted for this API key. Please wait a bit or switch to another free Gemini key/project.',
      retryable: false,
    };
  }

  if (status === 'MISSING_API_KEY' || /Missing VITE_GEMINI_API_KEY/i.test(message)) {
    return {
      content: 'Gemini API key is missing. Add a valid free Gemini API key in the app setup.',
      retryable: false,
    };
  }

  if (/API key not valid|PERMISSION_DENIED|API_KEY_INVALID/i.test(message) || error?.code === 403) {
    return {
      content: 'Gemini API key is invalid or blocked for this app.',
      retryable: false,
    };
  }

  if (status === 'NOT_FOUND' || /not found/i.test(message)) {
    return {
      content: 'Selected Gemini model is unavailable. Switch to a supported free model.',
      retryable: false,
    };
  }

  return {
    content: copy.serverBusy,
    retryable: true,
  };
}

function getSocialReply(text, languageCode) {
  if (isGreetingOnly(text)) {
    if (languageCode === 'mr') {
      return 'नमस्कार! मी KisanAI आहे. शेती, हवामान, मंडी भाव, रोग-किड किंवा सरकारी योजनांबद्दल विचारा.';
    }

    if (languageCode === 'en') {
      return 'Hello! I am KisanAI. Ask me about crops, weather, mandi prices, pests, or government schemes.';
    }

    return 'नमस्ते! मैं KisanAI हूं। आप खेती, मौसम, मंडी भाव, कीट-रोग या सरकारी योजनाओं के बारे में पूछ सकते हैं।';
  }

  if (isGoodbyeOnly(text)) {
    if (languageCode === 'mr') {
      return 'ठीक आहे. पुन्हा कधीही शेतीसंबंधी मदत हवी असेल तर मला विचारा.';
    }

    if (languageCode === 'en') {
      return 'Sure. Come back anytime if you need help with farming.';
    }

    return 'ठीक है। खेती से जुड़ी मदद चाहिए हो तो कभी भी फिर पूछिए।';
  }

  if (isThanksOnly(text)) {
    if (languageCode === 'mr') {
      return 'स्वागत आहे. अजून काही शेतीसंबंधी मदत हवी असेल तर विचारा.';
    }

    if (languageCode === 'en') {
      return 'You are welcome. Ask anytime if you need more farming help.';
    }

    return 'आपका स्वागत है। और खेती से जुड़ी मदद चाहिए तो पूछिए।';
  }

  return null;
}

function ChatBotPanel({ embedded = false, closeChat = () => {} }) {
  const isOpen = true;
  const zones = useZoneStore((state) => state.zones);
  const farmName = useSettingsStore((state) => state.farmName);
  const district = useSettingsStore((state) => state.district);
  const cropZ1 = useSettingsStore((state) => state.cropZ1);
  const cropZ2 = useSettingsStore((state) => state.cropZ2);
  const initialLanguageRef = useRef(getInitialLanguage());

  const [language, setLanguage] = useState(initialLanguageRef.current);
  const [ttsEnabled, setTtsEnabled] = useState(getInitialTtsValue);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hwConfirm, setHwConfirm] = useState(null); // { cmd, message }
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const copy = UI_COPY[language] || UI_COPY.hi;
  const hasGeminiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY);
  const locale = getSpeechLang(language);
  const settings = useMemo(
    () => ({
      farmName,
      district,
      cropZ1,
      cropZ2,
    }),
    [cropZ1, cropZ2, district, farmName]
  );
  const initialMessages = useMemo(
    () => [buildWelcomeMessage(initialLanguageRef.current)],
    []
  );

  const { messages, apiMessages, appendMessage, removeMessage, resetMessages } = useChatHistory({
    storageKey: CHAT_STORAGE_KEY,
    maxMessages: 10,
    initialMessages,
  });

  const scrollAnchorRef = useRef(null);
  const inputRef = useRef(null);
  const retryRequestsRef = useRef(new Map());
  const draftSnapshotRef = useRef('');

  const farmContext = useMemo(
    () => formatZoneContext(zones, settings, language),
    [language, settings, zones]
  );

  const voice = useVoiceRecognition({
    language,
    onInterimTranscript: (transcript) => {
      if (transcript) {
        setDraft(transcript);
      }
    },
    onFinalTranscript: (transcript) => {
      const finalText = transcript.trim();
      if (!finalText) {
        return;
      }

      setDraft(finalText);
      void handleSend(finalText, { fromVoice: true });
    },
    onError: (message) => {
      if (message === 'Voice not detected, please try again') {
        showToast(copy.voiceNotDetected, 'warning');
      } else if (message === 'Microphone permission is blocked') {
        showToast(copy.micDenied, 'error');
      } else if (message === 'Voice not supported in this browser') {
        showToast(copy.voiceNotSupported, 'warning');
      } else {
        showToast(message, 'error');
      }

      setDraft(draftSnapshotRef.current);
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (_) {}
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(TTS_STORAGE_KEY, String(ttsEnabled));
    } catch (_) {}
  }, [ttsEnabled]);

  useEffect(() => {
    if (!messages.length) {
      resetMessages([buildWelcomeMessage(language)]);
    }
  }, [language, messages.length, resetMessages]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      voice.stopRecognition(true);
      voice.cancelSpeech();
      return;
    }

    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [isOpen, voice]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, isTyping, messages]);

  useEffect(() => {
    if (embedded) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeChat();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeChat, embedded]);

  // Auto-speak every assistant reply when TTS is enabled
  const speakReply = useCallback(async (text) => {
    if (ttsEnabled && text) {
      await voice.speak(text, true);
    }
  }, [ttsEnabled, voice]);

  // Hardware command executor — called after farmer confirms
  const executeHardwareCommand = useCallback((cmd) => {
    const mqttClient = window.__ks_mqtt__;
    if (!mqttClient) {
      showToast('Hardware not connected', 'warning');
      return;
    }
    if (cmd.intent === 'PUMP_ON' || cmd.intent === 'PUMP_OFF') {
      mqttClient.publishPump?.(cmd.zoneId, cmd.intent === 'PUMP_ON', 'voice');
      const zoneName = zones[cmd.zoneId]?.name || cmd.zoneId;
      const msg = cmd.intent === 'PUMP_ON'
        ? `${zoneName} सिंचाई शुरू हो गई`
        : `${zoneName} पंप बंद हो गया`;
      showToast(msg, 'success');
      speakReply(msg);
    } else if (cmd.intent === 'VALVE_OPEN' || cmd.intent === 'VALVE_CLOSE') {
      mqttClient.publishValve?.(cmd.zoneId, cmd.intent === 'VALVE_OPEN', 'voice');
    }
  }, [zones, speakReply]);

  const handleSend = async (overrideText, { fromVoice = false, retryPayload = null } = {}) => {
    const rawText = (overrideText ?? draft).trim();
    if (!rawText) {
      return;
    }

    // Check for hardware voice command first
    if (fromVoice || true) {
      const availableZones = Object.keys(zones);
      const hwCmd = parseFarmerCommand(rawText, availableZones);
      if (hwCmd && (hwCmd.intent === 'PUMP_ON' || hwCmd.intent === 'PUMP_OFF' || hwCmd.intent === 'VALVE_OPEN' || hwCmd.intent === 'VALVE_CLOSE')) {
        if (!retryPayload) {
          appendMessage({ role: 'user', content: rawText });
          setDraft('');
        }
        const confirmMsg = buildConfirmMessage(hwCmd, zones, language);
        // Show hardware confirm dialog
        setHwConfirm({ cmd: hwCmd, message: confirmMsg });
        appendMessage({ role: 'assistant', content: confirmMsg });
        await speakReply(confirmMsg);
        return;
      }
    }

    const responseLanguage = detectLanguage(rawText, language);
    const socialReply = getSocialReply(rawText, responseLanguage);

    const conversation =
      retryPayload?.conversation ||
      [
        ...apiMessages,
        {
          role: 'user',
          content: rawText,
        },
      ];

    if (!retryPayload) {
      appendMessage({
        role: 'user',
        content: rawText,
      });
    }

    setDraft('');
    setIsTyping(true);

    try {
      if (!isOnline) {
        const offlineReply = offlineKrishiResponse(
          rawText,
          farmContext?.zones,
          farmContext?.weather,
          responseLanguage
        );
        appendMessage({ role: 'assistant', content: offlineReply });
        await speakReply(offlineReply);
        if (fromVoice) voice.restartIfArmed();
        return;
      }

      if (!retryPayload && socialReply) {
        appendMessage({
          role: 'assistant',
          content: socialReply,
        });
        await speakReply(socialReply);
        if (fromVoice) voice.restartIfArmed();
        return;
      }

      if (!hasGeminiKey) {
        throw new Error('missing_key');
      }

      const reply = await sendKisanChat({
        messages: conversation,
        preferredLanguage: responseLanguage,
        farmContext,
      });

      appendMessage({
        role: 'assistant',
        content: reply.text,
        sources: reply.sources,
        grounded: reply.grounded,
      });

      // Auto-speak every reply (not just voice-triggered)
      await speakReply(reply.text);
      if (fromVoice) voice.restartIfArmed();
    } catch (error) {
      const retryKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const isOfflineError = error.message === 'offline';
      const errorState = isOfflineError
        ? { content: copy.offline, retryable: false }
        : getChatErrorState(error, copy);

      retryRequestsRef.current.set(retryKey, {
        conversation,
        text: rawText,
        fromVoice,
      });

      appendMessage({
        role: 'assistant',
        content: errorState.content,
        error: true,
        retryable: errorState.retryable,
        retryKey,
      });

      if (fromVoice && errorState.retryable) {
        voice.restartIfArmed();
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = (retryKey, errorMessageId) => {
    const payload = retryRequestsRef.current.get(retryKey);
    if (!payload) {
      return;
    }

    removeMessage(errorMessageId);
    retryRequestsRef.current.delete(retryKey);
    void handleSend(payload.text, { fromVoice: payload.fromVoice, retryPayload: payload });
  };

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    showToast(`Language switched to ${nextLanguage.toUpperCase()}`, 'info');
  };

  const handleVoiceClick = () => {
    if (!voice.supported) {
      showToast(copy.voiceNotSupported, 'warning');
      return;
    }

    if (!voice.isArmed && !voice.isListening) {
      draftSnapshotRef.current = draft;
    }

    voice.toggleListening();
  };

  const quickReplies = QUICK_REPLIES[language] || QUICK_REPLIES.hi;
  const showQuickReplies =
    isOpen && messages.filter((message) => !message.isWelcome).length === 0 && !isTyping;

  return (
    <>
      {!embedded && isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[1px]"
          onClick={closeChat}
          aria-label={copy.close}
        />
      )}

      <div
        className={`${
          embedded
            ? 'relative h-full w-full'
            : 'kisan-chat-dock'
        }`}
      >
        <div
          className={`kisan-chat-panel ${embedded ? 'kisan-chat-panel-embedded' : ''} transition-all duration-300 ${
            isOpen || embedded
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-6 opacity-0'
          }`}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-[#F4F7F1] shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
            <div className="border-b border-border bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                    <h2 className="text-base font-black text-text-primary">KisanAI</h2>
                    <span className="rounded-full bg-[#ecf7ed] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#1a3d1a]">
                      {language === 'mr' ? 'सक्रिय' : language === 'en' ? 'Active' : 'सक्रिय'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{copy.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTtsEnabled((value) => !value)}
                    className="rounded-full border border-border bg-white p-2 text-text-secondary hover:text-primary"
                    aria-label={ttsEnabled ? 'Turn speaker off' : 'Turn speaker on'}
                    title={ttsEnabled ? 'Speaker on' : 'Speaker off'}
                  >
                    {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  {!embedded && (
                    <button
                      type="button"
                      onClick={closeChat}
                      className="rounded-full border border-border bg-white p-2 text-text-secondary hover:text-primary"
                      aria-label={copy.close}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-full border border-border bg-[#F7FAF5] p-1">
                  {getChatLanguages().map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleLanguageChange(item.code)}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        language === item.code
                          ? 'bg-primary text-white'
                          : 'text-text-secondary hover:text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {!isOnline && (
                  <div className="flex items-center gap-1 rounded-full bg-[#FFF2E8] px-3 py-1 text-[11px] font-bold text-[#B45309]">
                    <WifiOff size={13} />
                    <span>{copy.offline}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {showQuickReplies && (
                <div className="mb-4">
                  <QuickReplies replies={quickReplies} onSelect={(value) => void handleSend(value)} />
                </div>
              )}

              <div className="flex flex-col gap-3">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    locale={locale}
                    sourceLabel={copy.sources}
                    retryLabel={copy.retry}
                    onRetry={handleRetry}
                  />
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                        <span className="text-xs font-medium text-text-secondary">{copy.typing}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={scrollAnchorRef} />
              </div>
            </div>

            {/* Hardware confirm dialog */}
            {hwConfirm && (
              <div className="border-t border-border bg-[#fffbeb] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                    <Zap size={16} className="text-amber-700" />
                  </div>
                  <p className="flex-1 text-sm font-bold text-amber-900">{hwConfirm.message}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      executeHardwareCommand(hwConfirm.cmd);
                      setHwConfirm(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1a3d1a] py-2.5 text-xs font-black text-white"
                  >
                    <CheckCircle2 size={14} />
                    {language === 'mr' ? 'हो, करा' : language === 'en' ? 'Yes, do it' : 'हाँ, करें'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHwConfirm(null)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-xs font-black text-text-secondary"
                  >
                    {language === 'mr' ? 'नाही' : language === 'en' ? 'Cancel' : 'रद्द करें'}
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-border bg-white px-4 py-3">
              <div className="mb-2 min-h-[18px] text-xs text-text-secondary">
                {voice.isListening && draft ? draft : ''}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-[22px] border border-border bg-[#F7FAF5] px-4 py-3 shadow-inner">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={copy.placeholder}
                    rows={1}
                    className="max-h-28 w-full resize-none border-none bg-transparent text-sm leading-6 text-text-primary outline-none"
                  />
                </div>

                <VoiceButton
                  supported={voice.supported}
                  isListening={voice.isListening}
                  isActive={voice.isArmed}
                  onClick={handleVoiceClick}
                  tooltip={copy.voiceNotSupported}
                  disabled={isTyping}
                />

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || isTyping}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                    draft.trim() && !isTyping
                      ? 'bg-primary text-white shadow-md hover:opacity-90'
                      : 'bg-[#E5E7EB] text-[#94A3B8]'
                  }`}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ChatBot({ embedded = false }) {
  const widgetIsOpen = useChatWidgetStore((state) => state.isOpen);
  const widgetOpen = useChatWidgetStore((state) => state.open);
  const widgetClose = useChatWidgetStore((state) => state.close);
  const isOpen = embedded ? true : widgetIsOpen;
  const openChat = embedded ? NOOP : widgetOpen;
  const closeChat = embedded ? NOOP : widgetClose;
  const launcherCopy = UI_COPY.hi;

  if (!embedded && !isOpen) {
    return (
      <div className="kisan-chat-dock">
        <button
          type="button"
          onClick={openChat}
          className="kisan-chat-launcher shadow-xl"
          aria-label={launcherCopy.open}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2E7D32] to-[#174A1B] text-white">
            <MessageCircle size={24} />
          </span>
          <span className="kisan-chat-launcher-label">{launcherCopy.launcher}</span>
        </button>
      </div>
    );
  }

  return <ChatBotPanel embedded={embedded} closeChat={closeChat} />;
}

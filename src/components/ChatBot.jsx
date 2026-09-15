import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AudioLines, KeyRound, MessageCircle, Mic, Plus, Send, Volume2, VolumeX, X, WifiOff, Zap, CheckCircle2 } from 'lucide-react';
import { sendKisanChat } from '../api/kisanChat.js';
import { sendPuterChat } from '../api/puterChat.js';
import { sendOpenAiVoiceChat } from '../api/openaiVoiceChat.js';
import { offlineKrishiResponse } from '../ai-ml/offlineKrishi.js';
import { createChatMessage, useChatHistory } from '../hooks/useChatHistory.js';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useModeStore } from '../store/modeStore.js';
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
const TTS_STORAGE_KEY = 'kisanai-chat-tts';

const UI_COPY = {
  hi: {
    welcome:
      'नमस्ते! मैं Krishi AI हूं, आपका खेत साथी। अपनी फसल, मंडी भाव, मौसम, रोग या सरकारी योजना के बारे में बोलकर या लिखकर पूछिए।',
    placeholder: 'अपना सवाल लिखें या बोलें...',
    typing: 'Krishi AI जवाब तैयार कर रहा है...',
    offline: 'No internet connection',
    retry: 'Retry',
    sources: 'Sources',
    launcher: 'Krishi AI',
    subtitle: 'आपका सुनने वाला खेत साथी',
    agentHint: 'माइक दबाकर प्राकृतिक भाषा में बात करें',
    listening: 'Krishi सुन रहा है…',
    advancedVoice: 'उन्नत वॉइस मोड शुरू करें',
    endVoice: 'वॉइस मोड बंद करें',
    voiceModeHint: 'बोलें, जवाब सुनें, फिर अगला सवाल बोलें',
    voiceReady: 'अपने खेत के बारे में कुछ भी बोलें',
    voiceActionSafety: 'सिंचाई और वाल्व कमांड पहले आपकी पुष्टि मांगते हैं',
    voiceGreeting: 'नमस्ते! मैं Krishi हूं। आज आपके खेत में मैं कैसे मदद कर सकता हूं?',
    voiceNotSupported: 'Voice not supported in this browser',
    voiceNotDetected: 'Voice not detected, please try again',
    serverBusy: 'Server busy, please retry',
    micDenied: 'Microphone permission is blocked',
    open: 'Open Krishi AI',
    close: 'Close Krishi AI',
  },
  en: {
    welcome:
      'Hello! I am Krishi AI, your farm companion. Speak or type naturally about your crops, mandi prices, weather, pests, or government schemes.',
    placeholder: 'Type or speak your farming question...',
    typing: 'Krishi AI is preparing a live answer...',
    offline: 'No internet connection',
    retry: 'Retry',
    sources: 'Sources',
    launcher: 'Krishi AI',
    subtitle: 'Your listening farm companion',
    agentHint: 'Tap the mic and talk naturally',
    listening: 'Krishi is listening…',
    advancedVoice: 'Start advanced voice mode',
    endVoice: 'End voice mode',
    voiceModeHint: 'Speak, hear the reply, then ask your next question',
    voiceReady: 'Talk naturally about anything on your farm',
    voiceActionSafety: 'Irrigation and valve commands always need your approval',
    voiceGreeting: 'Hello, I am Krishi. How can I help with your farm today?',
    voiceNotSupported: 'Voice not supported in this browser',
    voiceNotDetected: 'Voice not detected, please try again',
    serverBusy: 'Server busy, please retry',
    micDenied: 'Microphone permission is blocked',
    open: 'Open Krishi AI',
    close: 'Close Krishi AI',
  },
  mr: {
    welcome:
      'नमस्कार! मी Krishi AI आहे, तुमचा शेत साथी. पीक, मंडी भाव, हवामान, रोग किंवा सरकारी योजनांबद्दल बोलून किंवा लिहून विचारा.',
    placeholder: 'तुमचा शेतीचा प्रश्न लिहा किंवा बोला...',
    typing: 'Krishi AI थेट माहिती तपासत आहे...',
    offline: 'No internet connection',
    retry: 'Retry',
    sources: 'Sources',
    launcher: 'Krishi AI',
    subtitle: 'तुमचा ऐकणारा शेत साथी',
    agentHint: 'माइक दाबा आणि सहजपणे बोला',
    listening: 'Krishi ऐकत आहे…',
    advancedVoice: 'अॅडव्हान्स व्हॉइस मोड सुरू करा',
    endVoice: 'व्हॉइस मोड बंद करा',
    voiceModeHint: 'बोला, उत्तर ऐका आणि पुढचा प्रश्न विचारा',
    voiceReady: 'तुमच्या शेताबद्दल काहीही सहजपणे बोला',
    voiceActionSafety: 'सिंचन आणि वाल्व कमांडसाठी नेहमी तुमची पुष्टी लागते',
    voiceGreeting: 'नमस्कार! मी Krishi आहे. आज तुमच्या शेतासाठी मी कशी मदत करू?',
    voiceNotSupported: 'Voice not supported in this browser',
    voiceNotDetected: 'Voice not detected, please try again',
    serverBusy: 'Server busy, please retry',
    micDenied: 'Microphone permission is blocked',
    open: 'Open Krishi AI',
    close: 'Close Krishi AI',
  },
};

const QUICK_REPLIES = {
  hi: ['मेरी फसल के लिए सलाह', 'आज का मंडी भाव', 'Pest control tips', 'PM Kisan status'],
  en: ['Advice for my crop', "Today's mandi price", 'Pest control tips', 'PM Kisan status'],
  mr: ['माझ्या पिकासाठी सल्ला', 'आजचा मंडी भाव', 'Pest control tips', 'PM Kisan status'],
};

const VOICE_COMMAND_EXAMPLES = {
  hi: [
    'Zone one pump चालू करा',
    'Zone two pump बंद करा',
    'झोन एक पंप सुरू करा',
    'झोन दोन पंप बंद करा',
  ],
  en: [
    'Zone one pump on',
    'Zone two pump off',
    'Turn on zone one pump',
    'Stop zone two pump',
  ],
  mr: [
    'Zone one pump चालू करा',
    'Zone two pump बंद करा',
    'झोन एक पंप सुरू करा',
    'झोन दोन पंप बंद करा',
  ],
};

const NOOP = () => {};

function cleanAssistantText(value) {
  return String(value || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$|[.,!?])/gm, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '• ')
    .replace(/\*+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getSpokenDecision(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return null;

  if (/^(yes|yeah|yep|haan|ha|haanji|ji\s*haan|हाँ|हां|हाँ\s*जी|हा|हो|होय|बरं|बर|करा)(?:\s|$)/u.test(normalized)) return true;
  if (/^(no|nope|nah|nahi|nahin|nahi\s*karna|नहीं|नही|ना|नको|नाही|थांबा|थांबवा)(?:\s|$)/u.test(normalized)) return false;
  return null;
}

function buildWelcomeMessage(language) {
  return createChatMessage({
    role: 'assistant',
    content: UI_COPY[language]?.welcome || UI_COPY.hi.welcome,
    isWelcome: true,
  });
}

function getInitialTtsValue() {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.sessionStorage.getItem(TTS_STORAGE_KEY) !== 'false';
  } catch {
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

function shouldUseOfflineFallback(error) {
  const status = error?.status;
  const message = String(error?.message || '');
  return (
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'MISSING_API_KEY' ||
    error?.code === 429 ||
    /quota|Missing VITE_GEMINI_API_KEY|Gemini request failed|API key/i.test(message)
  );
}

function getSocialReply(text, languageCode) {
  if (isGreetingOnly(text)) {
    if (languageCode === 'mr') {
      return 'नमस्कार! मी Krishi AI आहे. शेती, हवामान, मंडी भाव, रोग-किड किंवा सरकारी योजनांबद्दल विचारा.';
    }

    if (languageCode === 'en') {
      return 'Hello! I am Krishi AI. Ask me about crops, weather, mandi prices, pests, or government schemes.';
    }

    return 'नमस्ते! मैं Krishi AI हूं। आप खेती, मौसम, मंडी भाव, कीट-रोग या सरकारी योजनाओं के बारे में पूछ सकते हैं।';
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

function ChatBotPanel({ embedded = false, closeChat = () => {}, startVoice = false }) {
  const isOpen = true;
  const zones = useZoneStore((state) => state.zones);
  const farmName = useSettingsStore((state) => state.farmName);
  const district = useSettingsStore((state) => state.district);
  const cropZ1 = useSettingsStore((state) => state.cropZ1);
  const cropZ2 = useSettingsStore((state) => state.cropZ2);
  const controlMode = useModeStore((state) => state.mode);
  const appLanguage = useSettingsStore((state) => state.language) || 'hi';
  const setAppLanguage = useSettingsStore((state) => state.setLanguage);
  const language = appLanguage;
  const [ttsEnabled, setTtsEnabled] = useState(getInitialTtsValue);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hwConfirm, setHwConfirm] = useState(null); // { cmd, message }
  const [isVoiceExperience, setIsVoiceExperience] = useState(startVoice);
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
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
  const initialMessages = useMemo(() => [buildWelcomeMessage(appLanguage)], [appLanguage]);

  const { messages, apiMessages, appendMessage, removeMessage, resetMessages } = useChatHistory({
    storageKey: CHAT_STORAGE_KEY,
    maxMessages: 10,
    initialMessages,
    language,
  });

  const scrollAnchorRef = useRef(null);
  const inputRef = useRef(null);
  const retryRequestsRef = useRef(new Map());
  const draftSnapshotRef = useRef('');
  const voiceGreetingStartedRef = useRef(false);

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
      window.sessionStorage.setItem(TTS_STORAGE_KEY, String(ttsEnabled));
    } catch {
      // Browser storage can be unavailable in private or restricted sessions.
    }
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
  const speakReply = useCallback(async (text, responseLanguage = language) => {
    // Entering advanced voice mode is an explicit request for a spoken
    // conversation, including confirmation and error replies. It must not go
    // silent just because the normal chat sound preference was previously off.
    if ((ttsEnabled || isVoiceExperience) && text) {
      await voice.speak(cleanAssistantText(text), true, responseLanguage);
    }
  }, [isVoiceExperience, language, ttsEnabled, voice]);

  // Hardware command executor — called only after an explicit farmer confirmation.
  const executeHardwareCommand = useCallback(async (cmd) => {
    const mqttClient = window.__ks_mqtt__;
    const responseLanguage = cmd?.responseLanguage || language;
    if (controlMode !== 'act') {
      const modeMessage = responseLanguage === 'mr'
        ? 'सिंचन नियंत्रित करण्यासाठी आधी ACT मोड सुरू करा.'
        : responseLanguage === 'en'
        ? 'Please switch to ACT mode before controlling irrigation.'
        : 'सिंचाई नियंत्रित करने के लिए पहले ACT मोड चालू करें।';
      showToast(modeMessage, 'warning');
      await speakReply(modeMessage, responseLanguage);
      return false;
    }

    if (!mqttClient || !cmd?.zoneId || !zones[cmd.zoneId]) {
      const unavailable = responseLanguage === 'mr'
        ? 'हार्डवेअर कनेक्ट नाही. पंप कमांड पाठवता आली नाही.'
        : responseLanguage === 'en'
        ? 'Hardware is not connected, so I could not send the pump command.'
        : 'हार्डवेयर कनेक्ट नहीं है, इसलिए पंप कमांड नहीं भेजी जा सकी।';
      showToast(unavailable, 'warning');
      await speakReply(unavailable, responseLanguage);
      return false;
    }

    const zoneName = zones[cmd.zoneId]?.name || cmd.zoneId;
    if (cmd.intent === 'PUMP_ON' || cmd.intent === 'PUMP_OFF') {
      const turnOn = cmd.intent === 'PUMP_ON';
      const pumpSent = mqttClient.publishPump?.(cmd.zoneId, turnOn, 'voice');
      const valveSent = mqttClient.publishValve?.(cmd.zoneId, turnOn, 'voice');
      if (!pumpSent && !valveSent) {
        const unavailable = responseLanguage === 'mr'
          ? 'हार्डवेअर कनेक्ट नाही. पंप कमांड पाठवता आली नाही.'
          : responseLanguage === 'en'
          ? 'Hardware is not connected, so I could not send the pump command.'
          : 'हार्डवेयर कनेक्ट नहीं है, इसलिए पंप कमांड नहीं भेजी जा सकी।';
        showToast(unavailable, 'warning');
        await speakReply(unavailable, responseLanguage);
        return false;
      }

      const msg = responseLanguage === 'mr'
        ? `${zoneName} मध्ये सिंचन ${turnOn ? 'सुरू झाले' : 'बंद झाले'}`
        : responseLanguage === 'en'
        ? `Irrigation ${turnOn ? 'started' : 'stopped'} for ${zoneName}.`
        : `${zoneName} सिंचाई ${turnOn ? 'शुरू हो गई' : 'बंद हो गई'}`;
      showToast(msg, 'success');
      await speakReply(msg, responseLanguage);
      return true;
    } else if (cmd.intent === 'VALVE_OPEN' || cmd.intent === 'VALVE_CLOSE') {
      const open = cmd.intent === 'VALVE_OPEN';
      const sent = mqttClient.publishValve?.(cmd.zoneId, open, 'voice');
      if (!sent) {
        const unavailable = responseLanguage === 'mr'
          ? 'हार्डवेअर कनेक्ट नाही. वाल्व कमांड पाठवता आली नाही.'
          : responseLanguage === 'en'
          ? 'Hardware is not connected, so I could not send the valve command.'
          : 'हार्डवेयर कनेक्ट नहीं है, इसलिए वाल्व कमांड नहीं भेजी जा सकी।';
        showToast(unavailable, 'warning');
        await speakReply(unavailable, responseLanguage);
        return false;
      }

      const msg = responseLanguage === 'mr'
        ? `${zoneName} चा वाल्व ${open ? 'उघडला' : 'बंद झाला'}`
        : responseLanguage === 'en'
        ? `Valve ${open ? 'opened' : 'closed'} for ${zoneName}.`
        : `${zoneName} का वाल्व ${open ? 'खुल गया' : 'बंद हो गया'}`;
      showToast(msg, 'success');
      await speakReply(msg, responseLanguage);
      return true;
    }
    return false;
  }, [controlMode, language, zones, speakReply]);

  const handleSend = async (overrideText, { fromVoice = false, retryPayload = null } = {}) => {
    const rawText = (overrideText ?? draft).trim();
    if (!rawText) {
      return;
    }

    // Advanced voice mode keeps a short, safe command conversation alive:
    // request -> zone -> explicit yes/no. No hardware action occurs before yes.
    if (fromVoice && hwConfirm) {
      if (hwConfirm.awaitingZone) {
        const selectedCommand = parseFarmerCommand(
          `${hwConfirm.cmd.raw} ${rawText}`,
          Object.keys(zones)
        );

        if (selectedCommand?.zoneId) {
          const responseLanguage = hwConfirm.cmd.responseLanguage || detectLanguage(rawText, language);
          const commandWithLanguage = { ...selectedCommand, responseLanguage };
          const confirmMsg = buildConfirmMessage(commandWithLanguage, zones, responseLanguage);
          appendMessage({ role: 'user', content: rawText });
          appendMessage({ role: 'assistant', content: confirmMsg });
          setHwConfirm({ cmd: commandWithLanguage, message: confirmMsg, awaitingZone: false });
          await speakReply(confirmMsg, responseLanguage);
          voice.restartIfArmed();
          return;
        }

        const responseLanguage = hwConfirm.cmd.responseLanguage || language;
        const zonePrompt = buildConfirmMessage(hwConfirm.cmd, zones, responseLanguage);
        appendMessage({ role: 'assistant', content: zonePrompt });
        await speakReply(zonePrompt, responseLanguage);
        voice.restartIfArmed();
        return;
      }

      const decision = getSpokenDecision(rawText);
      if (decision !== null) {
        appendMessage({ role: 'user', content: rawText });
        const command = hwConfirm.cmd;
        setHwConfirm(null);
        if (decision) {
          await executeHardwareCommand(command);
        } else {
          const responseLanguage = command.responseLanguage || language;
          const cancelled = responseLanguage === 'mr' ? 'ठीक आहे, कमांड रद्द केली.' : responseLanguage === 'en' ? 'Okay, I cancelled that command.' : 'ठीक है, कमांड रद्द कर दी।';
          appendMessage({ role: 'assistant', content: cancelled });
          await speakReply(cancelled, responseLanguage);
        }
        voice.restartIfArmed();
        return;
      }
    }

    // Check typed and spoken hardware commands before sending a request to the AI service.
    {
      const availableZones = Object.keys(zones);
      const parsedCommand = parseFarmerCommand(rawText, availableZones);
      const hwCmd = parsedCommand
        ? { ...parsedCommand, responseLanguage: detectLanguage(rawText, language) }
        : null;
      if (hwCmd && (hwCmd.intent === 'PUMP_ON' || hwCmd.intent === 'PUMP_OFF' || hwCmd.intent === 'VALVE_OPEN' || hwCmd.intent === 'VALVE_CLOSE')) {
        if (!retryPayload) {
          appendMessage({ role: 'user', content: rawText });
          setDraft('');
        }
        const confirmMsg = buildConfirmMessage(hwCmd, zones, hwCmd.responseLanguage);
        // Keep the spoken dialogue active if Krishi still needs the zone.
        setHwConfirm({ cmd: hwCmd, message: confirmMsg, awaitingZone: !hwCmd.zoneId });
        appendMessage({ role: 'assistant', content: confirmMsg });
        await speakReply(confirmMsg, hwCmd.responseLanguage);
        if (fromVoice) voice.restartIfArmed();
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

      if (!hasGeminiKey && !openAiApiKey.trim() && typeof window !== 'undefined' && !window.puter?.ai?.chat) {
        throw new Error('missing_key');
      }

      let reply;
      if (openAiApiKey.trim()) {
        reply = await sendOpenAiVoiceChat({
          apiKey: openAiApiKey,
          messages: conversation,
          preferredLanguage: responseLanguage,
          farmContext,
        });
      } else {
        try {
          reply = await sendPuterChat({
            messages: conversation,
            preferredLanguage: responseLanguage,
            farmContext,
          });
        } catch (puterError) {
          if (!hasGeminiKey) throw puterError;
          reply = await sendKisanChat({
            messages: conversation,
            preferredLanguage: responseLanguage,
            farmContext,
          });
        }
      }

      const assistantText = cleanAssistantText(reply.text);
      appendMessage({
        role: 'assistant',
        content: assistantText,
        sources: reply.sources,
        grounded: reply.grounded,
      });

      // Auto-speak every reply (not just voice-triggered)
      await speakReply(assistantText);
      if (fromVoice) voice.restartIfArmed();
    } catch (error) {
      if (shouldUseOfflineFallback(error)) {
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
    setAppLanguage(nextLanguage);
    showToast(`Language switched to ${nextLanguage.toUpperCase()}`, 'info');
  };

  const handleVoiceClick = () => {
    if (!voice.supported) {
      showToast(copy.voiceNotSupported, 'warning');
      return;
    }

    if (!voice.isArmed && !voice.isListening) {
      draftSnapshotRef.current = draft;
    } else {
      voiceGreetingStartedRef.current = false;
    }

    voice.toggleListening();
  };

  const startVoiceConversation = useCallback(async () => {
    if (voiceGreetingStartedRef.current) {
      return;
    }

    voiceGreetingStartedRef.current = true;
    // The greeting is intentionally spoken even when normal chat sound is off:
    // entering Voice mode is an explicit request for an audible conversation.
    await voice.speak(copy.voiceGreeting, true);

    if (!voice.isArmed && !voice.isListening) {
      draftSnapshotRef.current = draft;
      voice.toggleListening();
    }
  }, [copy.voiceGreeting, draft, voice]);

  const openAdvancedVoice = () => {
    setIsVoiceExperience(true);
    void startVoiceConversation();
  };

  const closeAdvancedVoice = () => {
    setIsVoiceExperience(false);
    voiceGreetingStartedRef.current = false;
    voice.stopRecognition(true);
    voice.cancelSpeech();
  };

  useEffect(() => {
    if (!startVoice || voiceGreetingStartedRef.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void startVoiceConversation();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [startVoice, startVoiceConversation]);

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
                    <h2 className="text-base font-black text-text-primary">Krishi AI</h2>
                    <span className="rounded-full bg-[#ecf7ed] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#1a3d1a]">
                      {language === 'mr' ? 'सक्रिय' : language === 'en' ? 'Active' : 'सक्रिय'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{copy.subtitle}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${voice.isListening ? 'text-primary' : 'text-slate-500'}`}>
                    {voice.isListening ? copy.listening : copy.agentHint}
                  </p>
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

              <button
                type="button"
                onClick={openAdvancedVoice}
                disabled={!voice.supported || isTyping}
                className={`mt-3 flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition ${
                  voice.isArmed
                    ? 'border-primary/35 bg-primary/10 text-primary'
                    : 'border-emerald-200 bg-[#f3fbf4] text-[#1a6030] hover:bg-[#e7f6e9]'
                } ${!voice.supported || isTyping ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span className="flex items-center gap-2 text-xs font-black"><Mic size={15} /> {voice.isArmed ? copy.endVoice : copy.advancedVoice}</span>
                <span className="text-[10px] font-semibold opacity-75">{voice.isArmed ? copy.listening : copy.voiceModeHint}</span>
              </button>

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
                {[buildWelcomeMessage(language), ...messages.filter((message) => !message.isWelcome)].map((message) => (
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
                {hwConfirm.awaitingZone ? (
                  <button
                    type="button"
                    onClick={() => setHwConfirm(null)}
                    className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-black text-text-secondary"
                  >
                    {language === 'mr' ? 'रद्द करा' : language === 'en' ? 'Cancel command' : 'कमांड रद्द करें'}
                  </button>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void executeHardwareCommand(hwConfirm.cmd);
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
                )}
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

      {isVoiceExperience && (
        <div className="fixed inset-0 z-[200] flex min-h-[100dvh] flex-col overflow-hidden bg-[#080a0b] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(44,111,71,0.24),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(66,105,174,0.13),transparent_28%)]" />
          <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
            <div className="flex items-center gap-2 text-base font-black tracking-tight">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><AudioLines size={17} /></span>
              Krishi Voice
            </div>
            <button
              type="button"
              onClick={closeAdvancedVoice}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label={language === 'en' ? 'Exit voice mode' : 'Exit voice mode'}
            >
              <X size={20} />
            </button>
          </header>

          <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-32 text-center">
            <div className={`krishi-voice-orb ${voice.isListening ? 'krishi-voice-orb-listening' : ''} mb-8`} aria-hidden="true">
              <div className="krishi-voice-orb-core"><AudioLines size={38} strokeWidth={1.7} /></div>
            </div>
            <p className="max-w-xl text-2xl font-medium tracking-tight text-white sm:text-3xl">
              {hwConfirm?.message || (voice.isListening ? (draft || copy.listening) : copy.voiceReady)}
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/55">{copy.voiceActionSafety}</p>

            <div className="mt-6 w-full max-w-md rounded-[24px] border border-emerald-300/15 bg-white/[0.08] p-4 text-left shadow-2xl backdrop-blur">
              <p className="text-sm font-black text-emerald-200">
                {language === 'mr' ? 'असे बोलून पाहा' : language === 'en' ? 'Try saying' : 'ऐसे बोलकर देखें'}
              </p>
              <div className="mt-3 grid gap-2">
                {(VOICE_COMMAND_EXAMPLES[language] || VOICE_COMMAND_EXAMPLES.hi).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setDraft(example)}
                    className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-left text-sm font-bold text-white/90 transition hover:bg-white/10"
                  >
                    “{example}”
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-white/45">
                {language === 'mr'
                  ? 'टीप: “one/two” हळू बोला. Chrome कधी कधी 1 आणि 2 चुकीचे ऐकतो.'
                  : language === 'en'
                    ? 'Tip: say “one/two” slowly. Chrome sometimes hears digits incorrectly.'
                    : 'Tip: “one/two” धीरे बोलें। Chrome कभी-कभी 1 और 2 गलत सुनता है.'}
              </p>
            </div>

            {hwConfirm && !hwConfirm.awaitingZone && (
              <div className="mt-7 flex w-full max-w-sm gap-3 rounded-[24px] border border-amber-300/20 bg-amber-200/10 p-3">
                <button
                  type="button"
                  onClick={() => {
                    void executeHardwareCommand(hwConfirm.cmd);
                    setHwConfirm(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-[#06240f] transition hover:bg-emerald-400"
                >
                  <CheckCircle2 size={17} /> {language === 'mr' ? 'हो, करा' : language === 'en' ? 'Yes, start' : 'हाँ, शुरू करें'}
                </button>
                <button
                  type="button"
                  onClick={() => setHwConfirm(null)}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/20"
                >
                  {language === 'mr' ? 'नाही' : language === 'en' ? 'Cancel' : 'रद्द करें'}
                </button>
              </div>
            )}
          </main>

          <form
            className="relative z-10 mx-auto mb-7 flex w-[min(94vw,760px)] items-center gap-2 rounded-[28px] border border-white/10 bg-white/[0.12] px-3 py-2 shadow-2xl backdrop-blur-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <button
              type="button"
              onClick={() => setShowOpenAiKey((visible) => !visible)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${showOpenAiKey ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`}
              aria-label="OpenAI API key settings"
              title="OpenAI API key settings"
            >
              <Plus size={22} />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={copy.placeholder}
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-white/45"
              aria-label={copy.placeholder}
            />
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={!voice.supported || isTyping}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${voice.isListening ? 'bg-emerald-400 text-[#05250f] shadow-[0_0_0_8px_rgba(74,222,128,0.14)]' : 'bg-white/10 text-white hover:bg-white/20'} ${!voice.supported || isTyping ? 'cursor-not-allowed opacity-50' : ''}`}
              aria-label={voice.isListening ? 'Stop listening' : 'Start listening'}
            >
              {voice.isListening ? <AudioLines size={22} /> : <Mic size={21} />}
            </button>
            <button
              type="submit"
              disabled={!draft.trim() || isTyping}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#111] transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Send message"
            >
              <Send size={19} />
            </button>
          </form>

          {showOpenAiKey && (
            <div className="relative z-10 mx-auto -mt-4 mb-7 w-[min(94vw,760px)] rounded-2xl border border-white/10 bg-[#17191c]/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-black text-white"><KeyRound size={14} className="text-emerald-300" /> OpenAI key · gpt-4o-mini</p>
                {openAiApiKey && (
                  <button type="button" onClick={() => setOpenAiApiKey('')} className="text-[11px] font-bold text-white/60 hover:text-white">Clear</button>
                )}
              </div>
              <input
                type="password"
                value={openAiApiKey}
                onChange={(event) => setOpenAiApiKey(event.target.value)}
                placeholder="Paste your OpenAI API key for this session"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/60"
              />
              <p className="mt-2 text-[10px] leading-4 text-white/45">Used only in this browser session. Never saved to this device or project. Use a server-side proxy before publishing this app.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function ChatBot({ embedded = false, startVoice = false }) {
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

  return <ChatBotPanel embedded={embedded} closeChat={closeChat} startVoice={startVoice} />;
}

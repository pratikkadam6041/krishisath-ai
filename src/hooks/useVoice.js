import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseVoiceCommand, INTENTS } from '../ai-ml/nlpParser.js';

const LANG_CODES = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' };

export function useVoice({ onCommand } = {}) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [supported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const recogRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const speak = useCallback((text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = LANG_CODES[i18n.language] || 'mr-IN';
    utt.rate = 0.9;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    synthRef.current.speak(utt);
  }, [i18n.language]);

  const stopListening = useCallback(() => {
    if (recogRef.current) { try { recogRef.current.stop(); } catch (_) {} }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SR();
    recogRef.current = recog;
    recog.lang = LANG_CODES[i18n.language] || 'mr-IN';
    recog.continuous = false;
    recog.interimResults = false;

    recog.onstart = () => setListening(true);
    recog.onend   = () => setListening(false);
    recog.onerror = (e) => { console.warn('[Voice] Error:', e.error); setListening(false); };

    recog.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setProcessing(true);

      const parsed = parseVoiceCommand(text);
      setProcessing(false);

      if (parsed.intent === INTENTS.CONFIRM || parsed.intent === INTENTS.CANCEL) {
        if (onCommand) onCommand(parsed);
        return;
      }

      if (parsed.intent && onCommand) {
        onCommand(parsed);
      } else {
        speak(t('voice.notUnderstood'));
      }
    };

    try { recog.start(); } catch (e) { console.warn('[Voice] Start error:', e); }
  }, [supported, i18n.language, speak, t, onCommand]);

  return {
    supported,
    listening,
    processing,
    transcript,
    startListening,
    stopListening,
    speak,
    langCode: LANG_CODES[i18n.language] || 'mr-IN',
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechLang } from '../utils/languageDetect.js';

export function useVoiceRecognition({
  language = 'hi',
  onInterimTranscript,
  onFinalTranscript,
  onError,
} = {}) {
  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const [isListening, setIsListening] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef(null);
  const finalCapturedRef = useRef(false);
  const manualStopRef = useRef(false);

  const emitError = useCallback(
    (message) => {
      onError?.(message);
    },
    [onError]
  );

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopRecognition = useCallback((disarm = true) => {
    manualStopRef.current = true;

    if (disarm) {
      setIsArmed(false);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // The browser may already have ended recognition.
      }
    }

    setIsListening(false);
  }, []);

  const createRecognition = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();

    recognition.lang = getSpeechLang(language);
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      finalCapturedRef.current = false;
      manualStopRef.current = false;
      setInterimTranscript('');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const interimText = results
        .filter((result) => !result.isFinal)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      const finalText = results
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      const nextTranscript = finalText || interimText;
      setInterimTranscript(nextTranscript);
      onInterimTranscript?.(nextTranscript);

      if (finalText) {
        finalCapturedRef.current = true;
        onFinalTranscript?.(finalText);

        try {
          recognition.stop();
        } catch {
          // Recognition has already reached its final result.
        }
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (event.error === 'aborted') {
        return;
      }

      setIsArmed(false);

      if (event.error === 'no-speech') {
        emitError('Voice not detected, please try again');
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        emitError('Microphone permission is blocked');
        return;
      }

      emitError('Voice input failed, please try again');
    };

    recognition.onend = () => {
      setIsListening(false);

      if (!manualStopRef.current && !finalCapturedRef.current) {
        setIsArmed(false);
      }
    };

    return recognition;
  }, [emitError, language, onFinalTranscript, onInterimTranscript]);

  const startListening = useCallback(() => {
    if (!supported || typeof window === 'undefined') {
      emitError('Voice not supported in this browser');
      return;
    }

    cancelSpeech();
    recognitionRef.current = createRecognition();

    try {
      recognitionRef.current.start();
    } catch {
      emitError('Voice input failed, please try again');
      setIsArmed(false);
      setIsListening(false);
    }
  }, [cancelSpeech, createRecognition, emitError, supported]);

  const toggleListening = useCallback(() => {
    if (isListening || isArmed) {
      stopRecognition(true);
      setInterimTranscript('');
      return;
    }

    setIsArmed(true);
    startListening();
  }, [isArmed, isListening, startListening, stopRecognition]);

  const restartIfArmed = useCallback(() => {
    if (!supported || isListening || !isArmed) {
      return;
    }

    setTimeout(() => {
      if (!isArmed || isListening) {
        return;
      }

      startListening();
    }, 350);
  }, [isArmed, isListening, startListening, supported]);

  const speak = useCallback(
    (text, enabled = true) =>
      new Promise((resolve) => {
        if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getSpeechLang(language);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }),
    [language]
  );

  useEffect(
    () => () => {
      stopRecognition(true);
      cancelSpeech();
    },
    [cancelSpeech, stopRecognition]
  );

  return {
    supported,
    isListening,
    isArmed,
    interimTranscript,
    toggleListening,
    stopRecognition,
    restartIfArmed,
    speak,
    cancelSpeech,
  };
}

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Loader } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice.js';

export default function VoiceButton({ onCommand, size = 'lg' }) {
  const { t } = useTranslation();
  const voice = useVoice({ onCommand });

  const sz = { sm: 48, md: 56, lg: 68 }[size] || 68;
  const iconSz = { sm: 20, md: 22, lg: 26 }[size] || 26;

  if (!voice.supported) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="rounded-full bg-border flex items-center justify-center"
          style={{ width: sz, height: sz }}
        >
          <MicOff size={iconSz} className="text-text-secondary" />
        </div>
        <span className="text-xs text-text-secondary text-center">{t('voice.notSupported')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        id="voice-btn"
        onPointerDown={voice.startListening}
        onPointerUp={voice.stopListening}
        onPointerLeave={voice.stopListening}
        className={`rounded-full flex items-center justify-center transition-all duration-200 shadow-md
          ${voice.listening
            ? 'bg-danger voice-listening scale-110'
            : voice.processing
            ? 'bg-accent-amber scale-105'
            : 'bg-primary hover:bg-primary-dark active:scale-95'
          }`}
        style={{ width: sz, height: sz, minWidth: sz, minHeight: sz }}
        aria-label={voice.listening ? t('voice.listening') : t('voice.holdToSpeak')}
      >
        {voice.processing
          ? <Loader size={iconSz} className="text-white animate-spin" />
          : <Mic size={iconSz} className="text-white" />
        }
      </button>
      <span className="text-xs text-text-secondary text-center">
        {voice.listening ? t('voice.listening')
          : voice.processing ? t('voice.processing')
          : t('voice.holdToSpeak')}
      </span>
      {voice.transcript && (
        <span className="text-xs text-text-primary italic text-center max-w-[200px] truncate">
          "{voice.transcript}"
        </span>
      )}
    </div>
  );
}

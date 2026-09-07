import { AlertCircle, Mic } from 'lucide-react';

export default function VoiceButton({
  supported,
  isListening,
  isActive,
  onClick,
  tooltip,
  disabled = false,
}) {
  if (!supported) {
    return (
      <div
        title={tooltip}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border bg-white text-text-secondary"
      >
        <AlertCircle size={16} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
        isListening
          ? 'animate-kisan-mic-pulse border-red-500 bg-red-500 text-white'
          : isActive
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-white text-primary hover:border-primary/40 hover:bg-primary/5'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      title={isListening ? 'Listening...' : 'Use voice input'}
    >
      <Mic size={18} />
    </button>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { showToast } from './Toast/index.jsx';
import { useMqtt } from '../hooks/useMqtt.js';
import { useZoneStore } from '../store/zoneStore.js';
import { dispatchHardwareUpdate } from '../utils/zoneSync.js';

export default function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  
  const mqtt = useMqtt();
  const zones = useZoneStore(state => state.zones);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast("Listening... Speak a command.", "info");
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript.toLowerCase();
        setTranscript(text);
        handleCommand(text);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        showToast("Couldn't hear you clearly.", "warning");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [zones]);

  const handleCommand = (text) => {
    let handled = false;
    
    // Parse "start", "on", "water"
    if (text.includes('start') || text.includes('on') || text.includes('water') || text.includes('irrigate')) {
      // Find which zone
      let targetZone = null;
      Object.values(zones).forEach(z => {
        if (text.includes(z.name.toLowerCase()) || text.includes(z.id.toLowerCase())) {
          targetZone = z;
        }
      });
      
      // If no specific zone mentioned, default to the first one or all
      if (!targetZone && Object.values(zones).length > 0) {
        targetZone = Object.values(zones)[0];
      }

      if (targetZone) {
        mqtt.publishPump(targetZone.id, true);
        mqtt.publishValve(targetZone.id, true);
        dispatchHardwareUpdate({ ...targetZone, pumpOn: true, valveOpen: true });
        showToast(`Voice Command: Watering started for ${targetZone.name}`, "success");
        handled = true;
      }
    } 
    // Parse "stop", "off", "halt"
    else if (text.includes('stop') || text.includes('off') || text.includes('halt')) {
      Object.values(zones).forEach(z => {
        mqtt.publishPump(z.id, false);
        mqtt.publishValve(z.id, false);
        mqtt.publishFertigation(z.id, false);
        dispatchHardwareUpdate({ ...z, pumpOn: false, valveOpen: false, fertigationOn: false });
      });
      showToast("Voice Command: All operations stopped.", "info");
      handled = true;
    }

    if (!handled) {
      showToast(`Unknown command: "${text}"`, "warning");
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast("Speech Recognition not supported in this browser.", "warning");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {transcript && !isListening && (
        <div className="bg-slate-800/90 text-white text-xs px-3 py-2 rounded-xl backdrop-blur border border-white/10 animate-fade-out pointer-events-none">
          "{transcript}"
        </div>
      )}
      <button
        onClick={toggleListening}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]' 
            : 'bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
        }`}
      >
        {isListening ? <Loader2 size={24} className="animate-spin" /> : <Mic size={24} />}
      </button>
    </div>
  );
}

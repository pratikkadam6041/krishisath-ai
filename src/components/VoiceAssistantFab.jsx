import { useState, useCallback } from 'react';
import { AudioLines, Mic, Zap, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { parseFarmerCommand, buildConfirmMessage } from '../ai-ml/voiceCommandParser.js';
import { showToast } from './Toast/index.jsx';
import { useMqtt } from '../hooks/useMqtt.js';
import { dispatchHardwareUpdate } from '../utils/zoneSync.js';

export default function VoiceAssistantFab() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language) || 'hi';
  const zones = useZoneStore((state) => state.zones);
  
  const [hwConfirm, setHwConfirm] = useState(null); // { cmd, message }
  const [draft, setDraft] = useState('');
  const mqtt = useMqtt();
  
  const speakReply = useCallback(async (text, voiceObj) => {
    if (text) {
      await voiceObj.speak(text, true);
    }
  }, []);

  const executeHardwareCommand = useCallback((cmd, voiceObj) => {
    if (!mqtt || !mqtt.isConnected) {
      showToast('Hardware not connected', 'warning');
      return;
    }
    
    const zone = zones[cmd.zoneId];
    if (!zone) return;

    if (cmd.intent === 'PUMP_ON' || cmd.intent === 'PUMP_OFF') {
      const turnOn = cmd.intent === 'PUMP_ON';
      mqtt.publishPump(cmd.zoneId, turnOn, 'voice');
      mqtt.publishValve(cmd.zoneId, turnOn, 'voice');
      dispatchHardwareUpdate({ ...zone, pumpOn: turnOn, valveOpen: turnOn });
      const zoneName = zones[cmd.zoneId]?.name || cmd.zoneId;
      const msg = cmd.intent === 'PUMP_ON'
        ? `${zoneName} सिंचाई शुरू हो गई`
        : `${zoneName} पंप बंद हो गया`;
      showToast(msg, 'success');
      speakReply(msg, voiceObj);
    } else if (cmd.intent === 'VALVE_OPEN' || cmd.intent === 'VALVE_CLOSE') {
      const turnOn = cmd.intent === 'VALVE_OPEN';
      mqtt.publishValve(cmd.zoneId, turnOn, 'voice');
      dispatchHardwareUpdate({ ...zone, valveOpen: turnOn });
      const zoneName = zones[cmd.zoneId]?.name || cmd.zoneId;
      const msg = cmd.intent === 'VALVE_OPEN'
        ? `${zoneName} वाल्व खुल गया`
        : `${zoneName} वाल्व बंद हो गया`;
      showToast(msg, 'success');
      speakReply(msg, voiceObj);
    }
  }, [mqtt, zones, speakReply]);

  const voice = useVoiceRecognition({
    language,
    onInterimTranscript: (transcript) => {
      if (transcript) setDraft(transcript);
    },
    onFinalTranscript: async (transcript) => {
      const finalText = transcript.trim();
      if (!finalText) return;

      const availableZones = Object.keys(zones);
      const hwCmd = parseFarmerCommand(finalText, availableZones);
      
      if (hwCmd && (hwCmd.intent === 'PUMP_ON' || hwCmd.intent === 'PUMP_OFF' || hwCmd.intent === 'VALVE_OPEN' || hwCmd.intent === 'VALVE_CLOSE')) {
        const confirmMsg = buildConfirmMessage(hwCmd, zones, language);
        setHwConfirm({ cmd: hwCmd, message: confirmMsg });
        await speakReply(confirmMsg, voice);
      } else {
        const errMsg = language === 'mr' ? 'मला समजले नाही.' : language === 'en' ? 'I did not understand.' : 'मुझे समझ नहीं आया।';
        showToast(errMsg, 'error');
        await speakReply(errMsg, voice);
      }
      setDraft('');
    },
    onError: (message) => {
      showToast(message, 'error');
      setDraft('');
    },
  });

  const handleVoiceClick = () => {
    if (!voice.supported) {
      showToast('Voice not supported', 'warning');
      return;
    }
    voice.toggleListening();
  };

  return (
    <>
      {/* Voice Assistant Dock */}
      <div className="voice-assistant-dock fixed z-[95] flex flex-col items-end gap-3" style={{ bottom: 'calc(var(--bottom-nav-height) + 90px)', right: 'max(16px, calc(50vw - 14rem + 16px))' }}>
        <button
          type="button"
          onClick={() => navigate('/chat?voice=1')}
          className="krishi-floating-voice-orb flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105"
          aria-label="Talk to Krishi"
          title="Talk to Krishi"
        >
          <AudioLines size={21} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={handleVoiceClick}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all ${
            voice.isListening 
              ? 'bg-red-500 animate-kisan-mic-pulse' 
              : 'bg-gradient-to-br from-red-400 to-red-600 hover:scale-105'
          }`}
          aria-label="Voice Command"
        >
          <Mic size={24} />
        </button>
      </div>

      {/* Floating Dialog / Draft */}
      {(voice.isListening || hwConfirm) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl animate-slide-up">
            {hwConfirm ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                    <Zap size={24} className="text-amber-700" />
                  </div>
                  <p className="flex-1 text-base font-bold text-amber-900">{hwConfirm.message}</p>
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      executeHardwareCommand(hwConfirm.cmd, voice);
                      setHwConfirm(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] py-3.5 text-sm font-black text-white active:scale-95 transition-transform"
                  >
                    <CheckCircle2 size={18} />
                    {language === 'mr' ? 'हो, करा' : language === 'en' ? 'Yes, do it' : 'हाँ, करें'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHwConfirm(null);
                      voice.stopRecognition();
                    }}
                    className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-black text-text-secondary active:scale-95 transition-transform"
                  >
                    {language === 'mr' ? 'नाही' : language === 'en' ? 'Cancel' : 'रद्द करें'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-6">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-500 shadow-inner animate-kisan-mic-pulse">
                  <Mic size={40} />
                </div>
                <h3 className="mb-2 text-xl font-black text-text-primary">
                  {language === 'mr' ? 'ऐकत आहे...' : language === 'en' ? 'Listening...' : 'सुन रहा हूँ...'}
                </h3>
                <p className="text-center text-sm font-medium text-text-secondary h-6 overflow-hidden">
                  {draft || (language === 'mr' ? 'बोला...' : language === 'en' ? 'Speak now...' : 'बोलें...')}
                </p>
                <button
                  type="button"
                  onClick={() => voice.stopRecognition()}
                  className="mt-6 mb-6 rounded-full border border-border px-8 py-2.5 text-sm font-black text-text-secondary hover:bg-slate-50 transition-colors"
                >
                  {language === 'mr' ? 'थांबवा' : language === 'en' ? 'Stop' : 'रोकें'}
                </button>

                <div className="w-full rounded-[20px] border border-sky-200 bg-sky-50 p-4 text-left shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-sky-800">
                    <Info size={16} />
                    <span className="text-sm font-black">
                      {language === 'mr' ? 'काय बोलायचे?' : language === 'en' ? 'What to say?' : 'क्या बोलें?'}
                    </span>
                  </div>
                  <ul className="list-inside list-disc space-y-1.5 text-xs font-semibold text-sky-700">
                    {language === 'mr' ? (
                      <>
                        <li>"झोन 1 पंप सुरू करा"</li>
                        <li>"झोन 2 चा पंप बंद करा"</li>
                        <li>"झोन 1 वाल्व ओपन करा"</li>
                      </>
                    ) : language === 'en' ? (
                      <>
                        <li>"Turn on zone 1 pump"</li>
                        <li>"Stop the pump in zone 2"</li>
                        <li>"Open valve zone 1"</li>
                      </>
                    ) : (
                      <>
                        <li>"ज़ोन 1 का पंप चालू करो"</li>
                        <li>"ज़ोन 2 में पानी बंद करो"</li>
                        <li>"ज़ोन 1 वाल्व खोलो"</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

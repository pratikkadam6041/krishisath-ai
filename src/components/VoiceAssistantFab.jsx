import { useState, useCallback, useRef } from 'react';
import { AudioLines, Mic, Zap, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { parseFarmerCommand, buildConfirmMessage } from '../ai-ml/voiceCommandParser.js';
import { detectLanguage } from '../utils/languageDetect.js';
import { showToast } from './Toast/index.jsx';
import { useMqtt } from '../hooks/useMqtt.js';
import { dispatchHardwareUpdate } from '../utils/zoneSync.js';

function getSpokenDecision(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (/^(yes|yeah|yep|haan|ha|haanji|ji\s*haan|हाँ|हां|हाँ\s*जी|हा|हो|होय|बरं|बर|करा)(?:\s|$)/u.test(normalized)) return true;
  if (/^(no|nope|nah|nahi|nahin|नहीं|नही|ना|नको|नाही|थांबा|थांबवा)(?:\s|$)/u.test(normalized)) return false;
  return null;
}

function commandReply(language, key, zoneName = '') {
  const text = {
    unavailable: {
      en: 'Hardware is not connected, so I could not send the pump command.',
      hi: 'हार्डवेयर कनेक्ट नहीं है, इसलिए पंप कमांड नहीं भेजी जा सकी।',
      mr: 'हार्डवेअर कनेक्ट नाही. पंप कमांड पाठवता आली नाही.',
    },
    missingZone: {
      en: 'I could not find that irrigation zone.',
      hi: 'मुझे वह सिंचाई ज़ोन नहीं मिला।',
      mr: 'मला तो सिंचन झोन सापडला नाही.',
    },
    notUnderstood: {
      en: 'I did not understand. Please say the zone and whether to start or stop the pump.',
      hi: 'मुझे समझ नहीं आया। कृपया ज़ोन और पंप चालू या बंद करने का आदेश बोलें।',
      mr: 'मला समजले नाही. कृपया झोन आणि पंप सुरू किंवा बंद करण्याचा आदेश सांगा.',
    },
    cancelled: {
      en: 'Okay, I cancelled that command.',
      hi: 'ठीक है, कमांड रद्द कर दी।',
      mr: 'ठीक आहे, कमांड रद्द केली.',
    },
    pumpOn: {
      en: `Irrigation started for ${zoneName}.`,
      hi: `${zoneName} सिंचाई शुरू हो गई।`,
      mr: `${zoneName} मध्ये सिंचन सुरू झाले.`,
    },
    pumpOff: {
      en: `Irrigation stopped for ${zoneName}.`,
      hi: `${zoneName} पंप बंद हो गया।`,
      mr: `${zoneName} मधील सिंचन बंद झाले.`,
    },
    valveOn: {
      en: `Valve opened for ${zoneName}.`,
      hi: `${zoneName} का वाल्व खुल गया।`,
      mr: `${zoneName} चा वाल्व उघडला.`,
    },
    valveOff: {
      en: `Valve closed for ${zoneName}.`,
      hi: `${zoneName} का वाल्व बंद हो गया।`,
      mr: `${zoneName} चा वाल्व बंद झाला.`,
    },
  };
  return text[key]?.[language] || text[key]?.hi || '';
}

export default function VoiceAssistantFab() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language) || 'hi';
  const zones = useZoneStore((state) => state.zones);
  
  const [hwConfirm, setHwConfirm] = useState(null); // { cmd, message }
  const hwConfirmRef = useRef(null);
  const setHardwareConfirmation = useCallback((nextConfirmation) => {
    hwConfirmRef.current = nextConfirmation;
    setHwConfirm(nextConfirmation);
  }, []);
  const [draft, setDraft] = useState('');
  const mqtt = useMqtt();
  
  const speakReply = useCallback(async (text, voiceObj, responseLanguage = language) => {
    if (text) {
      await voiceObj.speak(text, true, responseLanguage);
    }
  }, [language]);

  const executeHardwareCommand = useCallback(async (cmd, voiceObj) => {
    const responseLanguage = cmd?.responseLanguage || language;
    if (!mqtt || !mqtt.isConnected) {
      const message = commandReply(responseLanguage, 'unavailable');
      showToast(message, 'warning');
      await speakReply(message, voiceObj, responseLanguage);
      return false;
    }
    
    const zone = zones[cmd.zoneId];
    if (!zone) {
      const message = commandReply(responseLanguage, 'missingZone');
      showToast(message, 'warning');
      await speakReply(message, voiceObj, responseLanguage);
      return false;
    }

    if (cmd.intent === 'PUMP_ON' || cmd.intent === 'PUMP_OFF') {
      const turnOn = cmd.intent === 'PUMP_ON';
      mqtt.publishPump(cmd.zoneId, turnOn, 'voice');
      mqtt.publishValve(cmd.zoneId, turnOn, 'voice');
      dispatchHardwareUpdate({ ...zone, pumpOn: turnOn, valveOpen: turnOn });
      const zoneName = zones[cmd.zoneId]?.name || cmd.zoneId;
      const msg = commandReply(responseLanguage, turnOn ? 'pumpOn' : 'pumpOff', zoneName);
      showToast(msg, 'success');
      await speakReply(msg, voiceObj, responseLanguage);
      return true;
    } else if (cmd.intent === 'VALVE_OPEN' || cmd.intent === 'VALVE_CLOSE') {
      const turnOn = cmd.intent === 'VALVE_OPEN';
      mqtt.publishValve(cmd.zoneId, turnOn, 'voice');
      dispatchHardwareUpdate({ ...zone, valveOpen: turnOn });
      const zoneName = zones[cmd.zoneId]?.name || cmd.zoneId;
      const msg = commandReply(responseLanguage, turnOn ? 'valveOn' : 'valveOff', zoneName);
      showToast(msg, 'success');
      await speakReply(msg, voiceObj, responseLanguage);
      return true;
    }
    return false;
  }, [language, mqtt, zones, speakReply]);

  const voice = useVoiceRecognition({
    language,
    onInterimTranscript: (transcript) => {
      if (transcript) setDraft(transcript);
    },
    onFinalTranscript: async (transcript) => {
      const finalText = transcript.trim();
      if (!finalText) return;

      const responseLanguage = detectLanguage(finalText, language);
      const activeConfirmation = hwConfirmRef.current;
      if (activeConfirmation) {
        const decision = getSpokenDecision(finalText);
        if (decision === true) {
          const command = activeConfirmation.cmd;
          setHardwareConfirmation(null);
          await executeHardwareCommand(command, voice);
          voice.restartIfArmed();
          setDraft('');
          return;
        }
        if (decision === false) {
          const message = commandReply(activeConfirmation.cmd.responseLanguage || responseLanguage, 'cancelled');
          setHardwareConfirmation(null);
          showToast(message, 'info');
          await speakReply(message, voice, activeConfirmation.cmd.responseLanguage || responseLanguage);
          voice.restartIfArmed();
          setDraft('');
          return;
        }
      }

      const availableZones = Object.keys(zones);
      const hwCmd = parseFarmerCommand(finalText, availableZones);
      
      if (hwCmd && (hwCmd.intent === 'PUMP_ON' || hwCmd.intent === 'PUMP_OFF' || hwCmd.intent === 'VALVE_OPEN' || hwCmd.intent === 'VALVE_CLOSE')) {
        const command = { ...hwCmd, responseLanguage };
        const confirmMsg = buildConfirmMessage(command, zones, responseLanguage);
        setHardwareConfirmation({ cmd: command, message: confirmMsg });
        await speakReply(confirmMsg, voice, responseLanguage);
        voice.restartIfArmed();
      } else {
        const errMsg = commandReply(responseLanguage, 'notUnderstood');
        showToast(errMsg, 'error');
        await speakReply(errMsg, voice, responseLanguage);
        voice.restartIfArmed();
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
                      void executeHardwareCommand(hwConfirm.cmd, voice);
                      setHardwareConfirmation(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] py-3.5 text-sm font-black text-white active:scale-95 transition-transform"
                  >
                    <CheckCircle2 size={18} />
                    {language === 'mr' ? 'हो, करा' : language === 'en' ? 'Yes, do it' : 'हाँ, करें'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHardwareConfirmation(null);
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
                        <li>"Zone one pump चालू करा"</li>
                        <li>"Zone two pump बंद करा"</li>
                        <li>"झोन एक पंप सुरू करा"</li>
                        <li>"झोन दोन पंप बंद करा"</li>
                      </>
                    ) : language === 'en' ? (
                      <>
                        <li>"Zone one pump on"</li>
                        <li>"Zone two pump off"</li>
                        <li>"Turn on zone one pump"</li>
                        <li>"Stop zone two pump"</li>
                      </>
                    ) : (
                      <>
                        <li>"Zone one pump चालू करो"</li>
                        <li>"Zone two pump बंद करो"</li>
                        <li>"ज़ोन एक पंप चालू करो"</li>
                        <li>"ज़ोन दो पंप बंद करो"</li>
                      </>
                    )}
                  </ul>
                  <p className="mt-3 text-[11px] font-semibold leading-4 text-sky-600">
                    {language === 'mr'
                      ? 'टीप: “one/two” हळू बोला. Chrome 1/2 कधी कधी चुकीचे ऐकतो.'
                      : language === 'en'
                        ? 'Tip: say “one/two” slowly; it is more reliable than digits.'
                        : 'Tip: “one/two” धीरे बोलें; यह digits से ज्यादा reliable है.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

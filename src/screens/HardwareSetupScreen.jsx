import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Power,
  QrCode,
  Router,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { localize } from '../utils/formatters.js';

function QrPattern() {
  const cells = useMemo(
    () => Array.from({ length: 81 }, (_, index) => ((index * 5 + 9) % 4 === 0 ? 1 : index % 5 === 0 ? 1 : 0)),
    []
  );

  return (
    <div className="grid grid-cols-9 gap-1 rounded-[28px] bg-white p-4 shadow-inner ring-1 ring-black/5">
      {cells.map((cell, index) => (
        <div key={index} className={`aspect-square rounded-[6px] ${cell ? 'bg-[#111827]' : 'bg-white'}`} />
      ))}
    </div>
  );
}

function StepProgress({ step }) {
  return (
    <div className="mb-5 flex gap-2">
      {[1, 2, 3].map((item) => (
        <div key={item} className={`h-2 flex-1 rounded-full ${item <= step ? 'bg-[#1a3d1a]' : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

export default function HardwareSetupScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const addZone = useZoneStore((state) => state.addZone);
  const nextZoneId = useZoneStore((state) => state.nextZoneId);
  const zones = useZoneStore((state) => state.zones);
  const selectedCrops = useZoneStore((state) => state.selectedCrops);

  const [step, setStep] = useState(1);
  const [poweredOn, setPoweredOn] = useState(true);
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const connectDevice = () => {
    setIsConnecting(true);
    window.setTimeout(() => {
      const nextId = nextZoneId();
      const cropIndex = Object.keys(zones || {}).length % Math.max(1, selectedCrops?.length || 1);
      const cropType = selectedCrops?.[cropIndex] || selectedCrops?.[0] || 'wheat';
      addZone(nextId, {
        name: `Sensor Zone ${nextId.toUpperCase()}`,
        cropType,
        area: 1.5,
        isManual: false,
      });
      setIsConnecting(false);
      setConnected(true);
    }, 1800);
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[30px] font-black leading-none text-text-primary">
            {localize({ hi: 'नया सेंसर जोड़ें', mr: 'नवीन सेन्सर जोडा', en: 'Add new sensor' }, language)}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {localize({ hi: 'बस 3 आसान चरण', mr: 'फक्त 3 सोपे टप्पे', en: 'Just 3 guided steps' }, language)}
          </p>
        </div>
      </div>

      <StepProgress step={connected ? 3 : step} />

      {connected ? (
        <div className="rounded-[32px] border border-border bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={38} />
          </div>
          <h2 className="text-center text-2xl font-black text-text-primary">
            {localize({ hi: 'ज़ोन सफलतापूर्वक जुड़ गया', mr: 'झोन यशस्वीरित्या जोडला गेला', en: 'Zone connected successfully' }, language)}
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {localize(
              {
                hi: 'अब यह सेंसर होम और ज़ोन स्क्रीन पर लाइव डेटा दिखाएगा।',
                mr: 'आता हा सेन्सर होम आणि झोन स्क्रीनवर लाइव्ह डेटा दाखवेल.',
                en: 'This sensor will now start appearing with live data on the home and zone screens.',
              },
              language
            )}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-[#f7faf5] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
                {localize({ hi: 'ज़ोन', mr: 'झोन', en: 'Zone' }, language)}
              </p>
              <p className="mt-2 text-sm font-black text-text-primary">Sensor Zone</p>
            </div>
            <div className="rounded-[22px] bg-[#f7faf5] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Wi-Fi</p>
              <p className="mt-2 text-sm font-black text-text-primary">{wifiName || 'Home network'}</p>
            </div>
            <div className="rounded-[22px] bg-[#f7faf5] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
                {localize({ hi: 'स्थिति', mr: 'स्थिती', en: 'Status' }, language)}
              </p>
              <p className="mt-2 text-sm font-black text-emerald-700">
                {localize({ hi: 'कनेक्टेड', mr: 'कनेक्टेड', en: 'Connected' }, language)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-2xl bg-[#1a3d1a] px-6 py-4 text-sm font-black text-white"
          >
            {localize({ hi: 'होम पर जाएँ', mr: 'होमवर जा', en: 'Go to home' }, language)}
          </button>
        </div>
      ) : null}

      {!connected && step === 1 ? (
        <div className="rounded-[32px] border border-border bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-5 rounded-[28px] bg-[linear-gradient(180deg,#f7faf5_0%,#eef6ec_100%)] p-6">
            <div className="mx-auto flex h-36 max-w-[220px] items-center justify-center rounded-[28px] border border-[#d8e5d4] bg-white">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[26px] border-4 border-dashed border-[#1a3d1a] bg-[#fbfdfb]">
                <Power size={34} className="text-[#1a3d1a]" />
                <span className="absolute -right-2 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white">LED</span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 text-sm font-black text-text-primary">
            <Cpu size={16} className="text-[#1a3d1a]" />
            {localize({ hi: 'यही सेंसर डिवाइस है', mr: 'हेच सेन्सर डिव्हाइस आहे', en: 'This is the sensor device' }, language)}
          </div>

          <h2 className="text-2xl font-black text-text-primary">
            {localize({ hi: 'क्या आपका डिवाइस चालू है?', mr: 'तुमचे डिव्हाइस सुरू आहे का?', en: 'Is the device powered on?' }, language)}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {localize(
              {
                hi: 'पावर बटन दबाएँ और LED जलती दिखे तो “हाँ” चुनें।',
                mr: 'पॉवर बटन दाबा आणि LED पेटली तर “होय” निवडा.',
                en: 'Press the power button and choose “Yes” when the LED turns on.',
              },
              language
            )}
          </p>

          <div className="mt-4 rounded-[22px] border border-[#e7eee4] bg-[#f7faf5] p-4">
            <div className="flex items-start gap-2 text-sm text-text-secondary">
              <HelpCircle size={16} className="mt-0.5 text-[#1a3d1a]" />
              <p>
                {localize(
                  {
                    hi: 'सेंसर खेत की नमी और पर्यावरण पढ़ता है। अगर यह नया है, पहले इसे बिजली दें फिर Wi-Fi से जोड़ें।',
                    mr: 'सेन्सर शेतातील ओलावा आणि वातावरण वाचतो. नवीन असल्यास आधी त्याला पॉवर द्या, मग Wi-Fi जोडा.',
                    en: 'A sensor reads field moisture and environment. If this is new, power it on first and then connect it to Wi-Fi.',
                  },
                  language
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setPoweredOn(false)}
              className={`flex-1 rounded-2xl border px-4 py-4 text-sm font-black ${
                !poweredOn ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-border text-text-primary'
              }`}
            >
              {localize({ hi: 'नहीं', mr: 'नाही', en: 'No' }, language)}
            </button>
            <button
              type="button"
              onClick={() => {
                setPoweredOn(true);
                setStep(2);
              }}
              className="flex-1 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
            >
              {localize({ hi: 'हाँ', mr: 'होय', en: 'Yes' }, language)}
            </button>
          </div>

          {!poweredOn ? (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              {localize(
                {
                  hi: 'डिवाइस को 3 सेकंड दबाकर चालू करें, फिर LED स्थिर होने दें।',
                  mr: 'डिव्हाइस 3 सेकंद दाबून सुरू करा आणि LED स्थिर होऊ द्या.',
                  en: 'Hold the button for 3 seconds to power on the device, then wait for the LED to become steady.',
                },
                language
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {!connected && step === 2 ? (
        <div className="rounded-[32px] border border-border bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900">
              <Router size={16} />
              2.4GHz Wi-Fi only
            </div>
            <p className="text-sm text-amber-700">
              {localize(
                {
                  hi: 'पहले सुनिश्चित करें कि आपका राउटर 2.4GHz नेटवर्क दे रहा है। 5GHz नेटवर्क पर सेंसर नहीं जुड़ेगा।',
                  mr: 'तुमचा राउटर 2.4GHz नेटवर्क देत आहे याची खात्री करा. 5GHz वर सेन्सर जोडला जाणार नाही.',
                  en: 'Make sure your router is broadcasting a 2.4GHz network first. The sensor will not connect on 5GHz.',
                },
                language
              )}
            </p>
          </div>

          <div className="mt-5 rounded-[28px] bg-[linear-gradient(180deg,#f7faf5_0%,#eef6ec_100%)] p-6">
            <div className="mx-auto flex h-28 max-w-[220px] items-center justify-center rounded-[24px] border border-[#d8e5d4] bg-white">
              <Wifi size={40} className="text-[#1a3d1a]" />
            </div>
          </div>

          <h2 className="mt-5 text-2xl font-black text-text-primary">
            {localize({ hi: 'घर के Wi-Fi की जानकारी दें', mr: 'घरच्या Wi-Fi ची माहिती द्या', en: 'Enter your home Wi-Fi details' }, language)}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {localize(
              {
                hi: 'सेंसर इसी नेटवर्क पर डेटा भेजेगा।',
                mr: 'सेन्सर याच नेटवर्कवर डेटा पाठवेल.',
                en: 'The sensor will send data over this network.',
              },
              language
            )}
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-text-secondary">
                {localize({ hi: 'Wi-Fi नाम', mr: 'Wi-Fi नाव', en: 'Wi-Fi name' }, language)}
              </label>
              <input
                value={wifiName}
                onChange={(event) => setWifiName(event.target.value)}
                placeholder={localize({ hi: 'उदाहरण: Kasba_Peth_Home', mr: 'उदाहरण: Kasba_Peth_Home', en: 'Example: Kasba_Peth_Home' }, language)}
                className="h-14 w-full rounded-2xl border border-border bg-[#f7faf5] px-4 text-sm font-semibold text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-text-secondary">
                {localize({ hi: 'पासवर्ड', mr: 'पासवर्ड', en: 'Password' }, language)}
              </label>
              <input
                value={wifiPassword}
                onChange={(event) => setWifiPassword(event.target.value)}
                type="password"
                placeholder={localize({ hi: 'Wi-Fi पासवर्ड', mr: 'Wi-Fi पासवर्ड', en: 'Wi-Fi password' }, language)}
                className="h-14 w-full rounded-2xl border border-border bg-[#f7faf5] px-4 text-sm font-semibold text-text-primary outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-2xl border border-border px-4 py-4 text-sm font-bold text-text-primary"
            >
              {localize({ hi: 'वापस', mr: 'मागे', en: 'Back' }, language)}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!wifiName || !wifiPassword}
              className="flex-1 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white disabled:opacity-50"
            >
              {localize({ hi: 'आगे', mr: 'पुढे', en: 'Next' }, language)}
            </button>
          </div>
        </div>
      ) : null}

      {!connected && step === 3 ? (
        <div className="rounded-[32px] border border-border bg-white p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#eef6ed] text-[#1a3d1a]">
            <QrCode size={30} />
          </div>
          <h2 className="text-2xl font-black text-text-primary">
            {localize({ hi: 'QR को सेंसर के पास रखें', mr: 'QR सेन्सरजवळ ठेवा', en: 'Hold the QR code near the sensor' }, language)}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {localize(
              {
                hi: 'सेंसर इस कोड को पढ़कर आपके Wi-Fi से जुड़ जाएगा।',
                mr: 'सेन्सर हा कोड वाचून तुमच्या Wi-Fi शी जोडला जाईल.',
                en: 'The sensor will scan this code and connect to your Wi-Fi.',
              },
              language
            )}
          </p>

          <div className="mx-auto mt-6 max-w-[260px] rounded-[30px] border border-[#e7eee4] bg-[#f7faf5] p-4">
            <QrPattern />
          </div>

          {isConnecting ? (
            <div className="mt-5 rounded-[22px] bg-[#f7faf5] p-4">
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="h-3 w-3 rounded-full bg-[#1a3d1a] animate-bounce" style={{ animationDelay: `${dot * 0.15}s` }} />
                ))}
              </div>
              <p className="mt-3 text-sm font-black text-[#1a3d1a]">
                {localize({ hi: 'कनेक्शन का इंतज़ार...', mr: 'कनेक्शनची वाट पाहत आहे...', en: 'Waiting for connection...' }, language)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {localize(
                  {
                    hi: 'आमतौर पर इसमें 10-20 सेकंड लगते हैं।',
                    mr: 'यासाठी साधारण 10-20 सेकंद लागतात.',
                    en: 'This usually takes 10-20 seconds.',
                  },
                  language
                )}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={connectDevice}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#1a3d1a] px-6 py-4 text-sm font-black text-white"
            >
              <ShieldCheck size={16} />
              {localize({ hi: 'कनेक्ट करें', mr: 'कनेक्ट करा', en: 'Connect now' }, language)}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

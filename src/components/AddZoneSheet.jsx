import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Plus, Tractor, X } from 'lucide-react';
import { CROP_LIBRARY } from '../data/appContent.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { localize } from '../utils/formatters.js';

export default function AddZoneSheet({ onClose }) {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const addZone = useZoneStore((state) => state.addZone);
  const nextZoneId = useZoneStore((state) => state.nextZoneId);

  const [mode, setMode] = useState('choice');
  const [zoneName, setZoneName] = useState('');
  const [cropType, setCropType] = useState('wheat');
  const [area, setArea] = useState(1.5);

  const createManualZone = () => {
    const nextId = nextZoneId();
    addZone(nextId, {
      name: zoneName || `Manual Zone ${nextId.toUpperCase()}`,
      cropType,
      area,
      isManual: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-6 pb-10 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-text-primary">
              {localize({ hi: 'नया झोन जोड़ें', mr: 'नवीन झोन जोडा', en: 'Add a new zone' }, language)}
            </h2>
            <p className="text-sm text-text-secondary">
              {localize({ hi: 'सेंसर या मैन्युअल, दोनों रास्ते उपलब्ध हैं।', mr: 'सेन्सर किंवा मॅन्युअल दोन्ही पर्याय उपलब्ध आहेत.', en: 'Both sensor and manual paths are supported.' }, language)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-2 text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {mode === 'choice' ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/hardware');
              }}
              className="w-full rounded-[28px] border border-[#dfe8df] bg-[#f7fbf6] p-5 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eaf5ea] text-[#1a3d1a]">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">
                    {localize({ hi: 'मेरे पास सेंसर है', mr: 'माझ्याकडे सेन्सर आहे', en: 'I have a sensor' }, language)}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {localize({ hi: '3 आसान चरण में नया डिवाइस जोड़ें।', mr: '3 सोप्या टप्प्यांत डिव्हाइस जोडा.', en: 'Add a new device in 3 simple steps.' }, language)}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('manual')}
              className="w-full rounded-[28px] border border-[#dfe8df] bg-white p-5 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#fff6e8] text-[#a16207]">
                  <Tractor size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">
                    {localize({ hi: 'मैन्युअल झोन बनाएं', mr: 'मॅन्युअल झोन तयार करा', en: 'Create a manual zone' }, language)}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {localize({ hi: 'नमी, चरण और नोट्स आप खुद दर्ज कर सकेंगे।', mr: 'ओलावा, स्टेज आणि नोट्स तुम्ही स्वतः भरू शकता.', en: 'You can log moisture, stage, and notes yourself.' }, language)}
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-text-secondary">
                {localize({ hi: 'झोन का नाम', mr: 'झोनचे नाव', en: 'Zone name' }, language)}
              </label>
              <input
                value={zoneName}
                onChange={(event) => setZoneName(event.target.value)}
                className="h-14 w-full rounded-2xl border border-border bg-[#f7faf5] px-4 text-base font-semibold text-text-primary outline-none"
                placeholder={localize({ hi: 'जैसे North Field', mr: 'उदा. North Field', en: 'For example North Field' }, language)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-text-secondary">
                {localize({ hi: 'मुख्य फसल', mr: 'मुख्य पीक', en: 'Primary crop' }, language)}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CROP_LIBRARY.slice(0, 8).map((crop) => (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => setCropType(crop.id)}
                    className={`rounded-2xl border px-3 py-3 text-left ${
                      cropType === crop.id ? 'border-[#1a3d1a] bg-[#eef6ed]' : 'border-border bg-white'
                    }`}
                  >
                    <p className="text-2xl">{crop.emoji}</p>
                    <p className="mt-2 text-sm font-black text-text-primary">{localize(crop.name, language)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-text-secondary">
                  {localize({ hi: 'क्षेत्रफल', mr: 'क्षेत्रफळ', en: 'Area' }, language)}
                </label>
                <span className="text-sm font-black text-[#1a3d1a]">{area.toFixed(1)} acre</span>
              </div>
              <input type="range" min="0.5" max="10" step="0.5" value={area} onChange={(event) => setArea(Number(event.target.value))} className="w-full accent-[#1a3d1a]" />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setMode('choice')} className="flex-1 rounded-2xl border border-border px-4 py-4 text-sm font-bold text-text-primary">
                {localize({ hi: 'वापस', mr: 'मागे', en: 'Back' }, language)}
              </button>
              <button type="button" onClick={createManualZone} className="flex-[1.4] rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white">
                <span className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  {localize({ hi: 'झोन बनाएं', mr: 'झोन तयार करा', en: 'Create zone' }, language)}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

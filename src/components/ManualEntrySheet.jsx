import { useState } from 'react';
import { Calendar, Droplets, FileText, X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { localize } from '../utils/formatters.js';

const STAGES = ['Sowing', 'Vegetative', 'Flowering', 'Harvest'];

const OBSERVATIONS = [
  { id: 'Dry', emoji: '🔴', color: 'bg-red-50 border-red-200 text-red-700' },
  { id: 'Normal', emoji: '🟡', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'Wet', emoji: '🟢', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

export default function ManualEntrySheet({ zoneId, onClose }) {
  const language = useSettingsStore((state) => state.language);
  const existing = useZoneStore((state) => state.manualEntries[zoneId]);
  const setManualEntry = useZoneStore((state) => state.setManualEntry);

  const [stage, setStage] = useState(existing?.stage || 'Vegetative');
  const [observation, setObservation] = useState(existing?.observation || 'Normal');
  const [notes, setNotes] = useState(existing?.notes || '');

  const saveEntry = () => {
    setManualEntry(zoneId, { stage, observation, notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 px-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-6 pb-10 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-text-primary">
              {localize({ hi: 'मैन्युअल अपडेट', mr: 'मॅन्युअल अपडेट', en: 'Manual update' }, language)}
            </h2>
            <p className="text-sm text-text-secondary">
              {localize({ hi: 'आज खेत की स्थिति दर्ज करें।', mr: 'आज शेताची स्थिती नोंदवा.', en: 'Record today’s field condition.' }, language)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-2 text-text-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-text-secondary">
              <Calendar size={14} />
              {localize({ hi: 'फसल का चरण', mr: 'पिकाचा टप्पा', en: 'Crop stage' }, language)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStage(item)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                    stage === item ? 'border-[#1a3d1a] bg-[#eef6ed] text-[#1a3d1a]' : 'border-border bg-white text-text-primary'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-text-secondary">
              <Droplets size={14} />
              {localize({ hi: 'मिट्टी का अवलोकन', mr: 'मातीचे निरीक्षण', en: 'Soil observation' }, language)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {OBSERVATIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setObservation(item.id)}
                  className={`rounded-2xl border px-3 py-4 text-center ${observation === item.id ? item.color : 'border-border bg-white text-text-primary'}`}
                >
                  <p className="text-2xl">{item.emoji}</p>
                  <p className="mt-2 text-sm font-black">{item.id}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-text-secondary">
              <FileText size={14} />
              {localize({ hi: 'नोट्स', mr: 'नोंदी', en: 'Notes' }, language)}
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-border bg-[#f7faf5] px-4 py-3 text-sm text-text-primary outline-none"
              placeholder={localize({ hi: 'जैसे पत्तों पर दाग, पानी भराव, खरपतवार...', mr: 'उदा. पानांवर डाग, पाणी साचणे, तण...', en: 'For example spots on leaves, standing water, weeds...' }, language)}
            />
          </div>

          <button type="button" onClick={saveEntry} className="w-full rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white">
            {localize({ hi: 'सेव करें', mr: 'जतन करा', en: 'Save update' }, language)}
          </button>
        </div>
      </div>
    </div>
  );
}

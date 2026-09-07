import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore.js';
import { localize } from '../utils/formatters.js';

export default function WaterNowConfirm({ zoneName, moisture, onConfirm, onCancel }) {
  const language = useSettingsStore((state) => state.language);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          onCancel();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onCancel]);

  const moistureColor = moisture < 40 ? '#dc2626' : moisture <= 60 ? '#f59e0b' : '#16a34a';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4" onClick={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-6 pb-10 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-text-primary">
              {localize({ hi: 'पानी देना शुरू करें?', mr: 'पाणी देणे सुरू करायचे?', en: 'Start irrigation?' }, language)}
            </h2>
            <p className="text-sm text-text-secondary">{zoneName}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full border border-border p-2 text-text-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 rounded-[24px] bg-[#f6faf4] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-text-secondary">
              {localize({ hi: 'वर्तमान नमी', mr: 'सध्याचा ओलावा', en: 'Current moisture' }, language)}
            </span>
            <span className="text-2xl font-black" style={{ color: moistureColor }}>
              {moisture}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full" style={{ width: `${moisture}%`, backgroundColor: moistureColor }} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-border px-4 py-4 text-sm font-bold text-text-primary">
            {localize({ hi: 'रद्द करें', mr: 'रद्द करा', en: 'Cancel' }, language)}
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white">
            {localize({ hi: 'हाँ, पानी दें', mr: 'हो, पाणी द्या', en: 'Yes, water now' }, language)}
          </button>
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-text-secondary">
          {localize(
            {
              hi: `${countdown} सेकंड में अपने आप बंद हो जाएगा`,
              mr: `${countdown} सेकंदात आपोआप बंद होईल`,
              en: `Auto-closes in ${countdown} seconds`,
            },
            language
          )}
        </p>
      </div>
    </div>
  );
}

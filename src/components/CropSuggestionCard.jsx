import { useEffect, useState } from 'react';
import { Brain, CalendarDays, IndianRupee, Leaf, Loader2 } from 'lucide-react';
import { getCropPrediction } from '../services/mlCropAdvisor.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { localize } from '../utils/formatters.js';

export default function CropSuggestionCard({ mandiName, historyData }) {
  const language = useSettingsStore((state) => state.language);
  const zones = useZoneStore((state) => state.zones);
  const district = useZoneStore((state) => state.district);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const primaryZone = Object.values(zones || {})[0] || {};
    let active = true;

    getCropPrediction({
      region: district || mandiName,
      currentCrop: primaryZone.cropType,
      npk: {
        n: primaryZone.nitrogen,
        p: primaryZone.phosphorus,
        k: primaryZone.potassium,
        ph: primaryZone.ph,
        ec: primaryZone.ec,
      },
      historyData,
    }).then((result) => {
      if (!active) return;
      setPrediction(result);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [district, historyData, mandiName, zones]);

  if (loading) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-[28px] border border-border bg-[#f7faf5] p-6">
        <Loader2 className="animate-spin text-[#1a3d1a] mb-2" size={24} />
        <p className="text-sm font-semibold text-text-secondary">
          {localize({ hi: 'ML मॉडल सुझाव तैयार कर रहा है...', mr: 'ML मॉडेल सुझाव तयार करत आहे...', en: 'ML Model analyzing data...' }, language)}
        </p>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2 text-emerald-800">
        <Brain size={20} />
        <h2 className="text-lg font-black tracking-tight">AI Crop Advisor</h2>
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-800">
          {prediction.confidenceScore}% Confidence
        </span>
      </div>

      <div className="mb-4 rounded-[20px] bg-white p-4 shadow-sm border border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Leaf size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Recommended Crop</p>
            <p className="text-lg font-black text-emerald-900">{prediction.recommendedCrop}</p>
          </div>
        </div>
        <p className="text-sm font-medium text-emerald-800/80 leading-relaxed">
          {prediction.reasoning}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[16px] bg-emerald-50/50 p-3 border border-emerald-100/50">
          <div className="flex items-center gap-2 mb-1 text-emerald-700">
            <IndianRupee size={14} />
            <p className="text-xs font-bold uppercase">Expected Price</p>
          </div>
          <p className="text-sm font-black text-slate-700">{prediction.expectedPriceRange}</p>
        </div>
        <div className="rounded-[16px] bg-emerald-50/50 p-3 border border-emerald-100/50">
          <div className="flex items-center gap-2 mb-1 text-emerald-700">
            <CalendarDays size={14} />
            <p className="text-xs font-bold uppercase">Sowing Window</p>
          </div>
          <p className="text-sm font-black text-slate-700">{prediction.recommendedSowingWindow}</p>
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-emerald-800/70">
        {prediction.model || 'Market forecast + soil-fit scoring'}
      </p>
    </div>
  );
}

import { getCropWaterProfile } from '../data/cropNutrition.js';
import { localize } from '../utils/formatters.js';

const NUTRIENT_COLORS = {
  nitrogen: '#7c3aed',
  phosphorus: '#f97316',
  potassium: '#eab308',
};

function getTone(value, min, max, language) {
  if (value == null) {
    return localize({ hi: 'डेटा नहीं', mr: 'डेटा नाही', en: 'No data' }, language);
  }

  if (value < min) {
    return localize({ hi: 'कम', mr: 'कमी', en: 'Low' }, language);
  }

  if (value > max) {
    return localize({ hi: 'ऊपर', mr: 'जास्त', en: 'High' }, language);
  }

  return localize({ hi: 'सही', mr: 'योग्य', en: 'Optimal' }, language);
}

export default function NutrientBars({ zone, language = 'hi', compact = false }) {
  const profile = getCropWaterProfile(zone?.cropType);
  const nutrients = [
    { key: 'nitrogen', value: zone?.nitrogen, range: profile.N },
    { key: 'phosphorus', value: zone?.phosphorus, range: profile.P },
    { key: 'potassium', value: zone?.potassium, range: profile.K },
  ];

  return (
    <div className={`rounded-[24px] bg-[#f7faf5] ${compact ? 'p-4' : 'p-5'}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-text-primary">
            {localize({ hi: 'NPK स्थिति', mr: 'NPK स्थिती', en: 'NPK status' }, language)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {localize(
              {
                hi: 'रंगीन पट्टी पोषक मान को आदर्श दायरे से तुलना करती है।',
                mr: 'रंगीत पट्टी पोषक मान आदर्श श्रेणीशी तुलना करते.',
                en: 'Each bar compares the nutrient value against a practical target range.',
              },
              language
            )}
          </p>
        </div>
        <p className="text-right text-xs font-semibold text-text-secondary">
          {localize({ hi: 'संदर्भ', mr: 'संदर्भ', en: 'Reference' }, language)}
          <span className="mt-1 block text-sm font-black text-text-primary">mg/kg</span>
        </p>
      </div>

      <div className="space-y-4">
        {nutrients.map((item) => {
          const meta = {
            label: item.key === 'nitrogen' ? 'N' : item.key === 'phosphorus' ? 'P' : 'K',
            color: NUTRIENT_COLORS[item.key],
            min: item.range.min,
            max: item.range.max,
            ideal: item.range.ideal,
          };
          const scaleMax = meta.max * 1.35;
          const safeValue = item.value ?? 0;
          const width = Math.min(100, Math.max(8, (safeValue / scaleMax) * 100));
          const minMarker = (meta.min / scaleMax) * 100;
          const maxMarker = (meta.max / scaleMax) * 100;

          return (
            <div key={item.key}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <div>
                    <p className="text-sm font-black text-text-primary">{meta.label}</p>
                    <p className="text-[11px] font-semibold text-text-secondary">
                      {getTone(safeValue, meta.min, meta.max, language)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-text-primary">
                    {item.value == null ? '—' : `${item.value} mg/kg`}
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    {localize({ hi: 'आदर्श', mr: 'आदर्श', en: 'Ideal' }, language)} {meta.min}–{meta.max}{' '}
                    ({meta.ideal})
                  </p>
                </div>
              </div>

              <div className="relative h-3 rounded-full bg-white">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${width}%`, backgroundColor: meta.color }}
                />
                <span
                  className="absolute top-[-3px] h-5 w-[2px] rounded-full bg-slate-300"
                  style={{ left: `${minMarker}%` }}
                />
                <span
                  className="absolute top-[-3px] h-5 w-[2px] rounded-full bg-slate-400"
                  style={{ left: `${maxMarker}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

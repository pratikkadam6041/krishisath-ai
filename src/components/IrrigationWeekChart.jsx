import { localize } from '../utils/formatters.js';

export default function IrrigationWeekChart({ plan = [], language = 'hi' }) {
  if (!plan.length) {
    return (
      <p className="text-sm text-text-secondary">
        {localize(
          { hi: 'सिंचाई योजना लोड हो रही है…', mr: 'सिंचन योजना लोड होत आहे…', en: 'Loading irrigation plan…' },
          language
        )}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {plan.map((day) => (
        <div
          key={day.date}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            day.shouldIrrigate ? 'border-emerald-200 bg-emerald-50/80' : 'border-border bg-white'
          }`}
        >
          <div className="w-12 text-center">
            <p className="text-xs font-black uppercase text-text-secondary">{day.dayName}</p>
            <p className="text-lg font-black text-text-primary">{day.time}</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-text-primary">
              {day.shouldIrrigate
                ? localize(
                    {
                      hi: `${day.durationMin} मिन • ${day.volumeL} लीटर`,
                      mr: `${day.durationMin} मिन • ${day.volumeL} लिटर`,
                      en: `${day.durationMin} min • ${day.volumeL} L`,
                    },
                    language
                  )
                : localize(
                    { hi: 'छोड़ें — बारिश/नमी ठीक', mr: 'वगळा — पाऊस/ओलावा ठीक', en: 'Skip — rain/moisture OK' },
                    language
                  )}
            </p>
            <p className="text-xs text-text-secondary">
              ET {day.et} mm · {localize({ hi: 'बारिश', mr: 'पाऊस', en: 'Rain' }, language)} {day.rainProb}%
            </p>
          </div>
          {day.shouldIrrigate ? (
            <span className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white">
              {localize({ hi: 'सिंचाई', mr: 'सिंचन', en: 'Irrigate' }, language)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

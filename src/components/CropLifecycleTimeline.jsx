import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, ChevronRight, Sprout } from 'lucide-react';
import { generateLifecycleSchedule } from '../services/fertigationAdvisor.js';

export default function CropLifecycleTimeline({ cropType, sowingDate }) {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (cropType) {
      setSchedule(generateLifecycleSchedule(cropType, sowingDate));
    }
  }, [cropType, sowingDate]);

  if (!schedule.length) return null;

  return (
    <div className="mt-5 rounded-[28px] border border-[#dbe7d4] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
          <Sprout size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Crop Lifecycle Schedule</h3>
          <p className="text-sm text-slate-500">Dynamic NPK targets based on {cropType}</p>
        </div>
      </div>

      <div className="relative border-l-2 border-emerald-100 ml-4 mt-6 space-y-6 pb-4">
        {schedule.map((stage, i) => {
          const isPast = new Date(stage.endDate) < new Date();
          const isCurrent = new Date(stage.startDate) <= new Date() && new Date(stage.endDate) > new Date();

          return (
            <div key={stage.stage} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                isPast ? 'bg-emerald-500' : isCurrent ? 'bg-amber-500' : 'bg-slate-300'
              }`} />
              
              <div className={`rounded-2xl p-4 transition-all ${
                isCurrent ? 'bg-amber-50 border border-amber-200 shadow-md' : 'bg-slate-50 border border-slate-100'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-slate-800">{stage.stage}</h4>
                  {isCurrent && <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Current</span>}
                  {isPast && <CheckCircle2 size={16} className="text-emerald-500" />}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Calendar size={12} />
                  {new Date(stage.startDate).toLocaleDateString()} - {new Date(stage.endDate).toLocaleDateString()}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400">N Ideal</p>
                    <p className="text-sm font-black text-slate-700">{stage.idealN}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400">P Ideal</p>
                    <p className="text-sm font-black text-slate-700">{stage.idealP}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400">K Ideal</p>
                    <p className="text-sm font-black text-slate-700">{stage.idealK}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

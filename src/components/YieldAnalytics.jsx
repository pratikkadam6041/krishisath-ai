import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart 
} from 'recharts';
import { TrendingUp, Droplets, Leaf, Target, Award } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore.js';
import { localize } from '../utils/formatters.js';

const mockData = [
  { name: 'Week 1', moisture: 30, npk: 40, yield: 60, aiPrediction: 60 },
  { name: 'Week 2', moisture: 35, npk: 45, yield: 65, aiPrediction: 62 },
  { name: 'Week 3', moisture: 45, npk: 55, yield: 70, aiPrediction: 68 },
  { name: 'Week 4', moisture: 55, npk: 70, yield: 80, aiPrediction: 75 },
  { name: 'Week 5', moisture: 60, npk: 85, yield: 85, aiPrediction: 82 },
  { name: 'Week 6 (Now)', moisture: 65, npk: 92, yield: 88, aiPrediction: 88 },
  { name: 'Week 7 (Proj)', moisture: 65, npk: 95, yield: null, aiPrediction: 94 },
  { name: 'Week 8 (Proj)', moisture: 70, npk: 100, yield: null, aiPrediction: 100 },
];

export default function YieldAnalytics() {
  const language = useSettingsStore(s => s.language);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-900/10">
          <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">Projected Yield</span>
          </div>
          <p className="text-4xl font-black text-emerald-900 dark:text-emerald-50">+24%</p>
          <p className="text-xs font-semibold text-emerald-700/70 mt-1 dark:text-emerald-400/60">Using RL AI Precision</p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm dark:border-blue-900/30 dark:bg-blue-900/10">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <Droplets size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">Water Saved</span>
          </div>
          <p className="text-4xl font-black text-blue-900 dark:text-blue-50">1,240L</p>
          <p className="text-xs font-semibold text-blue-700/70 mt-1 dark:text-blue-400/60">This month vs Manual</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">AI Harvest Prediction Timeline</h3>
            <p className="text-sm font-medium text-slate-500">Historical data combined with RL forecasting</p>
          </div>
          <div className="rounded-xl bg-purple-100 px-3 py-1.5 flex items-center gap-1.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Award size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">High Confidence</span>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontWeight: 800 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, marginTop: '20px' }} />
              
              <Area type="monotone" dataKey="aiPrediction" name="AI Projected Growth" stroke="#10b981" fillOpacity={1} fill="url(#colorYield)" strokeWidth={3} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="yield" name="Actual Growth Index" stroke="#059669" strokeWidth={4} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="npk" name="Soil Fertility (NPK)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Reasoning Panel */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
        <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <Target size={20} className="text-rose-500" />
          <h3 className="text-base font-black">AI Agronomist Insights</h3>
        </div>
        <ul className="space-y-3">
          <li className="flex gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">1</div>
            <p>Moisture levels have stabilized at 65% due to predictive rain shutoffs, preventing root rot.</p>
          </li>
          <li className="flex gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-black text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">2</div>
            <p>Fertigation schedules successfully raised Potassium (K) exactly during the flowering phase.</p>
          </li>
          <li className="flex gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">3</div>
            <p>Result: Expecting harvest maturity 12 days earlier than regional average with higher biomass.</p>
          </li>
        </ul>
      </div>
    </div>
  );
}

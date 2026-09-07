import { useModeStore } from '../../store/modeStore.js';
import { ShieldCheck, Eye } from 'lucide-react';
import mqttClient from '../../mqtt/mqttClient.js';

export default function ModeToggle({ className = '' }) {
  const { mode, setMode } = useModeStore();
  const isAct = mode === 'act';

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    mqttClient.publish('krishisarth/system/mode', nextMode === 'act' ? 'ACT' : 'VIEW');
  };

  return (
    <div
      className={`inline-flex rounded-full border border-[#dbe5d8] bg-[#f4faf2] p-1 shadow-sm ${className}`}
      role="group"
      aria-label="Mode"
    >
      <button
        type="button"
        onClick={() => handleModeChange('view')}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
          !isAct ? 'bg-white text-[#1a3d1a] shadow-sm' : 'text-slate-500 hover:text-[#1a3d1a]'
        }`}
        aria-pressed={!isAct}
      >
        <Eye size={13} />
        <span>View</span>
      </button>
      <button
        type="button"
        onClick={() => handleModeChange('act')}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
          isAct ? 'bg-[#1a3d1a] text-white shadow-sm' : 'text-slate-500 hover:text-[#1a3d1a]'
        }`}
        aria-pressed={isAct}
      >
        <ShieldCheck size={13} />
        <span>Act</span>
      </button>
    </div>
  );
}

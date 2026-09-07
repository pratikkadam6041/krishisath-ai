import { useTranslation } from 'react-i18next';
import { Leaf, Wind, Activity } from 'lucide-react';
import ActionButton from '../ActionButton/index.jsx';

export default function SoilMetricTile({ label, value, unit, status, icon: Icon, onClick }) {
  const { t } = useTranslation();

  const colors = {
    optimal:  'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]',
    low:      'bg-[#FFF8E1] text-[#F9A825] border-[#F9A825]',
    critical: 'bg-[#FFEBEE] text-[#C62828] border-[#C62828]',
    high:     'bg-[#E1F5FE] text-[#0277BD] border-[#0277BD]',
  }[status] || 'bg-white text-text-secondary border-border';

  const isClickable = !!onClick;

  return (
    <div
      className={`rounded-xl border flex flex-col p-3 ${colors} ${isClickable ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
        {Icon && <Icon size={14} />}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-xl font-bold leading-none">{value}</span>
        <span className="text-xs font-semibold opacity-75">{unit}</span>
      </div>
    </div>
  );
}

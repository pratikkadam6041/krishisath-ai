import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

const formatTime = (iso) => {
  try { return format(new Date(iso), 'HH:mm'); } catch { return iso; }
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-card p-2.5 border border-border text-sm">
      <p className="text-text-secondary text-xs">{formatTime(label)}</p>
      <p className="font-bold text-text-primary">{payload[0]?.value?.toFixed(1)}{unit}</p>
    </div>
  );
};

export default function HistoryChart({ data = [], color = '#2E7D32', unit = '%', title, height = 180, referenceLines = [] }) {
  const { t } = useTranslation();

  if (!data.length) {
    return (
      <div className="card p-4">
        {title && <p className="text-small font-semibold text-text-secondary mb-3">{title}</p>}
        <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
          {t('history.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      {title && <p className="text-small font-semibold text-text-primary mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            tick={{ fontSize: 11, fill: '#555555' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#555555' }}
            tickLine={false}
            axisLine={false}
            unit={unit}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {referenceLines.map((ref, i) => (
            <ReferenceLine key={i} x={ref.x} stroke={ref.color || '#0277BD'} strokeDasharray="4 2" label={ref.label} />
          ))}
          <Line
            type="monotone" dataKey="value" stroke={color}
            strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

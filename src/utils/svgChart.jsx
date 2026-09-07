import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Rectangle,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function mapSeries(data = [], labels = []) {
  return data.map((value, index) => ({
    label: labels[index] || `D${index + 1}`,
    value,
    index,
  }));
}

function formatTooltipValue(value, unit = '') {
  if (value == null) return `—${unit}`;
  return `${value}${unit}`;
}

function ChartTooltip({ active, payload, label, unit = '', formatter }) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0]?.value;
  const displayValue = formatter ? formatter(value) : formatTooltipValue(value, unit);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{displayValue}</p>
    </div>
  );
}

function getDomain(series = [], minimum) {
  const values = series.map((item) => item.value);
  if (!values.length) return [0, 100];

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const floor = minimum ?? Math.max(0, Math.floor((minValue - 5) / 5) * 5);
  const ceiling = Math.ceil((maxValue + 5) / 5) * 5 || 10;

  if (floor === ceiling) {
    return [0, ceiling + 10];
  }

  return [floor, ceiling];
}

export function Sparkline({
  data,
  height = 180,
  color = '#16a34a',
  unit = '%',
  labels = [],
  compact = false,
  showDots = !compact,
  showLabels = true,
  formatter,
  yDomain,
  zones = [],
}) {
  const series = mapSeries(data, labels);
  if (!series.length) return null;

  const domain = yDomain || getDomain(series, unit === '%' ? 0 : undefined);

  return (
    <div className={compact ? 'h-[88px] w-full' : `h-[${height}px] w-full`}>
      <ResponsiveContainer width="100%" height={compact ? 88 : height}>
        <AreaChart data={series} margin={{ top: 10, right: 10, left: compact ? -18 : -8, bottom: compact ? 0 : 6 }}>
          <defs>
            <linearGradient id={`trend-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {zones.map((zone) => (
            <ReferenceArea
              key={`${zone.label}-${zone.from}-${zone.to}`}
              y1={zone.from}
              y2={zone.to}
              fill={zone.color}
              fillOpacity={zone.opacity ?? 0.08}
              strokeOpacity={0}
            />
          ))}
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
            hide={!showLabels}
          />
          <YAxis
            width={compact ? 24 : 36}
            domain={domain}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
            tickFormatter={(value) => (compact ? `${value}` : `${value}${unit}`)}
          />
          <Tooltip content={<ChartTooltip unit={unit} formatter={formatter} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#trend-${color.replace('#', '')})`}
            strokeWidth={3}
            dot={showDots ? { r: 3, fill: color, stroke: '#ffffff', strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
  color = '#0284c7',
  labels = [],
  unit = 'L',
  formatter,
}) {
  const series = mapSeries(data, labels);
  if (!series.length) return null;

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={series} margin={{ top: 16, right: 10, left: -8, bottom: 6 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
          />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
            tickFormatter={(value) => `${value}${unit}`}
          />
          <Tooltip content={<ChartTooltip unit={unit} formatter={formatter} />} />
          <Bar
            dataKey="value"
            fill={color}
            radius={[10, 10, 4, 4]}
            maxBarSize={32}
            shape={(props) => <Rectangle {...props} radius={[10, 10, 4, 4]} />}
          >
            <LabelList
              dataKey="value"
              position="top"
              formatter={(value) => (formatter ? formatter(value) : `${value}${unit}`)}
              style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PumpTimeline({
  pumpStates = [],
  height = 120,
  labels = [],
}) {
  const defaultLabels = labels.length
    ? labels
    : ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00'].slice(0, pumpStates.length);

  const series = pumpStates.map((state, index) => ({
    label: defaultLabels[index] || `${index + 1}`,
    value: state ? 1 : 0,
  }));

  if (!series.length) return null;

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={series} margin={{ top: 14, right: 10, left: -18, bottom: 6 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
          />
          <YAxis
            width={0}
            domain={[0, 1]}
            tick={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value) => (value ? 'Pump ON' : 'Pump OFF')}
              />
            }
          />
          <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} maxBarSize={34}>
            <LabelList
              dataKey="value"
              position="insideTop"
              formatter={(value) => (value ? 'ON' : 'OFF')}
              style={{ fill: '#ffffff', fontSize: 10, fontWeight: 700 }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

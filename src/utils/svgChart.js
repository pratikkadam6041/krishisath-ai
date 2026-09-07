/**
 * SVG Chart utilities — pure SVG, no external library
 * All charts are inline SVG elements, zero dependencies
 */

/**
 * Build an SVG polyline path string from a data array
 * @param {number[]} data  - array of values
 * @param {number}   w     - SVG width in px
 * @param {number}   h     - SVG height in px
 * @param {number}   [pad] - padding inside SVG
 * @returns {{ path: string, points: Array<[number,number]>, min: number, max: number }}
 */
export function buildSparkline(data, w, h, pad = 8) {
  if (!data || data.length < 2) return { path: '', points: [], min: 0, max: 100 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + (1 - (val - min) / range) * innerH;
    return [x, y];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  // Area fill path (close bottom)
  const areaPath =
    path +
    ` L ${points[points.length - 1][0].toFixed(1)} ${(h - pad).toFixed(1)}` +
    ` L ${points[0][0].toFixed(1)} ${(h - pad).toFixed(1)} Z`;

  return { path, areaPath, points, min, max };
}

/**
 * Build SVG bar chart rects
 * @param {number[]} data   - array of values
 * @param {number}   w      - total SVG width
 * @param {number}   h      - total SVG height
 * @param {string}   color  - bar fill color
 * @returns {{ bars: Array<{x,y,w,h,val}>, min: number, max: number }}
 */
export function buildBars(data, w, h, color = '#10b981') {
  if (!data || data.length === 0) return { bars: [], min: 0, max: 0 };
  const pad = 6;
  const max = Math.max(...data) || 1;
  const barW = (w - pad * 2) / data.length;
  const gap = barW * 0.2;

  const bars = data.map((val, i) => {
    const barH = ((val / max) * (h - pad * 2));
    return {
      x: pad + i * barW + gap / 2,
      y: h - pad - barH,
      w: barW - gap,
      h: barH,
      val,
      color,
    };
  });

  return { bars, min: 0, max };
}

/**
 * Build pump activity segments (on/off timeline)
 * @param {boolean[]} pumpStates - array of true/false per day
 * @param {number}   w
 * @param {number}   h
 */
export function buildPumpTimeline(pumpStates, w, h = 20) {
  const segW = w / pumpStates.length;
  return pumpStates.map((on, i) => ({
    x: i * segW,
    y: 0,
    w: segW - 2,
    h,
    color: on ? '#10b981' : '#e5e7eb',
    label: on ? 'ON' : 'OFF',
  }));
}

/**
 * Sparkline chart React component (pure SVG)
 */
export function Sparkline({
  data,
  width = 240,
  height = 60,
  color = '#10b981',
  fillOpacity = 0.15,
  strokeWidth = 2,
  showDots = true,
  showLabels = false,
  labels = [],
}) {
  const { path, areaPath, points, min, max } = buildSparkline(data, width, height);
  if (!path) return null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} overflow="visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#sg-${color.replace('#', '')})`}
        stroke="none"
      />
      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {showDots &&
        points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill={color} stroke="white" strokeWidth={1.5} />
        ))}
      {/* Labels */}
      {showLabels &&
        labels.map((label, i) => {
          const pt = points[i];
          if (!pt) return null;
          return (
            <text
              key={i}
              x={pt[0]}
              y={height - 2}
              textAnchor="middle"
              fontSize={9}
              fill="#9ca3af"
            >
              {label}
            </text>
          );
        })}
    </svg>
  );
}

/**
 * Bar chart React component (pure SVG)
 */
export function BarChart({ data, width = 240, height = 80, color = '#10b981', labels = [] }) {
  const { bars } = buildBars(data, width, height, color);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.w}
            height={Math.max(bar.h, 2)}
            rx={3}
            fill={bar.color}
            opacity={0.85}
          />
          {labels[i] && (
            <text
              x={bar.x + bar.w / 2}
              y={height - 1}
              textAnchor="middle"
              fontSize={9}
              fill="#9ca3af"
            >
              {labels[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * Pump timeline bar React component (pure SVG)
 */
export function PumpTimeline({ pumpStates, width = 240, height = 20 }) {
  const segs = buildPumpTimeline(pumpStates, width, height);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {segs.map((seg, i) => (
        <rect key={i} x={seg.x} y={seg.y} width={Math.max(seg.w, 0)} height={seg.h} rx={3} fill={seg.color} />
      ))}
    </svg>
  );
}

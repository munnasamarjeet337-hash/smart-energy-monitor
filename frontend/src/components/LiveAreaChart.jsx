import React, { useState } from 'react';

/**
 * High-performance, responsive SVG Area Chart with smooth bezier curves and glowing gradients
 */
export const LiveAreaChart = ({
  data = [],
  height = 110,
  isAnomaly = false,
  gradientId = 'chart-grad'
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        Awaiting telemetry...
      </div>
    );
  }

  const padding = { top: 12, bottom: 8, left: 6, right: 6 };
  const width = 300; // Normalized coordinate viewBox width

  const values = data.map(d => d.watts);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (d.watts - minVal) / range) * (height - padding.top - padding.bottom);
    return { x, y, data: d };
  });

  // Build SVG path with smooth cubic bezier curve
  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${points[0].x} ${points[0].y} L ${width - padding.right} ${points[0].y}`;
  } else {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }

  // Area path closing at bottom
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const strokeColor = isAnomaly ? '#ef4444' : '#22d3ee';
  const fillColor1 = isAnomaly ? 'rgba(239, 68, 68, 0.45)' : 'rgba(34, 211, 238, 0.4)';
  const fillColor2 = isAnomaly ? 'rgba(239, 68, 68, 0.0)' : 'rgba(99, 102, 241, 0.0)';

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor1} />
            <stop offset="100%" stopColor={fillColor2} />
          </linearGradient>
        </defs>

        {/* Subtle grid lines */}
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height / 2} x2={width - padding.right} y2={height / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

        {/* Filled Area */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Line Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Real-Time Glowing Head Dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill={strokeColor}
            stroke="#0b1220"
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}
          />
        )}

        {/* Anomaly Spike Highlight Dots */}
        {points.map((pt, i) => {
          if (pt.data.isAnomaly) {
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#ef4444"
                stroke="#fff"
                strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 8px #ef4444)' }}
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};

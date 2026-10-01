import React, { useState } from 'react';

export const HistoryTimelineChart = ({ data = [], height = 300 }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No historical readings found for this query filter.
      </div>
    );
  }

  const padding = { top: 20, bottom: 40, left: 55, right: 25 };
  const width = 800; // viewBox width

  const values = data.map(d => d.watts);
  const minVal = Math.max(0, Math.floor(Math.min(...values) * 0.8));
  const maxVal = Math.ceil(Math.max(...values) * 1.15) || 500;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (d.watts - minVal) / range) * (height - padding.top - padding.bottom);
    return { x, y, data: d, index: i };
  });

  // Smooth bezier curve
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

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  // Generate 4 horizontal grid steps
  const gridSteps = 4;
  const yTicks = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = Math.round(minVal + (i / gridSteps) * (maxVal - minVal));
    const y = padding.top + (1 - i / gridSteps) * (height - padding.top - padding.bottom);
    return { val, y };
  });

  // Generate 5-6 X-axis time ticks
  const xTickCount = Math.min(6, points.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const idx = Math.floor((i / (xTickCount - 1 || 1)) * (points.length - 1));
    return points[idx];
  });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    
    // Find closest point by X coordinate
    let closest = points[0];
    let minDiff = Infinity;
    points.forEach(p => {
      const diff = Math.abs(p.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    });

    if (minDiff < 40) {
      setHoveredPoint(closest);
    } else {
      setHoveredPoint(null);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id="historyTimelineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.45)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0.0)" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid & Y-Axis Labels */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="rgba(255, 255, 255, 0.06)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={t.y + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {t.val} W
            </text>
          </g>
        ))}

        {/* Area Fill */}
        <path d={areaD} fill="url(#historyTimelineGrad)" />

        {/* Stroke Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-Axis Ticks */}
        {xTicks.map((t, idx) => (
          <text
            key={idx}
            x={t.x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {t.data.timeFormatted || new Date(t.data.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        ))}

        {/* Anomaly Spikes Highlight Dots */}
        {points.map((pt, i) => {
          if (pt.data.isAnomaly) {
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="6"
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 0 10px #ef4444)' }}
                />
              </g>
            );
          }
          return null;
        })}

        {/* Hover Crosshair & Focus Dot */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={height - padding.bottom}
              stroke="rgba(34, 211, 238, 0.5)"
              strokeDasharray="3 3"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="6"
              fill={hoveredPoint.data.isAnomaly ? '#ef4444' : '#22d3ee'}
              stroke="#0b1220"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))' }}
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="custom-tooltip"
          style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div className="tooltip-label">
            {hoveredPoint.data.timeFormatted || new Date(hoveredPoint.data.ts).toLocaleTimeString()} - {hoveredPoint.data.deviceId}
          </div>
          <div className="tooltip-value">{hoveredPoint.data.watts} Watts</div>
          {hoveredPoint.data.average && (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Rolling Avg: {hoveredPoint.data.average}W
            </div>
          )}
          {hoveredPoint.data.isAnomaly && (
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.72rem', marginTop: '0.2rem' }}>
              🚨 Anomaly Surge Detected!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

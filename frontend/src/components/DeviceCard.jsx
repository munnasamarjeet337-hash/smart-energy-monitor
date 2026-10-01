import React, { useMemo } from 'react';
import { 
  Refrigerator, 
  Wind, 
  Tv, 
  WashingMachine, 
  Flame, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';
import clsx from 'clsx';
import { LiveAreaChart } from './LiveAreaChart';

// Icon mapping for device types
const deviceIcons = {
  fridge: Refrigerator,
  ac: Wind,
  tv: Tv,
  washing_machine: WashingMachine,
  heater: Flame,
};

const deviceDisplayNames = {
  fridge: 'Kitchen Refrigerator',
  ac: 'Living Room A/C',
  tv: 'Entertainment TV',
  washing_machine: 'Washer & Dryer',
  heater: 'Water Heater',
};

export const DeviceCard = ({ deviceId, currentWatts, isAnomaly, averageWatts, historyData = [] }) => {
  const Icon = deviceIcons[deviceId] || Cpu;
  const displayName = deviceDisplayNames[deviceId] || deviceId.toUpperCase();

  // Compute local min, max, avg from the rolling 60 points
  const { minVal, maxVal, calculatedAvg } = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { minVal: currentWatts, maxVal: currentWatts, calculatedAvg: currentWatts };
    }
    const vals = historyData.map(d => d.watts);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    return { minVal: min, maxVal: max, calculatedAvg: avg };
  }, [historyData, currentWatts]);

  const gradientId = `gradient-${deviceId}`;

  return (
    <div className={clsx('device-card', isAnomaly && 'has-anomaly')}>
      {/* Header with Icon, Name, and Status Badge */}
      <div className="device-header">
        <div className="device-title-group">
          <div className="device-icon-box">
            <Icon size={20} />
          </div>
          <div>
            <div className="device-name">{displayName}</div>
            <div className="device-id-tag">ID: {deviceId}</div>
          </div>
        </div>

        <div className={clsx('status-pill', isAnomaly ? 'anomaly' : 'normal')}>
          {isAnomaly ? (
            <>
              <AlertTriangle size={12} />
              <span>ANOMALY</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} />
              <span>NORMAL</span>
            </>
          )}
        </div>
      </div>

      {/* Wattage Display */}
      <div className="device-power-display">
        <div>
          <span className="power-number">{currentWatts ?? '--'}</span>
          <span className="power-unit">W</span>
        </div>
        <div className="power-meta">
          <div>Rolling Avg: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{averageWatts || calculatedAvg || '--'}W</span></div>
          {isAnomaly && (
            <div style={{ color: 'var(--danger)', fontWeight: 600 }}>
              &gt;200% Threshold!
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Live Line/Area Chart */}
      <div className="device-chart-wrapper">
        <LiveAreaChart
          data={historyData}
          height={110}
          isAnomaly={isAnomaly}
          gradientId={gradientId}
        />
      </div>

      {/* Card Footer with Mini Stats */}
      <div className="device-card-footer">
        <span>Min: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{minVal}W</strong></span>
        <span>Avg: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{calculatedAvg}W</strong></span>
        <span>Peak: <strong style={{ color: isAnomaly ? 'var(--danger)' : 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{maxVal}W</strong></span>
      </div>
    </div>
  );
};

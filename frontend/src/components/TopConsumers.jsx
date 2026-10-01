import React from 'react';
import { Zap } from 'lucide-react';
import clsx from 'clsx';

const deviceDisplayNames = {
  fridge: 'Fridge',
  ac: 'Air Conditioner',
  tv: 'Smart TV',
  washing_machine: 'Washing Machine',
  heater: 'Water Heater',
};

export const TopConsumers = ({ topData = { topList: [], totalWatts: 0, totalKw: 0 } }) => {
  const { topList = [], totalWatts = 0, totalKw = 0 } = topData;

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <Zap size={18} style={{ color: 'var(--accent-cyan)' }} />
          <span>Top Consumers</span>
        </div>
        <div className="panel-badge">
          {totalKw > 0 ? `${totalKw} kW Total` : `${totalWatts} W Total`}
        </div>
      </div>

      <div className="top-consumers-list">
        {topList.length === 0 ? (
          <div className="empty-state">
            <span>Awaiting device telemetry...</span>
          </div>
        ) : (
          topList.map((item, index) => {
            const name = deviceDisplayNames[item.deviceId] || item.deviceId;
            return (
              <div key={item.deviceId} className="consumer-item">
                <div className="consumer-info">
                  <div className="consumer-left">
                    <span className={clsx('rank-badge', `rank-${index + 1}`)}>
                      {index + 1}
                    </span>
                    <span className="consumer-name">{name}</span>
                  </div>
                  <div className="consumer-right">
                    <span>{item.watts}W</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>

                <div className="consumer-bar-track">
                  <div
                    className={clsx('consumer-bar-fill', item.isAnomaly && 'spike')}
                    style={{ width: `${Math.max(item.percentage, 4)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

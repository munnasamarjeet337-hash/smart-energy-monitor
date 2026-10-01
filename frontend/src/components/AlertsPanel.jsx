import React from 'react';
import { AlertOctagon, Trash2, Clock } from 'lucide-react';

const deviceDisplayNames = {
  fridge: 'Fridge',
  ac: 'Air Conditioner',
  tv: 'Smart TV',
  washing_machine: 'Washing Machine',
  heater: 'Water Heater',
};

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const AlertsPanel = ({ alerts = [], onClearAlerts }) => {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <AlertOctagon size={18} style={{ color: 'var(--danger)' }} />
          <span>Anomaly Alerts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="panel-badge" style={{ color: alerts.length > 0 ? '#f87171' : 'var(--text-muted)' }}>
            {alerts.length} Event{alerts.length === 1 ? '' : 's'}
          </span>
          {alerts.length > 0 && onClearAlerts && (
            <button
              onClick={onClearAlerts}
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              title="Clear alerts list"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <AlertOctagon size={28} style={{ opacity: 0.3 }} />
            <span>No anomalies detected. All appliances operating within normal thresholds.</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const name = deviceDisplayNames[alert.deviceId] || alert.deviceId;
            return (
              <div key={alert.id || `${alert.deviceId}-${alert.ts}`} className="alert-item">
                <div className="alert-top">
                  <div className="alert-device-name">
                    <span>{name}</span>
                  </div>
                  <div className="alert-time" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={11} />
                    <span>{formatTime(alert.ts)}</span>
                  </div>
                </div>

                <div className="alert-body">
                  <div>
                    Spike: <span className="alert-power-highlight">{alert.watts}W</span>
                    {alert.average && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                        (Avg: {alert.average}W)
                      </span>
                    )}
                  </div>
                  {alert.percentageSpike && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171' }}>
                      +{alert.percentageSpike}%
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

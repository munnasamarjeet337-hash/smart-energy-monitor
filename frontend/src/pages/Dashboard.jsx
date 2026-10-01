import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Zap, 
  Activity, 
  Cpu, 
  AlertTriangle, 
  History as HistoryIcon, 
  LogOut, 
  X,
  Sparkles
} from 'lucide-react';
import { socket } from '../socket';
import { api } from '../api';
import { StatCard } from '../components/StatCard';
import { DeviceCard } from '../components/DeviceCard';
import { TopConsumers } from '../components/TopConsumers';
import { AlertsPanel } from '../components/AlertsPanel';

const INITIAL_DEVICES = ['fridge', 'ac', 'tv', 'washing_machine', 'heater'];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Per-device state: Map of deviceId -> { currentWatts, isAnomaly, averageWatts, history: [{ watts, ts, timeStr, isAnomaly }] }
  const [deviceStates, setDeviceStates] = useState(() => {
    const initial = {};
    INITIAL_DEVICES.forEach(id => {
      initial[id] = {
        deviceId: id,
        currentWatts: 0,
        isAnomaly: false,
        averageWatts: 0,
        history: []
      };
    });
    return initial;
  });

  const [topData, setTopData] = useState({ topList: [], totalWatts: 0, totalKw: 0, activeDeviceCount: 0 });
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Accumulated kWh estimation
  const [kwhAccumulated, setKwhAccumulated] = useState(0.000);
  const lastKwhUpdateRef = useRef(Date.now());

  // Check user authentication
  useEffect(() => {
    const token = localStorage.getItem('energy_token');
    const storedUser = localStorage.getItem('energy_user');
    if (!token) {
      navigate('/login');
      return;
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, [navigate]);

  // Connect Socket.IO on mount & listen to real-time events
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log('✅ Socket.IO connected to backend');
      setSocketConnected(true);
    };

    const onDisconnect = () => {
      console.warn('⚠️ Socket.IO disconnected');
      setSocketConnected(false);
    };

    // Initial load of latest known device readings
    const onInitialDevices = (devicesList) => {
      setDeviceStates(prev => {
        const next = { ...prev };
        devicesList.forEach(dev => {
          const timeStr = new Date(dev.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          next[dev.deviceId] = {
            deviceId: dev.deviceId,
            currentWatts: dev.watts,
            isAnomaly: dev.isAnomaly,
            averageWatts: dev.average,
            history: [{ watts: dev.watts, ts: dev.ts, timeStr, isAnomaly: dev.isAnomaly }]
          };
        });
        return next;
      });
    };

    // Initial recent alerts from DB
    const onInitialAlerts = (initialAlertsList) => {
      setAlerts(initialAlertsList);
    };

    // Live device reading event
    const onReading = (reading) => {
      const { deviceId, watts, ts, isAnomaly, average } = reading;
      const timeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setDeviceStates(prev => {
        const currentDev = prev[deviceId] || {
          deviceId,
          currentWatts: 0,
          isAnomaly: false,
          averageWatts: 0,
          history: []
        };

        const newPoint = { watts, ts, timeStr, isAnomaly };
        // Keep sliding array of last 60 points
        const updatedHistory = [...currentDev.history, newPoint].slice(-60);

        return {
          ...prev,
          [deviceId]: {
            deviceId,
            currentWatts: watts,
            isAnomaly: Boolean(isAnomaly),
            averageWatts: average || currentDev.averageWatts,
            history: updatedHistory
          }
        };
      });

      // Integrate energy consumption (kWh += watts * deltaHours / 1000)
      const now = Date.now();
      const elapsedHours = (now - lastKwhUpdateRef.current) / (1000 * 3600);
      lastKwhUpdateRef.current = now;
      if (elapsedHours > 0 && elapsedHours < 1) {
        setKwhAccumulated(prev => prev + (watts * elapsedHours) / 1000);
      }
    };

    // Live alert event
    const onAlert = (alertPayload) => {
      setAlerts(prev => [alertPayload, ...prev].slice(0, 50));

      // Spawn floating toast
      setToasts(prev => [
        ...prev,
        {
          id: alertPayload.id || Date.now(),
          deviceId: alertPayload.deviceId,
          watts: alertPayload.watts,
          message: alertPayload.message
        }
      ]);

      // Auto dismiss toast after 5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== (alertPayload.id || Date.now())));
      }, 5000);
    };

    // Top consumers interval event
    const onTopConsumers = (topPayload) => {
      setTopData(topPayload);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('initialDevices', onInitialDevices);
    socket.on('initialAlerts', onInitialAlerts);
    socket.on('reading', onReading);
    socket.on('alert', onAlert);
    socket.on('topConsumers', onTopConsumers);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('initialDevices', onInitialDevices);
      socket.off('initialAlerts', onInitialAlerts);
      socket.off('reading', onReading);
      socket.off('alert', onAlert);
      socket.off('topConsumers', onTopConsumers);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('energy_token');
    localStorage.removeItem('energy_user');
    socket.disconnect();
    navigate('/login');
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Aggregated Stats
  const totalPowerWatts = topData.totalWatts || Object.values(deviceStates).reduce((sum, d) => sum + (d.currentWatts || 0), 0);
  const totalPowerKw = (totalPowerWatts / 1000).toFixed(2);
  const activeCount = Object.values(deviceStates).filter(d => d.currentWatts > 0).length || 5;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top App Bar */}
      <nav className="top-nav">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <div>
            <div className="brand-title">Smart Energy Monitor</div>
          </div>
          <div className="live-badge">
            <div className="live-dot" />
            <span>{socketConnected ? 'Live Telemetry' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Live Aggregate Metric Pill */}
        <div className="nav-metrics">
          <div className="nav-metric-item">
            <span className="nav-metric-label">Current Load</span>
            <span className="nav-metric-value">{totalPowerKw} kW</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div className="nav-metric-item">
            <span className="nav-metric-label">Session Energy</span>
            <span className="nav-metric-value" style={{ color: 'var(--text-primary)' }}>
              {kwhAccumulated.toFixed(3)} kWh
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="nav-actions">
          <Link to="/history" className="btn btn-secondary">
            <HistoryIcon size={16} />
            <span>History & Analytics</span>
          </Link>
          <button onClick={handleLogout} className="btn btn-danger btn-icon" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="dashboard-container">
        {/* Row of 3 StatCards */}
        <div className="stats-grid">
          <StatCard
            title="Total Power Now"
            value={totalPowerWatts > 1000 ? totalPowerKw : totalPowerWatts}
            unit={totalPowerWatts > 1000 ? 'kW' : 'W'}
            icon={Zap}
            subtext="Live aggregated house power"
          />
          <StatCard
            title="Active Smart Plugs"
            value={`${activeCount}/5`}
            unit="Online"
            icon={Cpu}
            subtext="Reporting every 3 seconds"
          />
          <StatCard
            title="Anomalies Today"
            value={alerts.length}
            unit="Alerts"
            icon={AlertTriangle}
            variant={alerts.length > 0 ? 'danger' : 'default'}
            subtext="Wattage exceeding 2x rolling avg"
          />
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="main-grid">
          {/* Left Column: Device Cards Grid */}
          <div className="devices-grid">
            {INITIAL_DEVICES.map(deviceId => {
              const dev = deviceStates[deviceId] || {
                deviceId,
                currentWatts: 0,
                isAnomaly: false,
                averageWatts: 0,
                history: []
              };
              return (
                <DeviceCard
                  key={deviceId}
                  deviceId={dev.deviceId}
                  currentWatts={dev.currentWatts}
                  isAnomaly={dev.isAnomaly}
                  averageWatts={dev.averageWatts}
                  historyData={dev.history}
                />
              );
            })}
          </div>

          {/* Right Column: Top Consumers & Anomaly Alerts */}
          <div className="sidebar-column">
            <TopConsumers topData={topData} />
            <AlertsPanel alerts={alerts} onClearAlerts={() => setAlerts([])} />
          </div>
        </div>
      </div>

      {/* Floating Toast Alerts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            <div className="toast-content">
              <div className="toast-title">🚨 Anomaly Detected on {toast.deviceId.toUpperCase()}</div>
              <div className="toast-desc">
                Spike reached <strong>{toast.watts}W</strong> (exceeded 2x rolling average limit).
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Database 
} from 'lucide-react';
import { api } from '../api';
import { StatCard } from '../components/StatCard';
import { HistoryTimelineChart } from '../components/HistoryTimelineChart';

const DEVICE_OPTIONS = [
  { value: 'all', label: 'All Devices' },
  { value: 'fridge', label: 'Kitchen Refrigerator' },
  { value: 'ac', label: 'Living Room A/C' },
  { value: 'tv', label: 'Entertainment TV' },
  { value: 'washing_machine', label: 'Washer & Dryer' },
  { value: 'heater', label: 'Water Heater' },
];

export const History = () => {
  const navigate = useNavigate();
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [rangePreset, setRangePreset] = useState('1h');
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState({
    totalReadings: 0,
    avgWatts: 0,
    maxWatts: 0,
    minWatts: 0,
    anomalyCount: 0,
    estimatedKwh: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Protect route
  useEffect(() => {
    const token = localStorage.getItem('energy_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const fetchHistoryData = async () => {
    setLoading(true);
    setError('');

    try {
      let fromDate = null;
      const now = new Date();

      if (rangePreset === '15m') {
        fromDate = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      } else if (rangePreset === '1h') {
        fromDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      } else if (rangePreset === '6h') {
        fromDate = new Date(now.getTime() - 6 * 3600 * 1000).toISOString();
      } else if (rangePreset === '24h') {
        fromDate = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
      }

      const params = {
        deviceId: selectedDevice,
        limit: 500,
      };
      if (fromDate) {
        params.from = fromDate;
      }

      const res = await api.getHistory(params);
      if (res.success) {
        const formatted = res.data.map(r => ({
          ...r,
          timeFormatted: new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }));
        setReadings(formatted);
        setStats(res.stats || {});
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch historical readings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [selectedDevice, rangePreset]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Nav */}
      <nav className="top-nav">
        <div className="brand-wrapper">
          <Link to="/" className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
          <div className="brand-title" style={{ fontSize: '1.15rem' }}>
            Historical Power Analytics
          </div>
        </div>
        <div className="nav-actions">
          <button onClick={fetchHistoryData} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="history-container">
        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="filter-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Device:</span>
              <select
                className="select-input"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                {DEVICE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Time Window:</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { key: '15m', label: '15 Mins' },
                  { key: '1h', label: '1 Hour' },
                  { key: '6h', label: '6 Hours' },
                  { key: '24h', label: '24 Hours' },
                  { key: 'all', label: 'All Time' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setRangePreset(p.key)}
                    className={`btn ${rangePreset === p.key ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing <strong>{readings.length}</strong> logged telemetry data points
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            {error}
          </div>
        )}

        {/* Aggregated Stats Row */}
        <div className="stats-grid">
          <StatCard
            title="Total Readings"
            value={stats.totalReadings}
            unit="Entries"
            icon={Database}
            subtext="Validated & stored in MongoDB"
          />
          <StatCard
            title="Average Power Load"
            value={stats.avgWatts}
            unit="Watts"
            icon={TrendingUp}
            subtext="Across selected query window"
          />
          <StatCard
            title="Peak Wattage"
            value={stats.maxWatts}
            unit="Watts"
            icon={Zap}
            subtext="Highest recorded surge"
          />
          <StatCard
            title="Anomalies Flagged"
            value={stats.anomalyCount}
            unit="Spikes"
            icon={AlertTriangle}
            variant={stats.anomalyCount > 0 ? 'danger' : 'default'}
            subtext="Violated 2x sliding threshold"
          />
        </div>

        {/* Large Time-Series Trend Chart */}
        <div className="panel-card" style={{ padding: '1.5rem' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Zap size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span>Power Consumption Timeline (Watts)</span>
            </div>
          </div>

          <div style={{ height: '320px', width: '100%', marginTop: '0.5rem' }}>
            <HistoryTimelineChart data={readings} height={320} />
          </div>
        </div>

        {/* Detailed Data Table */}
        <div className="data-table-wrapper">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700 }}>
            Recent Power Readings Log
          </div>
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Device ID</th>
                  <th>Wattage</th>
                  <th>Rolling Avg</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(-100).reverse().map((r, i) => (
                  <tr key={r._id || i} className={r.isAnomaly ? 'row-anomaly' : ''}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {new Date(r.ts).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {r.deviceId}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.isAnomaly ? 'var(--danger)' : 'var(--accent-cyan)' }}>
                      {r.watts} W
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {r.average ? `${r.average} W` : '--'}
                    </td>
                    <td>
                      <span className={`status-pill ${r.isAnomaly ? 'anomaly' : 'normal'}`}>
                        {r.isAnomaly ? 'ANOMALY' : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reading = require('../models/Reading');
const mongoose = require('mongoose');

class ReadingStore {
  constructor(maxInMemory = 2000) {
    this.maxInMemory = maxInMemory;
    // Ring buffer of readings: [{ deviceId, watts, ts, isAnomaly, average }]
    this.readings = [];
  }

  /**
   * Save a new reading
   */
  async saveReading(readingData) {
    // 1. Add to in-memory ring buffer
    this.readings.push({
      _id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ...readingData,
      ts: new Date(readingData.ts || Date.now())
    });

    if (this.readings.length > this.maxInMemory) {
      this.readings.shift();
    }

    // 2. Persist to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Reading.create(readingData);
      } catch (err) {
        console.warn('⚠️ MongoDB write warning:', err.message);
      }
    }
  }

  /**
   * Query history with filters
   */
  async getHistory({ deviceId, from, to, limit = 500 }) {
    if (mongoose.connection.readyState === 1) {
      try {
        const filter = {};
        if (deviceId && deviceId !== 'all') {
          filter.deviceId = deviceId;
        }
        if (from || to) {
          filter.ts = {};
          if (from) filter.ts.$gte = new Date(from);
          if (to) filter.ts.$lte = new Date(to);
        }

        const maxLimit = Math.min(Number(limit) || 500, 2000);
        const docs = await Reading.find(filter)
          .sort({ ts: 1 })
          .limit(maxLimit)
          .lean();

        if (docs && docs.length > 0) {
          return docs;
        }
      } catch (err) {
        console.warn('⚠️ MongoDB query fallback to in-memory buffer:', err.message);
      }
    }

    // Fallback or memory query
    let filtered = this.readings;
    if (deviceId && deviceId !== 'all') {
      filtered = filtered.filter(r => r.deviceId === deviceId);
    }
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter(r => new Date(r.ts) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      filtered = filtered.filter(r => new Date(r.ts) <= toDate);
    }

    return filtered.slice(-Number(limit) || -500);
  }

  /**
   * Get all distinct devices + latest reading
   */
  async getDevices() {
    if (mongoose.connection.readyState === 1) {
      try {
        const devices = await Reading.aggregate([
          { $sort: { ts: -1 } },
          {
            $group: {
              _id: "$deviceId",
              latestReading: { $first: "$$ROOT" },
              count: { $sum: 1 },
              anomalyCount: {
                $sum: { $cond: ["$isAnomaly", 1, 0] }
              },
              avgWatts: { $avg: "$watts" },
              maxWatts: { $max: "$watts" }
            }
          },
          { $sort: { _id: 1 } }
        ]);

        if (devices && devices.length > 0) {
          return devices.map(d => ({
            deviceId: d._id,
            watts: d.latestReading.watts,
            ts: d.latestReading.ts,
            isAnomaly: d.latestReading.isAnomaly,
            average: d.latestReading.average,
            totalReadings: d.count,
            anomalyCount: d.anomalyCount,
            avgWatts: Math.round(d.avgWatts * 10) / 10,
            maxWatts: d.maxWatts
          }));
        }
      } catch (err) {
        console.warn('⚠️ Device aggregation fallback to memory:', err.message);
      }
    }

    // Memory aggregation
    const deviceMap = new Map();
    for (const r of this.readings) {
      if (!deviceMap.has(r.deviceId)) {
        deviceMap.set(r.deviceId, {
          deviceId: r.deviceId,
          readings: []
        });
      }
      deviceMap.get(r.deviceId).readings.push(r);
    }

    return Array.from(deviceMap.values()).map(({ deviceId, readings }) => {
      const latest = readings[readings.length - 1];
      const sum = readings.reduce((s, r) => s + r.watts, 0);
      const max = Math.max(...readings.map(r => r.watts));
      const anomalies = readings.filter(r => r.isAnomaly).length;

      return {
        deviceId,
        watts: latest.watts,
        ts: latest.ts,
        isAnomaly: latest.isAnomaly,
        average: latest.average,
        totalReadings: readings.length,
        anomalyCount: anomalies,
        avgWatts: Math.round((sum / readings.length) * 10) / 10,
        maxWatts: max
      };
    });
  }

  /**
   * Get recent anomalies
   */
  async getAlerts(limit = 50) {
    if (mongoose.connection.readyState === 1) {
      try {
        const alerts = await Reading.find({ isAnomaly: true })
          .sort({ ts: -1 })
          .limit(Number(limit))
          .lean();
        if (alerts && alerts.length > 0) return alerts;
      } catch (e) {}
    }

    return this.readings
      .filter(r => r.isAnomaly)
      .slice(-Number(limit))
      .reverse();
  }
}

module.exports = new ReadingStore(2000);

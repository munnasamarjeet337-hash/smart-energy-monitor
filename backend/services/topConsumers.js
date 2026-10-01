/**
 * Top Consumers Service
 * Tracks latest power readings across all devices and ranks top consumers
 */

class TopConsumersTracker {
  constructor() {
    // Map of deviceId -> { deviceId, watts, ts, isAnomaly, average }
    this.latestReadings = new Map();
  }

  /**
   * Update or record the latest reading for a device
   */
  update(reading) {
    if (!reading || !reading.deviceId) return;
    this.latestReadings.set(reading.deviceId, {
      deviceId: reading.deviceId,
      watts: Number(reading.watts) || 0,
      ts: reading.ts || new Date(),
      isAnomaly: Boolean(reading.isAnomaly),
      average: reading.average || null
    });
  }

  /**
   * Returns the top N energy consuming devices ranked by current wattage
   * @param {number} limit
   * @returns {Object} { topList: Array, totalWatts: number, activeDeviceCount: number }
   */
  getTopConsumers(limit = 5) {
    const devices = Array.from(this.latestReadings.values());
    const totalWatts = devices.reduce((sum, d) => sum + d.watts, 0);

    // Sort descending by watts
    const sorted = devices
      .slice()
      .sort((a, b) => b.watts - a.watts)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        deviceId: item.deviceId,
        watts: item.watts,
        percentage: totalWatts > 0 ? Math.round((item.watts / totalWatts) * 100) : 0,
        isAnomaly: item.isAnomaly,
        average: item.average,
        ts: item.ts
      }));

    return {
      topList: sorted,
      totalWatts: Math.round(totalWatts * 10) / 10,
      totalKw: Math.round((totalWatts / 1000) * 100) / 100,
      activeDeviceCount: devices.length
    };
  }

  /**
   * Returns map of all latest device readings
   */
  getAllDevices() {
    return Array.from(this.latestReadings.values());
  }
}

module.exports = new TopConsumersTracker();

/**
 * Anomaly Detector Service
 * Maintains an in-memory sliding window of the last 10 readings per device
 * and flags readings where current watts > 2 * rolling average.
 */

class AnomalyDetector {
  constructor(windowSize = 10) {
    this.windowSize = windowSize;
    // Map of deviceId -> Array of recent wattage numbers
    this.windows = new Map();
  }

  /**
   * Evaluates a reading against device's historical sliding window
   * @param {Object} reading - { deviceId, watts, ts }
   * @returns {Object} - { isAnomaly: boolean, average: number }
   */
  processReading(reading) {
    const { deviceId, watts } = reading;
    const numericWatts = Number(watts);

    if (!this.windows.has(deviceId)) {
      this.windows.set(deviceId, []);
    }

    const window = this.windows.get(deviceId);
    let isAnomaly = false;
    let rollingAverage = null;

    if (window.length > 0) {
      const sum = window.reduce((acc, val) => acc + val, 0);
      rollingAverage = Math.round((sum / window.length) * 10) / 10;

      // Anomaly trigger: watts > 2 * rolling average (with minimum window of 2-3 readings or baseline check)
      if (window.length >= 2 && rollingAverage > 0 && numericWatts > 2 * rollingAverage) {
        isAnomaly = true;
      }
    } else {
      rollingAverage = numericWatts;
    }

    // Add current reading to window
    window.push(numericWatts);
    if (window.length > this.windowSize) {
      window.shift();
    }

    return {
      isAnomaly,
      average: rollingAverage !== null ? rollingAverage : numericWatts
    };
  }

  /**
   * Get current sliding window array for a device
   */
  getWindow(deviceId) {
    return this.windows.get(deviceId) || [];
  }

  /**
   * Get current rolling average for a device
   */
  getRollingAverage(deviceId) {
    const window = this.windows.get(deviceId);
    if (!window || window.length === 0) return 0;
    const sum = window.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / window.length) * 10) / 10;
  }

  /**
   * Clear all windows (for testing or reset)
   */
  clear() {
    this.windows.clear();
  }
}

module.exports = new AnomalyDetector(10);

const express = require('express');
const readingStore = require('../services/readingStore');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/history
 * @desc    Fetch historical readings with filters for deviceId and date range
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { deviceId, from, to, limit = 500 } = req.query;
    
    const readings = await readingStore.getHistory({
      deviceId,
      from,
      to,
      limit
    });

    // Calculate summary statistics
    let stats = {
      totalReadings: readings.length,
      avgWatts: 0,
      maxWatts: 0,
      minWatts: 0,
      anomalyCount: 0,
      estimatedKwh: 0
    };

    if (readings.length > 0) {
      let sumWatts = 0;
      let max = readings[0].watts;
      let min = readings[0].watts;
      let anomalies = 0;

      for (const r of readings) {
        sumWatts += r.watts;
        if (r.watts > max) max = r.watts;
        if (r.watts < min) min = r.watts;
        if (r.isAnomaly) anomalies++;
      }

      const avg = sumWatts / readings.length;
      const durationHours = (readings.length * 3) / 3600;
      const kwh = (avg * durationHours) / 1000;

      stats = {
        totalReadings: readings.length,
        avgWatts: Math.round(avg * 10) / 10,
        maxWatts: Math.round(max * 10) / 10,
        minWatts: Math.round(min * 10) / 10,
        anomalyCount: anomalies,
        estimatedKwh: Math.round(kwh * 1000) / 1000
      };
    }

    return res.json({
      success: true,
      count: readings.length,
      stats,
      data: readings
    });
  } catch (err) {
    console.error('Error fetching history:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve historical readings'
    });
  }
});

/**
 * @route   GET /api/devices
 * @desc    Get list of all devices with their latest reading and stats
 * @access  Private
 */
router.get('/devices', protect, async (req, res) => {
  try {
    const devices = await readingStore.getDevices();
    return res.json({
      success: true,
      data: devices
    });
  } catch (err) {
    console.error('Error fetching devices:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve devices'
    });
  }
});

/**
 * @route   GET /api/alerts
 * @desc    Get list of recent anomalies/alerts
 * @access  Private
 */
router.get('/alerts', protect, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const alerts = await readingStore.getAlerts(Number(limit));
    return res.json({
      success: true,
      data: alerts
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts'
    });
  }
});

module.exports = router;

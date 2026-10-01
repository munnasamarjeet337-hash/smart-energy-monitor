const topConsumers = require('../services/topConsumers');
const Reading = require('../models/Reading');

let intervalId = null;

/**
 * Configure and initialize Socket.IO event handling
 * @param {Object} io - Socket.IO Server instance
 */
const initSocketHandler = (io) => {
  io.on('connection', async (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Send immediate initial state
    try {
      const topData = topConsumers.getTopConsumers(5);
      socket.emit('topConsumers', topData);

      // Fetch latest 5 anomalies to populate alerts panel immediately
      const recentAlerts = await Reading.find({ isAnomaly: true })
        .sort({ ts: -1 })
        .limit(10)
        .lean();

      socket.emit('initialAlerts', recentAlerts.map(a => ({
        id: `alert-${a._id}`,
        deviceId: a.deviceId,
        watts: a.watts,
        average: a.average || Math.round(a.watts / 2.5),
        ts: a.ts,
        percentageSpike: a.average > 0 ? Math.round(((a.watts - a.average) / a.average) * 100) : 100,
        message: `Power spike detected: ${a.watts}W`
      })));

      // Fetch latest reading per device to populate dashboard cards immediately
      const distinctDevices = await Reading.aggregate([
        { $sort: { ts: -1 } },
        {
          $group: {
            _id: "$deviceId",
            latestReading: { $first: "$$ROOT" }
          }
        }
      ]);

      const initialDevices = distinctDevices.map(d => ({
        deviceId: d._id,
        watts: d.latestReading.watts,
        ts: d.latestReading.ts,
        isAnomaly: d.latestReading.isAnomaly,
        average: d.latestReading.average
      }));

      socket.emit('initialDevices', initialDevices);

    } catch (err) {
      console.error('⚠️ Error sending initial socket data:', err.message);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Emit topConsumers every 2 seconds as required by specification
  if (!intervalId) {
    intervalId = setInterval(() => {
      const topData = topConsumers.getTopConsumers(5);
      io.emit('topConsumers', topData);
    }, 2000);
  }
};

module.exports = { initSocketHandler };

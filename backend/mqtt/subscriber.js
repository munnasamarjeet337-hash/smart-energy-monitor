const mqtt = require('mqtt');
const net = require('net');
const readingStore = require('../services/readingStore');
const anomalyDetector = require('../services/anomalyDetector');
const topConsumers = require('../services/topConsumers');

let mqttClient = null;
let aedesServer = null;

/**
 * Starts an embedded Aedes MQTT broker if standalone mosquitto broker is unavailable
 */
const startEmbeddedBroker = (port = 1883) => {
  return new Promise((resolve) => {
    try {
      const aedes = require('aedes')();
      const server = net.createServer(aedes.handle);
      server.listen(port, () => {
        console.log(`✅ Embedded Aedes MQTT Broker listening on port ${port}`);
        resolve(server);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`ℹ️ Port ${port} in use (broker is active).`);
        } else {
          console.warn(`⚠️ Embedded MQTT broker notice: ${err.message}`);
        }
        resolve(null);
      });
    } catch (e) {
      console.warn(`⚠️ Embedded broker init notice: ${e.message}`);
      resolve(null);
    }
  });
};

/**
 * Initialize MQTT Subscriber
 * @param {Object} io - Socket.IO server instance
 */
const initMqttSubscriber = async (io) => {
  const mqttUrl = process.env.MQTT_URL || 'mqtt://127.0.0.1:1883';
  const topic = 'home/devices/+/power';

  // If local host connection, try to ensure a broker is listening
  if (mqttUrl.includes('localhost') || mqttUrl.includes('127.0.0.1')) {
    aedesServer = await startEmbeddedBroker(1883);
  }

  console.log(`📡 Connecting to MQTT broker at ${mqttUrl}...`);
  mqttClient = mqtt.connect(mqttUrl, {
    reconnectPeriod: 3000,
    connectTimeout: 5000,
  });

  mqttClient.on('connect', () => {
    console.log(`✅ Connected to MQTT broker. Subscribing to: ${topic}`);
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error('❌ MQTT Subscription Error:', err.message);
      } else {
        console.log(`🎯 Successfully subscribed to topic "${topic}"`);
      }
    });
  });

  mqttClient.on('error', (err) => {
    console.warn(`⚠️ MQTT Client Notice: ${err.message}`);
  });

  mqttClient.on('message', async (receivedTopic, messageBuffer) => {
    try {
      const rawText = messageBuffer.toString();
      let payload;
      try {
        payload = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn(`⚠️ Discarded invalid JSON on topic ${receivedTopic}: ${rawText}`);
        return;
      }

      // Extract & validate fields: { deviceId, watts, ts }
      const deviceId = payload.deviceId ? String(payload.deviceId).trim() : null;
      const watts = Number(payload.watts);
      const ts = payload.ts ? new Date(payload.ts) : new Date();

      if (!deviceId || isNaN(watts) || watts < 0 || isNaN(ts.getTime())) {
        console.warn('⚠️ Discarded invalid payload structure:', payload);
        return;
      }

      // Anomaly Detection sliding window
      const { isAnomaly, average } = anomalyDetector.processReading({
        deviceId,
        watts,
        ts
      });

      const readingData = {
        deviceId,
        watts,
        ts,
        isAnomaly,
        average
      };

      // Update in-memory top consumers tracker
      topConsumers.update(readingData);

      // Persist reading
      readingStore.saveReading(readingData);

      // Emit reading event via Socket.IO
      if (io) {
        io.emit('reading', readingData);

        // If anomaly detected, emit alert event
        if (isAnomaly) {
          const alertPayload = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            deviceId,
            watts,
            average,
            ts,
            percentageSpike: average > 0 ? Math.round(((watts - average) / average) * 100) : 100,
            message: `Power spike detected: ${watts}W (Rolling avg: ${average}W)`
          };
          console.log(`🚨 ANOMALY DETECTED on [${deviceId}]: ${watts}W > 2x Avg (${average}W)`);
          io.emit('alert', alertPayload);
        }
      }
    } catch (err) {
      console.error('❌ Error processing MQTT message:', err.message);
    }
  });

  return mqttClient;
};

module.exports = { initMqttSubscriber };

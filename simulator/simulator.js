const mqtt = require('mqtt');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://127.0.0.1:1883';
const PUBLISH_INTERVAL_MS = 3000;

// 5 target devices with baseline wattage ranges
const devices = [
  { id: 'fridge', name: 'Kitchen Refrigerator', min: 80, max: 180 },
  { id: 'ac', name: 'Living Room Air Conditioner', min: 350, max: 500 },
  { id: 'tv', name: 'Smart OLED TV', min: 60, max: 150 },
  { id: 'washing_machine', name: 'Washer & Dryer', min: 200, max: 450 },
  { id: 'heater', name: 'Water Heater', min: 300, max: 500 },
];

console.log('====================================================');
console.log('⚡ Smart Energy Monitor - Multi-Device IoT Simulator');
console.log(`🔌 Target Broker: ${MQTT_URL}`);
console.log(`⏱️  Publish Interval: ${PUBLISH_INTERVAL_MS / 1000} seconds`);
console.log('====================================================');

const client = mqtt.connect(MQTT_URL, {
  reconnectPeriod: 2000,
  connectTimeout: 5000,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT Broker successfully. Starting simulation loop...\n');
  startSimulation();
});

client.on('error', (err) => {
  console.warn(`⚠️ MQTT Client error: ${err.message}. Retrying...`);
});

client.on('offline', () => {
  console.warn('⚠️ MQTT Broker offline. Waiting for connection...');
});

const generateWatts = (device) => {
  // 10% chance of high power spike (800 - 1200W)
  const isSpike = Math.random() < 0.10;
  if (isSpike) {
    const spikeWatts = Math.floor(Math.random() * (1200 - 800 + 1)) + 800;
    return { watts: spikeWatts, isSpike: true };
  }

  // Normal range with slight organic noise
  const normalWatts = Math.floor(Math.random() * (device.max - device.min + 1)) + device.min;
  return { watts: normalWatts, isSpike: false };
};

const publishReading = (device) => {
  const { watts, isSpike } = generateWatts(device);
  const payload = {
    deviceId: device.id,
    watts,
    ts: new Date().toISOString(),
  };

  const topic = `home/devices/${device.id}/power`;
  const message = JSON.stringify(payload);

  client.publish(topic, message, { qos: 0 }, (err) => {
    if (err) {
      console.error(`❌ Publish failed for ${device.id}:`, err.message);
    } else {
      const timeStr = new Date().toLocaleTimeString();
      if (isSpike) {
        console.log(`🚨 [${timeStr}] SPIKE!   [${device.id.padEnd(16)}] -> ${watts.toString().padStart(4)} W  (Anomaly injected)`);
      } else {
        console.log(`📡 [${timeStr}] PUBLISH  [${device.id.padEnd(16)}] -> ${watts.toString().padStart(4)} W`);
      }
    }
  });
};

const startSimulation = () => {
  // Initial immediate publish
  devices.forEach(publishReading);

  // Recurring interval every 3 seconds
  setInterval(() => {
    devices.forEach((device, index) => {
      // Stagger slightly (50ms) so timestamps and broker ordering are natural
      setTimeout(() => {
        publishReading(device);
      }, index * 50);
    });
  }, PUBLISH_INTERVAL_MS);
};

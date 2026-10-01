# ⚡ Smart Energy Monitor

An end-to-end, production-style real-time IoT energy monitoring and anomaly detection platform. Simulated smart-plug appliances continuously stream wattage telemetry over MQTT to an Eclipse Mosquitto broker. A high-performance Node.js / Express backend ingests and validates the stream, persists time-series readings into MongoDB with compound indices, executes an in-memory sliding-window anomaly detection algorithm, and broadcasts live power telemetry, top consumer rankings, and instant spike alerts via WebSockets (Socket.IO) to a modern dark-mode React dashboard.

---

## 📐 Architecture

```text
+-------------------------------------------------------------------------------+
|                             SMART ENERGY MONITOR                              |
+-------------------------------------------------------------------------------+

  [ Simulated Smart Plugs ]
    * Kitchen Refrigerator  (80 - 180W)
    * Living Room A/C       (350 - 500W)
    * Entertainment TV      (60 - 150W)
    * Washer & Dryer        (200 - 450W)
    * Water Heater          (300 - 500W)
    * (10% Spikes: 800 - 1200W)
               │
               ▼  MQTT Topic: home/devices/+/power (Port 1883)
     +───────────────────+
     | Eclipse Mosquitto |
     +───────────────────+
               │
               ▼  mqtt.js Subscriber
     +───────────────────────────────────────────────────+
     | Node.js / Express Backend (Port 5000)             |
     |  ├── Ingestion & Payload Validation               |
     |  ├── Sliding Window Anomaly Detection (>2x Avg)   |
     |  ├── Top 5 Consumers Tracker (2s Interval)        |
     |  └── JWT Authentication & Historical REST APIs    |
     +───────────────────┬───────────────────────────────+
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
  +──────────────+              +─────────────────+
  |   MongoDB    |              | Socket.IO Live  |
  | (Port 27017) |              | (WebSockets)    |
  +──────────────+              +────────┬────────+
                                         │
                                         ▼
                      +──────────────────────────────────────+
                      | React (Vite) Dashboard (Port 5173)   |
                      |  ├── Live 60s Recharts Curves        |
                      |  ├── Real-time Top Consumer Bars     |
                      |  ├── Sliding Anomaly Alert Stream    |
                      |  └── Historical Analytics Explorer   |
                      +──────────────────────────────────────+
```

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, `mqtt`, `socket.io`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `aedes`
- **Broker**: Eclipse Mosquitto (MQTT v3.1.1 / v5.0)
- **Database**: MongoDB 7.0 (Compound index on `{ deviceId: 1, ts: -1 }`)
- **Frontend**: React 18, Vite, Recharts, Lucide Icons, Socket.IO Client, React Router DOM, Custom Dark CSS
- **Containerization**: Docker & Docker Compose (`node:20-alpine`, `mongo:7.0`, `eclipse-mosquitto:2`)

---

## 🚀 How to Run

### Option 1: Docker Compose (Single Command)

```bash
docker compose up -d --build
cd frontend && npm install && npm run dev
cd ../simulator && npm install && npm start
```

### Option 2: Local Node.js Execution

```bash
# 1. Install dependencies
cd backend && npm install && cd ../frontend && npm install && cd ../simulator && npm install && cd ..

# 2. Start Backend & Frontend in separate terminals
cd backend && npm start
cd frontend && npm run dev

# 3. Start IoT Smart Plug Simulator
cd simulator && npm start
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

> 🔑 **Demo Credentials**:
> - Email: `demo@demo.com`
> - Password: `demo123`
> *(Also available via the **"Auto Fill"** button on the login screen)*

---

## ✨ Key Features

1. **Real-Time Telemetry Streaming**: Low-latency power readings pushed every 3 seconds across 5 smart appliances over MQTT.
2. **Sliding-Window Anomaly Detection**: In-memory rolling average of the last 10 readings per appliance. Automatically flags power surges exceeding $2 \times \text{rolling average}$ as anomalies.
3. **Live Recharts Area Visualizations**: Per-device animated live curves displaying the last 60 seconds of telemetry with glowing gradient fills.
4. **Top 5 Power Consumers**: Ranked live bar chart computing load distribution and relative percentage of total house consumption updated every 2 seconds.
5. **Instant Toast & Feed Alerts**: Floating warning notifications and an animated anomalies panel whenever a device spikes.
6. **Historical Analytics & Filtering**: Query past telemetry records by device and time range presets (15m, 1h, 6h, 24h, All time) with summary statistics (average watts, peak power, total kWh).
7. **JWT Authentication**: Secure user registration, bcrypt password hashing, and token-guarded REST APIs.

---

## 🖼️ Screenshots

```text
+---------------------------------------------------------------------------------------------+
|  [⚡ SMART ENERGY MONITOR]    [LIVE TELEMETRY]     Current Load: 1.84 kW | Session: 0.042 kWh|
+---------------------------------------------------------------------------------------------+
|  +-----------------------+  +-----------------------+  +-----------------------+            |
|  | TOTAL POWER NOW       |  | ACTIVE SMART PLUGS    |  | ANOMALIES TODAY       |            |
|  | 1.84 kW               |  | 5/5 Online            |  | 2 Alerts              |            |
|  +-----------------------+  +-----------------------+  +-----------------------+            |
|                                                                                             |
|  +--------------------+  +--------------------+  +--------------------+  +----------------+ |
|  | Living Room A/C    |  | Kitchen Fridge     |  | Washer & Dryer     |  | TOP CONSUMERS  | |
|  | 420 W  [NORMAL]    |  | 145 W  [NORMAL]    |  | 1,120 W  [ANOMALY] |  | 1. Washer (61%)| |
|  | ~~~/~\_/\_/\_/\_   |  | ~~~--\_/--\_/--\_  |  | ___/\_/\_/\_/\_/\  |  | 2. A/C    (23%)| |
|  +--------------------+  +--------------------+  +--------------------+  +----------------+ |
|  +--------------------+  +--------------------+                          | ANOMALY ALERTS | |
|  | Entertainment TV   |  | Water Heater       |                          | 🚨 Washer:1120W| |
|  | 110 W  [NORMAL]    |  | 450 W  [NORMAL]    |                          |    (Avg: 310W) | |
|  +--------------------+  +--------------------+                          +----------------+ |
+---------------------------------------------------------------------------------------------+
```

---

## 📜 License

MIT License. Built for real-time IoT power monitoring and energy optimization.

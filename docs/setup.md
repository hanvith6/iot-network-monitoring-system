# Setup & Deployment Guide

Complete instructions for deploying the Real-Time Drainage Monitoring System from scratch.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Arduino IDE | ≥ 2.0 | With ESP32 board package installed |
| ESP32 board package | ≥ 2.0.0 | Install via Arduino Board Manager |
| Node.js | 20 LTS | For the Next.js dashboard |
| npm | ≥ 10 | Bundled with Node.js |
| ThingsBoard account | Any edition | [thingsboard.io](https://thingsboard.io) cloud or self-hosted |
| Mosquitto (optional) | ≥ 2.0 | Only needed for local broker variant |

---

## Hardware Wiring

| ESP32 GPIO | Component | Pin |
|---|---|---|
| GPIO 5 | HC-SR04 | TRIG |
| GPIO 18 | HC-SR04 | ECHO |
| GPIO 27 | YF-S201 Flow Sensor | Signal (interrupt) |
| GPIO 34 | LiPo battery (via voltage divider) | ADC (optional) |
| 3.3 V / GND | All sensors | Power |

> **Note:** The Mosquitto variant uses GPIO 19 instead of GPIO 27 for the flow sensor. Check the pin definitions at the top of each `.ino` file.

---

## Part 1 — ESP32 Firmware

### Step 1 — Install Arduino Libraries

In Arduino IDE go to **Sketch → Include Library → Manage Libraries** and install:

- `PubSubClient` by Nick O'Leary (or use the bundled `PubSubClient.cpp` / `PubSubClient.h` in `firmware/`)

For the Blynk variant only:

- `Blynk` by Volodymyr Shymanskyy

### Step 2 — Install ESP32 Board Support

1. Open **Arduino IDE → Preferences**.
2. Add to **Additional Board Manager URLs**:  
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Go to **Tools → Board → Board Manager**, search for `esp32`, and install.

### Step 3 — Configure Credentials

Open `firmware/esp32_firmware.ino` and fill in the configuration block near the top:

```cpp
// WiFi
const char *ssid     = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// ThingsBoard MQTT
const char *mqtt_server   = "mqtt.eu.thingsboard.cloud";
const char *mqtt_username = "YOUR_THINGSBOARD_ACCESS_TOKEN";
const char *mqtt_password = "";   // leave blank for ThingsBoard
const int   mqtt_port     = 1883;
```

> **Security:** Never commit real credentials. Use the placeholder strings shown above in version control.

### Step 4 — Flash the Firmware

1. Connect ESP32 via USB.
2. Select **Tools → Board → ESP32 Dev Module** (or matching board).
3. Select the correct **Port**.
4. Click **Upload**.
5. Open **Serial Monitor** at **115200 baud** — you should see:

```
Connecting to YOUR_WIFI_SSID
.....
WiFi connected
Attempting MQTT connection...connected
```

### Firmware Variants

| File | Use Case |
|---|---|
| `esp32_firmware.ino` | **Primary** — ThingsBoard cloud, full state machine |
| `esp32_firmware_mosquitto.ino` | Mosquitto public/local broker, pairs with Next.js dashboard |
| `esp32_firmware_blynk.ino` | Prototype — Blynk mobile dashboard |

---

## Part 2 — MQTT Broker (Mosquitto Variant)

Skip this section if using ThingsBoard MQTT directly.

### Option A — Public Test Broker (Development Only)

No setup needed. The firmware connects to `test.mosquitto.org:1883`.  
The Next.js dashboard connects to `wss://test.mosquitto.org:8081`.

### Option B — Local Mosquitto Broker

```bash
# Install (macOS)
brew install mosquitto

# Start
brew services start mosquitto

# Test — subscribe in one terminal
mosquitto_sub -h localhost -t "drainage/data"

# Publish a test message
mosquitto_pub -h localhost -t "drainage/data" -m '{"flow_lpm":1.2,"water_level_cm":10,"state":"NORMAL","alert_level":"NORMAL","battery_level":95}'
```

Update `MQTT_BROKER` in `dashboard/hooks/use-system-data.ts` to point at your local broker:

```ts
const MQTT_BROKER = 'ws://localhost:9001';  // WebSocket port
```

---

## Part 3 — ThingsBoard Cloud Setup

### Step 1 — Create a Device

1. Log in at [thingsboard.cloud](https://thingsboard.cloud).
2. Go to **Entities → Devices → Add Device**.
3. Name it (e.g., `drainage-node-01`), leave profile as **default**.
4. Click **Manage Credentials** and copy the **Access Token** — paste it into the firmware as `mqtt_username`.

### Step 2 — Import the Dashboard

1. Go to **Dashboards → Import Dashboard**.
2. Upload `thingsboard/dashboards/thingsboard_dashboard_final.json`.
3. Open the dashboard and use **Entity Alias** settings to assign your device.

### Step 3 — Configure Alarm Rules

Follow the detailed guide in [docs/alarm_setup.md](alarm_setup.md).

Summary:
- Go to **Profiles → Device Profiles → default → Alarm Rules**.
- Add rule for `state == "OVERFLOW_RISK"` → Severity **CRITICAL**.
- Add rule for `state == "EARLY_SEDIMENTATION"` → Severity **WARNING**.
- Save the profile.

---

## Part 4 — Next.js Web Dashboard

### Step 1 — Install Dependencies

```bash
cd dashboard
npm install
```

### Step 2 — Run in Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Step 3 — Choose Data Mode

The dashboard has two modes selectable from the UI:

| Mode | Description |
|---|---|
| **Simulation** | Generates synthetic telemetry locally — no hardware required |
| **Live MQTT** | Connects to `wss://test.mosquitto.org:8081`, topic `drainage/data` |

Toggle between modes using the button in the Live Telemetry control bar.

### Step 4 — Build for Production

```bash
npm run build
npm run start
```

Or deploy to [Vercel](https://vercel.com) by connecting the `dashboard/` folder as the project root.

---

## Verifying the Full Pipeline

Once all parts are running, you should be able to:

1. See ESP32 Serial Monitor print telemetry every ~5 seconds.
2. See messages arrive in `mosquitto_sub` or ThingsBoard **Latest Telemetry** tab.
3. See the Next.js dashboard update in real time with the correct values.
4. Trigger a `WARNING` alarm by holding the ultrasonic sensor closer than 30 cm (water level > 20 cm).

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| ESP32 stuck on `Connecting...` | Wrong SSID/password | Re-check credentials in firmware |
| `MQTT connection failed, rc=-2` | Broker unreachable | Check IP, port, and firewall |
| ThingsBoard shows no telemetry | Wrong Access Token | Re-copy token from Device Credentials |
| Dashboard shows "disconnected" | Test broker unreachable | Check internet; switch to Simulation mode |
| Water level reads `-1` | Ultrasonic out of range / no echo | Check wiring and sensor distance |

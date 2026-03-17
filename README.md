# IoT Drainage Network Monitoring System

> **Final Year Project** — Real-time underground drainage monitoring using ESP32 microcontrollers, MQTT, ThingsBoard cloud, and a custom Next.js dashboard.

---

## Overview

This project implements an end-to-end IoT system for monitoring urban drainage infrastructure in real time. ESP32 edge nodes equipped with ultrasonic depth sensors and flow-rate meters continuously measure water levels inside drainage pipes. Readings are transmitted over WiFi via the MQTT protocol to a cloud broker, ingested by ThingsBoard for persistence and alerting, and visualised through a purpose-built web dashboard built with Next.js.

The system autonomously classifies pipe conditions across four severity levels — **Normal → Early Sedimentation → Partial Block → Overflow Risk** — and raises configurable alarms before a blockage becomes critical.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       EDGE LAYER                            │
│   ESP32 + HC-SR04 (Ultrasonic) + YF-S201 (Flow Sensor)     │
│   Multi-level state detection · Time-to-Overflow ETA        │
└──────────────────────────┬──────────────────────────────────┘
                           │ WiFi (802.11 b/g/n)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     TRANSPORT LAYER                         │
│         MQTT Broker (Mosquitto / ThingsBoard MQTT)          │
│    Topic: v1/devices/me/telemetry  ·  Port 1883             │
└──────────────────────────┬──────────────────────────────────┘
                           │ JSON Telemetry Payload
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      CLOUD LAYER                            │
│    ThingsBoard (Device Management · Alarm Rules · API)      │
│    REST API / WebSocket for dashboard data feed             │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket / MQTT over WSS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  VISUALISATION LAYER                        │
│     Next.js 16 Dashboard — Live charts, alarms, status      │
└─────────────────────────────────────────────────────────────┘
```

---

## Technologies Used

| Layer | Technology |
|---|---|
| Microcontroller | ESP32 (Espressif) |
| Sensors | HC-SR04 Ultrasonic, YF-S201 Flow Meter |
| Communication | MQTT (PubSubClient library) |
| MQTT Broker | Mosquitto (local) / ThingsBoard Cloud |
| Cloud Platform | ThingsBoard CE |
| Frontend | Next.js 16, React 19, Recharts, Tailwind CSS |
| Language | C++ (Firmware), TypeScript (Dashboard) |

---

## Repository Structure

```
iot-network-monitoring-system/
│
├── firmware/                         # ESP32 Arduino firmware
│   ├── esp32_firmware.ino            # Primary firmware (ThingsBoard MQTT)
│   ├── esp32_firmware_mosquitto.ino  # Variant for public Mosquitto broker
│   ├── esp32_firmware_blynk.ino      # Prototype variant (Blynk platform)
│   ├── PubSubClient.cpp              # MQTT client library
│   └── PubSubClient.h
│
├── dashboard/                        # Next.js web dashboard
│   ├── app/                          # App router pages
│   ├── components/                   # UI components
│   ├── hooks/use-system-data.ts      # MQTT data hook (live + simulation)
│   ├── lib/types.ts                  # Shared TypeScript types
│   └── package.json
│
├── thingsboard/
│   └── dashboards/                   # Exported ThingsBoard dashboard JSON files
│       ├── thingsboard_dashboard_final.json
│       ├── thingsboard_dashboard_v4.json
│       ├── thingsboard_dashboard_v2.json
│       └── thingsboard_dashboard.json
│
├── docs/                             # Project documentation
│   ├── architecture.md               # System design & data flow
│   ├── setup.md                      # Full setup & deployment guide
│   ├── alarm_setup.md                # ThingsBoard alarm configuration guide
│   └── images/                       # Architecture diagrams & screenshots
│
├── research/
│   └── IEEE_paper.docx               # Supporting IEEE research paper
│
├── .gitignore
└── README.md
```

---

## Documentation

### Guides

| Document | Description |
|---|---|
| [docs/setup.md](docs/setup.md) | **Full setup guide** — hardware wiring, firmware flashing, MQTT broker, ThingsBoard, and dashboard deployment |
| [docs/architecture.md](docs/architecture.md) | **System architecture** — layer-by-layer design, MQTT message flow, state machine, and data pipeline |
| [docs/alarm_setup.md](docs/alarm_setup.md) | **Alarm configuration** — step-by-step ThingsBoard Device Profile alarm rules |

### ThingsBoard Dashboards

All dashboard iterations are exported as importable JSON files in [`thingsboard/dashboards/`](thingsboard/dashboards/):

| File | Description |
|---|---|
| `thingsboard_dashboard_final.json` | **Latest production dashboard** (use this one) |
| `thingsboard_dashboard_v4.json` | Iteration 4 — refined layout |
| `thingsboard_dashboard_v2.json` | Iteration 2 — initial charts |
| `thingsboard_dashboard.json` | Original prototype |

### Research

| Document | Description |
|---|---|
| [research/IEEE_paper.docx](research/IEEE_paper.docx) | **Supporting IEEE research paper** — academic background and technical analysis underpinning this project |

---

## Key Features

- **Real-time telemetry** — flow rate (L/min), water level (cm), rise rate (cm/min), estimated time-to-overflow
- **Four-level state classification** — `NORMAL / EARLY_SEDIMENTATION / PARTIAL_BLOCK / OVERFLOW_RISK`
- **Edge intelligence** — state detection and ETA computation run entirely on the ESP32 (no cloud round-trip)
- **Alarm persistence** — 2-second hysteresis prevents flickering state transitions during turbulence
- **Dual-mode dashboard** — toggle between live MQTT data and simulated telemetry without code changes
- **Sound alerter** — browser audio notification on critical alarm
- **Battery monitoring** — LiPo voltage reported as percentage via ADC

---

## Quick Start

### Prerequisites

- Arduino IDE (≥ 2.0) with ESP32 board support
- Node.js 20+ and npm
- ThingsBoard account (cloud or self-hosted)

### 1 — Flash the ESP32

```bash
# Open in Arduino IDE
firmware/esp32_firmware.ino
```

Edit the configuration block at the top of the file:

```cpp
const char *ssid     = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
const char *mqtt_username = "YOUR_THINGSBOARD_ACCESS_TOKEN";
```

Upload to the ESP32 and open Serial Monitor (115200 baud) to confirm connection.

### 2 — Import the ThingsBoard Dashboard

1. Log in to your ThingsBoard instance.
2. Go to **Dashboards → Import Dashboard**.
3. Upload `thingsboard/dashboards/thingsboard_dashboard_final.json`.
4. Assign your device to the dashboard.

See [docs/alarm_setup.md](docs/alarm_setup.md) for configuring alarm rules.

### 3 — Run the Web Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Toggle **Live MQTT** in the UI to connect to `wss://test.mosquitto.org:8081` and receive real-time data. Use **Simulation** mode for offline testing.

Full step-by-step instructions are in [docs/setup.md](docs/setup.md).

---

## MQTT Payload Format

The ESP32 publishes JSON telemetry every 5 seconds:

```json
{
  "flow_lpm": 3.4,
  "water_level_cm": 28.5,
  "rise_rate_cm_per_min": 0.2,
  "overflow_eta_min": 85,
  "state": "EARLY_SEDIMENTATION",
  "alert_level": "WARNING",
  "battery_level": 87
}
```

---

## Alarm Levels

| State | Alert Level | Trigger Condition |
|---|---|---|
| `NORMAL` | NORMAL | Water level < 20 cm |
| `EARLY_SEDIMENTATION` | WARNING | Water level ≥ 20 cm |
| `PARTIAL_BLOCK` | ALERT | Water level ≥ 35 cm |
| `OVERFLOW_RISK` | CRITICAL | Water level ≥ 45 cm |

---

## License

This project is submitted as a Final Year Project. All rights reserved by the author.

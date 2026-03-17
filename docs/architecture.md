# System Architecture

## Overview

The system is a four-layer IoT pipeline: edge sensing, MQTT transport, cloud processing, and web visualisation. Each layer has a single, well-defined responsibility, keeping the design modular and replaceable.

---

## Layer 1 — Edge (ESP32 Node)

### Hardware

| Component | Part | Role |
|---|---|---|
| Microcontroller | ESP32 WROOM-32 | Processing, WiFi, MQTT |
| Depth sensor | HC-SR04 Ultrasonic | Measures distance-to-water surface |
| Flow sensor | YF-S201 | Pulse-count based flow rate measurement |
| Power | LiPo battery (ADC monitored on GPIO 34) | Portable deployment |

### Firmware Logic

```
loop()
  ├── readWaterLevel()      — HC-SR04 pulse (TRIGGER GPIO5, ECHO GPIO18)
  ├── readFlowRate()        — Count pulses on GPIO27 over 5 s window
  ├── classifyState()       — Multi-level threshold comparison
  ├── estimateETA()         — Linear regression on rise rate
  ├── buildPayload()        — Serialize to JSON
  └── mqttPublish()         — Publish to broker topic
```

### State Classification Thresholds

```
Water Level (cm)    State                Alert Level
────────────────────────────────────────────────────
0  – 19.9           NORMAL               NORMAL
20 – 34.9           EARLY_SEDIMENTATION  WARNING
35 – 44.9           PARTIAL_BLOCK        ALERT
≥ 45                OVERFLOW_RISK        CRITICAL
```

### Hysteresis (Alert Persistence)

A 2-second stability timer (`PERSISTENCE_MS = 2000`) prevents the state from flickering when the water surface is turbulent. A state transition only commits if the new condition persists continuously for 2 seconds.

---

## Layer 2 — Transport (MQTT)

### Protocol

MQTT 3.1.1 over TCP (port 1883) or WebSocket (port 8081 for browser clients).

### Topics

| Direction | Topic | Used By |
|---|---|---|
| ESP32 → Broker | `v1/devices/me/telemetry` | ThingsBoard firmware variant |
| ESP32 → Broker | `drainage/data` | Mosquitto / dashboard variant |
| Browser → Broker | `drainage/data` (subscribe) | Next.js dashboard (WSS) |

### JSON Payload (published every ~5 s)

```json
{
  "flow_lpm":             3.4,
  "water_level_cm":       28.5,
  "rise_rate_cm_per_min": 0.2,
  "overflow_eta_min":     85,
  "state":                "EARLY_SEDIMENTATION",
  "alert_level":          "WARNING",
  "battery_level":        87
}
```

### Broker Options

| Broker | Use Case | Auth |
|---|---|---|
| `test.mosquitto.org:1883` | Development & demo | None |
| `mqtt.eu.thingsboard.cloud:1883` | Production (ThingsBoard) | Device Access Token |
| Local Mosquitto (`localhost:1883`) | Self-hosted / LAN | Configurable |

---

## Layer 3 — Cloud (ThingsBoard)

### Responsibilities

- **Device registry** — each ESP32 is registered as a Device with a unique Access Token.
- **Telemetry storage** — all JSON keys are stored as time-series data points.
- **Alarm engine** — Device Profile alarm rules fire when `state` or `alert_level` values match configured conditions (see [alarm_setup.md](alarm_setup.md)).
- **REST API / WebSocket** — exposes telemetry to external consumers (the web dashboard).

### Data Flow inside ThingsBoard

```
MQTT Ingest  →  Telemetry Store  →  Alarm Rule Evaluation
                                         ↓
                              Alarm Created / Cleared
                                         ↓
                              Dashboard Widgets notified
```

### Exported Dashboards

All dashboard configurations are exported as JSON and stored in `thingsboard/dashboards/`:

| File | Description |
|---|---|
| `thingsboard_dashboard_final.json` | Production dashboard (latest) |
| `thingsboard_dashboard_v4.json` | Iteration 4 — refined layout |
| `thingsboard_dashboard_v2.json` | Iteration 2 — initial charts |
| `thingsboard_dashboard.json` | Original prototype |

---

## Layer 4 — Visualisation (Next.js Dashboard)

### Stack

- **Next.js 16** (App Router) — server and client components
- **React 19** — UI state management
- **Recharts** — real-time line charts
- **Tailwind CSS v4** — styling
- **mqtt.js** — WebSocket MQTT client (runs in the browser)

### Component Map

```
app/(dashboard)/page.tsx
  ├── TopNavBar          — branding, navigation links
  ├── HeroSection        — project title & description
  ├── StatusCard ×4      — System Status, Alert Level, ETA, Rise Rate
  ├── RealTimeChart ×2   — Flow Rate, Water Level (sliding 30-point window)
  ├── AlarmLogTable      — timestamped alarm event history
  ├── BatteryIndicator   — live battery percentage
  └── SoundAlerter       — browser audio on CRITICAL alarm
```

### Data Hook — `useSystemData`

`hooks/use-system-data.ts` centralises all data concerns:

- **Live mode** — connects to `wss://test.mosquitto.org:8081`, subscribes to `drainage/data`, parses `ESP32Payload`, updates React state.
- **Simulation mode** — generates synthetic telemetry locally using a deterministic cycle to allow demonstration without hardware.
- Maintains a 30-sample rolling `history` array for chart rendering.
- Appends to `alarms` log whenever `alertLevel` escalates beyond NORMAL.

---

## End-to-End Data Flow

```
HC-SR04 / YF-S201 sensors (physical)
        ↓  GPIO interrupts / pulse timing
ESP32 ADC + Digital I/O
        ↓  state classification + ETA
JSON telemetry (MQTT PUBLISH)
        ↓  TCP / WiFi
MQTT Broker
        ↓  MQTT SUBSCRIBE
ThingsBoard  ←→  Alarm Engine
        ↓  WebSocket MQTT (wss://)
Browser (mqtt.js)
        ↓  React state update
Recharts / StatusCards / AlarmLogTable
        ↓
User sees live drainage telemetry
```

---

## Security Considerations

- Device credentials (WiFi SSID/password, ThingsBoard Access Token) are **not committed** to the repository. Template placeholder strings mark where real values must be inserted before flashing.
- Each ESP32 device authenticates to ThingsBoard using a unique per-device Access Token over MQTT.
- The public Mosquitto broker (`test.mosquitto.org`) is used for development only; production deployments should use a private broker with TLS.

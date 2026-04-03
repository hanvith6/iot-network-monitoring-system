# Real-Time Drainage Monitoring System — Claude Context

## Project Summary
Final-year IoT project. Real-time urban drainage monitoring using ESP32 + sensors → MQTT → ThingsBoard cloud → Next.js dashboard. All state classification runs on the ESP32 (edge intelligence).

## Repository Layout
```
firmware/          # C++ Arduino code for ESP32
dashboard/         # Next.js 16 + React 19 + Recharts + Tailwind v4
thingsboard/dashboards/  # Exported ThingsBoard JSON dashboards
docs/              # architecture.md, setup.md, alarm_setup.md
research/          # IEEE paper (under review)
```

## Key Tech Stack
| Layer | Tech |
|---|---|
| Microcontroller | ESP32 WROOM-32 |
| Sensors | HC-SR04 (ultrasonic depth), YF-S201 (flow meter) |
| Protocol | MQTT 3.1.1 via PubSubClient |
| Broker (dev) | test.mosquitto.org:1883 / wss port 8081 |
| Broker (prod) | mqtt.eu.thingsboard.cloud:1883 (token auth) |
| Cloud | ThingsBoard CE |
| Frontend | Next.js 16, TypeScript, Recharts, Tailwind CSS v4 |

## Firmware Files
- `firmware/esp32_firmware.ino` — **Primary**: ThingsBoard MQTT, topic `v1/devices/me/telemetry`, GPIO 27 for flow
- `firmware/esp32_firmware_mosquitto.ino` — Mosquitto variant, topic `drainage/data`, GPIO 19 for flow, battery ADC on GPIO 34
- `firmware/esp32_firmware_blynk.ino` — Blynk prototype (legacy)

## MQTT Payload (published every ~1s)
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

## State Machine Thresholds
| Water Level (cm) | State | Alert |
|---|---|---|
| 0–19.9 | NORMAL | NORMAL |
| 20–34.9 | EARLY_SEDIMENTATION | WARNING |
| 35–44.9 | PARTIAL_BLOCK | ALERT |
| ≥45 | OVERFLOW_RISK | CRITICAL |

Early sedimentation also requires `flow_lpm < 2.0 && rise_rate > 0`. Transitions debounced with 2000ms persistence timer.

## Dashboard Key Files
- `dashboard/hooks/use-system-data.ts` — central data hook, Live MQTT + Simulation modes, 20-point rolling history
- `dashboard/lib/types.ts` — `ESP32Payload`, `SystemData`, `AlarmLog` interfaces
- `dashboard/app/(dashboard)/page.tsx` — main page: StatusCards × 4, RealTimeCharts × 2, AlarmLogTable
- `dashboard/app/(dashboard)/checkpoints/page.tsx` — node management (mock data)
- `dashboard/components/dashboard/SoundAlerter.tsx` — browser audio on CRITICAL (Web Audio API)
- `dashboard/app/globals.css` — Tailwind v4 theme: primary `#0d93f2`, bg-dark `#101b22`

## Dev Commands
```bash
cd dashboard && npm run dev     # start Next.js dev server → http://localhost:3000
cd dashboard && npm run build   # production build
```

## Conventions
- TypeScript strict mode throughout the dashboard
- Tailwind v4 with `@theme` block in globals.css — custom vars: `--color-primary`, `--color-background-dark`
- `cn()` helper from `lib/utils.ts` for conditional classnames
- No real auth backend — login/register pages are mock UI only
- Credentials (WiFi SSID, ThingsBoard token) are never committed — placeholder strings only

## Hardware Pins (Primary Firmware)
| GPIO | Component |
|---|---|
| 5 | HC-SR04 TRIG |
| 18 | HC-SR04 ECHO |
| 27 | YF-S201 flow (interrupt, FALLING edge) |
| 34 | LiPo battery ADC (Mosquitto variant only) |

## ThingsBoard Alarm Rules
Configured in Device Profile → Alarm Rules (NOT in dashboard JSON):
- `state == "OVERFLOW_RISK"` → Severity CRITICAL
- `state == "EARLY_SEDIMENTATION"` → Severity WARNING

## Agent Team Guidance
When working as part of an agent team on this project:
- **Firmware agents**: focus on `firmware/` only — do not touch dashboard code
- **Dashboard agents**: focus on `dashboard/` only — do not touch firmware
- **Docs agents**: focus on `docs/` and `README.md`
- Avoid editing the same file as another teammate
- The MQTT payload schema is the contract between firmware and dashboard — coordinate before changing field names

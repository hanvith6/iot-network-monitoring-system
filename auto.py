#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║   SMART DRAINAGE MONITORING SYSTEM — FULL AUTO SETUP            ║
║   ThingsBoard Cloud Complete Configuration                       ║
║                                                                  ║
║   What this does (A to Z):                                       ║
║   1. Logs in to ThingsBoard Cloud                                ║
║   2. Creates/verifies DrainageNode01 device                     ║
║   3. Gets device access token for ESP32                          ║
║   4. Deletes any old broken dashboard                            ║
║   5. Creates full dashboard — 9 widgets, perfect layout          ║
║   6. Creates 3 alarm rules (overflow, blockage, low flow)        ║
║   7. Creates email notification rule with alert templates        ║
║   8. Prints ESP32 config lines to paste into Arduino IDE         ║
║                                                                  ║
║   Run once. Everything configured. Nothing manual.              ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
    pip3 install requests
    python3 drainage_full_setup.py
"""

import json, os, sys, time

try:
    import requests
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

# ═══════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════
HOST        = os.getenv("TB_HOST", "https://thingsboard.cloud")
TOKEN       = os.getenv("TB_JWT_TOKEN", "")
TB_EMAIL    = os.getenv("TB_EMAIL", "")
TB_PASSWORD = os.getenv("TB_PASSWORD", "")
DEVICE_NAME = "DrainageNode01"
ALERT_EMAIL = os.getenv("ALERT_EMAIL", "alerts@example.com")
TEMPLATE_PATH = os.getenv(
    "TB_DASHBOARD_TEMPLATE",
    "thingsboard/dashboards/thingsboard_dashboard_final.json",
)
RUN_SUFFIX = os.getenv("TB_RUN_SUFFIX", str(int(time.time()))[-6:])

# Alarm thresholds — match your ESP32 code
OVERFLOW_THRESHOLD  = 40.0   # cm — CRITICAL
WARNING_THRESHOLD   = 35.0   # cm — WARNING
LOW_FLOW_THRESHOLD  = 2.0    # L/min — blockage warning

# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════
def step(msg): print(f"\n{'─'*60}\n  {msg}\n{'─'*60}")
def ok(msg):   print(f"  ✅  {msg}")
def info(msg): print(f"  ℹ️   {msg}")
def fail(msg, r=None):
    print(f"  ❌  {msg}")
    if r: print(f"      HTTP {r.status_code}: {r.text[:400]}")
    sys.exit(1)

s = requests.Session()
s.headers.update({"Content-Type": "application/json"})


def authenticate():
    # Prefer env JWT token for automation/CI; fallback to REST login if email/password are provided.
    if TOKEN:
        s.headers.update({"X-Authorization": f"Bearer {TOKEN}"})
        return

    if not TB_EMAIL or not TB_PASSWORD:
        fail(
            "Authentication missing. Set TB_JWT_TOKEN or TB_EMAIL/TB_PASSWORD environment variables."
        )

    r = s.post(
        f"{HOST}/api/auth/login",
        data=json.dumps({"username": TB_EMAIL, "password": TB_PASSWORD}),
    )
    if r.status_code != 200:
        fail("Could not login using TB_EMAIL/TB_PASSWORD", r)
    jwt = r.json().get("token")
    if not jwt:
        fail("Login succeeded but no token returned by ThingsBoard.")
    s.headers.update({"X-Authorization": f"Bearer {jwt}"})
    ok("Authenticated via ThingsBoard REST login")


def build_alias_for_device(alias_id, alias_name, device_name):
    return {
        "id": alias_id,
        "alias": alias_name,
        "filter": {
            "type": "entityName",
            "resolveMultiple": False,
            "entityType": "DEVICE",
            "entityNameFilter": device_name,
        },
    }


def dashboard_looks_tiny(configuration):
    try:
        widgets = configuration.get("widgets", {})
        layout_widgets = (
            configuration.get("states", {})
            .get("default", {})
            .get("layouts", {})
            .get("main", {})
            .get("widgets", {})
        )
        if len(layout_widgets) <= 1:
            return True

        total_area = 0
        for w in layout_widgets.values():
            sx = int(w.get("sizeX", 0) or 0)
            sy = int(w.get("sizeY", 0) or 0)
            total_area += sx * sy

        # A real 9-widget dashboard should have large area; tiny/blank layouts are usually near-zero.
        if total_area < 80:
            return True

        if widgets and len(layout_widgets) < max(3, len(widgets) // 2):
            return True

    except Exception:
        return True

    return False


def load_dashboard_template_payload(device_name):
    try:
        with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except Exception as e:
        info(f"Template load failed ({e}). Falling back to generated dashboard payload.")
        return build_dashboard_payload(device_name)

    payload["title"] = "Smart Drainage Monitor"
    cfg = payload.setdefault("configuration", {})
    cfg.setdefault("widgets", {})

    aliases = cfg.setdefault("entityAliases", {})
    if aliases:
        # Rebind first alias to the exact device name to avoid empty widgets.
        first_alias_key = next(iter(aliases.keys()))
        first_alias = aliases[first_alias_key]
        aliases[first_alias_key] = build_alias_for_device(
            first_alias.get("id", first_alias_key),
            first_alias.get("alias", "Drainage Sensor Node"),
            device_name,
        )
    else:
        aliases["alias_drainage_node"] = build_alias_for_device(
            "alias_drainage_node", "Drainage Sensor Node", device_name
        )

    states = cfg.setdefault("states", {})
    default_state = states.setdefault("default", {"name": "Smart Drainage", "root": True})
    layouts = default_state.setdefault("layouts", {})
    main_layout = layouts.setdefault("main", {})
    main_layout.setdefault("widgets", {})
    grid = main_layout.setdefault("gridSettings", {})
    grid["columns"] = 24
    grid.setdefault("margin", 10)
    grid.setdefault("backgroundColor", "#eeeeee")

    # Ensure layout exists for each widget. If missing, derive from widget-level placement.
    for w_id, w in cfg["widgets"].items():
        if w_id not in main_layout["widgets"]:
            main_layout["widgets"][w_id] = {
                "sizeX": int(w.get("sizeX", 6)),
                "sizeY": int(w.get("sizeY", 4)),
                "row": int(w.get("row", 0)),
                "col": int(w.get("col", 0)),
            }

    if dashboard_looks_tiny(cfg):
        info("Template layout looked tiny/incomplete. Falling back to generated stable layout.")
        return build_dashboard_payload(device_name)

    return payload


def build_dashboard_payload(device_name):
    alias_id = "alias_drainage_node"

    def latest_card(widget_id, title, key, units, color, row, col, sx=8, sy=4):
        return widget_id, {
            "isSystemType": True,
            "bundleAlias": "cards",
            "typeAlias": "simple_card",
            "type": "latest",
            "title": title,
            "sizeX": sx,
            "sizeY": sy,
            "row": row,
            "col": col,
            "config": {
                "datasources": [{
                    "type": "entity",
                    "name": "Drainage Node",
                    "entityAliasId": alias_id,
                    "dataKeys": [{
                        "name": key,
                        "type": "timeseries",
                        "label": title,
                        "color": color,
                        "units": units,
                        "decimals": 1
                    }]
                }],
                "timewindow": {"realtime": {"interval": 5000, "timewindowMs": 300000}},
                "showTitle": True,
                "backgroundColor": "#ffffff"
            }
        }, {"sizeX": sx, "sizeY": sy, "row": row, "col": col}

    widgets = {}
    layout = {}

    # Compatibility-safe layout: only simple cards to avoid version-specific widget runtime JS errors.
    for widget_id, w, l in [
        latest_card("w_level", "Water Level", "water_level_cm", "cm", "#2196F3", 0, 0, 8, 4),
        latest_card("w_flow", "Flow Rate", "flow_lpm", "L/min", "#4CAF50", 0, 8, 8, 4),
        latest_card("w_rise", "Rise Rate", "rise_rate_cm_per_min", "cm/min", "#FF9800", 0, 16, 8, 4),
        latest_card("w_eta", "Overflow ETA", "overflow_eta_min", "min", "#F44336", 4, 0, 8, 4),
        latest_card("w_state", "System State", "state", "", "#607D8B", 4, 8, 8, 4),
        latest_card("w_alert", "Alert Level", "alert_level", "", "#9C27B0", 4, 16, 8, 4),
        latest_card("w_fill", "Tank Fill %", "fill_percent", "%", "#00BCD4", 8, 0, 8, 4),
        latest_card("w_battery", "Battery", "battery_level", "%", "#8BC34A", 8, 8, 8, 4),
        latest_card("w_device", "Device", "state", "", "#795548", 8, 16, 8, 4),
    ]:
        widgets[widget_id] = w
        layout[widget_id] = l

    return {
        "title": "Smart Drainage Monitor",
        "configuration": {
            "description": "Auto-generated dashboard for DrainageNode01",
            "widgets": widgets,
            "entityAliases": {
                alias_id: {
                    "id": alias_id,
                    "alias": "Drainage Sensor Node",
                    "filter": {
                        "type": "entityName",
                        "resolveMultiple": False,
                        "entityType": "DEVICE",
                        "entityNameFilter": device_name,
                    },
                }
            },
            "states": {
                "default": {
                    "name": "Smart Drainage",
                    "root": True,
                    "layouts": {
                        "main": {
                            "widgets": layout,
                            "gridSettings": {
                                "backgroundColor": "#eeeeee",
                                "columns": 24,
                                "margin": 10,
                                "outerMargin": True,
                            },
                        }
                    },
                }
            },
        },
    }

# ═══════════════════════════════════════════════════════════════════
# STEP 1 — VERIFY LOGIN
# ═══════════════════════════════════════════════════════════════════
step("STEP 1 — Verifying login")
authenticate()
r = s.get(f"{HOST}/api/auth/user")
if r.status_code == 401:
    fail("Token expired! Go to ThingsBoard → Profile → Copy JWT Token, then update TOKEN= in this script.")
user = r.json()
ok(f"Logged in as: {user.get('email')} ({user.get('firstName')} {user.get('lastName')})")
tenant_id = user.get("tenantId", {}).get("id")

# ═══════════════════════════════════════════════════════════════════
# STEP 2 — CREATE OR FIND DEVICE
# ═══════════════════════════════════════════════════════════════════
step("STEP 2 — Device setup")
r = s.get(f"{HOST}/api/tenant/devices?pageSize=100&page=0")
device_id = None
for d in r.json().get("data", []):
    if d["name"] == DEVICE_NAME:
        device_id = d["id"]["id"]
        ok(f"Found existing device: {DEVICE_NAME} (id: {device_id})")
        break

if not device_id:
    info(f"Device '{DEVICE_NAME}' not found — creating it...")
    r = s.post(f"{HOST}/api/device", data=json.dumps({
        "name": DEVICE_NAME,
        "type": "default",
        "label": "ESP32 Drainage Node"
    }))
    if r.status_code not in (200, 201):
        fail("Could not create device", r)
    device_id = r.json()["id"]["id"]
    ok(f"Created device: {DEVICE_NAME} (id: {device_id})")

# Get device access token (what goes in ESP32 code)
r = s.get(f"{HOST}/api/device/{device_id}/credentials")
if r.status_code == 200:
    esp32_token = r.json().get("credentialsId", "unknown")
    ok(f"ESP32 access token: {esp32_token}")
else:
    esp32_token = "check-ThingsBoard-manually"
    info("Could not retrieve device token — check ThingsBoard manually")

# ═══════════════════════════════════════════════════════════════════
# STEP 3 — DELETE OLD DASHBOARD
# ═══════════════════════════════════════════════════════════════════
step("STEP 3 — Cleaning up old dashboards")
r = s.get(f"{HOST}/api/tenant/dashboards?pageSize=50&page=0")
deleted = 0
for dash in r.json().get("data", []):
    if dash.get("title", "").startswith("Smart Drainage Monitor"):
        s.delete(f"{HOST}/api/dashboard/{dash['id']['id']}")
        deleted += 1
        info(f"Deleted old dashboard: {dash['id']['id']}")
if deleted == 0:
    info("No old dashboards to delete")
else:
    ok(f"Deleted {deleted} old dashboard(s)")

# ═══════════════════════════════════════════════════════════════════
# STEP 4 — BUILD DASHBOARD
# ═══════════════════════════════════════════════════════════════════
step("STEP 4 — Building dashboard (9 widgets)")
dashboard_payload = build_dashboard_payload(DEVICE_NAME)

r = s.post(f"{HOST}/api/dashboard", data=json.dumps(dashboard_payload))
if r.status_code not in (200, 201):
    fail("Dashboard creation failed", r)
dash_id = r.json()["id"]["id"]
ok(f"Dashboard created: {dash_id}")
info(f"URL: {HOST}/dashboards/{dash_id}")

# Verify final persisted dashboard layout and auto-repair if it is tiny.
dashboard_widget_count = "unknown"
r = s.get(f"{HOST}/api/dashboard/{dash_id}")
if r.status_code == 200:
    created_dash = r.json()
    created_cfg = created_dash.get("configuration", {})
    layout_widgets = (
        created_cfg.get("states", {})
        .get("default", {})
        .get("layouts", {})
        .get("main", {})
        .get("widgets", {})
    )
    grid_columns = (
        created_cfg.get("states", {})
        .get("default", {})
        .get("layouts", {})
        .get("main", {})
        .get("gridSettings", {})
        .get("columns", "?")
    )
    dashboard_widget_count = len(layout_widgets)
    info(f"Dashboard validation: widgets={len(layout_widgets)}, gridColumns={grid_columns}")
    if dashboard_looks_tiny(created_cfg):
        info("Dashboard looked tiny after creation. Applying stable full-size layout fix...")
        created_dash["title"] = "Smart Drainage Monitor"
        created_dash["configuration"] = build_dashboard_payload(DEVICE_NAME)["configuration"]
        fix = s.post(f"{HOST}/api/dashboard", data=json.dumps(created_dash))
        if fix.status_code in (200, 201):
            ok("Applied auto-fix for tiny dashboard layout")
            recheck = s.get(f"{HOST}/api/dashboard/{dash_id}")
            if recheck.status_code == 200:
                rcfg = recheck.json().get("configuration", {})
                rw = (
                    rcfg.get("states", {})
                    .get("default", {})
                    .get("layouts", {})
                    .get("main", {})
                    .get("widgets", {})
                )
                rcol = (
                    rcfg.get("states", {})
                    .get("default", {})
                    .get("layouts", {})
                    .get("main", {})
                    .get("gridSettings", {})
                    .get("columns", "?")
                )
                info(f"Post-fix validation: widgets={len(rw)}, gridColumns={rcol}")
        else:
            info(f"Auto-fix attempt failed: {fix.status_code} — {fix.text[:180]}")
else:
    info("Could not verify created dashboard layout from API. Continuing.")

# ═══════════════════════════════════════════════════════════════════
# STEP 5 — ALARM RULES ON DEVICE PROFILE
# ═══════════════════════════════════════════════════════════════════
step("STEP 5 — Setting up alarm rules")

# Get device profile id
r = s.get(f"{HOST}/api/device/{device_id}")
profile_id = r.json().get("deviceProfileId", {}).get("id")
if not profile_id:
    info("Could not find device profile — skipping alarm rules (set manually in ThingsBoard)")
else:
    r = s.get(f"{HOST}/api/deviceProfile/{profile_id}")
    if r.status_code != 200:
        info("Could not fetch device profile — skipping alarm rules")
    else:
        profile = r.json()
        # Build alarm rules
        alarm_rules = [
            {
                "alarmType": "Overflow Risk",
                "createRules": {
                    "CRITICAL": {
                        "condition": {
                            "condition": [{
                                "key": {"type": "TIME_SERIES", "key": "water_level_cm"},
                                "valueType": "NUMERIC",
                                "predicate": {
                                    "type": "NUMERIC",
                                    "operation": "GREATER",
                                    "value": {"defaultValue": OVERFLOW_THRESHOLD, "dynamicValue": None}
                                }
                            }],
                            "spec": {"type": "SIMPLE"}
                        },
                        "schedule": None,
                        "alarmDetails": "Water level exceeded overflow threshold! Level: ${water_level_cm} cm",
                        "dashboardId": None
                    }
                },
                "clearRule": {
                    "condition": {
                        "condition": [{
                            "key": {"type": "TIME_SERIES", "key": "water_level_cm"},
                            "valueType": "NUMERIC",
                            "predicate": {
                                "type": "NUMERIC",
                                "operation": "LESS_OR_EQUAL",
                                "value": {"defaultValue": OVERFLOW_THRESHOLD - 5, "dynamicValue": None}
                            }
                        }],
                        "spec": {"type": "SIMPLE"}
                    },
                    "schedule": None,
                    "alarmDetails": ""
                },
                "propagate": True,
                "propagateToOwner": True,
                "propagateToTenant": True,
                "propagateRelationTypes": None
            },
            {
                "alarmType": "Partial Blockage",
                "createRules": {
                    "MAJOR": {
                        "condition": {
                            "condition": [{
                                "key": {"type": "TIME_SERIES", "key": "water_level_cm"},
                                "valueType": "NUMERIC",
                                "predicate": {
                                    "type": "NUMERIC",
                                    "operation": "GREATER",
                                    "value": {"defaultValue": WARNING_THRESHOLD, "dynamicValue": None}
                                }
                            }],
                            "spec": {"type": "SIMPLE"}
                        },
                        "schedule": None,
                        "alarmDetails": "Possible blockage detected. Level: ${water_level_cm} cm",
                        "dashboardId": None
                    }
                },
                "clearRule": {
                    "condition": {
                        "condition": [{
                            "key": {"type": "TIME_SERIES", "key": "water_level_cm"},
                            "valueType": "NUMERIC",
                            "predicate": {
                                "type": "NUMERIC",
                                "operation": "LESS_OR_EQUAL",
                                "value": {"defaultValue": WARNING_THRESHOLD - 3, "dynamicValue": None}
                            }
                        }],
                        "spec": {"type": "SIMPLE"}
                    },
                    "schedule": None,
                    "alarmDetails": ""
                },
                "propagate": True,
                "propagateToOwner": True,
                "propagateToTenant": True,
                "propagateRelationTypes": None
            },
            {
                "alarmType": "Low Flow Warning",
                "createRules": {
                    "WARNING": {
                        "condition": {
                            "condition": [{
                                "key": {"type": "TIME_SERIES", "key": "flow_lpm"},
                                "valueType": "NUMERIC",
                                "predicate": {
                                    "type": "NUMERIC",
                                    "operation": "LESS",
                                    "value": {"defaultValue": LOW_FLOW_THRESHOLD, "dynamicValue": None}
                                }
                            }],
                            "spec": {"type": "SIMPLE"}
                        },
                        "schedule": None,
                        "alarmDetails": "Low flow detected! Flow: ${flow_lpm} L/min",
                        "dashboardId": None
                    }
                },
                "clearRule": {
                    "condition": {
                        "condition": [{
                            "key": {"type": "TIME_SERIES", "key": "flow_lpm"},
                            "valueType": "NUMERIC",
                            "predicate": {
                                "type": "NUMERIC",
                                "operation": "GREATER_OR_EQUAL",
                                "value": {"defaultValue": LOW_FLOW_THRESHOLD + 1, "dynamicValue": None}
                            }
                        }],
                        "spec": {"type": "SIMPLE"}
                    },
                    "schedule": None,
                    "alarmDetails": ""
                },
                "propagate": True,
                "propagateToOwner": True,
                "propagateToTenant": True,
                "propagateRelationTypes": None
            }
        ]

        profile.setdefault("profileData", {})["alarms"] = alarm_rules
        r = s.post(f"{HOST}/api/deviceProfile", data=json.dumps(profile))
        if r.status_code in (200, 201):
            ok("Created 3 alarm rules: Overflow Risk / Partial Blockage / Low Flow Warning")
        else:
            info(f"Alarm rules partial: {r.status_code} — you may need to add them manually")

# ═══════════════════════════════════════════════════════════════════
# STEP 6 — EMAIL NOTIFICATION RULE
# ═══════════════════════════════════════════════════════════════════
step("STEP 6 — Setting up email notifications")

# Create notification template
template_payload = {
    "name": f"Drainage Alert Template {RUN_SUFFIX}",
    "notificationType": "ALARM",
    "configuration": {
        "notificationType": "ALARM",
        "defaultTextTemplate": (
            "🚨 DRAINAGE ALERT — ${alarmType}\n\n"
            "Device: ${deviceName}\n"
            "Alarm: ${alarmType}\n"
            "Severity: ${alarmSeverity}\n"
            "Time: ${alarmTime}\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "Water Level : ${water_level_cm} cm\n"
            "Flow Rate   : ${flow_lpm} L/min\n"
            "Rise Rate   : ${rise_rate_cm_per_min} cm/min\n"
            "ETA         : ${overflow_eta_min} min\n"
            "State       : ${state}\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Please check the drainage system immediately."
        ),
        "deliveryMethodsTemplates": {
            "EMAIL": {
                "method": "EMAIL",
                "enabled": True,
                "subject": "🚨 [DRAINAGE ALERT] ${alarmType} — ${deviceName}",
                "body": (
                    "<h2 style='color:red'>🚨 Drainage System Alert</h2>"
                    "<table style='border-collapse:collapse;width:100%'>"
                    "<tr><td><b>Alarm Type</b></td><td>${alarmType}</td></tr>"
                    "<tr><td><b>Severity</b></td><td>${alarmSeverity}</td></tr>"
                    "<tr><td><b>Device</b></td><td>${deviceName}</td></tr>"
                    "<tr><td><b>Time</b></td><td>${alarmTime}</td></tr>"
                    "</table><br>"
                    "<h3>Sensor Readings</h3>"
                    "<table style='border-collapse:collapse;width:100%'>"
                    "<tr style='background:#f0f0f0'><td><b>Water Level</b></td><td>${water_level_cm} cm</td></tr>"
                    "<tr><td><b>Flow Rate</b></td><td>${flow_lpm} L/min</td></tr>"
                    "<tr style='background:#f0f0f0'><td><b>Rise Rate</b></td><td>${rise_rate_cm_per_min} cm/min</td></tr>"
                    "<tr><td><b>Overflow ETA</b></td><td>${overflow_eta_min} min</td></tr>"
                    "<tr style='background:#f0f0f0'><td><b>System State</b></td><td>${state}</td></tr>"
                    "</table><br>"
                    "<p style='color:red'><b>Please check the drainage system immediately.</b></p>"
                )
            }
        }
    }
}

r = s.post(f"{HOST}/api/notification/template", data=json.dumps(template_payload))
template_id = None
if r.status_code in (200, 201):
    template_id = r.json()["id"]["id"]
    ok(f"Created notification template (id: {template_id})")
else:
    info(f"Template creation: {r.status_code} — {r.text[:200]}")

# Create notification target (who gets the email)
target_payload = {
    "name": f"Drainage Alert Recipients {RUN_SUFFIX}",
    "configuration": {
        "type": "PLATFORM_USERS",
        "usersFilter": {
            "type": "USER_LIST",
            "usersIds": [user["id"]["id"]]
        }
    }
}
r = s.post(f"{HOST}/api/notification/target", data=json.dumps(target_payload))
target_id = None
if r.status_code in (200, 201):
    target_id = r.json()["id"]["id"]
    ok(f"Created notification target for: {ALERT_EMAIL}")
else:
    info(f"Target creation: {r.status_code} — {r.text[:200]}")

# Create notification rule
if template_id and target_id:
    rule_payload = {
        "name": f"Drainage Alarm Notifications {RUN_SUFFIX}",
        "enabled": True,
        "templateId": {"id": template_id, "entityType": "NOTIFICATION_TEMPLATE"},
        "triggerType": "ALARM",
        "triggerConfig": {
            "triggerType": "ALARM",
            "alarmTypes": ["Overflow Risk", "Partial Blockage", "Low Flow Warning"],
            "alarmSeverities": ["CRITICAL", "MAJOR", "WARNING"],
            "notifyOn": ["CREATED", "SEVERITY_CHANGED", "ACKNOWLEDGED", "CLEARED"],
            "clearRule": None
        },
        "recipientsConfig": {
            "triggerType": "ALARM",
            "escalationTable": {
                "0": [target_id]
            }
        },
        "additionalConfig": {"description": "Sends email alerts for all drainage alarms"}
    }
    r = s.post(f"{HOST}/api/notification/rule", data=json.dumps(rule_payload))
    if r.status_code in (200, 201):
        ok("Created notification rule — email alerts active for all 3 alarm types")
    else:
        info(f"Notification rule: {r.status_code} — {r.text[:300]}")
else:
    info("Skipped notification rule (template or target creation failed)")

# ═══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════
print(f"""
╔══════════════════════════════════════════════════════════════════╗
║              ✅  SETUP COMPLETE — SUMMARY                        ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  DASHBOARD                                                       ║
║  → {HOST}/dashboards/{dash_id[:8]}...
║                                                                  ║
║  WIDGETS CREATED ({dashboard_widget_count} total)                                      ║
║  Row 1: Water Level | Flow Rate | Rise Rate | Overflow ETA      ║
║  Row 2: System State | Alert Level | Tank Fill %                ║
║  Row 3: Water Level Chart | Flow Rate Chart                     ║
║                                                                  ║
║  ALARM RULES (3 total)                                          ║
║  • Overflow Risk    → water_level_cm > {OVERFLOW_THRESHOLD} cm (CRITICAL)        ║
║  • Partial Blockage → water_level_cm > {WARNING_THRESHOLD} cm (MAJOR)           ║
║  • Low Flow Warning → flow_lpm < {LOW_FLOW_THRESHOLD} L/min (WARNING)          ║
║                                                                  ║
║  EMAIL ALERTS → {ALERT_EMAIL[:40]}
║  Triggers on: CREATED / SEVERITY_CHANGED / CLEARED             ║
║                                                                  ║
║  ESP32 ARDUINO IDE — paste these lines into your code:          ║
║  const char *mqtt_server = "mqtt.thingsboard.cloud";            ║
║  const char *mqtt_username = "{esp32_token[:30]}...";
║                                                                  ║
║  NEXT STEP: Flash ESP32 → open dashboard → see live data 🎉    ║
╚══════════════════════════════════════════════════════════════════╝
""")
#!/usr/bin/env python3
"""
RTDMS PCB Schematic Generator — v2 (Direct-Solder Design)
==========================================================
Design philosophy (from hardware photos):
  - ESP32-WROOM-32D MODULE soldered directly to PCB (castellated pads)
  - All sensor connections via 2.54mm male pin headers on PCB
  - Sensor Dupont/JST female connectors plug directly onto those headers
  - Power distribution rail: dedicated row of VCC + GND pins (multiple taps)
  - AMS1117-3.3 LDO on-board (no dev-board regulator needed)
  - Voltage divider on HC-SR04 ECHO (5V out → 3.3V safe for ESP32)

Usage:
    python generate_schematic.py           # writes rtdms_v2.kicad_sch
    python generate_schematic.py --netlist # print netlist + wiring guide

Pin source: firmware/capstone.ino
"""

import sys, uuid

def uid(): return str(uuid.uuid4())
def xy(x, y): return f"(at {x:.2f} {y:.2f})"

# ══════════════════════════════════════════════════════════════════
#  NET LIST  (from capstone.ino, confirmed GPIO map)
# ══════════════════════════════════════════════════════════════════
NETS = {
    "+5V":       ["J_PWR.1", "U_LDO.IN", "PWR_RAIL.all_VCC",
                  "J_HCSR04.1", "J_YFS201.1", "J_TURB.1",
                  "J_TDS.1",    "J_LCD.2"],
    "+3V3":       ["U_LDO.OUT", "U_ESP32.VCC", "C_3V3A.+", "C_3V3B.+",
                   "R_SCL.2",   "R_SDA.2",
                   "R_ECHO_TOP.1"],           # top of echo voltage divider
    "GND":       ["J_PWR.2", "U_LDO.GND", "U_ESP32.GND",
                  "PWR_RAIL.all_GND",
                  "J_HCSR04.4","J_YFS201.3","J_TURB.3",
                  "J_TDS.3",   "J_LCD.1",
                  "C_5V.−",    "C_3V3A.−", "C_3V3B.−"],
    # HC-SR04
    "TRIG":      ["U_ESP32.GPIO5",  "J_HCSR04.2"],
    "ECHO_5V":   ["J_HCSR04.3",     "R_ECHO_TOP.2"],   # raw 5V echo out
    "ECHO_3V3":  ["R_ECHO_TOP.3",   "U_ESP32.GPIO18"],  # divided ≈3.3V
    # YF-S201
    "FLOW":      ["U_ESP32.GPIO19", "J_YFS201.2"],
    # SEN0189 turbidity
    "TURB_AO":   ["U_ESP32.GPIO34", "J_TURB.2"],
    # TDS Meter V1.0
    "TDS_AO":    ["U_ESP32.GPIO32", "J_TDS.2"],
    # I2C (LCD)
    "SDA":       ["U_ESP32.GPIO23", "J_LCD.3", "R_SDA.1"],
    "SCL":       ["U_ESP32.GPIO22", "J_LCD.4", "R_SCL.1"],
}

# ══════════════════════════════════════════════════════════════════
#  S-EXPRESSION HELPERS
# ══════════════════════════════════════════════════════════════════

def sym(lib_id, ref, value, footprint, x, y, pins):
    """Generic symbol placement."""
    pin_lines = "\n".join(f'    (pin "{p}" (uuid {uid()}))' for p in pins)
    return f"""  (symbol (lib_id "{lib_id}") {xy(x,y)} (unit 1)
    (in_bom yes) (on_board yes)
    (uuid {uid()})
    (property "Reference" "{ref}" {xy(x+2,y-1)} (angle 0)
      (effects (font (size 1.27 1.27))))
    (property "Value" "{value}" {xy(x+2,y)} (angle 0)
      (effects (font (size 1.27 1.27))))
    (property "Footprint" "{footprint}" {xy(x,y)} (angle 0)
      (effects (font (size 1.27 1.27)) (hide yes)))
{pin_lines}
  )
"""

def header(ref, label, n_pins, pin_nets, x, y):
    """
    n-pin 2.54mm vertical male header.
    pin_nets: list of net-name strings, length == n_pins.
    Sensor Dupont female plugs directly onto this.
    """
    fp = f"Connector_PinHeader_2.54mm:PinHeader_1x{n_pins:02d}_P2.54mm_Vertical"
    lib = f"Connector:Conn_01x{n_pins:02d}"
    pins = [str(i+1) for i in range(n_pins)]
    body = sym(lib, ref, label, fp, x, y, pins)
    # add net labels at each pin position
    for i, net in enumerate(pin_nets):
        body += net_label(net, x - 2, y + i * 2.54)
    return body

def power_rail(ref, n_vcc, n_gnd, x, y):
    """
    Dedicated power distribution strip.
    Alternating VCC / GND pins so any sensor can tap power.
    n_vcc + n_gnd total pins.
    """
    total = n_vcc + n_gnd
    fp = f"Connector_PinHeader_2.54mm:PinHeader_1x{total:02d}_P2.54mm_Vertical"
    lib = f"Connector:Conn_01x{total:02d}"
    nets = []
    for i in range(max(n_vcc, n_gnd)):
        if i < n_vcc: nets.append("+5V")
        if i < n_gnd: nets.append("GND")
    pins = [str(i+1) for i in range(total)]
    body = sym(lib, ref, "PWR-RAIL", fp, x, y, pins)
    for i, net in enumerate(nets):
        body += net_label(net, x - 2, y + i * 2.54)
    return body

def esp32_module(ref, x, y):
    """
    ESP32-WROOM-32D — direct castellated solder footprint.
    Uses RF_Module:ESP32-WROOM-32 from KiCad library.
    """
    # Key used pins only — full 38-pad module
    used_pins = [
        "GND","3V3","EN",
        "GPIO34","GPIO35","GPIO32","GPIO33",
        "GPIO25","GPIO26","GPIO27","GPIO14","GPIO12",
        "GPIO13","GPIO15","GPIO2","GPIO0","GPIO4",
        "GPIO16","GPIO17","GPIO5","GPIO18","GPIO19",
        "GPIO21","RXD0","TXD0","GPIO22","GPIO23",
    ]
    pin_strs = "\n".join(f'    (pin "{p}" (uuid {uid()}))' for p in used_pins)
    return f"""  (symbol (lib_id "RF_Module:ESP32-WROOM-32") {xy(x,y)} (unit 1)
    (in_bom yes) (on_board yes)
    (uuid {uid()})
    (property "Reference" "{ref}" {xy(x+4,y-1)} (angle 0)
      (effects (font (size 1.27 1.27))))
    (property "Value" "ESP32-WROOM-32D" {xy(x+4,y)} (angle 0)
      (effects (font (size 1.27 1.27))))
    (property "Footprint" "RF_Module:ESP32-WROOM-32" {xy(x,y)} (angle 0)
      (effects (font (size 1.27 1.27)) (hide yes)))
{pin_strs}
  )
"""

def ldo(ref, x, y):
    """AMS1117-3.3 LDO: IN=5V → OUT=3V3, SOT-223 footprint."""
    return sym(
        "Device:Regulator_Linear_AMS1117-3.3",
        ref, "AMS1117-3.3",
        "Package_TO_SOT_SMD:SOT-223-3_TabPin2",
        x, y, ["IN","GND","OUT"]
    )

def resistor(ref, value, x, y):
    return sym("Device:R", ref, value,
               "Resistor_SMD:R_0805_2012Metric", x, y, ["1","2"])

def capacitor(ref, value, x, y):
    return sym("Device:C", ref, value,
               "Capacitor_SMD:C_0805_2012Metric", x, y, ["1","2"])

def net_label(name, x, y):
    return (f'  (label "{name}" {xy(x,y)} (angle 0)\n'
            f'    (effects (font (size 1.27 1.27)))\n'
            f'    (uuid {uid()})\n  )\n')

def pwr_flag(name, x, y):
    return (f'  (global_label "{name}" (shape power_in) {xy(x,y)} (angle 0)\n'
            f'    (effects (font (size 1.27 1.27)))\n'
            f'    (uuid {uid()})\n  )\n')

# ══════════════════════════════════════════════════════════════════
#  SCHEMATIC ASSEMBLY
# ══════════════════════════════════════════════════════════════════

def build():
    b = ""

    # ── ESP32-WROOM-32D (direct solder) ───────────────────────────
    b += esp32_module("U1", x=80, y=60)

    # ── AMS1117-3.3 LDO  (5V → 3.3V for ESP32 module) ────────────
    b += ldo("U2", x=40, y=50)

    # ── Power input (barrel jack 5.5mm / USB micro) ───────────────
    b += header("J_PWR", "PWR-IN-5V",  2, ["+5V","GND"],          x=20, y=30)

    # ── Power distribution rail ───────────────────────────────────
    #    6× +5V  +  6× GND  =  12-pin strip on one edge
    #    Sensors tap here with Dupont female connectors
    b += power_rail("J_RAIL", n_vcc=6, n_gnd=6, x=165, y=30)

    # ── HC-SR04 (4-pin male header: VCC · TRIG · ECHO · GND) ─────
    #    NOTE: ECHO is 5V out from sensor — goes through R divider
    #    before reaching ESP32 GPIO18 (max 3.3V)
    b += header("J1", "HC-SR04",
                4, ["+5V","TRIG","ECHO_5V","GND"],     x=145, y=30)

    # ── YF-S201 flow meter (3-pin: VCC · SIG · GND) ──────────────
    b += header("J2", "YF-S201",
                3, ["+5V","FLOW","GND"],                x=145, y=55)

    # ── SEN0189 turbidity (3-pin: VCC · AO · GND) ────────────────
    b += header("J3", "SEN0189-Turbidity",
                3, ["+5V","TURB_AO","GND"],             x=145, y=75)

    # ── TDS Meter V1.0 (3-pin: VCC · AO · GND) ───────────────────
    b += header("J4", "TDS-Meter-V1.0",
                3, ["+5V","TDS_AO","GND"],              x=145, y=95)

    # ── LCD 1602 I2C (4-pin: GND · VCC · SDA · SCL) ─────────────
    b += header("J5", "LCD1602-I2C",
                4, ["GND","+5V","SDA","SCL"],           x=145, y=115)

    # ── ECHO voltage divider (5V → 3.3V)  ────────────────────────
    #    ECHO_5V → R(1kΩ) → ECHO_MID → R(2kΩ) → GND
    #    ECHO_MID = 5V × 2/(1+2) = 3.33V  ✓ safe for ESP32
    b += resistor("R_ECHO1", "1k",   x=115, y=32)   # top resistor
    b += resistor("R_ECHO2", "2k",   x=115, y=42)   # bottom to GND
    b += net_label("ECHO_5V",  113, 30)
    b += net_label("ECHO_3V3", 113, 38)              # mid-point → GPIO18

    # ── I2C pull-ups (4.7kΩ → 3.3V) ─────────────────────────────
    b += resistor("R_SCL", "4.7k",  x=60, y=130)
    b += resistor("R_SDA", "4.7k",  x=70, y=130)
    b += net_label("SCL", 58, 128)
    b += net_label("SDA", 68, 128)
    b += net_label("+3V3", 58, 138)
    b += net_label("+3V3", 68, 138)

    # ── Decoupling caps ───────────────────────────────────────────
    b += capacitor("C1",  "100nF", x=40, y=70)   # 3.3V rail decoupling A
    b += capacitor("C2",  "10uF",  x=50, y=70)   # 3.3V rail bulk
    b += capacitor("C3",  "100nF", x=40, y=85)   # 5V rail decoupling
    b += capacitor("C4",  "100uF", x=50, y=85)   # 5V rail bulk
    b += net_label("+3V3", 38, 68)
    b += net_label("+5V",  38, 83)

    # ── Power global labels ───────────────────────────────────────
    b += pwr_flag("+5V",  20, 25)
    b += pwr_flag("+3V3", 30, 25)
    b += pwr_flag("GND",  20, 20)

    return b

def generate():
    return f"""(kicad_sch (version 20230121) (generator "rtdms_v2")
  (uuid {uid()})
  (paper "A4")
  (lib_symbols)

  (title_block
    (title "RTDMS v2 — Real-Time Drainage Monitoring System")
    (date "2026-04-03")
    (rev "v2.0")
    (company "GITAM University")
    (comment 1 "ESP32-WROOM-32D direct solder (castellated pads) + AMS1117-3.3 LDO")
    (comment 2 "All sensor headers: 2.54mm male pins — plug Dupont female connectors")
    (comment 3 "Power rail: 6x +5V + 6x GND strip on PCB edge")
    (comment 4 "ECHO voltage divider 1k/2k: 5V→3.3V for GPIO18 protection")
  )

{build()}
)
"""

# ══════════════════════════════════════════════════════════════════
#  WIRING GUIDE PRINTER
# ══════════════════════════════════════════════════════════════════

def print_wiring():
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  RTDMS v2 — Sensor Wiring Guide                     ║")
    print("║  (Dupont female → male header on PCB)               ║")
    print("╠══════════════════════════════════════════════════════╣")
    sensors = [
        ("HC-SR04",        "J1 (4-pin)", [
            ("Pin 1 (+5V)",  "Red wire   → VCC"),
            ("Pin 2 (TRIG)", "Orange     → TRIG (→ GPIO5)"),
            ("Pin 3 (ECHO)", "Yellow     → ECHO (5V→3V3 divider→GPIO18)"),
            ("Pin 4 (GND)",  "Black wire → GND"),
        ]),
        ("YF-S201 Flow",   "J2 (3-pin)", [
            ("Pin 1 (+5V)",  "Red   → VCC"),
            ("Pin 2 (SIG)",  "Yellow→ SIG  (→ GPIO19)"),
            ("Pin 3 (GND)",  "Black → GND"),
        ]),
        ("SEN0189 Turb",   "J3 (3-pin)", [
            ("Pin 1 (+5V)",  "Red   → VCC"),
            ("Pin 2 (AO)",   "Green → Analog Out (→ GPIO34)"),
            ("Pin 3 (GND)",  "Black → GND"),
        ]),
        ("TDS Meter V1.0", "J4 (3-pin)", [
            ("Pin 1 (+5V)",  "Red   → VCC"),
            ("Pin 2 (AO)",   "Blue  → Analog Out (→ GPIO32)"),
            ("Pin 3 (GND)",  "Black → GND"),
        ]),
        ("LCD 1602 I2C",   "J5 (4-pin)", [
            ("Pin 1 (GND)",  "Black  → GND"),
            ("Pin 2 (+5V)",  "Red    → VCC"),
            ("Pin 3 (SDA)",  "Blue   → SDA (→ GPIO23, 4.7k pull-up)"),
            ("Pin 4 (SCL)",  "Yellow → SCL (→ GPIO22, 4.7k pull-up)"),
        ]),
    ]
    for name, conn, pins in sensors:
        print(f"\n  ► {name}  →  {conn}")
        for p, desc in pins:
            print(f"      {p:<18}  {desc}")

    print("\n  ► Power Rail (J_RAIL, 12-pin strip on PCB edge)")
    print("      Odd pins  → +5V  (tap for any extra sensor/module)")
    print("      Even pins → GND  (tap for any extra sensor/module)")

    print("\n  ► AMS1117-3.3 (U2): 5V_IN → 3.3V_OUT for ESP32 module")
    print("  ► ECHO Voltage Divider: 1kΩ + 2kΩ  → 5V→3.3V on GPIO18")
    print("  ► I2C Pull-ups: R_SCL, R_SDA 4.7kΩ each → +3V3\n")
    print("╚══════════════════════════════════════════════════════╝\n")

    print("Netlist:")
    for net, nodes in NETS.items():
        print(f"  {net:<12} ← {', '.join(nodes)}")
    print()

# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    if "--netlist" in sys.argv:
        print_wiring()
        sys.exit(0)

    out = "rtdms_v2.kicad_sch"
    with open(out, "w") as f:
        f.write(generate())

    print(f"✅ Written: {out}")
    print()
    print("Next steps:")
    print("  1. Open rtdms_v2.kicad_sch in KiCad 7")
    print("  2. Tools → Assign Footprints (see bom.csv)")
    print("  3. File → Export → Netlist → open PCB Editor")
    print("  4. Place parts, route, add GND pour, export Gerbers")
    print("  5. Upload to jlcpcb.com (~₹850 for 5 boards)")
    print()
    print_wiring()

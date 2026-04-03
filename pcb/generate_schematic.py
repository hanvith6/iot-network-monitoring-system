#!/usr/bin/env python3
"""
RTDMS PCB Schematic Generator
==============================
Generates  rtdms.kicad_sch  (KiCad 7+) from capstone.ino pin definitions.

Usage:
    python generate_schematic.py          # writes rtdms.kicad_sch
    python generate_schematic.py --check  # print netlist only, no file write

Open rtdms.kicad_sch in KiCad 7 → PCB Editor → export Gerbers → upload to JLCPCB.

Pin source: firmware/capstone.ino
"""

import sys
import uuid
from dataclasses import dataclass, field
from typing import List, Tuple

# ─── Pin map from capstone.ino ────────────────────────────────────────────────
PINMAP = {
    # sensor connector     net_label      ESP32 GPIO
    "HC_SR04_TRIG":       ("TRIG",        "GPIO5"),
    "HC_SR04_ECHO":       ("ECHO",        "GPIO18"),
    "YFS201_SIG":         ("FLOW",        "GPIO19"),
    "SEN0189_AO":         ("TURB_AO",     "GPIO34"),
    "TDS_AO":             ("TDS_AO",      "GPIO32"),
    "LCD_SDA":            ("SDA",         "GPIO23"),
    "LCD_SCL":            ("SCL",         "GPIO22"),
}

POWER = "+5V"
GND   = "GND"
VCC33 = "+3V3"

# ─── KiCad 7 S-expression helpers ─────────────────────────────────────────────

def uid() -> str:
    return str(uuid.uuid4())

def xy(x: float, y: float) -> str:
    return f"(at {x:.2f} {y:.2f})"

def net_label(name: str, x: float, y: float, angle: int = 0) -> str:
    """Schematic net label — same-named labels are connected."""
    return (
        f'  (net_tie_pad_groups)\n'
        f'  (label "{name}" {xy(x, y)} (angle {angle})\n'
        f'    (effects (font (size 1.27 1.27)))\n'
        f'    (uuid {uid()})\n'
        f'  )\n'
    )

def global_label(name: str, shape: str, x: float, y: float, angle: int = 0) -> str:
    """Global label — connects across sheets."""
    return (
        f'  (global_label "{name}" (shape {shape}) {xy(x, y)} (angle {angle})\n'
        f'    (effects (font (size 1.27 1.27)))\n'
        f'    (uuid {uid()})\n'
        f'  )\n'
    )

def power_symbol(name: str, x: float, y: float) -> str:
    return (
        f'  (power_symbol "{name}" {xy(x, y)}\n'
        f'    (uuid {uid()})\n'
        f'  )\n'
    )

def wire(x1: float, y1: float, x2: float, y2: float) -> str:
    return (
        f'  (wire (pts (xy {x1:.2f} {y1:.2f}) (xy {x2:.2f} {y2:.2f}))\n'
        f'    (stroke (width 0) (type default))\n'
        f'    (uuid {uid()})\n'
        f'  )\n'
    )

def connector(ref: str, name: str, pins: List[Tuple[str, str]],
              x: float, y: float) -> str:
    """
    Generic screw-terminal / header connector.
    pins: list of (pin_number, net_name)
    """
    n = len(pins)
    lib_id = f"Connector:Conn_01x{n:02d}"
    lines = [
        f'  (symbol (lib_id "{lib_id}") {xy(x, y)} (unit 1)',
        f'    (in_bom yes) (on_board yes)',
        f'    (uuid {uid()})',
        f'    (property "Reference" "{ref}" {xy(x + 1.5, y - 1)} (angle 0)',
        f'      (effects (font (size 1.27 1.27))))',
        f'    (property "Value" "{name}" {xy(x + 1.5, y + 0.5)} (angle 0)',
        f'      (effects (font (size 1.27 1.27))))',
        f'    (property "Footprint" "Connector_PinHeader_2.54mm:PinHeader_1x{n:02d}_P2.54mm_Vertical"',
        f'      {xy(x, y)} (angle 0)',
        f'      (effects (font (size 1.27 1.27)) (hide yes)))',
    ]
    # pin_numbers
    for i, (pnum, net) in enumerate(pins):
        py = y + i * 2.54
        lines.append(
            f'    (pin "{pnum}" (uuid {uid()}))'
        )
    lines.append('  )')
    return '\n'.join(lines) + '\n'

def esp32_header(ref: str, x: float, y: float) -> str:
    """
    ESP32 DevKit represented as two 19-pin headers (left & right rails).
    Left  rail : pins 1-19  (GND, 3V3, EN, VP, VN, IO34, IO35, IO32, IO33,
                              IO25, IO26, IO27, IO14, IO12, GND, IO13, SD2, SD3, CMD)
    Right rail : pins 20-38 (CLK, SD0, SD1, IO15, IO2, IO0, IO4, IO16, IO17,
                              IO5, IO18, IO19, NC, IO21, RXD0, TXD0, IO22, IO23,
                              GND)
    Only electrically-used pins are labeled with net names; rest are NC.
    """
    left_nets = [
        "GND","VCC33","EN","NC","NC",
        "TURB_AO","NC","TDS_AO","NC",
        "NC","NC","NC","NC","NC",
        "GND","NC","NC","NC","NC",
    ]
    right_nets = [
        "NC","NC","NC","NC","NC",
        "NC","NC","NC","NC",
        "GPIO5_TRIG","ECHO","FLOW","NC","NC",
        "NC","NC","SCL","SDA","GND",
    ]

    def rail(ref_r, nets, rx, ry):
        n = len(nets)
        lib_id = f"Connector:Conn_01x{n:02d}"
        lines = [
            f'  (symbol (lib_id "{lib_id}") {xy(rx, ry)} (unit 1)',
            f'    (in_bom yes) (on_board yes)',
            f'    (uuid {uid()})',
            f'    (property "Reference" "{ref_r}" {xy(rx+1.5, ry-1)} (angle 0)',
            f'      (effects (font (size 1.27 1.27))))',
            f'    (property "Value" "ESP32-DevKit" {xy(rx+1.5, ry+0.5)} (angle 0)',
            f'      (effects (font (size 1.27 1.27))))',
        ]
        for i, net in enumerate(nets):
            lines.append(f'    (pin "{i+1}" (uuid {uid()}))')
        lines.append('  )')
        return '\n'.join(lines) + '\n'

    body = rail(ref + "_L", left_nets,  x,       y)
    body += rail(ref + "_R", right_nets, x + 7.62, y)
    return body

def resistor(ref: str, value: str, net_a: str, net_b: str,
             x: float, y: float) -> str:
    return (
        f'  (symbol (lib_id "Device:R") {xy(x, y)} (unit 1)\n'
        f'    (in_bom yes) (on_board yes)\n'
        f'    (uuid {uid()})\n'
        f'    (property "Reference" "{ref}" {xy(x+1.5, y)} (angle 0)\n'
        f'      (effects (font (size 1.27 1.27))))\n'
        f'    (property "Value" "{value}" {xy(x+1.5, y+1.27)} (angle 0)\n'
        f'      (effects (font (size 1.27 1.27))))\n'
        f'    (property "Footprint" "Resistor_SMD:R_0805_2012Metric"\n'
        f'      {xy(x, y)} (angle 0)\n'
        f'      (effects (font (size 1.27 1.27)) (hide yes)))\n'
        f'    (pin "1" (uuid {uid()}))\n'
        f'    (pin "2" (uuid {uid()}))\n'
        f'  )\n'
    )

def capacitor(ref: str, value: str, x: float, y: float) -> str:
    return (
        f'  (symbol (lib_id "Device:C") {xy(x, y)} (unit 1)\n'
        f'    (in_bom yes) (on_board yes)\n'
        f'    (uuid {uid()})\n'
        f'    (property "Reference" "{ref}" {xy(x+1.5, y)} (angle 0)\n'
        f'      (effects (font (size 1.27 1.27))))\n'
        f'    (property "Value" "{value}" {xy(x+1.5, y+1.27)} (angle 0)\n'
        f'      (effects (font (size 1.27 1.27))))\n'
        f'    (property "Footprint" "Capacitor_SMD:C_0805_2012Metric"\n'
        f'      {xy(x, y)} (angle 0)\n'
        f'      (effects (font (size 1.27 1.27)) (hide yes)))\n'
        f'    (pin "1" (uuid {uid()}))\n'
        f'    (pin "2" (uuid {uid()}))\n'
        f'  )\n'
    )

# ─── Full schematic assembly ───────────────────────────────────────────────────

def build_schematic() -> str:
    body = ""

    # ── ESP32 dev board ────────────────────────────────────
    body += esp32_header("U1", x=80, y=50)

    # ── HC-SR04 (4-pin: VCC TRIG ECHO GND) ────────────────
    body += connector("J1", "HC-SR04",
        [("1", "+5V"), ("2", "TRIG"), ("3", "ECHO"), ("4", "GND")],
        x=150, y=30)

    # ── YF-S201 (3-pin: VCC SIG GND) ──────────────────────
    body += connector("J2", "YF-S201",
        [("1", "+5V"), ("2", "FLOW"), ("3", "GND")],
        x=150, y=60)

    # ── SEN0189 Turbidity (3-pin: VCC AO GND) ─────────────
    body += connector("J3", "SEN0189-Turbidity",
        [("1", "+5V"), ("2", "TURB_AO"), ("3", "GND")],
        x=150, y=90)

    # ── TDS Meter V1.0 (3-pin: VCC AO GND) ───────────────
    body += connector("J4", "TDS-Meter-V1.0",
        [("1", "+5V"), ("2", "TDS_AO"), ("3", "GND")],
        x=150, y=120)

    # ── LCD 1602 I2C (4-pin: GND VCC SDA SCL) ─────────────
    body += connector("J5", "LCD1602-I2C",
        [("1", "GND"), ("2", "+5V"), ("3", "SDA"), ("4", "SCL")],
        x=150, y=150)

    # ── Power input (barrel jack, 2-pin: +5V GND) ──────────
    body += connector("J6", "PWR-5V-Barrel",
        [("1", "+5V"), ("2", "GND")],
        x=40, y=30)

    # ── I2C pull-up resistors (4.7kΩ, SDA/SCL → 3.3V) ─────
    body += resistor("R1", "4.7k", "SCL", "+3V3", x=60, y=155)
    body += resistor("R2", "4.7k", "SDA", "+3V3", x=70, y=155)

    # ── Decoupling caps 100nF (one per analog sensor) ──────
    for i, (cref, net) in enumerate([
        ("C1", "TURB_AO"), ("C2", "TDS_AO"),
        ("C3", "+5V"),     ("C4", "+3V3"),
    ]):
        body += capacitor(cref, "100nF", x=60 + i * 10, y=170)

    # ── Net labels for all signal nets ─────────────────────
    labels = [
        ("TRIG",    155, 35), ("ECHO",    155, 40),
        ("FLOW",    155, 65),
        ("TURB_AO", 155, 95), ("TDS_AO",  155, 125),
        ("SDA",     155, 155), ("SCL",    155, 160),
    ]
    for name, lx, ly in labels:
        body += net_label(name, lx, ly)

    # ── Global power labels ────────────────────────────────
    for pwr in [("+5V", 40, 25), ("GND", 40, 40), ("+3V3", 40, 45)]:
        body += global_label(pwr[0], "power_in", pwr[1], pwr[2])

    return body


def generate_kicad_sch() -> str:
    inner = build_schematic()
    return f"""(kicad_sch (version 20230121) (generator "rtdms_generator")
  (uuid {uid()})
  (paper "A4")

  (lib_symbols)

  (title_block
    (title "RTDMS — Real-Time Drainage Monitoring System")
    (date "2026-04-03")
    (rev "v1.0")
    (company "GITAM University")
    (comment 1 "ESP32-WROOM-32D-N4 + HC-SR04 + YF-S201 + SEN0189 + TDS Meter V1.0 + LCD1602A")
    (comment 2 "All sensors on 5V. ADC inputs on 3.3V-safe GPIO34 and GPIO32.")
    (comment 3 "I2C on GPIO22/GPIO23 with 4.7k pull-ups to 3.3V.")
  )

{inner}
)
"""

# ─── Netlist printer (--check mode) ───────────────────────────────────────────

def print_netlist():
    print("\n=== RTDMS Netlist (from capstone.ino) ===\n")
    nets = {
        "+5V":    ["J1.1", "J2.1", "J3.1", "J4.1", "J5.2", "J6.1", "U1.VIN"],
        "GND":    ["J1.4", "J2.3", "J3.3", "J4.3", "J5.1", "J6.2", "U1.GND"],
        "TRIG":   ["J1.2", "U1.GPIO5"],
        "ECHO":   ["J1.3", "U1.GPIO18"],
        "FLOW":   ["J2.2", "U1.GPIO19"],
        "TURB_AO":["J3.2", "U1.GPIO34"],
        "TDS_AO": ["J4.2", "U1.GPIO32"],
        "SDA":    ["J5.3", "U1.GPIO23", "R2.1"],
        "SCL":    ["J5.4", "U1.GPIO22", "R1.1"],
        "+3V3":   ["U1.3V3", "R1.2", "R2.2", "C4.1"],
    }
    for net, nodes in nets.items():
        print(f"  {net:<12} ← {', '.join(nodes)}")
    print()


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--check" in sys.argv:
        print_netlist()
        sys.exit(0)

    out_file = "rtdms.kicad_sch"
    content = generate_kicad_sch()

    with open(out_file, "w") as f:
        f.write(content)

    print(f"✅ Written: {out_file}")
    print("   Open in KiCad 7+:")
    print("   1. File → Open Schematic → select rtdms.kicad_sch")
    print("   2. Assign footprints (Tools → Assign Footprints)")
    print("   3. File → Export → Netlist")
    print("   4. PCB Editor → File → Import Netlist")
    print("   5. Place parts, route, export Gerbers → upload to JLCPCB")
    print()
    print_netlist()

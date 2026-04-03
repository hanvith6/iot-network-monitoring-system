# RTDMS PCB Design

Custom PCB for Real-Time Drainage Monitoring System.
ESP32-WROOM-32D-N4 + HC-SR04 + YF-S201 + SEN0189 + TDS Meter V1.0 + LCD1602A I2C

---

## Files

| File | Purpose |
|---|---|
| `generate_schematic.py` | Run to generate `rtdms.kicad_sch` |
| `rtdms.kicad_sch` | KiCad 7 schematic (generated) |
| `bom.csv` | Bill of materials with LCSC part numbers |

---

## Step 1 — Generate the Schematic

```bash
cd pcb
python generate_schematic.py          # generates rtdms.kicad_sch
python generate_schematic.py --check  # print netlist only
```

Requires Python 3.7+. No extra packages needed.

---

## Step 2 — Open in KiCad 7

1. Download KiCad 7 free from [kicad.org](https://www.kicad.org)
2. **File → Open Schematic** → select `rtdms.kicad_sch`
3. **Tools → Assign Footprints** — assign from `bom.csv` Footprint column
4. **File → Export → Netlist** → save as `rtdms.net`

---

## Step 3 — PCB Layout

1. Open **PCB Editor** (from KiCad main window)
2. **File → Import Netlist** → select `rtdms.net`
3. Board size: **80 × 60 mm**
4. Place components:
   - ESP32 headers (HDR_L, HDR_R) in centre
   - Screw terminals (J1–J4) on right edge — wires exit the side
   - LCD header (J5) on bottom edge
   - Power jack (J6) on left edge
   - Caps and resistors near ESP32
5. **Route → Interactive Router** (X key) — route all traces
   - Signal traces: 0.3 mm min width
   - Power traces (+5V / GND): 0.8 mm min width
6. Right-click empty area → **Add Copper Zone** → assign to GND → flood both layers
7. **Inspect → Design Rules Checker** — fix all errors

---

## Step 4 — Export Gerbers

1. **File → Fabrication Outputs → Gerbers**
2. Select all layers: F.Cu, B.Cu, F.SilkS, B.SilkS, F.Mask, B.Mask, Edge.Cuts
3. Also export **Drill Files** (Excellon format)
4. Zip all files → `rtdms_gerbers.zip`

---

## Step 5 — Order from JLCPCB

1. Go to [jlcpcb.com](https://jlcpcb.com)
2. **Upload Gerbers** → upload `rtdms_gerbers.zip`
3. Settings:
   - Layers: **2**
   - Dimensions: **80 × 60 mm**
   - PCB Qty: **5**
   - PCB Colour: **Blue** (standard)
   - Surface Finish: **HASL (with lead)** — cheapest
   - Copper Weight: **1 oz**
4. Cost: ~**$2 USD** + ~$8 shipping = ₹850 total
5. Production: 24–48 hrs → Shipping to India (DHL): 5–7 days

---

## Pin Map (from capstone.ino)

| Net | ESP32 GPIO | Connector |
|---|---|---|
| TRIG | GPIO5 | J1 pin 2 (HC-SR04) |
| ECHO | GPIO18 | J1 pin 3 (HC-SR04) |
| FLOW | GPIO19 | J2 pin 2 (YF-S201) |
| TURB_AO | GPIO34 | J3 pin 2 (SEN0189) |
| TDS_AO | GPIO32 | J4 pin 2 (TDS Meter) |
| SDA | GPIO23 | J5 pin 3 (LCD) + R2 pull-up |
| SCL | GPIO22 | J5 pin 4 (LCD) + R1 pull-up |
| +5V | VIN | J6 pin 1, all sensor VCC |
| GND | GND | J6 pin 2, all sensor GND |

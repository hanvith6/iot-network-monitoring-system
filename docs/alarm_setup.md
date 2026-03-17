# How to Create Alarms in ThingsBoard

The dashboard file handles the **widgets** (Charts, Cards), but **Alarms** must be created in the "Device Profile" section.

### Step 5: Create Alarm Rules (Manual Setup)

1.  **Go to Device Profiles**:
    *   In the Left Sidebar, click **Profiles** -> **Device Profiles**.
    *   Click on the **"default"** profile (or whichever profile your Device uses).

2.  **Open Alarm Rules**:
    *   Click the **Alarm rules** tab at the top.
    *   Click **Add alarm rule**.

### Alarm 1: Overflow Risk (Critical)
*   **Alarm Type**: `Overflow Risk`
*   **Create Alarm Condition**:
    *   Click **Add Key Filter**.
    *   Type: **Telemetry**.
    *   Key: `state`.
    *   Value Type: **String**.
    *   Operation: **Equal**.
    *   Value: `OVERFLOW_RISK` (Must match exact text from ESP32).
*   **Severity**: Select **CRITICAL** (Red).
*   Click **Add**.

### Alarm 2: Early Sedimentation (Warning)
*   **Alarm Type**: `Sedimentation Warning`
*   **Create Alarm Condition**:
    *   Click **Add Key Filter**.
    *   Type: **Telemetry**.
    *   Key: `state`.
    *   Value Type: **String**.
    *   Operation: **Equal**.
    *   Value: `EARLY_SEDIMENTATION`.
*   **Severity**: Select **WARNING** (Orange).
*   Click **Add**.

### Save Profile
*   Click the **Apply changes** (Checkmark) icon to save the profile.

**Verification:**
When your ESP32 detects blockages, a Red or Orange alarm bell will now appear on your new Dashboard!

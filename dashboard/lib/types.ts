export interface ESP32Payload {
    flow_lpm: number;
    water_level_cm: number;
    rise_rate_cm_per_min: number;
    overflow_eta_min: number | null;
    state: "NORMAL" | "EARLY_SEDIMENTATION" | "PARTIAL_BLOCK" | "OVERFLOW_RISK";
    alert_level: "NORMAL" | "WARNING" | "ALERT" | "CRITICAL";
    battery_level: number;
}

export interface SystemData {
    flowRate: number;
    waterLevel: number;
    riseRate: number;
    eta: number | null;
    status: ESP32Payload["state"];
    alertLevel: ESP32Payload["alert_level"];
    batteryLevel?: number;
    timestamp: string;
}

export interface AlarmLog {
    id: string;
    timestamp: string;
    type: string;
    severity: ESP32Payload["alert_level"];
    message: string;
}

import { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { ESP32Payload, SystemData, AlarmLog } from '@/lib/types';

// CONFIGURATION
const MQTT_BROKER = 'wss://mqtt.eu.thingsboard.cloud:8883';
const TOPIC = 'v1/devices/me/telemetry';
const PIPE_DEPTH_CM = 45;

export function useSystemData() {
    const [isLive, setIsLive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [data, setData] = useState<SystemData>({
        flowRate: 0,
        waterLevel: 0,
        riseRate: 0,
        eta: null,
        fillPercent: 0,
        flowIndex: 1,
        turbidityRaw: 2200,
        turbidityStatus: "CLEAR",
        tdsPpm: 145,
        tdsStatus: "CLEAN",
        status: "NORMAL",
        alertLevel: "NORMAL",
        batteryLevel: 100,
        timestamp: new Date().toLocaleTimeString()
    });

    const [history, setHistory] = useState<(SystemData & { time: string })[]>([]);
    const [alarms, setAlarms] = useState<AlarmLog[]>([]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let client: mqtt.MqttClient | null = null;

        if (isLive) {
            // ── Live MQTT Mode ──────────────────────────────
            const clientId = 'rtdms-dash-' + Math.random().toString(16).substr(2, 8);
            client = mqtt.connect(MQTT_BROKER, {
                clientId,
                keepalive: 60,
                protocolId: 'MQTT',
                protocolVersion: 4,
                clean: true,
                reconnectPeriod: 2000,
                connectTimeout: 30 * 1000,
            });

            client.on('connect', () => {
                console.log('[RTDMS] Connected to ThingsBoard MQTT');
                setIsConnected(true);
                client?.subscribe(TOPIC, (err) => {
                    if (err) console.error('[RTDMS] Subscription error:', err);
                });
            });

            client.on('message', (_topic, message) => {
                try {
                    const payload = JSON.parse(message.toString()) as ESP32Payload;
                    const timeStr = new Date().toLocaleTimeString();

                    const newData: SystemData = {
                        flowRate: payload.flow_lpm,
                        waterLevel: payload.water_level_cm,
                        riseRate: payload.rise_rate_cm_per_min,
                        eta: payload.overflow_eta_min,
                        fillPercent: payload.fill_percent ?? (payload.water_level_cm / PIPE_DEPTH_CM) * 100,
                        flowIndex: payload.flow_index ?? 1,
                        turbidityRaw: payload.turbidity_raw ?? 0,
                        turbidityStatus: payload.turbidity_status ?? "CLEAR",
                        tdsPpm: payload.tds_ppm ?? 0,
                        tdsStatus: payload.tds_status ?? "CLEAN",
                        status: payload.state,
                        alertLevel: payload.alert_level,
                        batteryLevel: payload.battery_level,
                        timestamp: timeStr
                    };

                    setData(newData);
                    setHistory(prev => {
                        const next = [...prev, { ...newData, time: timeStr }];
                        if (next.length > 20) next.shift();
                        return next;
                    });

                    if (newData.alertLevel !== "NORMAL") {
                        setAlarms(prev => {
                            if (prev.length > 0 &&
                                prev[0].type === newData.status &&
                                prev[0].timestamp === timeStr) return prev;
                            const alarm: AlarmLog = {
                                id: Math.random().toString(36).substr(2, 9),
                                timestamp: timeStr,
                                type: newData.status,
                                severity: newData.alertLevel,
                                message: `State changed to ${newData.status.replace(/_/g, ' ')}`
                            };
                            return [alarm, ...prev].slice(0, 50);
                        });
                    }
                } catch (e) {
                    console.error('[RTDMS] Failed to parse MQTT message', e);
                }
            });

            client.on('error', (err) => {
                console.error('[RTDMS] MQTT Error:', err);
                setIsConnected(false);
            });

            client.on('offline', () => setIsConnected(false));
            client.on('reconnect', () => setIsConnected(false));

        } else {
            // ── Simulation Mode ─────────────────────────────
            interval = setInterval(() => {
                setData((prev) => {
                    const timeStr = new Date().toLocaleTimeString();

                    let newFlow = Math.max(0, prev.flowRate + (Math.random() * 1.6 - 0.8));
                    let newWaterLevel = Math.max(0, Math.min(PIPE_DEPTH_CM, prev.waterLevel + (Math.random() * 4 - 1.8)));

                    // Occasional surge
                    if (Math.random() > 0.96) newWaterLevel = Math.min(PIPE_DEPTH_CM, newWaterLevel + 6);

                    const fillPct = (newWaterLevel / PIPE_DEPTH_CM) * 100;
                    const expectedQ = 2.5 * Math.pow(Math.max(newWaterLevel, 0.1), 1.5);
                    const simFlowIndex = expectedQ > 0.1 ? newFlow / expectedQ : 1;

                    let status: SystemData["status"] = "NORMAL";
                    let alertLevel: SystemData["alertLevel"] = "NORMAL";

                    if (fillPct >= 89 || newWaterLevel >= 40) {
                        status = "OVERFLOW_RISK"; alertLevel = "CRITICAL";
                    } else if (newWaterLevel >= 35 || (simFlowIndex < 0.4 && newWaterLevel > 20)) {
                        status = "PARTIAL_BLOCK"; alertLevel = "ALERT";
                    } else if (newWaterLevel >= 20 && newFlow < 2) {
                        status = "EARLY_SEDIMENTATION"; alertLevel = "WARNING";
                    }

                    const riseRate = parseFloat((newWaterLevel - prev.waterLevel).toFixed(2));
                    let eta: number | null = null;
                    if (riseRate > 0.4) {
                        eta = parseFloat(((PIPE_DEPTH_CM - newWaterLevel) / riseRate).toFixed(1));
                        if (eta < 0) eta = null;
                    }

                    // Turbidity rises with water level
                    const simTurbRaw = Math.max(600, 2300 - newWaterLevel * 22);
                    const simTurbStatus: SystemData["turbidityStatus"] =
                        simTurbRaw > 2000 ? "CLEAR" : simTurbRaw > 800 ? "MODERATE" : "TURBID";

                    // TDS rises with fill level (simulating sediment/contamination)
                    const simTdsPpm = Math.max(0, 120 + fillPct * 3.2 + Math.random() * 20);
                    const simTdsStatus: SystemData["tdsStatus"] =
                        simTdsPpm < 300 ? "CLEAN" : simTdsPpm < 600 ? "MODERATE" : "CONTAMINATED";

                    const newData: SystemData = {
                        flowRate: parseFloat(newFlow.toFixed(1)),
                        waterLevel: parseFloat(newWaterLevel.toFixed(1)),
                        riseRate,
                        eta,
                        fillPercent: parseFloat(fillPct.toFixed(1)),
                        flowIndex: parseFloat(Math.min(2, Math.max(0, simFlowIndex)).toFixed(3)),
                        turbidityRaw: Math.round(simTurbRaw),
                        turbidityStatus: simTurbStatus,
                        tdsPpm: parseFloat(simTdsPpm.toFixed(1)),
                        tdsStatus: simTdsStatus,
                        status,
                        alertLevel,
                        batteryLevel: 100,
                        timestamp: timeStr,
                    };

                    setHistory(prev => {
                        const next = [...prev, { ...newData, time: timeStr }];
                        if (next.length > 20) next.shift();
                        return next;
                    });

                    if (newData.alertLevel !== "NORMAL" && Math.random() > 0.7) {
                        setAlarms(prev => {
                            const alarm: AlarmLog = {
                                id: Math.random().toString(36).substr(2, 9),
                                timestamp: timeStr,
                                type: newData.status,
                                severity: newData.alertLevel,
                                message: `Simulated: ${newData.status.replace(/_/g, ' ')}`
                            };
                            return [alarm, ...prev].slice(0, 50);
                        });
                    }

                    return newData;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (client) { client.end(); }
            setIsConnected(false);
        };
    }, [isLive]);

    return { data, history, alarms, isLive, setIsLive, isConnected };
}

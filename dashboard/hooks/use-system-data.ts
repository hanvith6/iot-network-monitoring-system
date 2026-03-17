import { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { ESP32Payload, SystemData, AlarmLog } from '@/lib/types';

// CONFIGURATION
const MQTT_BROKER = 'wss://test.mosquitto.org:8081';
const TOPIC = 'drainage/data';

export function useSystemData() {
    const [isLive, setIsLive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Initial State
    const [data, setData] = useState<SystemData>({
        flowRate: 0,
        waterLevel: 0,
        riseRate: 0,
        eta: null,
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
            // Live MQTT Mode
            const clientId = 'client-' + Math.random().toString(16).substr(2, 8);
            client = mqtt.connect(MQTT_BROKER, {
                clientId,
                keepalive: 60,
                protocolId: 'MQTT',
                protocolVersion: 4,
                clean: true,
                reconnectPeriod: 1000,
                connectTimeout: 30 * 1000,
            });

            client.on('connect', () => {
                console.log('Connected to MQTT Broker');
                setIsConnected(true);
                client?.subscribe(TOPIC, (err) => {
                    if (err) console.error('Subscription error:', err);
                });
            });

            client.on('message', (topic, message) => {
                try {
                    const payload = JSON.parse(message.toString()) as ESP32Payload;
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString();

                    const newData: SystemData = {
                        flowRate: payload.flow_lpm,
                        waterLevel: payload.water_level_cm,
                        riseRate: payload.rise_rate_cm_per_min,
                        eta: payload.overflow_eta_min,
                        status: payload.state,
                        alertLevel: payload.alert_level,
                        batteryLevel: payload.battery_level,
                        timestamp: timeStr
                    };

                    setData(newData);
                    setHistory(prev => {
                        const newHistory = [...prev, { ...newData, time: timeStr }];
                        if (newHistory.length > 20) newHistory.shift();
                        return newHistory;
                    });

                    // Add to Alarms if not Normal
                    if (newData.alertLevel !== "NORMAL") {
                        setAlarms(prev => {
                            // Avoid duplicate consecutive alarms for cleanliness
                            if (prev.length > 0 && prev[prev.length - 1].message === newData.status && prev[prev.length - 1].timestamp === timeStr) return prev;

                            const newAlarm: AlarmLog = {
                                id: Math.random().toString(36).substr(2, 9),
                                timestamp: timeStr,
                                type: newData.status,
                                severity: newData.alertLevel,
                                message: `System state changed to ${newData.status}`
                            };
                            return [newAlarm, ...prev].slice(0, 50); // Keep last 50
                        });
                    }

                } catch (e) {
                    console.error("Failed to parse MQTT message", e);
                }
            });

            client.on('error', (err) => {
                console.error('MQTT Error: ', err);
                setIsConnected(false);
            });

            client.on('offline', () => {
                setIsConnected(false);
            });

        } else {
            // Simulation Mode 
            interval = setInterval(() => {
                setData((prev) => {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString();

                    // Simulation Logic
                    let newFlow = Math.max(0, prev.flowRate + (Math.random() * 2 - 1));
                    let newWaterLevel = Math.max(0, Math.min(60, prev.waterLevel + (Math.random() * 5 - 2.5)));

                    if (Math.random() > 0.95) newWaterLevel += 8; // Random surge

                    // Logic derived from Firmware
                    let status: SystemData["status"] = "NORMAL";
                    let alertLevel: SystemData["alertLevel"] = "NORMAL";

                    if (newWaterLevel > 45) {
                        status = "OVERFLOW_RISK";
                        alertLevel = "CRITICAL";
                    } else if (newWaterLevel > 35) {
                        status = "PARTIAL_BLOCK";
                        alertLevel = "ALERT";
                    } else if (newWaterLevel > 20 && newFlow < 2) {
                        status = "EARLY_SEDIMENTATION";
                        alertLevel = "WARNING";
                    }

                    // Simulated Calculations
                    const riseRate = parseFloat((newWaterLevel - prev.waterLevel).toFixed(2));
                    let eta: number | null = null;
                    if (riseRate > 0.5) {
                        eta = parseFloat(((50 - newWaterLevel) / riseRate).toFixed(1));
                        if (eta < 0) eta = null;
                    }

                    const newData: SystemData = {
                        flowRate: parseFloat(newFlow.toFixed(1)),
                        waterLevel: parseFloat(newWaterLevel.toFixed(1)),
                        riseRate: riseRate,
                        eta: eta,
                        status: status,
                        alertLevel: alertLevel,
                        batteryLevel: 85, // Simulated battery
                        timestamp: timeStr,
                    };

                    setHistory((prevHistory) => {
                        const newHistory = [...prevHistory, { ...newData, time: timeStr }];
                        if (newHistory.length > 20) newHistory.shift();
                        return newHistory;
                    });

                    // Add to Alarms
                    if (newData.alertLevel !== "NORMAL") {
                        // Only add random alarms occasionally in sim mode to avoid spam
                        if (Math.random() > 0.7) {
                            setAlarms(prev => {
                                const newAlarm: AlarmLog = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    timestamp: timeStr,
                                    type: newData.status,
                                    severity: newData.alertLevel,
                                    message: `Simulated Alert: ${newData.status}`
                                };
                                return [newAlarm, ...prev].slice(0, 50);
                            });
                        }
                    }

                    return newData;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (client) client.end();
            setIsConnected(false);
        };
    }, [isLive]);

    return {
        data,
        history,
        alarms,
        isLive,
        setIsLive,
        isConnected
    };
}

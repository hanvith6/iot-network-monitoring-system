"use client";

import { useEffect, useState } from "react";
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
    Wifi, WifiOff, Radio, Droplets, Activity, TrendingUp,
    Zap, FlaskConical, ThermometerSun, Battery, Clock,
    AlertTriangle, CheckCircle2, Gauge,
} from "lucide-react";
import { useSystemData } from "@/hooks/use-system-data";
import { AlarmLogTable } from "@/components/dashboard/AlarmLogTable";
import { SoundAlerter } from "@/components/dashboard/SoundAlerter";
import { BatteryIndicator } from "@/components/dashboard/BatteryIndicator";
import { GaugeWidget } from "@/components/dashboard/GaugeWidget";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";
import { SystemData } from "@/lib/types";

// ── Alert style map ──────────────────────────────────────────────────────────
const ASTYLE = {
    NORMAL:   { text: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/25" },
    WARNING:  { text: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/25"   },
    ALERT:    { text: "text-orange-400",  bg: "bg-orange-500/10",   border: "border-orange-500/25"  },
    CRITICAL: { text: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/25"     },
};

const STATE_DESC: Record<SystemData["status"], string> = {
    NORMAL:               "All parameters within normal operating range",
    EARLY_SEDIMENTATION:  "Sediment accumulation detected — reduced flow capacity",
    PARTIAL_BLOCK:        "Partial blockage confirmed — maintenance required",
    OVERFLOW_RISK:        "CRITICAL: Overflow imminent — immediate action required",
};

// ── Inline chart components ──────────────────────────────────────────────────
function AreaCard({
    title, data, dataKey, color, unit = "",
}: {
    title: string; data: any[]; dataKey: string; color: string; unit?: string;
}) {
    const latest = data.length > 0 ? data[data.length - 1][dataKey] : null;
    return (
        <div className="bg-[#0d1f2d] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{title}</h3>
                {latest !== null && (
                    <span className="text-xs font-mono text-white/40">
                        {Number(latest).toFixed(1)}{unit && ` ${unit}`}
                    </span>
                )}
            </div>
            <div className="h-[175px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <defs>
                            <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                            dataKey="time"
                            stroke="rgba(255,255,255,0.15)"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.15)"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            width={30}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#050c14",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "11px",
                                color: "#e3f2fd",
                            }}
                            labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#g-${dataKey})`}
                            dot={false}
                            activeDot={{ r: 3, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function BarCard({
    title, data, dataKey, color,
}: {
    title: string; data: any[]; dataKey: string; color: string;
}) {
    return (
        <div className="bg-[#0d1f2d] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">{title}</h3>
            <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="rgba(255,255,255,0.15)"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.15)"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#050c14",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "11px",
                                color: "#e3f2fd",
                            }}
                        />
                        <Bar dataKey={dataKey} fill={color} fillOpacity={0.75} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { data, history, alarms, isLive, setIsLive, isConnected } = useSystemData();
    const [clockTime, setClockTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setClockTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const astyle = ASTYLE[data.alertLevel] ?? ASTYLE.NORMAL;

    const etaColor =
        data.eta === null       ? "text-white/25"
        : data.eta < 5          ? "text-red-400"
        : data.eta < 15         ? "text-orange-400"
        : data.eta < 30         ? "text-amber-400"
                                : "text-emerald-400";

    const waterAlertLevel: SystemData["alertLevel"] =
        data.waterLevel >= 40 ? "CRITICAL"
        : data.waterLevel >= 35 ? "ALERT"
        : data.waterLevel >= 20 ? "WARNING"
        : "NORMAL";

    const flowAlertLevel: SystemData["alertLevel"] =
        data.flowRate < 0.5 && data.waterLevel > 20 ? "ALERT"
        : data.flowRate < 2.0 && data.waterLevel > 20 ? "WARNING"
        : "NORMAL";

    const flowIdxLevel: SystemData["alertLevel"] =
        data.flowIndex < 0.3 ? "CRITICAL"
        : data.flowIndex < 0.5 ? "ALERT"
        : data.flowIndex < 0.7 ? "WARNING"
        : "NORMAL";

    return (
        <div className="p-4 md:p-5 space-y-4 min-h-screen">
            <SoundAlerter alertLevel={data.alertLevel} />

            {/* ── Control Bar ──────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1f2d] border border-white/[0.07] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div>
                        <h1 className="text-white font-bold text-sm leading-none">Live Telemetry</h1>
                        <p className="text-white/30 text-[10px] mt-0.5">
                            Real-Time Drainage Monitoring System
                        </p>
                    </div>
                    <div className="h-7 w-px bg-white/[0.08] hidden sm:block" />
                    <BatteryIndicator percentage={data.batteryLevel} />
                    <div className="flex items-center gap-1.5">
                        <span
                            className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isLive && isConnected
                                    ? "bg-emerald-400 animate-pulse"
                                    : isLive
                                    ? "bg-red-400 animate-pulse"
                                    : "bg-white/20"
                            )}
                        />
                        <span className="text-[10px] text-white/35 hidden sm:block">
                            {isLive ? (isConnected ? "MQTT Connected" : "Connecting…") : "Simulation Mode"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-white/20 text-xs font-mono hidden md:block">
                        {clockTime.toLocaleTimeString()}
                    </span>
                    <div className="flex items-center gap-0.5 bg-black/30 p-1 rounded-lg border border-white/[0.06]">
                        <button
                            onClick={() => setIsLive(false)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                !isLive ? "bg-white/10 text-white" : "text-white/35 hover:text-white/70"
                            )}
                        >
                            Simulation
                        </button>
                        <button
                            onClick={() => setIsLive(true)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                                isLive
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-white/35 hover:text-white/70"
                            )}
                        >
                            Live MQTT
                            {isLive
                                ? isConnected
                                    ? <Wifi className="h-3 w-3" />
                                    : <WifiOff className="h-3 w-3 text-red-300 animate-pulse" />
                                : <Radio className="h-3 w-3" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 8 KPI Cards ─────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                    title="Water Level"
                    value={data.waterLevel.toFixed(1)}
                    unit="cm"
                    icon={Droplets}
                    alertLevel={waterAlertLevel}
                    subtitle={`${data.fillPercent.toFixed(0)}% of 45 cm pipe`}
                />
                <MetricCard
                    title="Fill Level"
                    value={data.fillPercent.toFixed(1)}
                    unit="%"
                    icon={Gauge}
                    alertLevel={
                        data.fillPercent >= 89 ? "CRITICAL"
                        : data.fillPercent >= 78 ? "ALERT"
                        : data.fillPercent >= 44 ? "WARNING"
                        : "NORMAL"
                    }
                    subtitle="Pipe capacity used"
                />
                <MetricCard
                    title="Flow Rate"
                    value={data.flowRate.toFixed(1)}
                    unit="L/min"
                    icon={Activity}
                    alertLevel={flowAlertLevel}
                    subtitle={`Index: ${data.flowIndex.toFixed(3)}`}
                />
                <MetricCard
                    title="Rise Rate"
                    value={data.riseRate.toFixed(2)}
                    unit="cm/min"
                    icon={TrendingUp}
                    alertLevel={
                        data.riseRate > 1.5 ? "CRITICAL"
                        : data.riseRate > 0.5 ? "WARNING"
                        : "NORMAL"
                    }
                    subtitle={data.riseRate > 0 ? "Level rising" : "Level stable / falling"}
                />
                <MetricCard
                    title="Turbidity"
                    value={data.turbidityStatus}
                    icon={ThermometerSun}
                    alertLevel={
                        data.turbidityStatus === "TURBID" ? "ALERT"
                        : data.turbidityStatus === "MODERATE" ? "WARNING"
                        : "NORMAL"
                    }
                    subtitle={`RAW: ${data.turbidityRaw}`}
                />
                <MetricCard
                    title="TDS"
                    value={data.tdsPpm.toFixed(0)}
                    unit="ppm"
                    icon={FlaskConical}
                    alertLevel={
                        data.tdsStatus === "CONTAMINATED" ? "CRITICAL"
                        : data.tdsStatus === "MODERATE" ? "WARNING"
                        : "NORMAL"
                    }
                    subtitle={data.tdsStatus}
                />
                <MetricCard
                    title="Flow Index"
                    value={data.flowIndex.toFixed(3)}
                    icon={Zap}
                    alertLevel={flowIdxLevel}
                    subtitle="BDA blockage confidence"
                />
                <MetricCard
                    title="Battery"
                    value={data.batteryLevel}
                    unit="%"
                    icon={Battery}
                    alertLevel={
                        data.batteryLevel < 15 ? "CRITICAL"
                        : data.batteryLevel < 30 ? "WARNING"
                        : "NORMAL"
                    }
                    subtitle="ESP32 power supply"
                />
            </div>

            {/* ── Gauge + State + ETA ──────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Gauge */}
                <div className="bg-[#0d1f2d] border border-white/[0.07] rounded-xl p-5 flex flex-col items-center">
                    <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                        Pipe Fill Level
                    </h3>
                    <GaugeWidget
                        value={data.fillPercent}
                        label="Fill %"
                        alertLevel={data.alertLevel}
                    />
                    <div className="mt-3 w-full grid grid-cols-3 gap-2 text-center">
                        {[
                            { label: "DEPTH",   val: `${data.waterLevel.toFixed(1)} cm` },
                            { label: "PIPE",    val: "45 cm" },
                            { label: "REMAIN",  val: `${Math.max(0, 45 - data.waterLevel).toFixed(1)} cm` },
                        ].map(({ label, val }) => (
                            <div key={label} className="bg-black/20 rounded-lg p-2">
                                <p className="text-[9px] text-white/25 uppercase tracking-wider">{label}</p>
                                <p className="text-xs font-mono text-white/60 mt-0.5">{val}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System State */}
                <div
                    className={cn(
                        "border rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-center",
                        astyle.bg, astyle.border
                    )}
                >
                    {data.alertLevel === "NORMAL"
                        ? <CheckCircle2 className={cn("w-11 h-11", astyle.text)} />
                        : (
                            <AlertTriangle
                                className={cn(
                                    "w-11 h-11",
                                    astyle.text,
                                    data.alertLevel === "CRITICAL" && "animate-pulse"
                                )}
                            />
                        )
                    }
                    <div>
                        <h2 className={cn("text-xl font-bold leading-tight", astyle.text)}>
                            {data.status.replace(/_/g, " ")}
                        </h2>
                        <p className="text-white/40 text-xs mt-1.5 max-w-[180px]">
                            {STATE_DESC[data.status]}
                        </p>
                    </div>
                    <span
                        className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
                            astyle.text, astyle.border
                        )}
                    >
                        {data.alertLevel}
                    </span>
                </div>

                {/* ETA */}
                <div className="bg-[#0d1f2d] border border-white/[0.07] rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-center">
                    <Clock className="w-7 h-7 text-white/20" />
                    <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                            Time to Overflow
                        </p>
                        <span className={cn("text-5xl font-bold font-mono tabular-nums leading-none", etaColor)}>
                            {data.eta !== null ? Math.max(0, Math.floor(data.eta)) : "—"}
                        </span>
                        <p className="text-[11px] text-white/35 mt-1.5">
                            {data.eta !== null ? "minutes remaining" : "no overflow risk"}
                        </p>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-black/20 rounded-lg p-2">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">RISE RATE</p>
                            <p className="text-xs font-mono text-white/55 mt-0.5">
                                {data.riseRate.toFixed(2)} cm/min
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">HEADROOM</p>
                            <p className="text-xs font-mono text-white/55 mt-0.5">
                                {Math.max(0, 45 - data.waterLevel).toFixed(1)} cm
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Area Charts ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AreaCard title="Water Level" data={history} dataKey="waterLevel" color="#00c8ff" unit="cm" />
                <AreaCard title="Flow Rate"   data={history} dataKey="flowRate"   color="#00e676" unit="L/min" />
            </div>

            {/* ── Bar Charts ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BarCard title="Fill % History"   data={history} dataKey="fillPercent"   color="#ffb300" />
                <BarCard title="Turbidity (RAW)"  data={history} dataKey="turbidityRaw"  color="#ff6d00" />
                <BarCard title="Flow Index"        data={history} dataKey="flowIndex"     color="#c084fc" />
            </div>

            {/* ── Alarm Log ────────────────────────────────── */}
            <AlarmLogTable alarms={alarms} />

            {/* Footer */}
            <div className="border-t border-white/[0.05] pt-3 text-center">
                <p className="text-white/15 text-[10px] uppercase tracking-widest">
                    Dashboard Version 2 &nbsp;·&nbsp; Real-Time Drainage Monitoring System &nbsp;·&nbsp; GITAM University
                </p>
            </div>
        </div>
    );
}

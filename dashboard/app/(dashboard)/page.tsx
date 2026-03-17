"use client";

import { useSystemData } from "@/hooks/use-system-data";
import { RealTimeChart } from "@/components/dashboard/RealTimeChart";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { AlarmLogTable } from "@/components/dashboard/AlarmLogTable";
import { SoundAlerter } from "@/components/dashboard/SoundAlerter";
import { BatteryIndicator } from "@/components/dashboard/BatteryIndicator";
import { HeroSection } from "@/components/layout/HeroSection";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data, history, alarms, isLive, setIsLive, isConnected } = useSystemData();

  return (
    <div className="min-h-screen bg-background-dark">
      <TopNavBar />

      <main className="container mx-auto px-4 pb-20">
        <HeroSection />

        <div id="dashboard-content" className="space-y-10">
          {/* Control Bar & Connection Status */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[.02] p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-4">
              <h2 className="text-white text-2xl font-bold">Live Telemetry</h2>
              <div className="h-6 w-px bg-white/10"></div>
              {/* Battery Indicator */}
              <BatteryIndicator percentage={data.batteryLevel || 0} />
            </div>

            <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setIsLive(false)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  !isLive ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                Simulation
              </button>
              <button
                onClick={() => setIsLive(true)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  isLive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white/70"
                )}
              >
                Live MQTT
                {isLive && (
                  isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 animate-pulse text-red-300" />
                )}
              </button>
            </div>
          </div>

          {/* Row 1: Status Cards (Grid of 4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatusCard
              title="System Status"
              value={data.status}
              type="status"
              colorCode={data.status}
              iconName="activity"
            />
            <StatusCard
              title="Alert Level"
              value={data.alertLevel}
              type="alert"
              colorCode={data.alertLevel}
              iconName="alert"
            />
            <StatusCard
              title="Time to Overflow"
              value={data.eta === null ? "--" : `${data.eta} min`}
              type="status"
              colorCode={data.eta !== null && data.eta < 5 ? "CRITICAL" : "NORMAL"}
              iconName="waves" // Using waves for water related
            />
            <StatusCard
              title="Rise Rate"
              value={`${data.riseRate} cm/min`}
              type="status"
              colorCode={data.riseRate > 0.5 ? "WARNING" : "NORMAL"}
              iconName="activity"
            />
          </div>

          {/* Row 2: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RealTimeChart
              title="Flow Rate (L/min)"
              data={history}
              dataKey="flowRate"
              color="#4caf50" // Green
            />
            <RealTimeChart
              title="Water Level (cm)"
              data={history}
              dataKey="waterLevel"
              color="#2196f3" // Blue
            />
          </div>

          {/* Row 3: Analytics (Alarm Table) */}
          <div className="grid grid-cols-1">
            <AlarmLogTable alarms={alarms} />
          </div>
        </div>
      </main>

      {/* Invisible Components */}
      <SoundAlerter alertLevel={data.alertLevel} />

      {/* Footer */}
      <footer className="bg-background-dark/50 border-t border-white/10 mt-20 py-10 text-center">
        <p className="text-white/60 text-sm">© 2024 Real-Time Drainage Monitoring System. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

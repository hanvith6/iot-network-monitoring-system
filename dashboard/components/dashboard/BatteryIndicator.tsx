import { Battery, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react";

interface BatteryIndicatorProps {
    percentage: number; // 0-100
}

export function BatteryIndicator({ percentage }: BatteryIndicatorProps) {
    let Icon = Battery;
    let colorClass = "text-green-500";

    if (percentage <= 20) {
        Icon = BatteryWarning;
        colorClass = "text-red-500 animate-pulse";
    } else if (percentage <= 50) {
        Icon = BatteryLow;
        colorClass = "text-yellow-500";
    } else if (percentage <= 80) {
        Icon = BatteryMedium;
        colorClass = "text-blue-500";
    }

    return (
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10" title={`Battery Level: ${percentage}%`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
            <span className="text-sm font-medium text-white/80">{percentage}%</span>
        </div>
    );
}

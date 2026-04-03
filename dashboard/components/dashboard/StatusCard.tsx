import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Activity, Waves } from "lucide-react";

interface StatusCardProps {
    title: string;
    value: string;
    type: "status" | "alert";
    colorCode: string;
    iconName?: "waves" | "activity" | "alert" | "check";
}

export function StatusCard({ title, value, type, colorCode, iconName }: StatusCardProps) {
    // Map status codes to colors & icons
    const getStatusConfig = (code: string) => {
        const normalizedCode = code.toUpperCase();

        if (normalizedCode === "NORMAL") {
            return { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle };
        }
        if (["WARNING", "EARLY_SEDIMENTATION", "PARTIAL_BLOCK"].includes(normalizedCode)) {
            return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertTriangle };
        }
        if (["ALERT", "CRITICAL", "OVERFLOW_RISK"].includes(normalizedCode)) {
            return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: AlertTriangle };
        }

        return { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", icon: Activity };
    };

    const config = getStatusConfig(colorCode);
    const Icon = iconName === "waves" ? Waves : (iconName === "activity" ? Activity : config.icon);

    return (
        <div className={cn(
            "flex flex-1 gap-4 rounded-xl border p-6 flex-col hover:bg-white/[.08] transition-colors",
            "bg-white/[.05] border-white/10",
            config.border
        )}>
            <div className="flex items-center justify-between">
                <Icon className={cn("w-8 h-8", config.color)} />
                {type === "alert" && (
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold bg-black/40", config.color)}>
                        {colorCode}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <h2 className="text-white text-lg font-bold leading-tight">{title}</h2>
                <p className={cn("text-2xl font-mono tracking-tight", config.color)}>
                    {value.replace(/_/g, " ")}
                </p>
            </div>
        </div>
    );
}

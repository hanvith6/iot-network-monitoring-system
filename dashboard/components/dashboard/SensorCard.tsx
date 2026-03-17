import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SensorCardProps {
    title: string;
    value: string | number;
    unit: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "stable";
    status?: "normal" | "warning" | "critical";
    subtitle?: string;
}

export function SensorCard({
    title,
    value,
    unit,
    icon: Icon,
    trend,
    status = "normal",
    subtitle,
}: SensorCardProps) {
    const statusColors = {
        normal: "text-emerald-400",
        warning: "text-amber-400",
        critical: "text-rose-500",
    };

    const bgColors = {
        normal: "bg-emerald-400/10",
        warning: "bg-amber-400/10",
        critical: "bg-rose-500/10",
    };

    return (
        <Card className="hover:border-slate-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-full", bgColors[status])}>
                    <Icon className={cn("h-4 w-4", statusColors[status])} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                    {value}
                    <span className="text-sm font-normal text-slate-500 ml-1">
                        {unit}
                    </span>
                </div>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}

"use client";

import { useState } from "react";
import { Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlarmLog } from "@/lib/types";

interface AlarmLogTableProps {
    alarms: AlarmLog[];
}

export function AlarmLogTable({ alarms }: AlarmLogTableProps) {
    const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "WARNING">("ALL");

    const filteredAlarms = alarms.filter((alarm) => {
        if (filter === "ALL") return true;
        if (filter === "CRITICAL") return ["CRITICAL", "OVERFLOW_RISK", "ALERT"].includes(alarm.severity);
        if (filter === "WARNING") return ["WARNING", "EARLY_SEDIMENTATION", "PARTIAL_BLOCK"].includes(alarm.severity);
        return true;
    });

    const downloadCSV = () => {
        const headers = ["ID", "Timestamp", "Level", "Message"];
        const rows = filteredAlarms.map((a) => [a.id, a.timestamp, a.severity, a.message]);
        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "alarm_logs.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[.05] p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-white text-lg font-bold leading-tight">Alarm Logs</h2>
                <div className="flex gap-2">
                    {/* Filter Dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm">
                            <Filter className="w-4 h-4" />
                            <span>{filter === "ALL" ? "All Levels" : filter}</span>
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-white/10 bg-[#101b22] shadow-xl p-1 hidden group-hover:block z-20">
                            <button onClick={() => setFilter("ALL")} className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5 rounded-md">All Levels</button>
                            <button onClick={() => setFilter("CRITICAL")} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-md">Critical Only</button>
                            <button onClick={() => setFilter("WARNING")} className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-white/5 rounded-md">Warnings Only</button>
                        </div>
                    </div>

                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white/70">
                    <thead className="border-b border-white/10 text-white/50 bg-white/[0.02]">
                        <tr>
                            <th className="px-4 py-3 font-medium">Time</th>
                            <th className="px-4 py-3 font-medium">Level</th>
                            <th className="px-4 py-3 font-medium">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredAlarms.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-white/30 italic">
                                    No alarms found for this filter.
                                </td>
                            </tr>
                        ) : (
                            filteredAlarms.map((alarm) => (
                                <tr key={alarm.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{alarm.timestamp}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                ["CRITICAL", "OVERFLOW_RISK", "ALERT"].includes(alarm.severity)
                                                    ? "bg-red-500/20 text-red-400 border border-red-500/20"
                                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                                            )}
                                        >
                                            {alarm.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{alarm.message}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

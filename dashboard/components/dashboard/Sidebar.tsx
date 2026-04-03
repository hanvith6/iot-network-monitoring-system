"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waves, LayoutDashboard, Map, Settings, LogOut, Activity } from "lucide-react";
import { NavItem } from "@/components/dashboard/NavItem";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-60 flex-col border-r border-white/[0.06] bg-[#060e17] md:flex h-screen sticky top-0">
            {/* Logo */}
            <div className="flex h-16 items-center px-5 border-b border-white/[0.06] gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                    <Waves className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <span className="text-white font-bold text-sm leading-none">RTDMS</span>
                    <p className="text-white/30 text-[10px] mt-0.5">Drainage Monitor v2</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col justify-between p-3">
                <nav className="space-y-1">
                    <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 py-2">
                        Monitoring
                    </p>
                    <NavItem
                        href="/"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={pathname === "/"}
                    />
                    <NavItem
                        href="/checkpoints"
                        icon={Map}
                        label="Checkpoints"
                        active={pathname === "/checkpoints"}
                    />
                    <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 py-2 mt-3">
                        System
                    </p>
                    <NavItem
                        href="/settings"
                        icon={Settings}
                        label="Settings"
                        active={pathname === "/settings"}
                    />
                </nav>

                {/* Footer */}
                <div className="space-y-3">
                    {/* System status dot */}
                    <div className="flex items-center gap-2 px-3 py-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-white/30">System Online</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-2">
                        <Link
                            href="/login"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs font-medium"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}

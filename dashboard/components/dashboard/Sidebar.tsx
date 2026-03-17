"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Map, Settings, LogOut } from "lucide-react";
import { NavItem } from "@/components/dashboard/NavItem";

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950/50 backdrop-blur md:flex h-screen sticky top-0">
            <div className="flex h-16 items-center px-6 border-b border-slate-800">
                <div className="flex items-center gap-2 font-bold text-xl text-slate-100">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <span>Drainage<span className="text-blue-500">Monitor</span></span>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-between p-4">
                <nav className="space-y-2">
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
                    <NavItem
                        href="/settings"
                        icon={Settings}
                        label="Settings"
                        active={pathname === "/settings"}
                    />
                </nav>

                <div className="pt-4 border-t border-slate-800">
                    <Link
                        href="/login"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/10 transition-colors text-sm font-medium"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Link>
                </div>
            </div>
        </aside>
    );
}

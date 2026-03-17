import { Activity } from "lucide-react";

export function Header() {
    return (
        <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur supports-[backdrop-filter]:bg-slate-950/50 sticky top-0 z-50">
            <div className="container flex h-16 items-center px-4">
                <div className="flex items-center gap-2 font-bold text-xl text-slate-100">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <span>Drainage<span className="text-blue-500">Monitor</span></span>
                </div>
                <nav className="ml-auto flex gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        System Online
                    </div>
                </nav>
            </div>
        </header>
    );
}

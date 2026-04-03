"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Waves, ArrowRight, Loader2, Lock, Mail, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => router.push("/"), 1200);
    };

    return (
        <div className="min-h-screen bg-[#060e17] flex items-center justify-center p-4 relative overflow-hidden">

            {/* Background: grid + glow orbs */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div
                    className="absolute inset-0 opacity-100"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px), " +
                            "linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)",
                        backgroundSize: "44px 44px",
                    }}
                />
                <div
                    className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(0,200,255,0.07) 0%, transparent 65%)" }}
                />
                <div
                    className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(0,80,200,0.05) 0%, transparent 65%)" }}
                />
            </div>

            <div className="w-full max-w-[360px] relative z-10 space-y-6">

                {/* Branding */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20">
                        <Waves className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold tracking-tight">RTDMS</h1>
                        <p className="text-white/35 text-xs mt-0.5">Real-Time Drainage Monitoring System</p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-[#0d1f2d] border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/50">
                    <div className="mb-5">
                        <h2 className="text-white font-semibold text-base">Sign in</h2>
                        <p className="text-white/35 text-xs mt-0.5">Access the monitoring dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@gitam.edu"
                                    className={cn(
                                        "w-full bg-black/30 border border-white/[0.08] rounded-lg",
                                        "pl-9 pr-4 py-2.5 text-white text-sm",
                                        "placeholder:text-white/15",
                                        "focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15",
                                        "transition-all"
                                    )}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={cn(
                                        "w-full bg-black/30 border border-white/[0.08] rounded-lg",
                                        "pl-9 pr-4 py-2.5 text-white text-sm",
                                        "placeholder:text-white/15",
                                        "focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15",
                                        "transition-all"
                                    )}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/85 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group mt-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-white/[0.05] text-center">
                        <Link href="/register" className="text-[11px] text-white/25 hover:text-primary/70 transition-colors">
                            Don&apos;t have an account?{" "}
                            <span className="underline underline-offset-2">Register</span>
                        </Link>
                    </div>
                </div>

                {/* Status strip */}
                <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-white/25">System Online</span>
                    </div>
                    <span className="text-white/10 text-xs">·</span>
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] text-white/25">GITAM University</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

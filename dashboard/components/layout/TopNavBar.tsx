import Link from "next/link";
import { Waves, Menu } from "lucide-react";

export function TopNavBar() {
    return (
        <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-sm border-b border-white/10">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Waves className="w-8 h-8 text-primary" />
                        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                            Drainage Monitoring System
                        </h2>
                    </div>
                    <nav className="hidden md:flex flex-1 justify-end gap-8">
                        <div className="flex items-center gap-9">
                            <Link
                                href="#"
                                className="text-white text-sm font-medium hover:text-primary transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="#"
                                className="text-white/70 text-sm font-medium hover:text-primary transition-colors"
                            >
                                System Overview
                            </Link>
                            <Link
                                href="#"
                                className="text-white/70 text-sm font-medium hover:text-primary transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="#"
                                className="text-white/70 text-sm font-medium hover:text-primary transition-colors"
                            >
                                Team
                            </Link>
                            <Link
                                href="#"
                                className="text-white/70 text-sm font-medium hover:text-primary transition-colors"
                            >
                                Contact
                            </Link>
                        </div>
                    </nav>
                    <button className="md:hidden text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    );
}

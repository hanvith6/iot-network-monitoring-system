import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#060e17] text-white">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

export function HeroSection() {
    const scrollToDashboard = () => {
        const dashboardSection = document.getElementById("dashboard-content");
        if (dashboardSection) {
            dashboardSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="@container py-16 sm:py-24">
            <div className="@[480px]:p-4">
                <div
                    className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat @[480px]:gap-8 rounded-lg items-center justify-center px-4 py-10 text-center relative overflow-hidden"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(16, 27, 34, 0.8) 0%, rgba(16, 27, 34, 0.95) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBPWUVDSbMP7AvFEBBDc-8Vx-pc_4CRLrCbLo4N8lDqFZYz-EAM_fS9gP0jIMcgEZnDnri6B2LzfNnkAxVUj8QNDcxeSVQj7CV7C2w1-SaQo6Kl_kA5ZXVKO1Cn6Td1e2AWZ2DXx6u_fecpPvS6op0fZCGI0YMb2WDw_3opdW4repgXTPxucNr1IYsbBPVZOkMelLIzhW4M0oHfcXupVt9MByMwtNVcG23nvncCr3lY-6aQ8GbKM1QQx95NmzS1jREJsFC_DcRhZstc")',
                    }}
                >
                    <div className="flex flex-col gap-4 max-w-3xl z-10">
                        <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] @[480px]:text-5xl">
                            Real-Time Drainage Monitoring System
                        </h1>
                        <h2 className="text-white/80 text-base font-normal leading-normal @[480px]:text-lg">
                            Leveraging IoT for Smarter, Proactive Urban Water Management.
                        </h2>
                    </div>
                    <button
                        onClick={scrollToDashboard}
                        className="flex min-w-[84px] max-w-[480px] z-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 @[480px]:h-12 @[480px]:px-5 bg-primary text-white text-sm font-bold tracking-[0.015em] @[480px]:text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <span className="truncate">View Dashboard</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useRef } from "react";

interface SoundAlerterProps {
    alertLevel: string;
}

export function SoundAlerter({ alertLevel }: SoundAlerterProps) {
    const audioContextRef = useRef<AudioContext | null>(null);

    const playBeep = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Alert sound parameters
        osc.type = "square";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop pitch

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    };

    useEffect(() => {
        if (["CRITICAL", "OVERFLOW_RISK", "ALERT"].includes(alertLevel)) {
            // Play sound continuously every 2 seconds if critical
            const interval = setInterval(() => {
                playBeep();
            }, 2000);

            // Play immediately once
            playBeep();

            return () => clearInterval(interval);
        }
    }, [alertLevel]);

    return null; // Invisible component
}

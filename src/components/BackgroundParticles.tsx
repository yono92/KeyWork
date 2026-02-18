import React from "react";

const PARTICLE_COUNT = 20;

// 결정적(deterministic) 시드 값으로 hydration 안전하게 생성
function seededValue(index: number, offset: number): number {
    const x = Math.sin(index * 9301 + offset * 49297) * 49979;
    return x - Math.floor(x);
}

const r = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    left: `${r(seededValue(i, 1) * 100, 2)}%`,
    top: `${r(seededValue(i, 2) * 100, 2)}%`,
    size: `${r(2 + seededValue(i, 3) * 6, 1)}px`,
    opacity: r(0.03 + seededValue(i, 4) * 0.07, 4),
    duration: r(15 + seededValue(i, 5) * 30, 1),
    delay: r(-(seededValue(i, 6) * 30), 1),
}));

export default function BackgroundParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {particles.map((p, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-sky-400 dark:bg-sky-300"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        opacity: p.opacity,
                        animationName: "bgFloat",
                        animationDuration: `${p.duration}s`,
                        animationTimingFunction: "ease-in-out",
                        animationDelay: `${p.delay}s`,
                        animationIterationCount: "infinite",
                    }}
                />
            ))}
        </div>
    );
}

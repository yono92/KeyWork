import React from "react";

const PARTICLE_COUNT = 20;

// 결정적(deterministic) 시드 값으로 hydration 안전하게 생성
function seededValue(index: number, offset: number): number {
    const x = Math.sin(index * 9301 + offset * 49297) * 49979;
    return x - Math.floor(x);
}

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    left: `${seededValue(i, 1) * 100}%`,
    top: `${seededValue(i, 2) * 100}%`,
    size: 2 + seededValue(i, 3) * 6, // 2-8px
    opacity: 0.03 + seededValue(i, 4) * 0.07, // 0.03-0.1
    duration: 15 + seededValue(i, 5) * 30, // 15-45s
    delay: -(seededValue(i, 6) * 30), // 음수 딜레이로 즉시 분산
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
                        animation: `bgFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

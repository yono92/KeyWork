import React, { useEffect, useState } from "react";

interface Particle {
    id: number;
    x: number;
    y: number;
    angle: number;
    color: string;
}

interface ParticleEffectProps {
    x: number;
    y: number;
    color?: string;
}

const PARTICLE_COLORS = ["#38bdf8", "#22d3ee", "#818cf8", "#f472b6", "#fbbf24", "#34d399"];
const PARTICLE_COUNT = 7;

const ParticleEffect: React.FC<ParticleEffectProps> = ({ x, y, color }) => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const newParticles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            id: Date.now() + i,
            x,
            y,
            angle: (360 / PARTICLE_COUNT) * i + (Math.random() * 30 - 15),
            color: color ?? PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        }));
        setParticles(newParticles);

        const timer = setTimeout(() => setParticles([]), 500);
        return () => clearTimeout(timer);
    }, [x, y, color]);

    if (particles.length === 0) return null;

    return (
        <>
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute pointer-events-none animate-particle-burst"
                    style={{
                        left: `${p.x}px`,
                        top: `${p.y}px`,
                        ["--angle" as string]: `${p.angle}deg`,
                        backgroundColor: p.color,
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                    }}
                />
            ))}
        </>
    );
};

export default ParticleEffect;

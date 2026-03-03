import { useState, useCallback } from "react";

export interface ScorePopup {
    id: number;
    text: string;
    x: number;
    bottom: number;
}

export interface DustParticle {
    id: number;
    dx: number;
}

export interface ClearParticle {
    id: number;
    x: number;
    bottom: number;
    color: string;
    angle: number;
}

const GROUND_BOTTOM = 22;

/**
 * TypingRunner 파티클 시스템 — 점수 팝업, 먼지, 클리어 파티클, 화면 흔들림/히트 플래시
 */
export function useParticleSystem() {
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
    const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
    const [clearParticles, setClearParticles] = useState<ClearParticle[]>([]);
    const [isShaking, setIsShaking] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);

    const showScorePopup = useCallback((text: string, x: number) => {
        const id = Date.now() + Math.random();
        setScorePopups((prev) => [...prev, { id, text, x, bottom: GROUND_BOTTOM + 8 }]);
        setTimeout(() => {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
        }, 800);
    }, []);

    const spawnDust = useCallback(() => {
        const particles: DustParticle[] = Array.from({ length: 4 }, (_, i) => ({
            id: Date.now() + i,
            dx: (Math.random() - 0.5) * 30,
        }));
        setDustParticles(particles);
        setTimeout(() => setDustParticles([]), 400);
    }, []);

    const spawnClearParticles = useCallback((x: number, color: string) => {
        const newParticles: ClearParticle[] = Array.from({ length: 6 }, (_, i) => ({
            id: Date.now() + i + Math.random(),
            x,
            bottom: GROUND_BOTTOM + 4,
            color,
            angle: (360 / 6) * i + (Math.random() * 30 - 15),
        }));
        setClearParticles((prev) => [...prev, ...newParticles]);
        setTimeout(() => {
            setClearParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
        }, 500);
    }, []);

    const triggerShake = useCallback(() => {
        setIsShaking(true);
        setHitFlash(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => setHitFlash(false), 300);
    }, []);

    const resetParticles = useCallback(() => {
        setScorePopups([]);
        setDustParticles([]);
        setClearParticles([]);
        setIsShaking(false);
        setHitFlash(false);
    }, []);

    return {
        scorePopups,
        dustParticles,
        clearParticles,
        isShaking,
        hitFlash,
        showScorePopup,
        spawnDust,
        spawnClearParticles,
        triggerShake,
        resetParticles,
    };
}

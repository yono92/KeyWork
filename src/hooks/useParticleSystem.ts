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
    dy: number;
    size: number;
}

export interface ClearParticle {
    id: number;
    x: number;
    bottom: number;
    color: string;
    angle: number;
    size: number;
}

const GROUND_BOTTOM = 22;

/**
 * TypingRunner 파티클 시스템 — 점수 팝업, 먼지, 클리어 파티클, 화면 흔들림/히트 플래시, 콤보 글로우
 */
export function useParticleSystem() {
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
    const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
    const [clearParticles, setClearParticles] = useState<ClearParticle[]>([]);
    const [isShaking, setIsShaking] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [comboGlow, setComboGlow] = useState(false);
    const [hitZoom, setHitZoom] = useState(false);

    const showScorePopup = useCallback((text: string, x: number) => {
        const id = Date.now() + Math.random();
        setScorePopups((prev) => [...prev, { id, text, x, bottom: GROUND_BOTTOM + 8 }]);
        setTimeout(() => {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
        }, 800);
    }, []);

    const spawnDust = useCallback(() => {
        const particles: DustParticle[] = Array.from({ length: 8 }, (_, i) => ({
            id: Date.now() + i,
            dx: (Math.random() - 0.5) * 40,
            dy: -(Math.random() * 15 + 5),
            size: 3 + Math.random() * 3,
        }));
        setDustParticles(particles);
        setTimeout(() => setDustParticles([]), 500);
    }, []);

    const spawnClearParticles = useCallback((x: number, color: string) => {
        const newParticles: ClearParticle[] = Array.from({ length: 12 }, (_, i) => ({
            id: Date.now() + i + Math.random(),
            x,
            bottom: GROUND_BOTTOM + 4,
            color,
            angle: (360 / 12) * i + (Math.random() * 20 - 10),
            size: 4 + Math.random() * 5,
        }));
        setClearParticles((prev) => [...prev, ...newParticles]);
        setTimeout(() => {
            setClearParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
        }, 600);
    }, []);

    const triggerShake = useCallback(() => {
        setIsShaking(true);
        setHitFlash(true);
        setHitZoom(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => setHitFlash(false), 300);
        setTimeout(() => setHitZoom(false), 200);
    }, []);

    const triggerComboGlow = useCallback(() => {
        setComboGlow(true);
        setTimeout(() => setComboGlow(false), 800);
    }, []);

    const resetParticles = useCallback(() => {
        setScorePopups([]);
        setDustParticles([]);
        setClearParticles([]);
        setIsShaking(false);
        setHitFlash(false);
        setComboGlow(false);
        setHitZoom(false);
    }, []);

    return {
        scorePopups,
        dustParticles,
        clearParticles,
        isShaking,
        hitFlash,
        comboGlow,
        hitZoom,
        showScorePopup,
        spawnDust,
        spawnClearParticles,
        triggerShake,
        triggerComboGlow,
        resetParticles,
    };
}

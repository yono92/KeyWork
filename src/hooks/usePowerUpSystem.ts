import { useState, useRef } from "react";

/**
 * 파워업 효과 관리 — slow motion, shield, activeEffects 타이머
 */
export function usePowerUpSystem() {
    const [slowMotion, setSlowMotion] = useState(false);
    const [shield, setShield] = useState(false);
    const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
    const activeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const applyEffect = (effect: string, duration: number) => {
        if (activeTimersRef.current[effect]) {
            clearTimeout(activeTimersRef.current[effect]);
        }

        setActiveEffects((prev) => new Set(prev).add(effect));

        if (effect === "slow") setSlowMotion(true);
        if (effect === "shield") setShield(true);

        activeTimersRef.current[effect] = setTimeout(() => {
            setActiveEffects((prev) => {
                const next = new Set(prev);
                next.delete(effect);
                return next;
            });

            if (effect === "slow") setSlowMotion(false);
            if (effect === "shield") setShield(false);

            delete activeTimersRef.current[effect];
        }, duration);
    };

    const resetEffects = () => {
        Object.values(activeTimersRef.current).forEach(clearTimeout);
        activeTimersRef.current = {};
        setSlowMotion(false);
        setShield(false);
        setActiveEffects(new Set());
    };

    return {
        slowMotion,
        shield,
        activeEffects,
        applyEffect,
        resetEffects,
    };
}

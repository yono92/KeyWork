import { useState, useCallback, useRef } from "react";

interface FloatingText {
    id: number;
    text: string;
    color: string;
}

/**
 * Tetris 시각 효과 상태 — flashRows, shaking, scorePop, floatingTexts, levelGlow, impactRow
 */
export function useTetrisAnimations(animEnabled: boolean) {
    const [flashRows, setFlashRows] = useState<number[]>([]);
    const [shaking, setShaking] = useState(false);
    const [scorePop, setScorePop] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [levelGlow, setLevelGlow] = useState(false);
    const [hardDropDistance, setHardDropDistance] = useState(0);
    const [impactRow, setImpactRow] = useState<number | null>(null);
    const floatingIdRef = useRef(0);

    const triggerFlash = useCallback((rows: number[]) => {
        if (!animEnabled || rows.length === 0) return;
        setFlashRows(rows);
        setTimeout(() => setFlashRows([]), 700);
    }, [animEnabled]);

    const triggerShake = useCallback(() => {
        if (!animEnabled) return;
        setShaking(true);
        setTimeout(() => setShaking(false), 180);
    }, [animEnabled]);

    const triggerScorePop = useCallback(() => {
        if (!animEnabled) return;
        setScorePop(true);
        setTimeout(() => setScorePop(false), 300);
    }, [animEnabled]);

    const addFloatingText = useCallback((text: string, color: string) => {
        if (!animEnabled) return;
        const id = ++floatingIdRef.current;
        setFloatingTexts((prev) => [...prev, { id, text, color }]);
        setTimeout(() => setFloatingTexts((prev) => prev.filter((t) => t.id !== id)), 1200);
    }, [animEnabled]);

    const triggerLevelGlow = useCallback(() => {
        if (!animEnabled) return;
        setLevelGlow(true);
        setTimeout(() => setLevelGlow(false), 600);
    }, [animEnabled]);

    return {
        flashRows,
        shaking,
        scorePop,
        floatingTexts,
        levelGlow,
        hardDropDistance,
        setHardDropDistance,
        impactRow,
        setImpactRow,
        triggerFlash,
        triggerShake,
        triggerScorePop,
        addFloatingText,
        triggerLevelGlow,
    };
}

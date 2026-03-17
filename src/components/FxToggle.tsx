"use client";

import React, { useCallback } from "react";
import { Sparkles, SparklesIcon } from "lucide-react";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";

interface FxToggleProps {
    className?: string;
}

const PHOSPHOR_LABELS = { cyan: "C", green: "G", amber: "A" } as const;

const FxToggle: React.FC<FxToggleProps> = ({ className = "" }) => {
    const fxEnabled = useTypingStore((state) => state.fxEnabled);
    const toggleFx = useTypingStore((state) => state.toggleFx);
    const darkMode = useTypingStore((state) => state.darkMode);
    const phosphorColor = useTypingStore((state) => state.phosphorColor);
    const cyclePhosphorColor = useTypingStore((state) => state.cyclePhosphorColor);

    const handleClick = useCallback(() => {
        toggleFx();
    }, [toggleFx]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        cyclePhosphorColor();
    }, [cyclePhosphorColor]);

    return (
        <Button
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            variant="ghost"
            size="icon"
            className={`${className} text-slate-700 dark:text-slate-200 relative`}
            aria-label={fxEnabled ? "FX OFF" : "FX ON"}
            title={darkMode ? `Phosphor: ${phosphorColor} (right-click to cycle)` : undefined}
        >
            {fxEnabled ? (
                <Sparkles size={16} />
            ) : (
                <SparklesIcon size={16} className="opacity-40" />
            )}
            {fxEnabled && darkMode && (
                <span
                    className="absolute -top-0.5 -right-0.5 text-[7px] font-bold leading-none"
                    style={{ color: `var(--phosphor-color)` }}
                >
                    {PHOSPHOR_LABELS[phosphorColor]}
                </span>
            )}
        </Button>
    );
};

export default FxToggle;

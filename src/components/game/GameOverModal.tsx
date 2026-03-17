import React, { ReactNode } from "react";
import useTypingStore from "../../store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CoupangAffiliateSection from "../affiliate/CoupangAffiliateSection";

interface GameOverModalProps {
    title: string;
    badge?: ReactNode;
    primaryStat: ReactNode;
    stats: { label: string; value: string | number }[];
    buttons: { label: string; onClick: () => void; primary?: boolean }[];
    children?: ReactNode;
    isHighScore?: boolean;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
    title,
    badge,
    primaryStat,
    stats,
    buttons,
    children,
    isHighScore = false,
}) => {
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const fxEnabled = useTypingStore((s) => s.fxEnabled);

    return (
        <div className="absolute inset-0 flex items-center justify-center z-30"
            role="alertdialog"
            aria-labelledby="game-over-title"
            aria-modal="true"
            style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                animation: fxEnabled ? "game-over-curtain 0.8s ease-out forwards" : "tetris-fade-in 0.3s ease-out",
            }}
        >
            {fxEnabled && (
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 pointer-events-none"
                    style={{ animation: "game-ripple 0.6s ease-out forwards" }}
                    aria-hidden="true"
                />
            )}
            <Card
                className={`text-center w-full max-w-xs sm:max-w-sm mx-4 max-h-[90vh] overflow-y-auto ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"} relative`}
                style={{
                    animation: "game-celebration 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                }}
            >
                <CardContent className="px-5 py-5 sm:px-10 sm:py-8">
                <h2
                    id="game-over-title"
                    className="text-xl sm:text-3xl font-bold mb-1 text-[var(--retro-text)] font-pixel"
                    style={{ fontSize: "clamp(12px, 3vw, 18px)", lineHeight: 1.6 }}
                >
                    {title}
                </h2>

                {isHighScore && (
                    <p
                        className="font-pixel text-[var(--retro-game-warning)] mb-2"
                        style={{
                            fontSize: 8,
                            lineHeight: 1.6,
                            animation: "tetris-blink 0.6s ease-in-out infinite",
                        }}
                    >
                        &#9733; NEW HIGH SCORE &#9733;
                    </p>
                )}

                {badge}

                <div
                    className="border-t border-b py-3 my-3 border-[var(--retro-border-mid)]"
                >
                    {primaryStat}
                </div>

                <div
                    className="text-sm space-y-1.5 mb-5 text-[var(--retro-text)]/80"
                >
                    {stats.map((s, i) => (
                        <p
                            key={i}
                            style={fxEnabled ? { animation: `tetris-fade-in 0.3s ease-out ${0.1 + i * 0.08}s both` } : undefined}
                        >
                            {s.label}:{" "}
                            <span className="font-medium tabular-nums">{s.value}</span>
                        </p>
                    ))}
                </div>

                {children}
                <CoupangAffiliateSection />

                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
                    {buttons.map((btn, i) => (
                        <Button
                            key={i}
                            onClick={btn.onClick}
                            variant={btn.primary ? "default" : "outline"}
                            className={
                                btn.primary
                                    ? `px-5 py-2.5 sm:px-8 sm:py-3 font-medium text-sm sm:text-base ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`
                                    : `px-4 py-2.5 sm:px-6 sm:py-3 font-medium text-sm sm:text-base ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`
                            }
                        >
                            {btn.label}
                        </Button>
                    ))}
                </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default GameOverModal;

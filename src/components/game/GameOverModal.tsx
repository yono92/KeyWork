import React, { ReactNode } from "react";
import useTypingStore from "../../store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GameOverModalProps {
    title: string;
    badge?: ReactNode;
    primaryStat: ReactNode;
    stats: { label: string; value: string | number }[];
    buttons: { label: string; onClick: () => void; primary?: boolean }[];
    children?: ReactNode;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
    title,
    badge,
    primaryStat,
    stats,
    buttons,
    children,
}) => {
    const retroTheme = useTypingStore((s) => s.retroTheme);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
            <Card
                className={`text-center animate-panel-in w-full max-w-xs sm:max-w-sm mx-4 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}
            >
                <CardContent className="px-5 py-5 sm:px-10 sm:py-8">
                <h2
                    className="text-xl sm:text-3xl font-bold mb-1 text-[var(--retro-text)]"
                >
                    {title}
                </h2>

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
                        <p key={i}>
                            {s.label}:{" "}
                            <span className="font-medium tabular-nums">{s.value}</span>
                        </p>
                    ))}
                </div>

                {children}

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

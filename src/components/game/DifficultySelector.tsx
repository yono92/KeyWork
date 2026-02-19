import React from "react";
import useTypingStore from "../../store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DifficultySelectorProps {
    title: string;
    subtitle?: string;
    descriptions: Record<"easy" | "normal" | "hard", string>;
    onSelect: (difficulty: "easy" | "normal" | "hard") => void;
}

const COLORS = {
    easy: "border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10",
    normal: "border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/10",
    hard: "border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/10",
} as const;

const LABEL_COLORS = {
    easy: "text-emerald-400",
    normal: "text-sky-400",
    hard: "text-rose-400",
} as const;

const LABELS = { easy: "Easy", normal: "Normal", hard: "Hard" } as const;

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
    title,
    subtitle,
    descriptions,
    onSelect,
}) => {
    const retroTheme = useTypingStore((s) => s.retroTheme);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 z-30">
            <Card
                className={`text-center animate-panel-in w-full max-w-xs sm:max-w-sm mx-4 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}
            >
                <CardContent className="px-5 py-5 sm:px-10 sm:py-8">
                <h2
                    className="text-xl sm:text-3xl font-bold mb-1 text-[var(--retro-text)]"
                >
                    {title}
                </h2>
                {subtitle && (
                    <p
                        className="text-sm mb-4 sm:mb-6 text-[var(--retro-text)]/80"
                    >
                        {subtitle}
                    </p>
                )}
                <div className="flex flex-col gap-2.5 sm:gap-3">
                    {(["easy", "normal", "hard"] as const).map((d) => (
                        <Button
                            key={d}
                            onClick={() => onSelect(d)}
                            variant="outline"
                            className={`h-auto px-4 py-2.5 sm:px-6 sm:py-3 border-2 transition-all duration-200 cursor-pointer ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"} ${COLORS[d]}`}
                        >
                            <div className={`text-base sm:text-lg font-bold ${LABEL_COLORS[d]}`}>
                                {LABELS[d]}
                            </div>
                            <div className="text-xs mt-0.5 text-[var(--retro-text)]/80">
                                {descriptions[d]}
                            </div>
                        </Button>
                    ))}
                </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DifficultySelector;

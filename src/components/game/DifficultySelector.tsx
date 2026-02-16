import React from "react";
import useTypingStore from "../../store/store";

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
    const darkMode = useTypingStore((s) => s.darkMode);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
            <div
                className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                    darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}
            >
                <h2
                    className={`text-xl sm:text-3xl font-bold mb-1 ${
                        darkMode ? "text-white" : "text-slate-800"
                    }`}
                >
                    {title}
                </h2>
                {subtitle && (
                    <p
                        className={`text-sm mb-4 sm:mb-6 ${
                            darkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                    >
                        {subtitle}
                    </p>
                )}
                <div className="flex flex-col gap-2.5 sm:gap-3">
                    {(["easy", "normal", "hard"] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => onSelect(d)}
                            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${COLORS[d]} ${
                                darkMode ? "bg-white/[0.03]" : "bg-slate-50"
                            }`}
                        >
                            <div className={`text-base sm:text-lg font-bold ${LABEL_COLORS[d]}`}>
                                {LABELS[d]}
                            </div>
                            <div
                                className={`text-xs mt-0.5 ${
                                    darkMode ? "text-slate-400" : "text-slate-500"
                                }`}
                            >
                                {descriptions[d]}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DifficultySelector;

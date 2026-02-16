import React, { ReactNode } from "react";
import useTypingStore from "../../store/store";

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
    const darkMode = useTypingStore((s) => s.darkMode);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
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

                {badge}

                <div
                    className={`border-t border-b py-3 my-3 ${
                        darkMode ? "border-white/10" : "border-slate-200"
                    }`}
                >
                    {primaryStat}
                </div>

                <div
                    className={`text-sm space-y-1.5 mb-5 ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
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
                        <button
                            key={i}
                            onClick={btn.onClick}
                            className={
                                btn.primary
                                    ? "px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base"
                                    : `px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base ${
                                          darkMode
                                              ? "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5"
                                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                      }`
                            }
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GameOverModal;

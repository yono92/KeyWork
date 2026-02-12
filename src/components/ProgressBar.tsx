import React from "react";
import useTypingStore from "../store/store";

interface ProgressBarProps {
    trackWidth?: number;
    className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    trackWidth,
    className = "",
}) => {
    const progress = useTypingStore((state) => state.progress);

    return (
        <div
            className={`h-1.5 bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden mx-auto ${className}`}
            style={{ width: trackWidth ? `${trackWidth}px` : "100%" }}
        >
            <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                    width: `${progress}%`,
                    background:
                        "linear-gradient(90deg, #38bdf8 0%, #06b6d4 50%, #8b5cf6 100%)",
                    boxShadow: progress > 0 ? "0 0 8px rgba(56, 189, 248, 0.4)" : "none",
                }}
            ></div>
        </div>
    );
};

export default ProgressBar;

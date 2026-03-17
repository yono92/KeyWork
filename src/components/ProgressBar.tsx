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
            className={`h-3 overflow-hidden mx-auto border-2 border-[var(--retro-border-dark)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] dark:bg-[var(--retro-game-bg)] ${className}`}
            style={{ width: trackWidth ? `${trackWidth}px` : "100%" }}
        >
            <div
                className="h-full transition-all duration-300"
                style={{
                    width: `${progress}%`,
                    background: progress > 0
                        ? "repeating-linear-gradient(90deg, var(--retro-accent) 0px, var(--retro-accent) 4px, var(--retro-accent-2) 4px, var(--retro-accent-2) 8px)"
                        : "transparent",
                }}
            />
        </div>
    );
};

export default ProgressBar;

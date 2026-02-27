import React from "react";
import { Button } from "@/components/ui/button";

interface FallbackNoticeProps {
    message: string;
    sourceLabel: string;
    onRetry?: () => void;
    darkMode?: boolean;
    className?: string;
}

const FallbackNotice: React.FC<FallbackNoticeProps> = ({
    message,
    sourceLabel,
    onRetry,
    darkMode = false,
    className,
}) => {
    return (
        <div
            className={`flex items-center justify-between gap-3 px-3 py-2 text-xs sm:text-sm border rounded-lg ${
                darkMode
                    ? "bg-amber-500/10 border-amber-400/30 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-700"
            } ${className ?? ""}`}
            role="status"
            aria-live="polite"
        >
            <p className="font-medium">
                {message} <span className="opacity-80">({sourceLabel})</span>
            </p>
            {onRetry && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={onRetry}
                    className="h-7 px-2.5 text-xs"
                >
                    다시 시도
                </Button>
            )}
        </div>
    );
};

export default FallbackNotice;

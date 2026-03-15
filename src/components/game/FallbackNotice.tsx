import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface FallbackNoticeProps {
    message: string;
    onRetry?: () => void;
    darkMode?: boolean;
    className?: string;
    /** 자동 소멸 시간(ms). 0이면 소멸 안 함. 기본 6000 */
    autoDismissMs?: number;
}

const FallbackNotice: React.FC<FallbackNoticeProps> = ({
    message,
    onRetry,
    darkMode = false,
    className,
    autoDismissMs = 6000,
}) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setVisible(true);
        if (autoDismissMs <= 0) return;
        const timer = setTimeout(() => setVisible(false), autoDismissMs);
        return () => clearTimeout(timer);
    }, [message, autoDismissMs]);

    if (!visible) return null;

    return (
        <div
            className={`flex items-center justify-between gap-3 px-3 py-1.5 text-[11px] sm:text-xs border rounded-lg transition-opacity duration-300 ${
                darkMode
                    ? "bg-amber-500/10 border-amber-400/20 text-amber-300/80"
                    : "bg-amber-50/80 border-amber-200/60 text-amber-600"
            } ${className ?? ""}`}
            role="status"
            aria-live="polite"
        >
            <p>{message}</p>
            {onRetry && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        onRetry();
                        setVisible(false);
                    }}
                    className="h-6 px-2 text-[11px]"
                >
                    재연결
                </Button>
            )}
        </div>
    );
};

export default FallbackNotice;

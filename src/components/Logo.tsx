import React, { useId } from "react";

const Logo: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const gid = useId();

    return (
        <div className="flex items-center gap-2">
            <svg
                className="w-7 h-7 shrink-0"
                viewBox="0 0 28 28"
                fill="none"
            >
                <defs>
                    <linearGradient
                        id={gid}
                        x1="0"
                        y1="0"
                        x2="28"
                        y2="28"
                    >
                        <stop stopColor="#0ea5e9" />
                        <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
                {/* 키보드 본체 */}
                <rect
                    x="1.5"
                    y="6"
                    width="25"
                    height="16"
                    rx="3.5"
                    fill={`url(#${gid})`}
                    fillOpacity="0.1"
                    stroke={`url(#${gid})`}
                    strokeWidth="1.5"
                />
                {/* 상단 키 3개 */}
                <rect x="4.5" y="9" width="5" height="3.5" rx="1" fill={`url(#${gid})`} />
                <rect x="11.5" y="9" width="5" height="3.5" rx="1" fill={`url(#${gid})`} />
                <rect x="18.5" y="9" width="5" height="3.5" rx="1" fill={`url(#${gid})`} />
                {/* 스페이스바 */}
                <rect x="7" y="15" width="14" height="3.5" rx="1" fill={`url(#${gid})`} fillOpacity="0.5" />
            </svg>
            {!compact && (
                <span className="font-extrabold text-lg tracking-tight select-none">
                    <span className="bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent">
                        Key
                    </span>
                    <span className="text-slate-700 dark:text-slate-200">
                        Work
                    </span>
                </span>
            )}
        </div>
    );
};

export default Logo;

import React from "react";

const Logo: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    return (
        <div className="flex items-center gap-2 select-none">
            <svg
                className="h-6 w-6 shrink-0"
                viewBox="0 0 24 24"
                role="img"
                aria-label="KeyWork logo"
            >
                <rect x="1" y="1" width="22" height="22" fill="rgba(255,255,255,0.16)" />
                <rect x="1" y="1" width="22" height="22" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
                <rect x="2" y="2" width="20" height="20" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />

                <rect x="4" y="6" width="16" height="9" fill="rgba(255,255,255,0.16)" />
                <rect x="5" y="7" width="3" height="2" fill="#d9ecff" />
                <rect x="9" y="7" width="3" height="2" fill="#d9ecff" />
                <rect x="13" y="7" width="3" height="2" fill="#d9ecff" />
                <rect x="17" y="7" width="2" height="2" fill="#d9ecff" />
                <rect x="6" y="11" width="12" height="2" fill="#d9ecff" />

                <rect x="4" y="16.5" width="16" height="3.5" fill="rgba(255,255,255,0.28)" />
            </svg>

            {!compact ? (
                <div className="leading-none">
                    <p className="text-[12px] font-bold tracking-[0.08em] text-white">
                        KEYWORK
                    </p>
                    <p className="text-[9px] font-semibold tracking-[0.12em] text-slate-100/80">
                        TYPING STATION
                    </p>
                </div>
            ) : (
                <span className="sr-only">KeyWork</span>
            )}
        </div>
    );
};

export default Logo;

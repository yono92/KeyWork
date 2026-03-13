"use client";

interface LevelBadgeProps {
    level: number;
    progressPercent?: number;
    compact?: boolean;
}

export default function LevelBadge({ level, progressPercent = 0, compact = false }: LevelBadgeProps) {
    return (
        <div
            className={`inline-flex items-center gap-2 border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] ${
                compact ? "rounded-lg px-2 py-1" : "rounded-xl px-3 py-2"
            }`}
        >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--retro-accent)]/25 bg-[var(--retro-accent)]/12 text-xs font-black text-[var(--retro-accent)]">
                Lv
            </div>
            <div className="min-w-0">
                <p className={`${compact ? "text-sm" : "text-base"} font-black leading-none text-[var(--retro-text)]`}>
                    {level}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/45">
                    {progressPercent}% progress
                </p>
            </div>
        </div>
    );
}

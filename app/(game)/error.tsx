"use client";

import { useEffect } from "react";

export default function GameError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GameError]", error);
    }, [error]);

    return (
        <div
            role="alert"
            className="flex items-center justify-center h-full p-6"
        >
            <div className="text-center max-w-sm border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)] px-8 py-8">
                <h2 className="text-2xl font-bold mb-3 text-[var(--retro-text)]">
                    오류가 발생했습니다
                </h2>
                <p className="text-sm mb-5 text-[var(--retro-text)]/70">
                    게임 실행 중 문제가 발생했습니다.
                    <br />
                    아래 버튼을 눌러 다시 시도해 주세요.
                </p>
                <button
                    onClick={reset}
                    className="px-6 py-2.5 font-bold text-sm border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)] text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)] active:border-t-[var(--retro-border-dark)] active:border-l-[var(--retro-border-dark)] active:border-r-[var(--retro-border-light)] active:border-b-[var(--retro-border-light)]"
                >
                    다시 시도
                </button>
            </div>
        </div>
    );
}

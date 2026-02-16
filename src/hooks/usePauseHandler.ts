import { useEffect } from "react";

export function usePauseHandler(
    gameStarted: boolean,
    gameOver: boolean,
    setIsPaused: React.Dispatch<React.SetStateAction<boolean>>
): void {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && gameStarted && !gameOver) {
                setIsPaused((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [gameStarted, gameOver, setIsPaused]);
}

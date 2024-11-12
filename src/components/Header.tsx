import React, { useState } from "react";
import useTypingStore from "../store/store";

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const gameMode = useTypingStore((state) => state.gameMode);
    const setGameMode = useTypingStore((state) => state.setGameMode);

    const gameModes = [
        { id: "practice", name: "문장연습" },
        { id: "falling-words", name: "소나기" },
    ] as const;

    const handleGameModeSelect = (mode: "practice" | "falling-words") => {
        setGameMode(mode);
        setIsMenuOpen(false);
    };

    return (
        <header className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold">KeyWork</div>

            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-xl"
                >
                    {isMenuOpen ? "✕" : "☰"}
                </button>

                {isMenuOpen && (
                    <>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                            {gameModes.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() =>
                                        handleGameModeSelect(mode.id)
                                    }
                                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700
                                        ${
                                            gameMode === mode.id
                                                ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                                                : "text-gray-700 dark:text-gray-300"
                                        }`}
                                >
                                    {mode.name}
                                </button>
                            ))}
                        </div>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-20 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;

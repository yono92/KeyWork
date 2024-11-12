// components/FallingWordsGame.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import LanguageToggle from "./LanguageToggle"; // 언어 토글 컴포넌트 가져오기

interface Word {
    id: number;
    text: string;
    left: number;
    top: number;
}

const FallingWordsGame: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const language = useTypingStore((state) => state.language);
    const toggleLanguage = useTypingStore((state) => state.toggleLanguage);

    const [words, setWords] = useState<Word[]>([]);
    const [input, setInput] = useState<string>("");
    const [score, setScore] = useState<number>(0);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [level, setLevel] = useState<number>(1);
    const [lives, setLives] = useState<number>(3);
    const [levelUp, setLevelUp] = useState<boolean>(false);
    const [wordsMatched, setWordsMatched] = useState<number>(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const spawnInterval = Math.max(2000 - level * 150, 500);
    const fallSpeed = Math.min(1 + level * 0.5, 10);

    const spawnWord = useCallback((): void => {
        if (gameOver) return;

        const wordsList = wordsData[language];
        const word = wordsList[Math.floor(Math.random() * wordsList.length)];
        const gameArea = gameAreaRef.current;
        const maxLeft = gameArea ? gameArea.offsetWidth - 100 : 0;

        const newWord: Word = {
            id: Date.now(),
            text: word,
            left: Math.random() * maxLeft,
            top: -50,
        };

        setWords((curr) => [...curr, newWord]);
    }, [gameOver, language]);

    useEffect(() => {
        if (gameOver) return;

        const moveWords = setInterval(() => {
            setWords((currentWords) => {
                const updatedWords = currentWords.map((word) => ({
                    ...word,
                    top: word.top + fallSpeed,
                }));

                const remainingWords = updatedWords.filter((word) => {
                    if (word.top > window.innerHeight - 150) {
                        setLives((prevLives) => {
                            const newLives = Math.max(prevLives - 1, 0);
                            if (newLives === 0) {
                                setGameOver(true);
                            }
                            return newLives;
                        });
                        return false; // 단어가 화면 하단을 벗어나면 제거
                    }
                    return true;
                });

                return remainingWords;
            });
        }, 16);

        return () => clearInterval(moveWords);
    }, [fallSpeed, gameOver]);

    useEffect(() => {
        if (gameOver) return;

        const spawn = setInterval(spawnWord, spawnInterval);
        return () => clearInterval(spawn);
    }, [spawnWord, spawnInterval, gameOver]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setInput(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "Enter") {
            const value = input;
            const matchedWord = words.find((word) => value === word.text);

            if (matchedWord) {
                setInput("");

                requestAnimationFrame(() => {
                    setWords((curr) =>
                        curr.filter((word) => word.id !== matchedWord.id)
                    );

                    setScore(
                        (prevScore) => prevScore + matchedWord.text.length * 10
                    );
                    setWordsMatched((prevMatched) => {
                        const newMatched = prevMatched + 1;

                        if (newMatched >= level * 5) {
                            setLevel((prevLevel) => prevLevel + 1);
                            setLevelUp(true);
                            setTimeout(() => setLevelUp(false), 1000);
                            return 0;
                        }

                        return newMatched;
                    });
                });
            }
        }
    };

    const restartGame = (): void => {
        setWords([]);
        setScore(0);
        setLevel(1);
        setLives(3);
        setGameOver(false);
        setLevelUp(false);
        setWordsMatched(0);
        setInput("");
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <div
            ref={gameAreaRef}
            className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
        >
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800">
                <div className="absolute top-0 left-0 right-0 flex justify-between p-4 bg-gray-200 dark:bg-gray-700 bg-opacity-90">
                    <div className="text-xl font-bold">Score: {score}</div>
                    <div className="text-xl font-bold">Level: {level}</div>
                    <div className="text-xl font-bold">
                        Lives: {"❤️".repeat(lives)}
                    </div>
                </div>

                {levelUp && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-yellow-400 animate-bounce">
                        Level Up!
                    </div>
                )}

                {words.map((word) => (
                    <div
                        key={word.id}
                        className={`absolute text-lg font-bold transition-all ${
                            darkMode ? "text-white" : "text-gray-800"
                        }`}
                        style={{
                            left: `${word.left}px`,
                            top: `${word.top}px`,
                        }}
                    >
                        {word.text}
                    </div>
                ))}

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-200 dark:bg-gray-700 bg-opacity-90">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        className={`w-full p-3 text-lg rounded-lg outline-none transition-colors ${
                            darkMode
                                ? "bg-gray-800 text-white border-gray-600 focus:border-blue-500"
                                : "bg-white text-gray-800 border-gray-300 focus:border-blue-500"
                        } border-2`}
                        placeholder={
                            language === "korean" ? "" : "Type the word..."
                        }
                        autoComplete="off"
                    />
                </div>
            </div>
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                    <div
                        className={`text-center p-8 rounded-lg ${
                            darkMode ? "bg-gray-800" : "bg-white"
                        }`}
                    >
                        <h2
                            className={`text-3xl font-bold mb-4 ${
                                darkMode ? "text-white" : "text-gray-800"
                            }`}
                        >
                            Game Over!
                        </h2>
                        <p
                            className={`text-xl mb-4 ${
                                darkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                        >
                            Final Score: {score}
                        </p>
                        <button
                            onClick={restartGame}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            {language === "korean" ? "다시 하기" : "Play Again"}
                        </button>
                    </div>
                </div>
            )}
            <LanguageToggle
                language={language}
                toggleLanguage={toggleLanguage}
            />
        </div>
    );
};

export default FallingWordsGame;

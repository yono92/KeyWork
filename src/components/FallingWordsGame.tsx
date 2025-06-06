import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import LanguageToggle from "./LanguageToggle";


interface Word {
    id: number;
    text: string;
    left: number;
    top: number;
    type: "normal" | "life" | "slow" | "clear" | "shield" | "score";
    color?: string;
}

const ITEM_TYPES = {
    life: { chance: 0.03, color: "text-red-400" },
    slow: { chance: 0.03, color: "text-blue-400" },
    clear: { chance: 0.02, color: "text-purple-400" },
    shield: { chance: 0.02, color: "text-yellow-400" },
    score: { chance: 0.05, color: "text-green-400" },
} as const;

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
    const [combo, setCombo] = useState<number>(0);
    const [slowMotion, setSlowMotion] = useState<boolean>(false);
    const [shield, setShield] = useState<boolean>(false);
    const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
    const [lastTypedTime, setLastTypedTime] = useState<number>(Date.now());

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const spawnInterval =
        Math.max(2000 - level * 100, 300) * (slowMotion ? 1.5 : 1);
    const fallSpeed = Math.min(1 + level * 0.5, 10) * (slowMotion ? 0.5 : 1);

    const lifeLostRef = useRef(false);
    const activeTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

    const getRandomWord = (): string => {
        // 반환 타입 명시
        const wordsList = wordsData[language];
        if (!Array.isArray(wordsList) || wordsList.length === 0) {
            console.error("Invalid words data structure");
            return "";
        }
        return wordsList[Math.floor(Math.random() * wordsList.length)];
    };

    const updateActiveEffects = (effect: string, duration: number) => {
        if (activeTimersRef.current[effect]) {
            clearTimeout(activeTimersRef.current[effect]);
        }
        
        setActiveEffects((prev) => new Set(prev).add(effect));
        
        // 효과 시작 시 적용
        if (effect === "slow") setSlowMotion(true);
        if (effect === "shield") setShield(true);
        
        // 새 타이머 저장
        activeTimersRef.current[effect] = setTimeout(() => {
            setActiveEffects((prev) => {
                const next = new Set(prev);
                next.delete(effect);
                return next;
            });
            
            // 효과 종료 시 상태 되돌리기
            if (effect === "slow") setSlowMotion(false);
            if (effect === "shield") setShield(false);
            
            delete activeTimersRef.current[effect];
            console.log(`${effect} effect ended`);
        }, duration);
    };

    const spawnWord = useCallback((): void => {
        if (gameOver) return;

        const gameArea = gameAreaRef.current;
        const maxLeft = gameArea ? gameArea.offsetWidth - 100 : 0;

        const numWords = Math.min(1 + Math.floor(level / 2), 5); // 레벨에 따라 최대 5개 생성
        for (let i = 0; i < numWords; i++) {
            const wordText = getRandomWord();
            if (!wordText) continue;

            let wordType: Word["type"] = "normal";
            const random = Math.random();

            const itemChance = Math.min(0.05 + (level - 1) * 0.01, 0.2);

            if (random < itemChance) {
                const itemTypes: Word["type"][] = [
                    "life",
                    "slow",
                    "clear",
                    "shield",
                    "score",
                ];
                wordType =
                    itemTypes[Math.floor(Math.random() * itemTypes.length)];
            }

            const newWord: Word = {
                id: Date.now() + i, // 고유 ID 보장
                text: wordText,
                left: Math.random() * maxLeft,
                top: -50,
                type: wordType,
                color:
                    wordType !== "normal"
                        ? ITEM_TYPES[wordType].color
                        : undefined,
            };

            setWords((curr) => [...curr, newWord]);
        }
    }, [gameOver, language, level]);

    // 이모지와 함께 단어를 표시하는 컴포넌트
    const getItemEmoji = (type: Word["type"]) => {
        switch (type) {
            case "life":
                return "❤️";
            case "slow":
                return "🐌";
            case "clear":
                return "💫";
            case "shield":
                return "🛡️";
            case "score":
                return "💎";
            default:
                return "";
        }
    };

    const handleItemEffect = (type: Word["type"]) => {
        switch (type) {
            case "life":
                setLives((prev) => Math.min(prev + 1, 5));
                break;
            case "slow":
                setSlowMotion(true);
                updateActiveEffects("slow", 8000);
                break;
            case "clear":
                setWords((curr) => curr.filter((w) => w.type === "normal"));
                setScore((prev) => prev + 50 * level);
                break;
            case "shield":
                setShield(true);
                updateActiveEffects("shield", 5000);
                break;
            case "score":
                setScore((prev) => prev + 200 * level);
                setCombo((prev) => prev + 2);
                break;
        }
    };

    useEffect(() => {
        if (gameOver) return;

        const moveWords = setInterval(() => {
            setWords((currentWords) => {
                const updatedWords = currentWords.map((word) => ({
                    ...word,
                    top: word.top + fallSpeed,
                }));

                const bottomThreshold = window.innerHeight - 150;

                // 바닥에 닿은 일반 단어가 있는지 확인
                const bottomWords = updatedWords.filter(
                    (word) => word.top > bottomThreshold && word.type === "normal"
                );
                
                // 단어가 바닥에 닿고 쉴드가 없는 경우에만 라이프 감소
                if (bottomWords.length > 0 && !shield && !lifeLostRef.current) {
                    lifeLostRef.current = true;  // ref를 사용해 상태 저장
                    
                    // 타이머를 사용하여 다음 인터벌에서 플래그 초기화
                    setTimeout(() => {
                        lifeLostRef.current = false;
                    }, 500);
                    
                    setLives((prevLives) => {
                        const newLives = Math.max(prevLives - 1, 0);
                        if (newLives === 0) setGameOver(true);
                        return newLives;
                    });
                    setCombo(0);
                }

                // 바닥에 닿았거나 특수 아이템인 단어들은 제거
                return updatedWords.filter(
                    (word) => (word.top <= bottomThreshold || word.type !== "normal" || shield)
                );
            });
        }, 16);

        return () => clearInterval(moveWords);
    }, [fallSpeed, gameOver, shield]);

    useEffect(() => {
        if (gameOver) return;

        const spawn = setInterval(spawnWord, spawnInterval);
        return () => clearInterval(spawn);
    }, [spawnWord, spawnInterval, gameOver]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setInput(e.target.value);
    };

    const getLevelRequirements = (currentLevel: number) => ({
        scoreNeeded: currentLevel * 500,
        comboNeeded: currentLevel * 3,
    });

    const checkLevelUp = useCallback(() => {
        const requirements = getLevelRequirements(level);

        if (
            score >= requirements.scoreNeeded &&
            combo >= requirements.comboNeeded
        ) {
            setLevel((prev) => prev + 1);
            setLevelUp(true);
            setTimeout(() => setLevelUp(false), 1000);
        }
    }, [score, level, combo]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "Enter") {
            const value = input;
            const matchedWord = words.find((word) => value === word.text);

            if (matchedWord) {
                setLastTypedTime(Date.now());

                requestAnimationFrame(() => {
                    setWords((curr) =>
                        curr.filter((word) => word.id !== matchedWord.id)
                    );

                    setInput(""); // 인풋창 초기화

                    if (matchedWord.type !== "normal") {
                        handleItemEffect(matchedWord.type);
                    } else {
                        // 콤보 계산을 단순화하고 명확하게 수정
                        const newCombo = combo + 1;
                        setCombo(newCombo);
                        
                        let wordScore = matchedWord.text.length * 10;
                        const comboMultiplier = 1 + Math.min(newCombo * 0.2, 2);
                        wordScore *= comboMultiplier;

                        const timeSinceLastType = Date.now() - lastTypedTime;
                        if (timeSinceLastType < 500) wordScore *= 1.5;

                        setScore((prev) => prev + Math.round(wordScore));
                    }

                    checkLevelUp();
                });
            } else {
                setCombo(0);
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
        setCombo(0);
        setSlowMotion(false);
        setShield(false);
        setActiveEffects(new Set());
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

    const renderActiveEffects = () => (
        <div className="absolute top-14 right-4 flex gap-2">
            {Array.from(activeEffects).map((effect) => (
                <div
                    key={effect}
                    className="px-2 py-1 rounded bg-opacity-50 bg-gray-800 text-white"
                >
                    {effect === "slow" && "🐌"}
                    {effect === "shield" && "🛡️"}
                </div>
            ))}
        </div>
    );

    return (
        <div
            ref={gameAreaRef}
            className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
        >
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800">
                <div className="absolute top-0 left-0 right-0 flex justify-between p-4 bg-gray-200 dark:bg-gray-700 bg-opacity-90">
                    <div className="text-xl font-bold">
                        Score: {score}
                        {combo > 0 && (
                            <span className="ml-2 text-sm text-blue-500">
                                x{(1 + Math.min(combo * 0.2, 2)).toFixed(1)}
                            </span>
                        )}
                    </div>
                    <div className="text-xl font-bold">Level: {level}</div>
                    <div className="text-xl font-bold">
                        Life: {"❤️".repeat(lives)}
                    </div>
                </div>

                {renderActiveEffects()}

                {combo >= 3 && (
                    <div className="absolute top-14 left-4">
                        <div
                            className={`text-lg font-bold ${
                                combo >= 10
                                    ? "text-yellow-400"
                                    : combo >= 5
                                    ? "text-blue-400"
                                    : "text-green-400"
                            }`}
                        >
                            {combo} Combo!{" "}
                            {combo >= 15 ? " 🔥" : combo >= 3 ? " ⚡" : " ✨"}
                        </div>
                    </div>
                )}

                {levelUp && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-4xl font-bold text-yellow-400 animate-bounce">
                            Level Up! 🎯
                        </div>
                        <div className="text-lg text-blue-400 mt-2">
                            Next goal:{" "}
                            {getLevelRequirements(level + 1).scoreNeeded} points
                        </div>
                    </div>
                )}
                {words.map((word) => (
                    <div
                        key={word.id}
                        className={`absolute text-lg font-bold transition-all flex items-center gap-2 ${
                            word.type === "normal"
                                ? darkMode
                                    ? "text-white"
                                    : "text-gray-800"
                                : word.color
                        } ${
                            word.type !== "normal"
                                ? "animate-pulse shadow-lg rounded px-2 py-1 bg-opacity-20 " +
                                  (darkMode ? "bg-white" : "bg-gray-800")
                                : ""
                        }`}
                        style={{
                            left: `${word.left}px`,
                            top: `${word.top}px`,
                        }}
                    >
                        {word.type !== "normal" && (
                            <span className="mr-1">
                                {getItemEmoji(word.type)}
                            </span>
                        )}
                        <span>{word.text}</span>
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

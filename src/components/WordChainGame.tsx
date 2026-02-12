import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/wordchain-dict.json";

type SoundType = "submit" | "wrong" | "aiTurn" | "lifeLost" | "gameOver" | "win";

interface ChatMessage {
    id: number;
    text: string;
    sender: "player" | "ai";
    isValid: boolean;
}

const DIFFICULTY_CONFIG = {
    easy:   { timeLimit: 15, lives: 3 },
    normal: { timeLimit: 10, lives: 3 },
    hard:   { timeLimit: 7,  lives: 3 },
} as const;

const WordChainGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const language = useTypingStore((s) => s.language);
    const isMuted = useTypingStore((s) => s.isMuted);
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);

    const config = DIFFICULTY_CONFIG[difficulty];

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState<number>(config.lives);
    const [combo, setCombo] = useState(0);
    const [timer, setTimer] = useState<number>(config.timeLimit);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentChar, setCurrentChar] = useState(""); // 현재 시작해야 하는 글자
    const [isAiTurn, setIsAiTurn] = useState(false);
    const [playerWon, setPlayerWon] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const usedWordsRef = useRef<Set<string>>(new Set());
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const gameStartTimeRef = useRef(Date.now());
    const maxComboRef = useRef(0);
    const wordsTypedRef = useRef(0);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;
        try {
            if (!audioContextRef.current) audioContextRef.current = new AudioContext();
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") ctx.resume();
            const now = ctx.currentTime;

            switch (type) {
                case "submit": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(660, now);
                    osc.frequency.linearRampToValueAtTime(880, now + 0.08);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.08);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.08);
                    break;
                }
                case "wrong": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(200, now);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.15);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.15);
                    break;
                }
                case "aiTurn": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.linearRampToValueAtTime(550, now + 0.1);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.1);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.1);
                    break;
                }
                case "lifeLost": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.2);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.2);
                    break;
                }
                case "gameOver": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.5);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.5);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.5);
                    break;
                }
                case "win": {
                    for (let i = 0; i < 4; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        const offset = i * 0.12;
                        osc.frequency.setValueAtTime(523 + i * 130, now + offset);
                        gain.gain.setValueAtTime(0.15, now + offset);
                        gain.gain.linearRampToValueAtTime(0, now + offset + 0.12);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset); osc.stop(now + offset + 0.12);
                    }
                    break;
                }
            }
        } catch { /* ignore */ }
    }, [isMuted]);

    // 한글 두음법칙: 끝말잇기에서 마지막 글자의 변환 후보를 반환
    const getStartChars = (lastChar: string): string[] => {
        if (language !== "korean") return [lastChar.toLowerCase()];

        // 두음법칙 매핑 (마지막 글자 → 시작 가능 글자들)
        // 예: "럼" → ["럼", "넘"] 이 아니라, 마지막 글자 "력"이면 다음 단어는 "역"으로도 시작 가능
        const dueum: Record<string, string[]> = {
            "녀": ["여"], "뇨": ["요"], "뉴": ["유"], "니": ["이"],
            "랴": ["야"], "려": ["여"], "례": ["예"], "료": ["요"],
            "류": ["유"], "리": ["이"], "라": ["나"], "래": ["내"],
            "로": ["노"], "뢰": ["뇌"], "루": ["누"], "르": ["느"],
        };

        const chars = [lastChar];
        // lastChar 자체가 두음법칙 대상인 경우
        if (dueum[lastChar]) {
            chars.push(...dueum[lastChar]);
        }
        // 역방향: lastChar가 변환 결과인 경우 (예: "여"로 끝나면 "녀", "려"로 시작하는 단어도 허용)
        for (const [from, toList] of Object.entries(dueum)) {
            if (toList.includes(lastChar)) {
                chars.push(from);
            }
        }
        return [...new Set(chars)];
    };

    const getLastChar = (word: string): string => {
        if (language === "korean") {
            return word[word.length - 1];
        }
        return word[word.length - 1].toLowerCase();
    };

    const getFirstChar = (word: string): string => {
        if (language === "korean") {
            return word[0];
        }
        return word[0].toLowerCase();
    };

    const isChainValid = (lastChar: string, nextWord: string): boolean => {
        const validStarts = getStartChars(lastChar);
        const firstChar = getFirstChar(nextWord);
        return validStarts.includes(firstChar);
    };

    const isValidWord = (word: string): boolean => {
        const wordsList = wordsData[language] as string[];
        return wordsList.some((w) =>
            language === "korean" ? w === word : w.toLowerCase() === word.toLowerCase()
        );
    };

    const findAiWord = useCallback((startChar: string): string | null => {
        const wordsList = wordsData[language] as string[];
        const validStarts = getStartChars(startChar);

        const candidates = wordsList.filter((w) => {
            const first = getFirstChar(w);
            return validStarts.includes(first) && !usedWordsRef.current.has(w.toLowerCase());
        });

        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }, [language]);

    const addMessage = (text: string, sender: "player" | "ai", isValid: boolean) => {
        setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, sender, isValid }]);
    };

    const doAiTurn = useCallback((startChar: string) => {
        setIsAiTurn(true);
        setTimeout(() => {
            const aiWord = findAiWord(startChar);
            if (!aiWord) {
                // AI가 단어를 못 찾음 → 플레이어 승리
                addMessage(language === "korean" ? "...할 말이 없어요" : "...I give up", "ai", true);
                setPlayerWon(true);
                setGameOver(true);
                playSound("win");
                setIsAiTurn(false);
                return;
            }

            usedWordsRef.current.add(aiWord.toLowerCase());
            addMessage(aiWord, "ai", true);
            playSound("aiTurn");
            setCurrentChar(getLastChar(aiWord));
            setTimer(config.timeLimit);
            setIsAiTurn(false);
            if (inputRef.current) inputRef.current.focus();
        }, 1000 + Math.random() * 500);
    }, [findAiWord, language, config.timeLimit, playSound]);

    // 타이머
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || isAiTurn) return;

        timerIntervalRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    // 시간 초과 → 라이프 감소 + AI가 같은 글자로 단어를 제시
                    playSound("lifeLost");
                    setCombo(0);
                    setLives((l) => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setGameOver(true);
                            playSound("gameOver");
                        } else {
                            // AI가 단어를 대신 제시해서 게임 진행
                            doAiTurn(currentChar);
                        }
                        return Math.max(newLives, 0);
                    });
                    return config.timeLimit;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [gameStarted, gameOver, isPaused, isAiTurn, config.timeLimit, playSound, currentChar, doAiTurn]);

    // 채팅 스크롤
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // ESC 일시정지
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && gameStarted && !gameOver) {
                setIsPaused((p) => !p);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [gameStarted, gameOver]);

    useEffect(() => {
        if (!isPaused && !gameOver && !isAiTurn && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver, isAiTurn]);

    const handleSubmit = () => {
        if (isComposingRef.current || !input.trim() || isAiTurn) return;

        const word = input.trim();
        setInput("");
        if (inputRef.current) inputRef.current.value = "";

        // 연결 규칙 검증 (두음법칙 포함)
        if (currentChar && !isChainValid(currentChar, word)) {
            addMessage(word, "player", false);
            playSound("wrong");
            setCombo(0);
            return;
        }

        if (!isValidWord(word)) {
            addMessage(word, "player", false);
            playSound("wrong");
            setCombo(0);
            return;
        }

        if (usedWordsRef.current.has(word.toLowerCase())) {
            addMessage(word, "player", false);
            playSound("wrong");
            setCombo(0);
            return;
        }

        // 유효한 단어
        usedWordsRef.current.add(word.toLowerCase());
        addMessage(word, "player", true);
        playSound("submit");
        wordsTypedRef.current++;

        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > maxComboRef.current) maxComboRef.current = newCombo;

        // 점수 계산
        const timeBonus = timer / config.timeLimit;
        const comboMultiplier = 1 + Math.min(newCombo * 0.2, 2);
        const wordScore = Math.round(word.length * 10 * timeBonus * comboMultiplier);
        setScore((prev) => prev + wordScore);

        // AI 턴
        const nextChar = getLastChar(word);
        setCurrentChar(nextChar);
        doAiTurn(nextChar);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !isComposingRef.current && !e.nativeEvent.isComposing) {
            handleSubmit();
        }
    };

    const handleCompositionStart = () => { isComposingRef.current = true; };
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        setInput((e.target as HTMLInputElement).value);
    };

    const restartGame = (overrideDifficulty?: keyof typeof DIFFICULTY_CONFIG) => {
        const d = overrideDifficulty ?? difficulty;
        const cfg = DIFFICULTY_CONFIG[d];
        setScore(0);
        setLives(cfg.lives);
        setCombo(0);
        setTimer(cfg.timeLimit);
        setMessages([]);
        setInput("");
        setGameOver(false);
        setGameStarted(true);
        setIsPaused(false);
        setIsAiTurn(false);
        setPlayerWon(false);
        usedWordsRef.current.clear();
        gameStartTimeRef.current = Date.now();
        maxComboRef.current = 0;
        wordsTypedRef.current = 0;

        // AI가 먼저 시작
        setTimeout(() => {
            const wordsList = wordsData[language] as string[];
            const firstWord = wordsList[Math.floor(Math.random() * wordsList.length)];
            usedWordsRef.current.add(firstWord.toLowerCase());
            addMessage(firstWord, "ai", true);
            setCurrentChar(getLastChar(firstWord));
            setTimer(cfg.timeLimit);
            if (inputRef.current) inputRef.current.focus();
        }, 500);
    };

    const formatPlayTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}분 ${sec.toString().padStart(2, "0")}초`;
    };

    return (
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* 상단 바 */}
                <div className={`flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Score: <span className="tabular-nums">{score}</span>
                        {combo > 0 && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm text-sky-400">
                                x{(1 + Math.min(combo * 0.2, 2)).toFixed(1)}
                            </span>
                        )}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md ${
                        difficulty === "easy" ? "bg-emerald-500/20 text-emerald-400"
                        : difficulty === "normal" ? "bg-sky-500/20 text-sky-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                        {difficulty === "easy" ? "Easy" : difficulty === "normal" ? "Normal" : "Hard"}
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* 타이머 */}
                        <div className={`text-xs sm:text-lg font-bold tabular-nums ${
                            timer <= 3 ? "text-rose-400 animate-pulse" : darkMode ? "text-white" : "text-slate-800"
                        }`}>
                            ⏱️ {timer}s
                        </div>
                        {/* 라이프 */}
                        <div className={`text-sm sm:text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {"❤️".repeat(Math.max(lives, 0))}
                            {"🖤".repeat(Math.max(config.lives - lives, 0))}
                        </div>
                    </div>
                </div>

                {/* 현재 글자 힌트 */}
                {currentChar && gameStarted && !gameOver && (
                    <div className="flex justify-center py-2">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                            darkMode ? "bg-sky-500/15 text-sky-300 border border-sky-500/20" : "bg-sky-50 text-sky-600 border border-sky-200"
                        }`}>
                            {(() => {
                                const chars = getStartChars(currentChar);
                                if (language === "korean") {
                                    if (chars.length > 1) {
                                        return `"${chars.join('" 또는 "')}"(으)로 시작하는 단어`;
                                    }
                                    return `"${currentChar}"(으)로 시작하는 단어`;
                                }
                                return `Word starting with "${currentChar}"`;
                            })()}
                        </span>
                    </div>
                )}

                {/* 채팅 영역 */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === "player" ? "justify-end" : "justify-start"} animate-chat-bubble`}
                        >
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium ${
                                msg.sender === "ai"
                                    ? darkMode
                                        ? "bg-white/[0.08] text-white rounded-bl-md"
                                        : "bg-slate-100 text-slate-800 rounded-bl-md"
                                    : msg.isValid
                                        ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-md"
                                        : "bg-rose-500/80 text-white rounded-br-md line-through"
                            }`}>
                                {msg.sender === "ai" && <span className="mr-1.5">🤖</span>}
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isAiTurn && (
                        <div className="flex justify-start animate-chat-bubble">
                            <div className={`px-4 py-2.5 rounded-2xl rounded-bl-md text-sm ${
                                darkMode ? "bg-white/[0.08] text-white" : "bg-slate-100 text-slate-800"
                            }`}>
                                🤖 <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 입력 */}
                <div className={`p-2.5 sm:p-4 backdrop-blur-sm border-t ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className="flex gap-2 sm:gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
                            disabled={!gameStarted || isPaused || gameOver || isAiTurn}
                            className={`flex-1 px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                                darkMode
                                    ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                                    : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
                            } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50`}
                            placeholder={
                                isAiTurn
                                    ? (language === "korean" ? "AI 차례입니다..." : "AI's turn...")
                                    : currentChar
                                        ? (language === "korean"
                                            ? (() => {
                                                const chars = getStartChars(currentChar);
                                                return chars.length > 1
                                                    ? `"${chars.join('" / "')}"(으)로 시작하는 단어 입력`
                                                    : `"${currentChar}"(으)로 시작하는 단어 입력`;
                                            })()
                                            : `Type a word starting with "${currentChar}"`)
                                        : (language === "korean" ? "단어를 입력하세요..." : "Type a word...")
                            }
                            autoComplete="off"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!gameStarted || isPaused || gameOver || isAiTurn || !input.trim()}
                            className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-50"
                        >
                            Enter
                        </button>
                    </div>
                </div>
            </div>

            {/* 난이도 선택 */}
            {!gameStarted && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {language === "korean" ? "끝말잇기" : "Word Chain"}
                        </h2>
                        <p className={`text-sm mb-4 sm:mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {language === "korean" ? "난이도를 선택하세요" : "Select difficulty"}
                        </p>
                        <div className="flex flex-col gap-2.5 sm:gap-3">
                            {(["easy", "normal", "hard"] as const).map((d) => {
                                const colors = {
                                    easy: "border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10",
                                    normal: "border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/10",
                                    hard: "border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/10",
                                };
                                const labelColors = { easy: "text-emerald-400", normal: "text-sky-400", hard: "text-rose-400" };
                                const descriptions = {
                                    easy: language === "korean" ? `제한시간 ${DIFFICULTY_CONFIG.easy.timeLimit}초, 라이프 3개` : `${DIFFICULTY_CONFIG.easy.timeLimit}s time, 3 lives`,
                                    normal: language === "korean" ? `제한시간 ${DIFFICULTY_CONFIG.normal.timeLimit}초, 라이프 3개` : `${DIFFICULTY_CONFIG.normal.timeLimit}s time, 3 lives`,
                                    hard: language === "korean" ? `제한시간 ${DIFFICULTY_CONFIG.hard.timeLimit}초, 라이프 3개` : `${DIFFICULTY_CONFIG.hard.timeLimit}s time, 3 lives`,
                                };
                                return (
                                    <button
                                        key={d}
                                        onClick={() => { setDifficulty(d); restartGame(d); }}
                                        className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${colors[d]} ${
                                            darkMode ? "bg-white/[0.03]" : "bg-slate-50"
                                        }`}
                                    >
                                        <div className={`text-base sm:text-lg font-bold ${labelColors[d]}`}>
                                            {d === "easy" ? "Easy" : d === "normal" ? "Normal" : "Hard"}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            {descriptions[d]}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 일시정지 */}
            {isPaused && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className="text-center">
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">PAUSED</h2>
                        <p className="text-sm sm:text-lg text-slate-300">
                            {language === "korean" ? "ESC를 눌러 계속" : "Press ESC to continue"}
                        </p>
                    </div>
                </div>
            )}

            {/* 게임 오버 */}
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {playerWon
                                ? (language === "korean" ? "승리!" : "You Win!")
                                : (language === "korean" ? "Game Over!" : "Game Over!")}
                        </h2>
                        {playerWon && (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">🏆</p>
                        )}

                        <div className={`border-t border-b py-3 my-3 ${darkMode ? "border-white/10" : "border-slate-200"}`}>
                            <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                                Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                            </p>
                        </div>

                        <div className={`text-sm space-y-1.5 mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <p>{language === "korean" ? "입력 단어" : "Words typed"}: <span className="font-medium tabular-nums">{wordsTypedRef.current}{language === "korean" ? "개" : ""}</span></p>
                            <p>{language === "korean" ? "최대 콤보" : "Max combo"}: <span className="font-medium tabular-nums">{maxComboRef.current}</span></p>
                            <p>{language === "korean" ? "플레이 시간" : "Play time"}: <span className="font-medium tabular-nums">{formatPlayTime(Date.now() - gameStartTimeRef.current)}</span></p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
                            <button
                                onClick={() => restartGame()}
                                className="px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base"
                            >
                                {language === "korean" ? "다시 하기" : "Play Again"}
                            </button>
                            <button
                                onClick={() => { restartGame(); setGameStarted(false); }}
                                className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base ${
                                    darkMode
                                        ? "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                            >
                                {language === "korean" ? "난이도 변경" : "Change Difficulty"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordChainGame;

import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";

type SoundType = "submit" | "wrong" | "aiTurn" | "lifeLost" | "gameOver" | "win";

interface ChatMessage {
    id: number;
    text: string;
    sender: "player" | "ai";
    isValid: boolean;
    definition?: string | null;
}

interface KrdictValidationResult {
    exists: boolean;
    definition: string | null;
}

interface KrdictCandidatesResult {
    words: string[];
}

const KOREAN_START_POOL = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
const HANGUL_WORD_REGEX = /^[가-힣]{2,}$/;

const DIFFICULTY_CONFIG = {
    easy:   { timeLimit: 20, lives: 3 },
    normal: { timeLimit: 15, lives: 3 },
    hard:   { timeLimit: 10, lives: 3 },
} as const;

const WordChainGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const language = useTypingStore((s) => s.language);
    const setLanguage = useTypingStore((s) => s.setLanguage);
    const isMuted = useTypingStore((s) => s.isMuted);

    const config = DIFFICULTY_CONFIG.normal;

    const [gameStarted, setGameStarted] = useState(true);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState<number>(config.lives);
    const [combo, setCombo] = useState(0);
    const [timer, setTimer] = useState<number>(config.timeLimit);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentChar, setCurrentChar] = useState("");
    const [isAiTurn, setIsAiTurn] = useState(false);
    const [playerWon, setPlayerWon] = useState(false);
    const [isValidatingWord, setIsValidatingWord] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const usedWordsRef = useRef<Set<string>>(new Set());
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const aiTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialAiWordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aiTurnPendingRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());
    const maxComboRef = useRef(0);
    const wordsTypedRef = useRef(0);
    const currentCharRef = useRef("");
    const doAiTurnRef = useRef<(startChar: string) => void>(() => {});

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

    const getStartChars = (lastChar: string): string[] => {
        // Two-sound rule candidates (ASCII-safe unicode escapes).
        const dueum: Record<string, string[]> = {
            "\uB77C": ["\uB098"], // 라 -> 나
            "\uB7B4": ["\uB0B4"], // 래 -> 내
            "\uB7B5": ["\uC57D"], // 략 -> 약
            "\uB7C9": ["\uC591"], // 량 -> 양
            "\uB824": ["\uC5EC"], // 려 -> 여
            "\uB840": ["\uC608"], // 례 -> 예
            "\uB85C": ["\uB178"], // 로 -> 노
            "\uB8CC": ["\uC694"], // 료 -> 요
            "\uB958": ["\uC720"], // 류 -> 유
            "\uB974": ["\uB290"], // 르 -> 느
            "\uB9AC": ["\uC774"], // 리 -> 이
        };

        const chars = [lastChar];
        if (dueum[lastChar]) chars.push(...dueum[lastChar]);

        // Allow reverse pair too, so users are not over-restricted.
        for (const [from, toList] of Object.entries(dueum)) {
            if (toList.includes(lastChar)) chars.push(from);
        }

        return [...new Set(chars)];
    };

    const getLastChar = (word: string): string => word[word.length - 1];

    const getFirstChar = (word: string): string => word[0];

    const isChainValid = (lastChar: string, nextWord: string): boolean => {
        const validStarts = getStartChars(lastChar);
        const firstChar = getFirstChar(nextWord);
        return validStarts.includes(firstChar);
    };

    const validateWordWithKrdict = useCallback(async (word: string): Promise<KrdictValidationResult | null> => {
        try {
            const response = await fetch(`/api/krdict/validate?word=${encodeURIComponent(word)}`);
            if (!response.ok) return null;

            const data: unknown = await response.json();
            if (
                typeof data === "object" &&
                data !== null &&
                "exists" in data &&
                "definition" in data &&
                typeof (data as { exists: unknown }).exists === "boolean"
            ) {
                const parsed = data as { exists: boolean; definition: unknown };
                return {
                    exists: parsed.exists,
                    definition:
                        typeof parsed.definition === "string" && parsed.definition.trim()
                            ? parsed.definition.trim()
                            : null,
                };
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    const fetchKrdictCandidates = useCallback(async (starts: string[]): Promise<string[]> => {
        if (starts.length === 0) return [];
        try {
            const query = encodeURIComponent(starts.join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${query}`);
            if (!response.ok) {
                console.error("[끝말잇기] candidates API 실패:", response.status, response.statusText);
                return [];
            }

            const data: unknown = await response.json();
            if (typeof data === "object" && data !== null && "words" in data) {
                const words = (data as KrdictCandidatesResult).words ?? [];
                return Array.isArray(words) ? words : [];
            }
            console.error("[끝말잇기] candidates API 응답 형식 오류:", data);
            return [];
        } catch (err) {
            console.error("[끝말잇기] candidates API 예외:", err);
            return [];
        }
    }, []);

    const findAiWord = useCallback(async (startChar: string): Promise<string | null> => {
        const validStarts = getStartChars(startChar);
        // 최대 2회 재시도
        for (let attempt = 0; attempt < 2; attempt++) {
            const words = await fetchKrdictCandidates(validStarts);
            const apiCandidates = words.filter((w) => {
                const first = getFirstChar(w);
                return validStarts.includes(first) && !usedWordsRef.current.has(w.toLowerCase());
            });
            if (apiCandidates.length > 0) {
                return apiCandidates[Math.floor(Math.random() * apiCandidates.length)];
            }
        }
        return null;
    }, [fetchKrdictCandidates]);

    const addMessage = (
        text: string,
        sender: "player" | "ai",
        isValid: boolean,
        definition: string | null = null
    ) => {
        setMessages((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), text, sender, isValid, definition },
        ]);
    };

    // Keep latest currentChar for timer callback.
    useEffect(() => { currentCharRef.current = currentChar; }, [currentChar]);

    const doAiTurn = useCallback((startChar: string) => {
        if (aiTurnPendingRef.current) return;
        aiTurnPendingRef.current = true;
        setIsAiTurn(true);
        if (aiTurnTimeoutRef.current) {
            clearTimeout(aiTurnTimeoutRef.current);
        }
        aiTurnTimeoutRef.current = setTimeout(async () => {
            const aiWord = await findAiWord(startChar);
            if (!aiWord) {
                addMessage("...단어가 없어.", "ai", true);
                setPlayerWon(true);
                setGameOver(true);
                playSound("win");
                setIsAiTurn(false);
                aiTurnPendingRef.current = false;
                return;
            }

            usedWordsRef.current.add(aiWord.toLowerCase());
            let aiDefinition: string | null = null;
            const validation = await validateWordWithKrdict(aiWord);
            if (validation?.exists) {
                aiDefinition = validation.definition;
            }
            addMessage(aiWord, "ai", true, aiDefinition);
            playSound("aiTurn");
            setCurrentChar(getLastChar(aiWord));
            setTimer(config.timeLimit);
            setIsAiTurn(false);
            aiTurnPendingRef.current = false;
            if (inputRef.current) inputRef.current.focus();
        }, 1000 + Math.random() * 500);
    }, [findAiWord, config.timeLimit, playSound, validateWordWithKrdict]);

    // Keep latest AI function for timer callback.
    useEffect(() => { doAiTurnRef.current = doAiTurn; }, [doAiTurn]);

    // Main timer.
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || isAiTurn || isValidatingWord) return;

        timerIntervalRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    playSound("lifeLost");
                    setCombo(0);
                    setLives((l) => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setGameOver(true);
                            playSound("gameOver");
                        } else {
                            doAiTurnRef.current(currentCharRef.current);
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
    }, [gameStarted, gameOver, isPaused, isAiTurn, isValidatingWord, config.timeLimit, playSound]);

    // Auto scroll chat.
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Pause with ESC.
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

    const handleSubmit = async () => {
        if (isComposingRef.current || !input.trim() || isAiTurn || isValidatingWord) return;

        const word = input.trim();
        setInput("");
        if (inputRef.current) inputRef.current.value = "";

        // Validate chain rule first.
        if (currentChar && !isChainValid(currentChar, word)) {
            addMessage(word, "player", false);
            playSound("wrong");
            setCombo(0);
            return;
        }

        if (!HANGUL_WORD_REGEX.test(word)) {
            addMessage(word, "player", false);
            playSound("wrong");
            setCombo(0);
            return;
        }

        let isWordValid = false;
        let definition: string | null = null;

        setIsValidatingWord(true);
        const krdictResult = await validateWordWithKrdict(word);
        setIsValidatingWord(false);

        if (!krdictResult) {
            addMessage("사전 연결 오류", "player", false);
            playSound("wrong");
            setCombo(0);
            return;
        }
        isWordValid = krdictResult.exists;
        definition = krdictResult.definition;

        if (!isWordValid) {
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

        usedWordsRef.current.add(word.toLowerCase());
        addMessage(word, "player", true, definition);
        playSound("submit");
        wordsTypedRef.current++;

        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > maxComboRef.current) maxComboRef.current = newCombo;

        const timeBonus = timer / config.timeLimit;
        const comboMultiplier = Math.min(1 + newCombo * 0.2, 2);
        const wordScore = Math.round(word.length * 10 * timeBonus * comboMultiplier);
        setScore((prev) => prev + wordScore);

        const nextChar = getLastChar(word);
        setCurrentChar(nextChar);
        doAiTurn(nextChar);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !isComposingRef.current && !e.nativeEvent.isComposing) {
            void handleSubmit();
        }
    };

    const handleCompositionStart = () => { isComposingRef.current = true; };
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        setInput((e.target as HTMLInputElement).value);
    };

    const restartGame = useCallback(() => {
        const cfg = DIFFICULTY_CONFIG.normal;
        setScore(0);
        setLives(cfg.lives);
        setCombo(0);
        setTimer(cfg.timeLimit);
        setMessages([]);
        setInput("");
        setGameOver(false);
        setGameStarted(true);
        setIsPaused(false);
        setIsAiTurn(true);
        aiTurnPendingRef.current = false;
        setPlayerWon(false);
        usedWordsRef.current.clear();
        gameStartTimeRef.current = Date.now();
        maxComboRef.current = 0;
        wordsTypedRef.current = 0;

        // AI starts first.
        if (initialAiWordTimeoutRef.current) {
            clearTimeout(initialAiWordTimeoutRef.current);
        }
        initialAiWordTimeoutRef.current = setTimeout(async () => {
            let firstWord: string | null = null;
            // 최대 3번 다른 시작 글자로 재시도
            const shuffledPool = [...KOREAN_START_POOL].sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(3, shuffledPool.length); i++) {
                const starters = await fetchKrdictCandidates([shuffledPool[i]]);
                if (starters.length > 0) {
                    firstWord = starters[Math.floor(Math.random() * starters.length)];
                    break;
                }
            }

            if (!firstWord) {
                addMessage("사전 연결 실패 — 다시 시도해주세요", "ai", false);
                setGameOver(true);
                setPlayerWon(true);
                setIsAiTurn(false);
                return;
            }
            usedWordsRef.current.add(firstWord.toLowerCase());
            let firstDefinition: string | null = null;
            const validation = await validateWordWithKrdict(firstWord);
            if (validation?.exists) {
                firstDefinition = validation.definition;
            }
            addMessage(firstWord, "ai", true, firstDefinition);
            setCurrentChar(getLastChar(firstWord));
            setTimer(cfg.timeLimit);
            setIsAiTurn(false);
            if (inputRef.current) inputRef.current.focus();
        }, 500);
    }, [fetchKrdictCandidates, validateWordWithKrdict]);

    useEffect(() => {
        if (language !== "korean") {
            setLanguage("korean");
            return;
        }
        restartGame();
    }, [language, restartGame, setLanguage]);

    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
            if (initialAiWordTimeoutRef.current) clearTimeout(initialAiWordTimeoutRef.current);
        };
    }, []);

    const formatPlayTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* Top bar */}
                <div className={`flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Score: <span className="tabular-nums">{score}</span>
                        {combo > 0 && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm text-sky-400">
                                x{Math.min(1 + combo * 0.2, 2).toFixed(1)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Timer */}
                        <div className={`text-xs sm:text-lg font-bold tabular-nums ${
                            timer <= 3 ? "text-rose-400 animate-pulse" : darkMode ? "text-white" : "text-slate-800"
                        }`}>
                            ⏱ {timer}s
                        </div>
                        {/* Lives */}
                        <div className={`text-sm sm:text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {"❤️".repeat(Math.max(lives, 0))}
                            {"🖤".repeat(Math.max(config.lives - lives, 0))}
                        </div>
                    </div>
                </div>

                {/* Current start character hint */}
                {currentChar && gameStarted && !gameOver && (
                    <div className="flex justify-center py-2">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                            darkMode ? "bg-sky-500/15 text-sky-300 border border-sky-500/20" : "bg-sky-50 text-sky-600 border border-sky-200"
                        }`}>
                            {(() => {
                                const chars = getStartChars(currentChar);
                                if (chars.length > 1) {
                                    return `"${chars.join('" 또는 "')}"로 시작하는 단어`;
                                }
                                return `"${currentChar}"로 시작하는 단어`;
                            })()}
                        </span>
                    </div>
                )}

                {/* Chat area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === "player" ? "justify-end" : "justify-start"} animate-chat-bubble`}
                        >
                            <div className="max-w-[78%]">
                                <div className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
                                    darkMode ? "text-slate-400" : "text-slate-500"
                                }`}>
                                    {msg.sender === "ai" ? "상대" : "나"}
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${
                                    msg.sender === "ai"
                                        ? darkMode
                                            ? "bg-white/[0.08] text-white rounded-bl-md"
                                            : "bg-slate-100 text-slate-800 rounded-bl-md"
                                        : msg.isValid
                                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-md"
                                            : "bg-rose-500/80 text-white rounded-br-md line-through"
                                }`}>
                                    {msg.text}
                                </div>
                                {msg.isValid && msg.definition && (
                                    <div className={`mt-1.5 px-3 py-2 rounded-xl border text-[11px] sm:text-xs leading-relaxed ${
                                        darkMode
                                            ? "bg-slate-950/50 border-sky-500/20 text-slate-200"
                                            : "bg-sky-50/80 border-sky-200 text-slate-700"
                                    }`}>
                                        <span className="font-semibold text-sky-400 mr-1">
                                            의미
                                        </span>
                                        <span>{msg.definition}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isAiTurn && (
                        <div className="flex justify-start animate-chat-bubble">
                            <div className={`px-4 py-2.5 rounded-2xl rounded-bl-md text-sm ${
                                darkMode ? "bg-white/[0.08] text-white" : "bg-slate-100 text-slate-800"
                            }`}>
                                상대 입력 중 <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area */}
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
                            disabled={!gameStarted || isPaused || gameOver || isAiTurn || isValidatingWord}
                            className={`flex-1 px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                                darkMode
                                    ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                                    : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
                            } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50`}
                            placeholder={
                                isAiTurn
                                    ? "상대 차례입니다..."
                                    : isValidatingWord
                                        ? "단어 검증 중..."
                                        : currentChar
                                            ? (() => {
                                                const chars = getStartChars(currentChar);
                                                return chars.length > 1
                                                    ? `"${chars.join('" / "')}"로 시작하는 단어 입력`
                                                    : `"${currentChar}"로 시작하는 단어 입력`;
                                            })()
                                            : "단어를 입력하세요..."
                            }
                            autoComplete="off"
                        />
                        <button
                            onClick={() => void handleSubmit()}
                            disabled={!gameStarted || isPaused || gameOver || isAiTurn || isValidatingWord || !input.trim()}
                            className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-50"
                        >
                            {isValidatingWord ? "검증중..." : "입력"}
                        </button>
                    </div>
                </div>
            </div>


            {/* Pause overlay */}
            {isPaused && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className="text-center">
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">PAUSED</h2>
                        <p className="text-sm sm:text-lg text-slate-300">
                            ESC를 눌러 계속
                        </p>
                    </div>
                </div>
            )}

            {/* Game over overlay */}
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {playerWon ? "승리!" : "게임 오버"}
                        </h2>
                        {playerWon && (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">★</p>
                        )}

                        <div className={`border-t border-b py-3 my-3 ${darkMode ? "border-white/10" : "border-slate-200"}`}>
                            <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                                Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                            </p>
                        </div>

                        <div className={`text-sm space-y-1.5 mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <p>입력 단어 수: <span className="font-medium tabular-nums">{wordsTypedRef.current}</span></p>
                            <p>최대 콤보: <span className="font-medium tabular-nums">{maxComboRef.current}</span></p>
                            <p>플레이 시간: <span className="font-medium tabular-nums">{formatPlayTime(Date.now() - gameStartTimeRef.current)}</span></p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
                            <button
                                onClick={() => restartGame()}
                                className="px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base"
                            >
                                다시 하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordChainGame;

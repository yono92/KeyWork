import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
import { formatPlayTime } from "../utils/formatting";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";
import { KOREAN_START_POOL, HANGUL_WORD_REGEX } from "../utils/koreanConstants";
import { Button } from "@/components/ui/button";
import wordChainDict from "../data/wordchain-dict.json";
import FallbackNotice from "./game/FallbackNotice";

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
    source?: string;
}

interface KrdictCandidatesResult {
    words: string[];
}


const DIFFICULTY_CONFIG = {
    easy:   { timeLimit: 20, lives: 3 },
    normal: { timeLimit: 15, lives: 3 },
    hard:   { timeLimit: 10, lives: 3 },
} as const;

const WordChainGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const language = useTypingStore((s) => s.language);
    const setLanguage = useTypingStore((s) => s.setLanguage);

    const { playSound } = useGameAudio();

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
    const [dictionarySource, setDictionarySource] = useState<"krdict" | "local">("krdict");
    const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const usedWordsRef = useRef<Set<string>>(new Set());
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const aiTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialAiWordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aiTurnPendingRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());
    const maxComboRef = useRef(0);
    const wordsTypedRef = useRef(0);
    const submitLockRef = useRef(false);
    const currentCharRef = useRef("");
    const doAiTurnRef = useRef<(startChar: string) => void>(() => {});
    const localKoreanDict = useMemo(() => wordChainDict.korean ?? [], []);
    const localDictSetRef = useRef<Set<string>>(new Set(localKoreanDict.map((w) => w.toLowerCase())));

    usePauseHandler(gameStarted, gameOver, setIsPaused);

    // 게임오버 시 XP 지급
    // 두음법칙: 한글 음절을 분해하여 초성을 변환한 음절을 반환
    const applyDueum = (char: string): string | null => {
        const code = char.charCodeAt(0);
        if (code < 0xAC00 || code > 0xD7A3) return null;
        const offset = code - 0xAC00;
        const initial = Math.floor(offset / (21 * 28));
        const medial = Math.floor((offset % (21 * 28)) / 28);
        const final_ = offset % 28;

        // ㅑ(2),ㅕ(6),ㅖ(7),ㅛ(12),ㅠ(17),ㅣ(20) 앞에서 ㄹ→ㅇ, ㄴ→ㅇ
        const yVowels = [2, 6, 7, 12, 17, 20];
        // ㅏ(0),ㅐ(1),ㅗ(8),ㅚ(11),ㅜ(13),ㅡ(18) 앞에서 ㄹ→ㄴ
        const aVowels = [0, 1, 8, 11, 13, 18];

        let newInitial: number | null = null;
        if (initial === 5) { // ㄹ
            if (aVowels.includes(medial)) newInitial = 2;  // ㄹ→ㄴ (라→나, 로→노 등)
            else if (yVowels.includes(medial)) newInitial = 11; // ㄹ→ㅇ (리→이, 려→여 등)
        } else if (initial === 2) { // ㄴ
            if (yVowels.includes(medial)) newInitial = 11; // ㄴ→ㅇ (니→이, 녀→여 등)
        }
        if (newInitial === null) return null;
        return String.fromCharCode(0xAC00 + newInitial * 21 * 28 + medial * 28 + final_);
    };

    const getStartChars = (lastChar: string): string[] => {
        const chars = [lastChar];
        const code = lastChar.charCodeAt(0);
        if (code < 0xAC00 || code > 0xD7A3) return chars;

        // 정방향: 두음법칙 적용 (련→연, 님→임, 략→약 등)
        const transformed = applyDueum(lastChar);
        if (transformed) chars.push(transformed);

        // 역방향: 두음법칙 역적용 (여→려/녀, 이→리/니, 노→로 등)
        const offset = code - 0xAC00;
        const initial = Math.floor(offset / (21 * 28));
        const medial = Math.floor((offset % (21 * 28)) / 28);
        const final_ = offset % 28;
        const yVowels = [2, 6, 7, 12, 17, 20];
        const aVowels = [0, 1, 8, 11, 13, 18];
        const buildChar = (i: number) => String.fromCharCode(0xAC00 + i * 21 * 28 + medial * 28 + final_);

        if (initial === 2 && aVowels.includes(medial)) {
            // ㄴ+ㅏ/ㅐ/ㅗ/ㅚ/ㅜ/ㅡ ← ㄹ (나→라, 노→로 등)
            chars.push(buildChar(5));
        } else if (initial === 11 && yVowels.includes(medial)) {
            // ㅇ+ㅑ/ㅕ/ㅖ/ㅛ/ㅠ/ㅣ ← ㄹ, ㄴ (여→려/녀, 이→리/니 등)
            chars.push(buildChar(5), buildChar(2));
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

    // 한방 단어 방어: 이을 수 없는 끝 글자 목록
    const KILLER_ENDINGS = new Set([
        "늄", "슘", "튬", "륨", "듐", "뮴", "붕",
        "숍", "릅", "갈", "꿈", "늑", "릇", "맡",
    ]);

    // 초반 6턴(플레이어 3번 + AI 3번) 동안 한방 단어 차단
    const isKillerWord = (word: string): boolean => {
        if (usedWordsRef.current.size >= 6) return false;
        const last = getLastChar(word);
        // 두음법칙 적용한 모든 변환도 체크
        const chars = getStartChars(last);
        return chars.every((c) => KILLER_ENDINGS.has(c));
    };

    const validateWordWithKrdict = useCallback(async (word: string): Promise<KrdictValidationResult | null> => {
        try {
            const response = await fetch(`/api/krdict/validate?word=${encodeURIComponent(word)}`);
            if (!response.ok) {
                const localExists = localDictSetRef.current.has(word.toLowerCase());
                setDictionarySource("local");
                setFallbackMessage("사전 연결이 불안정해 로컬 사전으로 검증합니다.");
                return { exists: localExists, definition: null, source: "local" };
            }

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
                    source: "krdict",
                };
            }
            return null;
        } catch {
            const localExists = localDictSetRef.current.has(word.toLowerCase());
            setDictionarySource("local");
            setFallbackMessage("사전 연결 실패로 로컬 사전으로 검증합니다.");
            return { exists: localExists, definition: null, source: "local" };
        }
    }, []);

    const fetchKrdictCandidates = useCallback(async (starts: string[]): Promise<string[]> => {
        if (starts.length === 0) return [];
        try {
            const query = encodeURIComponent(starts.join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${query}`);
            if (!response.ok) {
                setDictionarySource("local");
                setFallbackMessage("사전 연결이 불안정해 로컬 단어 후보로 진행합니다.");
                return localKoreanDict.filter((w) => starts.includes(getFirstChar(w)));
            }

            const data: unknown = await response.json();
            if (typeof data === "object" && data !== null && "words" in data) {
                const words = (data as KrdictCandidatesResult).words ?? [];
                setDictionarySource("krdict");
                setFallbackMessage(null);
                return Array.isArray(words) ? words : [];
            }
            console.error("[끝말잇기] candidates API 응답 형식 오류:", data);
            setDictionarySource("local");
            setFallbackMessage("사전 응답 오류로 로컬 단어 후보로 진행합니다.");
            return localKoreanDict.filter((w) => starts.includes(getFirstChar(w)));
        } catch (err) {
            console.error("[끝말잇기] candidates API 예외:", err);
            setDictionarySource("local");
            setFallbackMessage("사전 연결 실패로 로컬 단어 후보로 진행합니다.");
            return localKoreanDict.filter((w) => starts.includes(getFirstChar(w)));
        }
    }, [localKoreanDict]);

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
                // 초반에는 한방 단어를 피함
                const safe = apiCandidates.filter((w) => !isKillerWord(w));
                if (safe.length > 0) return safe[Math.floor(Math.random() * safe.length)];
                // 안전한 단어가 없으면 그냥 사용
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
                addMessage("…단어가 없어.", "ai", true);
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

    useEffect(() => {
        if (!isPaused && !gameOver && !isAiTurn && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver, isAiTurn]);

    // Prevent backspace browser navigation and auto-focus input.
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // 백스페이스 뒤로가기 방지
            if (
                e.key === "Backspace" &&
                !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
            ) {
                e.preventDefault();
            }
            // 키 입력 시 자동으로 인풋 포커스
            if (
                !isPaused &&
                !isAiTurn &&
                !isValidatingWord &&
                inputRef.current &&
                document.activeElement !== inputRef.current &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey &&
                e.key !== "Escape"
            ) {
                inputRef.current.focus();
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [gameStarted, gameOver, isPaused, isAiTurn, isValidatingWord]);

    const handleSubmit = async () => {
        if (!input.trim() || isAiTurn || isValidatingWord || submitLockRef.current) return;
        submitLockRef.current = true;

        try {
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

            // 초반 한방 단어 차단
            if (isKillerWord(word)) {
                addMessage(`"${word}" — 초반에는 한방 단어를 사용할 수 없습니다!`, "player", false);
                playSound("wrong");
                setCombo(0);
                return;
            }

            usedWordsRef.current.add(word.toLowerCase());
            addMessage(word, "player", true, definition);
            playSound("match");
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
        } finally {
            setIsValidatingWord(false);
            submitLockRef.current = false;
        }
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
                setPlayerWon(false);
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
                {fallbackMessage && (
                    <div className="px-3 sm:px-4 pb-2">
                        <FallbackNotice
                            darkMode={darkMode}
                            message={fallbackMessage}
                            sourceLabel={dictionarySource === "krdict" ? "krdict" : "local wordchain-dict"}
                            onRetry={() => {
                                setFallbackMessage(null);
                                void fetchKrdictCandidates(currentChar ? getStartChars(currentChar) : ["가"]);
                            }}
                        />
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
                        <div className="flex justify-start animate-chat-bubble" aria-live="polite">
                            <div className={`px-4 py-2.5 rounded-2xl rounded-bl-md text-sm ${
                                darkMode ? "bg-white/[0.08] text-white" : "bg-slate-100 text-slate-800"
                            }`}>
                                상대 입력 중 <span className="animate-pulse">…</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className={`p-2.5 sm:p-4 backdrop-blur-sm border-t ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className="flex gap-2 sm:gap-3">
                        <GameInput
                            inputRef={inputRef}
                            value={input}
                            onChange={setInput}
                            onSubmit={() => void handleSubmit()}
                            disabled={!gameStarted || isPaused || gameOver || isAiTurn || isValidatingWord}
                            className="flex-1"
                            placeholder={
                                isAiTurn
                                    ? "상대 차례입니다…"
                                    : isValidatingWord
                                        ? "단어 검증 중…"
                                        : currentChar
                                            ? (() => {
                                                const chars = getStartChars(currentChar);
                                                return chars.length > 1
                                                    ? `"${chars.join('" / "')}"로 시작하는 단어 입력`
                                                    : `"${currentChar}"로 시작하는 단어 입력`;
                                            })()
                                            : "단어를 입력하세요…"
                            }
                            ariaLabel="끝말잇기 단어 입력"
                        />
                        <Button
                            onClick={() => void handleSubmit()}
                            disabled={!gameStarted || isPaused || gameOver || isAiTurn || isValidatingWord || !input.trim()}
                            variant="secondary"
                            className={`h-auto px-4 py-2 sm:px-6 sm:py-3 font-medium text-sm sm:text-base disabled:opacity-50 ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                        >
                            {isValidatingWord ? "검증중…" : "입력"}
                        </Button>
                    </div>
                </div>
            </div>


            {/* Pause overlay */}
            {isPaused && !gameOver && <PauseOverlay language="korean" />}

            {/* Game over overlay */}
            {gameOver && (
                <GameOverModal
                    title={playerWon ? "승리!" : "게임 오버"}
                    badge={playerWon ? <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">★</p> : undefined}
                    primaryStat={
                        <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                        </p>
                    }
                    stats={[
                        { label: "입력 단어 수", value: wordsTypedRef.current },
                        { label: "최대 콤보", value: maxComboRef.current },
                        { label: "플레이 시간", value: formatPlayTime(Date.now() - gameStartTimeRef.current, "ko") },
                    ]}
                    buttons={[
                        { label: "다시 하기", onClick: () => restartGame(), primary: true },
                    ]}
                />
            )}
        </div>
    );
};

export default WordChainGame;

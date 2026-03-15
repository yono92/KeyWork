import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import { useGameAudio } from "./useGameAudio";
import { usePauseHandler } from "./usePauseHandler";
import { KOREAN_START_POOL, HANGUL_WORD_REGEX } from "../utils/koreanConstants";
import {
    getStartChars,
    getLastChar,
    getFirstChar,
    isChainValid,
    isKillerWord,
} from "../utils/dueumUtils";
import wordChainDict from "../data/wordchain-dict.json";
import { fetchWithClientTimeout } from "../lib/clientFetch";
import { isTooSimilarWord, pickDiverseWord } from "../utils/wordDiversity";

const RECENT_WORD_WINDOW = 8;

// Re-export for component use
export { getStartChars };

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

/**
 * 끝말잇기 게임 전체 로직 — 타이머, AI 턴, 검증, 제출, 메시지 히스토리
 */
export function useWordChainGame() {
    const language = useTypingStore((s) => s.language);
    const setLanguage = useTypingStore((s) => s.setLanguage);

    const { playSound } = useGameAudio();

    const difficulty = useTypingStore((s) => s.difficulty);
    const config = DIFFICULTY_CONFIG[difficulty];

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
    const recentWordsRef = useRef<string[]>([]);
    const doAiTurnRef = useRef<(startChar: string) => void>(() => {});
    const localKoreanDict = useMemo(() => wordChainDict.korean ?? [], []);
    const localDictSetRef = useRef<Set<string>>(new Set(localKoreanDict.map((w) => w.toLowerCase())));

    usePauseHandler(gameStarted, gameOver, setIsPaused);

    const validateWordWithKrdict = useCallback(async (word: string): Promise<KrdictValidationResult | null> => {
        try {
            const response = await fetchWithClientTimeout(
                `/api/krdict/validate?word=${encodeURIComponent(word)}`
            );
            if (!response.ok) {
                const localExists = localDictSetRef.current.has(word.toLowerCase());
                setDictionarySource("local");
                setFallbackMessage("기본 단어장으로 검증합니다.");
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
            setFallbackMessage("기본 단어장으로 검증합니다.");
            return { exists: localExists, definition: null, source: "local" };
        }
    }, []);

    const fetchKrdictCandidates = useCallback(async (starts: string[]): Promise<string[]> => {
        if (starts.length === 0) return [];
        try {
            const query = encodeURIComponent(starts.join(","));
            const response = await fetchWithClientTimeout(
                `/api/krdict/candidates?starts=${query}&num=200`
            );
            if (!response.ok) {
                setDictionarySource("local");
                setFallbackMessage("기본 단어장으로 진행합니다.");
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
            setFallbackMessage("기본 단어장으로 진행합니다.");
            return localKoreanDict.filter((w) => starts.includes(getFirstChar(w)));
        } catch (err) {
            console.error("[끝말잇기] candidates API 예외:", err);
            setDictionarySource("local");
            setFallbackMessage("기본 단어장으로 진행합니다.");
            return localKoreanDict.filter((w) => starts.includes(getFirstChar(w)));
        }
    }, [localKoreanDict]);

    const findAiWord = useCallback(async (startChar: string): Promise<string | null> => {
        const validStarts = getStartChars(startChar);
        for (let attempt = 0; attempt < 2; attempt++) {
            const words = await fetchKrdictCandidates(validStarts);
            const apiCandidates = words.filter((w) => {
                const first = getFirstChar(w);
                return validStarts.includes(first) && !usedWordsRef.current.has(w.toLowerCase());
            });
            if (apiCandidates.length > 0) {
                const safe = apiCandidates.filter((w) => !isKillerWord(w, usedWordsRef.current.size));
                const diverseSafe = safe.filter(
                    (word) => !isTooSimilarWord(word, recentWordsRef.current, "korean")
                );
                const pool = diverseSafe.length > 0 ? diverseSafe : safe.length > 0 ? safe : apiCandidates;
                return pickDiverseWord(pool, recentWordsRef.current, "korean");
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
            recentWordsRef.current = [...recentWordsRef.current.slice(-(RECENT_WORD_WINDOW - 1)), aiWord];
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

    useEffect(() => { doAiTurnRef.current = doAiTurn; }, [doAiTurn]);

    // Main timer
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

    // Auto scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (!isPaused && !gameOver && !isAiTurn && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver, isAiTurn]);

    // Prevent backspace browser navigation and auto-focus input
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "Backspace" &&
                !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
            ) {
                e.preventDefault();
            }
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

            if (!krdictResult) {
                addMessage("단어 확인에 실패했습니다", "player", false);
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

            if (isKillerWord(word, usedWordsRef.current.size)) {
                addMessage(`"${word}" — 초반에는 한방 단어를 사용할 수 없습니다!`, "player", false);
                playSound("wrong");
                setCombo(0);
                return;
            }

            usedWordsRef.current.add(word.toLowerCase());
            recentWordsRef.current = [...recentWordsRef.current.slice(-(RECENT_WORD_WINDOW - 1)), word];
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
        recentWordsRef.current = [];
        gameStartTimeRef.current = Date.now();
        maxComboRef.current = 0;
        wordsTypedRef.current = 0;

        if (initialAiWordTimeoutRef.current) {
            clearTimeout(initialAiWordTimeoutRef.current);
        }
        initialAiWordTimeoutRef.current = setTimeout(async () => {
            let firstWord: string | null = null;
            const shuffledPool = [...KOREAN_START_POOL].sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(3, shuffledPool.length); i++) {
                const starters = await fetchKrdictCandidates([shuffledPool[i]]);
                if (starters.length > 0) {
                    const diverseStarters = starters.filter(
                        (word) => !isTooSimilarWord(word, recentWordsRef.current, "korean")
                    );
                    firstWord = pickDiverseWord(
                        diverseStarters.length > 0 ? diverseStarters : starters,
                        recentWordsRef.current,
                        "korean"
                    );
                    break;
                }
            }

            if (!firstWord) {
                addMessage("단어를 불러오지 못했습니다 — 다시 시도해주세요", "ai", false);
                setGameOver(true);
                setPlayerWon(false);
                setIsAiTurn(false);
                return;
            }
            usedWordsRef.current.add(firstWord.toLowerCase());
            recentWordsRef.current = [...recentWordsRef.current.slice(-(RECENT_WORD_WINDOW - 1)), firstWord];
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

    return {
        // State
        gameStarted,
        gameOver,
        isPaused,
        score,
        lives,
        combo,
        timer,
        input,
        setInput,
        messages,
        currentChar,
        isAiTurn,
        playerWon,
        isValidatingWord,
        dictionarySource,
        fallbackMessage,
        config,
        // Refs
        inputRef,
        chatContainerRef,
        wordsTypedRef,
        maxComboRef,
        gameStartTimeRef,
        // Actions
        handleSubmit,
        restartGame,
        fetchKrdictCandidates,
    };
}

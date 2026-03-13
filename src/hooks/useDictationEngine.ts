"use client";

import { useState, useCallback, useRef } from "react";
import { getRandomSentenceUnique } from "../utils/sentenceUtils";
import { calculateHangulAccuracy } from "../utils/hangulUtils";

// ── 타입 ──

type Difficulty = "easy" | "normal" | "hard";
type GamePhase = "idle" | "playing" | "grading" | "finished";

export interface QuestionResult {
    sentence: string;
    input: string;
    accuracy: number;
    diff: DiffChar[];
}

export interface DiffChar {
    char: string;
    status: "correct" | "incorrect" | "missing" | "extra";
}

interface DifficultyConfig {
    rate: number;       // TTS 속도
    autoPlays: number;  // 자동 재생 횟수
    scoreMul: number;   // 점수 배율
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
    easy: { rate: 0.8, autoPlays: 3, scoreMul: 0.7 },
    normal: { rate: 1.0, autoPlays: 2, scoreMul: 1.0 },
    hard: { rate: 1.2, autoPlays: 1, scoreMul: 1.5 },
};

const TOTAL_QUESTIONS = 10;

// ── TTS 헬퍼 ──

function isTTSAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speak(text: string, lang: "korean" | "english", rate: number): Promise<void> {
    return new Promise((resolve) => {
        if (!isTTSAvailable()) {
            resolve();
            return;
        }
        // 이전 발화 중단
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "korean" ? "ko-KR" : "en-US";
        utterance.rate = rate;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
    });
}

// ── 글자별 diff 계산 ──

function computeDiff(target: string, input: string): DiffChar[] {
    const result: DiffChar[] = [];
    const maxLen = Math.max(target.length, input.length);

    for (let i = 0; i < maxLen; i++) {
        if (i < target.length && i < input.length) {
            result.push({
                char: target[i],
                status: target[i] === input[i] ? "correct" : "incorrect",
            });
        } else if (i < target.length) {
            result.push({ char: target[i], status: "missing" });
        } else {
            result.push({ char: input[i], status: "extra" });
        }
    }

    return result;
}

// ── 영어 정확도 ──

function calculateCharAccuracy(target: string, input: string): number {
    if (!input) return 0;
    const len = Math.max(target.length, 1);
    let correct = 0;
    for (let i = 0; i < target.length; i++) {
        if (i < input.length && target[i] === input[i]) correct++;
    }
    // 초과 입력 페널티
    const extra = Math.max(0, input.length - target.length);
    const accuracy = ((correct - extra * 0.5) / len) * 100;
    return Math.min(100, Math.max(0, Math.round(accuracy)));
}

// ── 훅 ──

export function useDictationEngine(language: "korean" | "english") {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [questionIndex, setQuestionIndex] = useState(0);
    const [currentSentence, setCurrentSentence] = useState("");
    const [results, setResults] = useState<QuestionResult[]>([]);
    const [currentDiff, setCurrentDiff] = useState<DiffChar[] | null>(null);
    const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [playsRemaining, setPlaysRemaining] = useState(0);
    const [showFallback, setShowFallback] = useState(false);

    const difficultyRef = useRef<Difficulty>("normal");
    const usedIndicesRef = useRef(new Set<number>());
    const languageRef = useRef(language);

    // language ref 동기화
    languageRef.current = language;

    // ── TTS 재생 ──
    const playSentence = useCallback(async (sentence?: string) => {
        const text = sentence ?? currentSentence;
        if (!text) return;

        if (!isTTSAvailable()) {
            // 폴백: 텍스트 2초간 표시
            setShowFallback(true);
            await new Promise((r) => setTimeout(r, 2000));
            setShowFallback(false);
            return;
        }

        setIsSpeaking(true);
        const config = DIFFICULTY_CONFIG[difficultyRef.current];
        await speak(text, languageRef.current, config.rate);
        setIsSpeaking(false);
        setPlaysRemaining((prev) => Math.max(0, prev - 1));
    }, [currentSentence]);

    // ── 다음 문제 로드 ──
    const loadQuestion = useCallback(async (index: number) => {
        const sentence = getRandomSentenceUnique(languageRef.current, usedIndicesRef.current);
        setCurrentSentence(sentence);
        setQuestionIndex(index);
        setCurrentDiff(null);
        setCurrentAccuracy(null);
        setPhase("playing");

        const config = DIFFICULTY_CONFIG[difficultyRef.current];
        setPlaysRemaining(config.autoPlays);

        // 자동 재생
        if (isTTSAvailable()) {
            setIsSpeaking(true);
            await speak(sentence, languageRef.current, config.rate);
            setIsSpeaking(false);
            setPlaysRemaining(config.autoPlays - 1);
        } else {
            setShowFallback(true);
            await new Promise((r) => setTimeout(r, 2000));
            setShowFallback(false);
        }
    }, []);

    // ── 채점 ──
    const gradeAnswer = useCallback((input: string) => {
        const trimmed = input.trim();

        // 정확도 계산
        const accuracy = languageRef.current === "korean"
            ? calculateHangulAccuracy(currentSentence, trimmed)
            : calculateCharAccuracy(currentSentence, trimmed);

        // 글자별 diff
        const diff = computeDiff(currentSentence, trimmed);

        setCurrentAccuracy(accuracy);
        setCurrentDiff(diff);
        setPhase("grading");

        // 결과 저장
        const result: QuestionResult = {
            sentence: currentSentence,
            input: trimmed,
            accuracy,
            diff,
        };
        setResults((prev) => [...prev, result]);

        // TTS 중단
        if (isTTSAvailable()) speechSynthesis.cancel();

        return { accuracy, diff };
    }, [currentSentence]);

    // ── 다음 문제 or 완료 ──
    const nextQuestion = useCallback(async () => {
        const nextIdx = questionIndex + 1;
        if (nextIdx >= TOTAL_QUESTIONS) {
            setPhase("finished");
        } else {
            await loadQuestion(nextIdx);
        }
    }, [questionIndex, loadQuestion]);

    // ── 게임 시작 ──
    const startGame = useCallback(async (difficulty: Difficulty) => {
        difficultyRef.current = difficulty;
        usedIndicesRef.current.clear();
        setResults([]);
        setQuestionIndex(0);
        setCurrentDiff(null);
        setCurrentAccuracy(null);
        await loadQuestion(0);
    }, [loadQuestion]);

    // ── 재시작 ──
    const restart = useCallback(async () => {
        await startGame(difficultyRef.current);
    }, [startGame]);

    // ── 메뉴로 ──
    const backToMenu = useCallback(() => {
        if (isTTSAvailable()) speechSynthesis.cancel();
        setPhase("idle");
        setResults([]);
    }, []);

    // ── 최종 점수 계산 ──
    const totalScore = results.reduce((sum, r) => sum + r.accuracy, 0);
    const averageAccuracy = results.length > 0
        ? Math.round(totalScore / results.length)
        : 0;
    const perfectCount = results.filter((r) => r.accuracy === 100).length;
    const config = DIFFICULTY_CONFIG[difficultyRef.current];
    const finalScore = Math.round(totalScore * config.scoreMul);

    return {
        phase,
        questionIndex,
        totalQuestions: TOTAL_QUESTIONS,
        currentSentence,
        currentDiff,
        currentAccuracy,
        isSpeaking,
        playsRemaining,
        showFallback,
        results,
        totalScore,
        finalScore,
        averageAccuracy,
        perfectCount,
        startGame,
        playSentence,
        gradeAnswer,
        nextQuestion,
        restart,
        backToMenu,
    };
}

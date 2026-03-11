import { useCallback, useEffect, useRef } from "react";
import useTypingStore from "../store/store";
import {
    extractPracticePrompts,
    getRandomSentenceUnique,
    normalizePracticePrompt,
} from "../utils/sentenceUtils";

/**
 * 타이핑 연습 텍스트 관리 — 로컬 코퍼스 + promptQueue 로테이션
 */
export function usePracticeText() {
    const text = useTypingStore((state) => state.text);
    const setText = useTypingStore((state) => state.setText);
    const language = useTypingStore((state) => state.language);

    const promptQueueRef = useRef<string[]>([]);
    const usedIndicesRef = useRef<Set<number>>(new Set());

    const getLocalFallback = useCallback((nextLanguage: "korean" | "english") => {
        const candidate = getRandomSentenceUnique(nextLanguage, usedIndicesRef.current);
        if (candidate.length > 0) return candidate;
        return nextLanguage === "korean"
            ? "기본 문장으로 타자 연습을 시작합니다"
            : "Start typing with a basic practice sentence";
    }, []);

    const loadNextLocalPrompt = useCallback(() => {
        const prompts = extractPracticePrompts(getLocalFallback(language), language);
        const [firstPrompt, ...restPrompts] = prompts;
        setText(firstPrompt ?? getLocalFallback(language));
        promptQueueRef.current = restPrompts;
    }, [getLocalFallback, language, setText]);

    /** 다음 프롬프트로 전진 (큐에 있으면 큐에서, 없으면 새 로컬 문장 로드) */
    const advanceToNextPrompt = useCallback(() => {
        const nextPrompt = promptQueueRef.current.shift();
        if (nextPrompt) {
            setText(nextPrompt);
        } else {
            loadNextLocalPrompt();
        }
    }, [loadNextLocalPrompt, setText]);

    // 텍스트 초기화 (마운트 시, 언어 변경 시)
    useEffect(() => {
        promptQueueRef.current = [];
        usedIndicesRef.current = new Set();
        loadNextLocalPrompt();
    }, [language, loadNextLocalPrompt]);

    // 안전장치: 비어있는 텍스트는 즉시 속담으로 교정
    useEffect(() => {
        const normalized = normalizePracticePrompt(text ?? "", language);
        if (normalized !== text && normalized.length > 0) {
            setText(normalized);
            return;
        }
        if (!normalized) {
            promptQueueRef.current = [];
            setText(getLocalFallback(language));
        }
    }, [text, language, setText, getLocalFallback]);

    return {
        advanceToNextPrompt,
    };
}

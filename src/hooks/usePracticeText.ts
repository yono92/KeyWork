import { useCallback, useEffect, useRef } from "react";
import useTypingStore from "../store/store";
import {
    extractPracticePrompts,
    getRandomSentenceUnique,
    normalizePracticePrompt,
} from "../utils/sentenceUtils";
import type { CustomText } from "@/lib/supabase/types";

export type PracticeSource = "proverbs" | "custom";

/**
 * 타이핑 연습 텍스트 관리 — 로컬 코퍼스 + 커스텀 텍스트 + promptQueue 로테이션
 */
export function usePracticeText(
    source: PracticeSource = "proverbs",
    customTexts: CustomText[] = [],
) {
    const text = useTypingStore((state) => state.text);
    const setText = useTypingStore((state) => state.setText);
    const language = useTypingStore((state) => state.language);

    const promptQueueRef = useRef<string[]>([]);
    const usedIndicesRef = useRef<Set<number>>(new Set());
    const usedCustomIndicesRef = useRef<Set<number>>(new Set());

    const getLocalFallback = useCallback((nextLanguage: "korean" | "english") => {
        const candidate = getRandomSentenceUnique(nextLanguage, usedIndicesRef.current);
        if (candidate.length > 0) return candidate;
        return nextLanguage === "korean"
            ? "기본 문장으로 타자 연습을 시작합니다"
            : "Start typing with a basic practice sentence";
    }, []);

    const getCustomText = useCallback(() => {
        if (customTexts.length === 0) return null;
        const available = customTexts.filter((_, i) => !usedCustomIndicesRef.current.has(i));
        const pool = available.length > 0 ? available : customTexts;
        if (available.length === 0) usedCustomIndicesRef.current = new Set();
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const idx = customTexts.indexOf(picked);
        usedCustomIndicesRef.current.add(idx);
        return picked.content;
    }, [customTexts]);

    const loadNextPrompt = useCallback(() => {
        let rawText: string;

        if (source === "custom") {
            const custom = getCustomText();
            if (custom) {
                rawText = custom;
            } else {
                // 커스텀 텍스트 없으면 속담 폴백
                rawText = getLocalFallback(language);
            }
        } else {
            rawText = getLocalFallback(language);
        }

        const prompts = extractPracticePrompts(rawText, language);
        const [firstPrompt, ...restPrompts] = prompts;
        setText(firstPrompt ?? getLocalFallback(language));
        promptQueueRef.current = restPrompts;
    }, [source, getCustomText, getLocalFallback, language, setText]);

    /** 다음 프롬프트로 전진 (큐에 있으면 큐에서, 없으면 새 문장 로드) */
    const advanceToNextPrompt = useCallback(() => {
        const nextPrompt = promptQueueRef.current.shift();
        if (nextPrompt) {
            setText(nextPrompt);
        } else {
            loadNextPrompt();
        }
    }, [loadNextPrompt, setText]);

    // 텍스트 초기화 (마운트 시, 언어 변경 시, 소스 변경 시)
    useEffect(() => {
        promptQueueRef.current = [];
        usedIndicesRef.current = new Set();
        usedCustomIndicesRef.current = new Set();
        loadNextPrompt();
    }, [language, source, loadNextPrompt]);

    // 안전장치: 비어있는 텍스트는 즉시 교정
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

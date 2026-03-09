import { useState, useCallback, useEffect, useRef } from "react";
import useTypingStore from "../store/store";
import { extractPracticePrompts, getRandomSentence, normalizePracticePrompt } from "../utils/sentenceUtils";
import { ClientFetchError, fetchWithClientTimeout } from "../lib/clientFetch";

/**
 * 타이핑 연습 텍스트 관리 — Wikipedia API + 속담 폴백 + promptQueue 로테이션
 */
export function usePracticeText() {
    const text = useTypingStore((state) => state.text);
    const setText = useTypingStore((state) => state.setText);
    const language = useTypingStore((state) => state.language);

    const [textSource, setTextSource] = useState<"wikipedia" | "proverb-fallback">("proverb-fallback");
    const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
    const promptQueueRef = useRef<string[]>([]);
    const initializedRef = useRef(false);

    const getRandomProverb = useCallback((nextLanguage: "korean" | "english") => {
        const candidate = getRandomSentence(nextLanguage);
        if (candidate.length > 0) return candidate;
        return nextLanguage === "korean"
            ? "기본 문장으로 타자 연습을 시작합니다"
            : "Start typing with a basic practice sentence";
    }, []);

    const fetchPracticeText = useCallback(async () => {
        const nextLanguageCode = language === "korean" ? "ko" : "en";
        try {
            const response = await fetchWithClientTimeout(
                `/api/wikipedia?lang=${nextLanguageCode}`
            );
            if (!response.ok) {
                promptQueueRef.current = [];
                setText(getRandomProverb(language));
                setTextSource("proverb-fallback");
                setFallbackMessage("위키 문서 연결이 불안정해 속담으로 연습 중입니다.");
                return;
            }

            const data: unknown = await response.json();
            if (
                typeof data === "object" &&
                data !== null &&
                "text" in data &&
                typeof (data as { text: unknown }).text === "string" &&
                (data as { text: string }).text.trim().length > 0
            ) {
                const prompts = extractPracticePrompts((data as { text: string }).text, language);
                if (prompts.length > 0) {
                    setText(prompts[0]);
                    promptQueueRef.current = prompts.slice(1);
                    setTextSource("wikipedia");
                    setFallbackMessage(null);
                    return;
                }
            }

            promptQueueRef.current = [];
            setText(getRandomProverb(language));
            setTextSource("proverb-fallback");
            setFallbackMessage("위키 문서를 가져오지 못해 속담으로 연습 중입니다.");
        } catch (error) {
            promptQueueRef.current = [];
            setText(getRandomProverb(language));
            setTextSource("proverb-fallback");
            setFallbackMessage(
                error instanceof ClientFetchError && error.code === "TIMEOUT"
                    ? "응답 지연으로 속담 연습 모드로 전환되었습니다."
                    : "네트워크 오류로 속담 연습 모드로 전환되었습니다."
            );
        }
    }, [language, setText, getRandomProverb]);

    /** 다음 프롬프트로 전진 (큐에 있으면 큐에서, 없으면 새 fetch) */
    const advanceToNextPrompt = useCallback(() => {
        const nextPrompt = promptQueueRef.current.shift();
        if (nextPrompt) {
            setText(nextPrompt);
            setTextSource("wikipedia");
            setFallbackMessage(null);
        } else {
            void fetchPracticeText();
        }
    }, [setText, fetchPracticeText]);

    // 텍스트 초기화 (마운트 시, 언어 변경 시)
    useEffect(() => {
        promptQueueRef.current = [];
        void fetchPracticeText();

        if (!initializedRef.current) {
            initializedRef.current = true;
        }
    }, [language, fetchPracticeText]);

    // 안전장치: 비어있는 텍스트는 즉시 속담으로 교정
    useEffect(() => {
        const normalized = normalizePracticePrompt(text ?? "", language);
        if (normalized !== text && normalized.length > 0) {
            setText(normalized);
            return;
        }
        if (!normalized) {
            promptQueueRef.current = [];
            setText(getRandomProverb(language));
            setTextSource("proverb-fallback");
        }
    }, [text, language, setText, getRandomProverb]);

    return {
        textSource,
        fallbackMessage,
        fetchPracticeText,
        advanceToNextPrompt,
    };
}

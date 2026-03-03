import { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import { calculateHangulAccuracy, countKeystrokes } from "../utils/hangulUtils";

const NON_TYPING_KEYS = new Set([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock",
    "Tab",
    "Escape",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Insert",
    "Delete",
]);

type AudioContextClass = typeof AudioContext;

const getAudioContextClass = (): AudioContextClass | undefined => {
    const w = window as Window &
        typeof globalThis & { webkitAudioContext?: AudioContextClass };
    return w.AudioContext || w.webkitAudioContext;
};

/**
 * WPM/KPM 계산, 12초 캡, 가중 평균, 아웃라이어 필터링
 */
export function useTypingMetrics() {
    const text = useTypingStore((state) => state.text);
    const setProgress = useTypingStore((state) => state.setProgress);
    const language = useTypingStore((state) => state.language);
    const isMuted = useTypingStore((state) => state.isMuted);

    const [input, setInput] = useState<string>("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [typingSpeed, setTypingSpeed] = useState<number>(0);
    const [accuracy, setAccuracy] = useState<number>(0);
    const [allSpeeds, setAllSpeeds] = useState<number[]>([]);
    const [allAccuracies, setAllAccuracies] = useState<number[]>([]);
    const [averageSpeed, setAverageSpeed] = useState<number>(0);
    const [averageAccuracy, setAverageAccuracy] = useState<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);

    const beep = useCallback(
        (frequency = 800, duration = 30, volume = 0.2) => {
            try {
                if (!audioContextRef.current) {
                    const AudioCtor = getAudioContextClass();
                    if (!AudioCtor) return;
                    audioContextRef.current = new AudioCtor();
                }

                const ctx = audioContextRef.current;
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
                gainNode.gain.setValueAtTime(volume, ctx.currentTime);

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.start();
                oscillator.stop(ctx.currentTime + duration / 1000);
            } catch {
                // beep 실패 시 무시
            }
        },
        []
    );

    const playKeyClickSound = useCallback(() => {
        if (isMuted) return;
        beep(800, 30, 0.2);
    }, [beep, isMuted]);

    // AudioContext 초기화 (사용자 상호작용 시)
    useEffect(() => {
        const handleUserInteraction = () => {
            if (audioContextRef.current) return;
            try {
                const AudioCtor = getAudioContextClass();
                if (!AudioCtor) return;
                audioContextRef.current = new AudioCtor();
            } catch {
                // AudioContext 초기화 실패 시 무시
            }
        };

        document.addEventListener("click", handleUserInteraction);
        document.addEventListener("keydown", handleUserInteraction);

        return () => {
            document.removeEventListener("click", handleUserInteraction);
            document.removeEventListener("keydown", handleUserInteraction);
        };
    }, []);

    // 속도/정확도 계산
    useEffect(() => {
        const progress = text.length > 0 ? (input.length / text.length) * 100 : 0;
        setProgress(progress);

        if (input.length > 0 && startTime !== null) {
            const currentTime = Date.now();
            const timeElapsedInMinutes = Math.max(
                5 / 60,
                (currentTime - startTime) / 60000
            );

            // Net KPM: 정확하게 입력한 자모 수만 카운트 (오타 자동 차감)
            let correctKeystrokes = 0;
            for (let i = 0; i < input.length && i < text.length; i++) {
                if (input[i] === text[i]) {
                    correctKeystrokes += countKeystrokes(input[i]);
                }
            }

            // 영어: WPM (1 word = 5 chars), 한국어: KPM (자모 기준)
            const rawSpeed = language === "english"
                ? correctKeystrokes / 5 / timeElapsedInMinutes
                : correctKeystrokes / timeElapsedInMinutes;

            let calculatedSpeed = Math.round(rawSpeed);

            // 12초 미만일 경우 상한 보정
            if (timeElapsedInMinutes < 0.2) {
                const cap = language === "english" ? 200 : 700;
                calculatedSpeed = Math.min(calculatedSpeed, cap);
            }

            setTypingSpeed(calculatedSpeed);

            const calculatedAccuracy = calculateHangulAccuracy(text, input);
            setAccuracy(calculatedAccuracy);
        } else {
            setTypingSpeed(0);
            setAccuracy(0);
        }
    }, [input, text, startTime, setProgress, language]);

    /** 현재 세션의 속도/정확도를 기록하고 평균 갱신 */
    const recordSession = useCallback(() => {
        if (typingSpeed <= 0 || accuracy <= 0) return;

        setAllSpeeds((prevSpeeds) => {
            const updatedSpeeds = [...prevSpeeds, typingSpeed];

            // 이상치 제거 (평균의 2배 이상인 값은 제외)
            const validSpeeds =
                updatedSpeeds.length > 1
                    ? updatedSpeeds.filter((speed) => {
                          const currentAvg =
                              updatedSpeeds.reduce(
                                  (acc, curr) => acc + curr,
                                  0
                              ) / updatedSpeeds.length;
                          return speed <= currentAvg * 2;
                      })
                    : updatedSpeeds;

            // 최근 값에 더 높은 가중치 부여
            let weightedSum = 0;
            let weightSum = 0;
            validSpeeds.forEach((speed, index) => {
                const weight = index + 1;
                weightedSum += speed * weight;
                weightSum += weight;
            });

            const newAverageSpeed =
                weightSum > 0
                    ? weightedSum / weightSum
                    : validSpeeds.reduce((acc, curr) => acc + curr, 0) /
                      validSpeeds.length;

            setAverageSpeed(Math.round(newAverageSpeed));
            return updatedSpeeds;
        });

        setAllAccuracies((prevAccuracies) => {
            const updatedAccuracies = [...prevAccuracies, accuracy];

            let weightedSum = 0;
            let weightSum = 0;
            updatedAccuracies.forEach((acc, index) => {
                const weight = index + 1;
                weightedSum += acc * weight;
                weightSum += weight;
            });

            const newAverageAccuracy =
                weightSum > 0
                    ? weightedSum / weightSum
                    : updatedAccuracies.reduce(
                          (acc, curr) => acc + curr,
                          0
                      ) / updatedAccuracies.length;

            setAverageAccuracy(Math.round(newAverageAccuracy));
            return updatedAccuracies;
        });
    }, [typingSpeed, accuracy]);

    /** 현재 메트릭 초기화 (세션 간 전환 시) */
    const resetCurrentMetrics = useCallback(() => {
        setInput("");
        setStartTime(null);
        setTypingSpeed(0);
        setAccuracy(0);
    }, []);

    /** 타이핑 시작 감지 (첫 타이핑 키 입력 시 호출) */
    const handleTypingStart = useCallback((e: React.KeyboardEvent) => {
        const isTypingKey =
            !e.repeat &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            !NON_TYPING_KEYS.has(e.key);

        if (isTypingKey && startTime === null) {
            setStartTime(Date.now());
        }
    }, [startTime]);

    return {
        input,
        setInput,
        typingSpeed,
        accuracy,
        allSpeeds,
        allAccuracies,
        averageSpeed,
        averageAccuracy,
        startTime,
        handleTypingStart,
        recordSession,
        resetCurrentMetrics,
        playKeyClickSound,
    };
}

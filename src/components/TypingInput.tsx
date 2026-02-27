import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import useTypingStore from "../store/store";
import proverbsData from "../data/proverbs.json";
import { calculateHangulAccuracy, countKeystrokes } from "../utils/hangulUtils";
import Keyboard from "./Keyboard";
import ProgressBar from "./ProgressBar";
import FallbackNotice from "./game/FallbackNotice";
import { useScreenSize } from "../hooks/useScreenSize";

type AudioContextClass = typeof AudioContext;

const getAudioContextClass = (): AudioContextClass | undefined => {
    const w = window as Window &
        typeof globalThis & { webkitAudioContext?: AudioContextClass };
    return w.AudioContext || w.webkitAudioContext;
};

const normalizeCode = (code: string): string => {
    if (code.startsWith("Key")) return code.slice(3).toLowerCase();
    if (code.startsWith("Digit")) return code.slice(5);

    const codeMap: Record<string, string> = {
        Backquote: "`",
        Minus: "-",
        Equal: "=",
        BracketLeft: "[",
        BracketRight: "]",
        Backslash: "\\",
        Semicolon: ";",
        Quote: "'",
        Comma: ",",
        Period: ".",
        Slash: "/",
        Space: "space",
        Enter: "enter",
        Tab: "tab",
        Backspace: "backspace",
        CapsLock: "capslock",
        ShiftLeft: "shiftleft",
        ShiftRight: "shiftright",
        ControlLeft: "controlleft",
        ControlRight: "controlright",
        AltLeft: "altleft",
        AltRight: "altright",
        MetaLeft: "metaleft",
        MetaRight: "metaright",
    };

    return codeMap[code] || code.toLowerCase();
};

const MODIFIER_KEYS = [
    "shiftleft",
    "shiftright",
    "controlleft",
    "controlright",
    "altleft",
    "altright",
    "metaleft",
    "metaright",
] as const;

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

const syncModifierKeys = (keys: string[], e: KeyboardEvent): string[] => {
    const next = keys.filter((key) => !MODIFIER_KEYS.includes(key as (typeof MODIFIER_KEYS)[number]));
    if (e.shiftKey) next.push("shiftleft");
    if (e.ctrlKey) next.push("controlleft");
    if (e.altKey) next.push("altleft");
    if (e.metaKey) next.push("metaleft");
    return [...new Set(next)];
};

const TypingInput: React.FC = () => {
    const text = useTypingStore((state) => state.text);
    const setProgress = useTypingStore((state) => state.setProgress);
    const darkMode = useTypingStore((state) => state.darkMode);
    const setText = useTypingStore((state) => state.setText);
    const language = useTypingStore((state) => state.language);

    const [input, setInput] = useState<string>("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [typingSpeed, setTypingSpeed] = useState<number>(0);
    const [accuracy, setAccuracy] = useState<number>(0);
    const [allSpeeds, setAllSpeeds] = useState<number[]>([]);
    const [allAccuracies, setAllAccuracies] = useState<number[]>([]);
    const [averageSpeed, setAverageSpeed] = useState<number>(0);
    const [averageAccuracy, setAverageAccuracy] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [pressedKeys, setPressedKeys] = useState<string[]>([]);
    const { isMobile, isShortScreen, isLargeScreen } = useScreenSize();
    const [platform, setPlatform] = useState<"mac" | "windows">("windows");
    const [textSource, setTextSource] = useState<"wikipedia" | "proverb-fallback">("proverb-fallback");
    const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const initializedRef = useRef(false);
    const isMuted = useTypingStore((state) => state.isMuted);
    const retroTheme = useTypingStore((state) => state.retroTheme);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const keyCode = normalizeCode(e.code);
        setPressedKeys((prevKeys) => {
            if (keyCode === "fn") {
                return syncModifierKeys(prevKeys, e);
            }
            return syncModifierKeys([...new Set([...prevKeys, keyCode])], e);
        });
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const keyCode = normalizeCode(e.code);
        setPressedKeys((prevKeys) =>
            syncModifierKeys(
                prevKeys.filter((key) => key !== keyCode && key !== "fn"),
                e
            )
        );
    }, []);

    useEffect(() => {
        const handleWindowBlur = () => setPressedKeys([]);
        const handleVisibilityChange = () => {
            if (document.hidden) setPressedKeys([]);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [handleKeyDown, handleKeyUp]);

    const getRandomProverb = useCallback((nextLanguage: "korean" | "english") => {
        const arr = proverbsData[nextLanguage];
        return arr[Math.floor(Math.random() * arr.length)];
    }, []);

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

    const fetchPracticeText = useCallback(async () => {
        const nextLanguageCode = language === "korean" ? "ko" : "en";
        try {
            const response = await fetch(`/api/wikipedia?lang=${nextLanguageCode}`);
            if (!response.ok) {
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
                setText((data as { text: string }).text.trim());
                setTextSource("wikipedia");
                setFallbackMessage(null);
                return;
            }

            setText(getRandomProverb(language));
            setTextSource("proverb-fallback");
            setFallbackMessage("위키 문서를 가져오지 못해 속담으로 연습 중입니다.");
        } catch {
            setText(getRandomProverb(language));
            setTextSource("proverb-fallback");
            setFallbackMessage("네트워크 오류로 속담 연습 모드로 전환되었습니다.");
        }
    }, [language, setText, getRandomProverb]);

    // 텍스트 초기화 (마운트 시, 언어 변경 시)
    useEffect(() => {
        void fetchPracticeText();
        setInput("");
        setStartTime(null);
        setTypingSpeed(0);
        setAccuracy(0);
        setProgress(0);

        if (!initializedRef.current) {
            initializedRef.current = true;
            if (inputRef.current) inputRef.current.focus();
        }
    }, [language, setProgress, fetchPracticeText]);

    // 안전장치: 비어있는 텍스트는 즉시 속담으로 교정
    useEffect(() => {
        if (!text || !text.trim()) {
            setText(getRandomProverb(language));
            setTextSource("proverb-fallback");
        }
    }, [text, language, setText, getRandomProverb]);

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
            // 입력이 없을 때는 0으로 설정
            setTypingSpeed(0);
            setAccuracy(0);
        }
    }, [input, text, startTime, setProgress, language]);

    useEffect(() => {
        const uaDataPlatform = (navigator as Navigator & {
            userAgentData?: { platform?: string };
        }).userAgentData?.platform;
        const platformValue = navigator.platform || "";
        const userAgent = navigator.userAgent || "";
        const detectSource = `${uaDataPlatform || ""} ${platformValue} ${userAgent}`;
        setPlatform(/mac|iphone|ipad|ipod/i.test(detectSource) ? "mac" : "windows");
    }, []);

    const playKeyClickSound = useCallback(() => {
        if (isMuted) return;
        beep(800, 30, 0.2);
    }, [beep, isMuted]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const lastChar = value.slice(-1);

        // 입력값이 비어있거나 백스페이스인 경우는 허용
        if (!value || value.length < input.length) {
            setInput(value);
            return;
        }

        // 스페이스바는 항상 허용
        if (lastChar === " ") {
            setInput(value);
            playKeyClickSound();
            return;
        }

        playKeyClickSound();
        setInput(value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isTypingKey =
            !e.repeat &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            !NON_TYPING_KEYS.has(e.key);

        if (isTypingKey && startTime === null) {
            setStartTime(Date.now());
        }

        if (e.key === "Enter") {
            // 현재 속도와 정확도가 0이 아닌 경우에만 기록
            if (typingSpeed > 0 && accuracy > 0) {
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

                    // 최근 값에 더 높은 가중치 부여 (최근 값일수록 더 중요하게 반영)
                    let weightedSum = 0;
                    let weightSum = 0;

                    validSpeeds.forEach((speed, index) => {
                        const weight = index + 1; // 인덱스가 클수록(최근 값일수록) 가중치가 높음
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

                    // 가중 평균 계산 (최근 값에 더 높은 가중치 부여)
                    let weightedSum = 0;
                    let weightSum = 0;

                    updatedAccuracies.forEach((acc, index) => {
                        const weight = index + 1; // 인덱스가 클수록(최근 값일수록) 가중치가 높음
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
            }

            // XP 지급 (정확도 기반, 최대 15)
            // 입력 필드 초기화 및 상태 초기화
            setInput("");
            setStartTime(null);
            setTypingSpeed(0);
            setAccuracy(0);
            void fetchPracticeText();
        }
    };

    const renderedText = useMemo(() => {
        return text.split("").map((char, index) => {
            let className = darkMode ? "text-slate-500" : "text-slate-400";

            if (index < input.length) {
                if (input[index] === char) {
                    className = "text-emerald-400 dark:text-emerald-400";
                } else {
                    className = "text-rose-500 dark:text-rose-400";
                }
            } else if (index === input.length) {
                className = darkMode
                    ? "text-white underline decoration-sky-400 decoration-2 underline-offset-4"
                    : "text-slate-800 underline decoration-sky-500 decoration-2 underline-offset-4";
            }

            return (
                <span key={index} className={className}>
                    {char}
                </span>
            );
        });
    }, [text, input, darkMode]);

    const progressBarWidth = useMemo(() => {
        const estimated = text.length * (isLargeScreen ? 22 : 16);
        const maxW = isLargeScreen ? 1100 : 760;
        return Math.min(maxW, Math.max(260, estimated));
    }, [text.length, isLargeScreen]);

    const lg = isLargeScreen;

    return (
        <div className={`w-full ${lg ? "" : "max-w-4xl mx-auto"} animate-panel-in ${lg ? "space-y-8" : "space-y-4 md:space-y-6"} my-auto`}>
            {/* 타이핑 영역 */}
            <div
                className={`${lg ? "px-12 py-10" : "px-6 py-6 md:px-8 md:py-8"} transition-all duration-300 border-2 ${
                    retroTheme === "mac-classic"
                        ? "rounded-xl border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)]"
                        : "rounded-none border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)]"
                }`}
            >
                <div className={`text-center ${lg ? "text-4xl leading-relaxed mb-8" : "text-2xl md:text-3xl leading-loose mb-6"} font-semibold tracking-wide`}>
                    {renderedText}
                </div>
                {fallbackMessage && (
                    <FallbackNotice
                        className="mb-4"
                        darkMode={darkMode}
                        message={fallbackMessage}
                        sourceLabel={
                            textSource === "wikipedia" ? "wikipedia" : "local proverbs.json"
                        }
                        onRetry={() => {
                            void fetchPracticeText();
                        }}
                    />
                )}
                <ProgressBar trackWidth={progressBarWidth} className={lg ? "mb-7" : "mb-5"} />
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    className={`w-full ${lg ? "px-5 py-4 text-2xl" : "px-4 py-3.5 text-xl"} outline-none border-2 ${
                        retroTheme === "mac-classic"
                            ? "rounded-lg border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)]"
                            : "rounded-none border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)]"
                    } focus:ring-2 focus:ring-[var(--retro-accent)]`}
                    placeholder=""
                    autoFocus
                />
            </div>

            {/* 키보드 */}
            {!isMobile && (
                <Keyboard
                    pressedKeys={pressedKeys}
                    language={language}
                    darkMode={darkMode}
                    platform={platform}
                    size={lg ? "large" : isShortScreen ? "compact" : "normal"}
                />
            )}

            {/* 통계 카드 */}
            <div className={`grid grid-cols-2 md:grid-cols-4 ${lg ? "gap-5" : "gap-3"}`}>
                <div className={`${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"} ${lg ? "px-6 py-5" : "px-4 py-3.5"} transition-all duration-300 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)]`}>
                    <div className={`${lg ? "text-sm mb-1.5" : "text-xs mb-1"} font-medium ${darkMode ? "text-sky-400" : "text-sky-600"}`}>
                        타이핑 속도
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`${lg ? "text-3xl" : "text-2xl"} font-bold tabular-nums text-[var(--retro-text)]`}>
                            {typingSpeed}
                        </span>
                        <span className={`${lg ? "text-sm" : "text-xs"} text-[var(--retro-text)]/70`}>{language === "english" ? "WPM" : "타/분"}</span>
                    </div>
                </div>
                <div className={`${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"} ${lg ? "px-6 py-5" : "px-4 py-3.5"} transition-all duration-300 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)]`}>
                    <div className={`${lg ? "text-sm mb-1.5" : "text-xs mb-1"} font-medium ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                        정확도
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`${lg ? "text-3xl" : "text-2xl"} font-bold tabular-nums text-[var(--retro-text)]`}>
                            {accuracy}
                        </span>
                        <span className={`${lg ? "text-sm" : "text-xs"} text-[var(--retro-text)]/70`}>%</span>
                    </div>
                </div>
                <div className={`${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"} ${lg ? "px-6 py-5" : "px-4 py-3.5"} transition-all duration-300 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)]`}>
                    <div className={`${lg ? "text-sm mb-1.5" : "text-xs mb-1"} font-medium ${darkMode ? "text-violet-400" : "text-violet-600"}`}>
                        평균 속도
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`${lg ? "text-3xl" : "text-2xl"} font-bold tabular-nums text-[var(--retro-text)]`}>
                            {allSpeeds.length > 0 ? averageSpeed : 0}
                        </span>
                        <span className={`${lg ? "text-sm" : "text-xs"} text-[var(--retro-text)]/70`}>{language === "english" ? "WPM" : "타/분"}</span>
                    </div>
                </div>
                <div className={`${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"} ${lg ? "px-6 py-5" : "px-4 py-3.5"} transition-all duration-300 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)]`}>
                    <div className={`${lg ? "text-sm mb-1.5" : "text-xs mb-1"} font-medium ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
                        평균 정확도
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`${lg ? "text-3xl" : "text-2xl"} font-bold tabular-nums text-[var(--retro-text)]`}>
                            {allAccuracies.length > 0 ? averageAccuracy : 0}
                        </span>
                        <span className={`${lg ? "text-sm" : "text-xs"} text-[var(--retro-text)]/70`}>%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypingInput;

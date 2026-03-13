import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import useTypingStore from "../store/store";
import Keyboard from "./Keyboard";
import ProgressBar from "./ProgressBar";
import { useScreenSize } from "../hooks/useScreenSize";
import { useKeyboardState } from "../hooks/useKeyboardState";
import { usePracticeText } from "../hooks/usePracticeText";
import type { PracticeSource } from "../hooks/usePracticeText";
import { useTypingMetrics } from "../hooks/useTypingMetrics";
import { useCustomTexts } from "../hooks/useCustomTexts";
import { useAuthContext } from "@/components/auth/AuthProvider";
import CustomTextManager from "./practice/CustomTextManager";
import { BookOpen, FileText, Settings2 } from "lucide-react";

const SOURCE_STORAGE_KEY = "keywork_practice_source";

const TypingInput: React.FC = () => {
    const text = useTypingStore((state) => state.text);
    const darkMode = useTypingStore((state) => state.darkMode);
    const language = useTypingStore((state) => state.language);
    const setProgress = useTypingStore((state) => state.setProgress);
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const ko = language === "korean";
    const rounded = retroTheme === "mac-classic";

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { isMobile, isShortScreen, isLargeScreen } = useScreenSize();
    const [platform, setPlatform] = useState<"mac" | "windows">("windows");

    // 텍스트 소스
    const { isLoggedIn } = useAuthContext();
    const [source, setSource] = useState<PracticeSource>(() => {
        if (typeof window === "undefined") return "proverbs";
        return (localStorage.getItem(SOURCE_STORAGE_KEY) as PracticeSource) || "proverbs";
    });
    const [showManager, setShowManager] = useState(false);

    const { texts: customTexts, loading: customLoading, addText, updateText, deleteText } = useCustomTexts(language);
    const effectiveSource = (!isLoggedIn || source !== "custom") ? "proverbs" : source;

    const { pressedKeys } = useKeyboardState();
    const { advanceToNextPrompt } = usePracticeText(effectiveSource, customTexts);
    const {
        input,
        setInput,
        typingSpeed,
        accuracy,
        allSpeeds,
        allAccuracies,
        averageSpeed,
        averageAccuracy,
        handleTypingStart,
        recordSession,
        resetCurrentMetrics,
        playKeyClickSound,
    } = useTypingMetrics();

    const handleSourceChange = useCallback((newSource: PracticeSource) => {
        setSource(newSource);
        localStorage.setItem(SOURCE_STORAGE_KEY, newSource);
        setShowManager(false);
    }, []);

    // 언어 변경 시 입력 초기화 + 포커스
    useEffect(() => {
        resetCurrentMetrics();
        setProgress(0);
    }, [language, setProgress, resetCurrentMetrics]);

    // 마운트 시 포커스
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    useEffect(() => {
        const uaDataPlatform = (navigator as Navigator & {
            userAgentData?: { platform?: string };
        }).userAgentData?.platform;
        const platformValue = navigator.platform || "";
        const userAgent = navigator.userAgent || "";
        const detectSource = `${uaDataPlatform || ""} ${platformValue} ${userAgent}`;
        setPlatform(/mac|iphone|ipad|ipod/i.test(detectSource) ? "mac" : "windows");
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value.replace(/\r?\n/g, " ");
        const lastChar = value.slice(-1);

        if (!value || value.length < input.length) {
            setInput(value);
            return;
        }

        if (lastChar === " ") {
            setInput(value);
            playKeyClickSound();
            return;
        }

        playKeyClickSound();
        setInput(value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        handleTypingStart(e);

        if (e.key === "Enter") {
            e.preventDefault();
            recordSession();
            resetCurrentMetrics();
            advanceToNextPrompt();
        }
    };

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
    }, [input]);

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
    const rnd = rounded ? "rounded-xl" : "rounded-none";

    return (
        <div className={`w-full ${lg ? "" : "max-w-4xl mx-auto"} animate-panel-in ${lg ? "space-y-8" : "space-y-4 md:space-y-6"} my-auto`}>
            {/* 소스 탭 */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    <button
                        onClick={() => handleSourceChange("proverbs")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${rnd} ${
                            effectiveSource === "proverbs"
                                ? "bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                                : "border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/60 hover:bg-[var(--retro-surface-alt)]"
                        }`}
                    >
                        <BookOpen className="h-3 w-3" />
                        {ko ? "속담" : "Proverbs"}
                    </button>
                    <button
                        onClick={() => isLoggedIn && handleSourceChange("custom")}
                        disabled={!isLoggedIn}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${rnd} ${
                            effectiveSource === "custom"
                                ? "bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                                : isLoggedIn
                                    ? "border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/60 hover:bg-[var(--retro-surface-alt)]"
                                    : "border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/30 cursor-not-allowed"
                        }`}
                    >
                        <FileText className="h-3 w-3" />
                        {ko ? "내 텍스트" : "My Texts"}
                    </button>
                </div>
                {effectiveSource === "custom" && (
                    <button
                        onClick={() => setShowManager((v) => !v)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--retro-text)]/60 hover:text-[var(--retro-text)] border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] hover:bg-[var(--retro-surface-alt)] transition-colors ${rnd}`}
                    >
                        <Settings2 className="h-3 w-3" />
                        {ko ? "관리" : "Manage"}
                    </button>
                )}
            </div>

            {/* 커스텀 텍스트 관리 패널 */}
            {showManager && effectiveSource === "custom" && (
                <div className={`border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)] p-4 ${rnd}`}>
                    <CustomTextManager
                        texts={customTexts}
                        loading={customLoading}
                        ko={ko}
                        rounded={rounded}
                        onAdd={addText}
                        onUpdate={updateText}
                        onDelete={deleteText}
                        onClose={() => setShowManager(false)}
                    />
                </div>
            )}

            {effectiveSource === "custom" && !customLoading && customTexts.length === 0 && (
                <div className={`border-2 border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 px-4 py-3 text-sm text-[var(--retro-text)]/70 ${rnd}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-semibold text-[var(--retro-text)]">
                                {ko ? "등록된 내 텍스트가 없어 속담으로 이어서 연습 중입니다." : "No custom text yet, so practice continues with proverbs."}
                            </p>
                            <p className="mt-1 text-xs text-[var(--retro-text)]/50">
                                {ko ? "관리에서 한국어/영어별 연습 문장을 추가하면 바로 내 텍스트 소스로 전환됩니다." : "Add practice lines in Manage for this language to switch the source immediately."}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowManager(true)}
                            className={`inline-flex items-center justify-center border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)] ${rnd}`}
                        >
                            {ko ? "텍스트 추가" : "Add text"}
                        </button>
                    </div>
                </div>
            )}

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
                <ProgressBar trackWidth={progressBarWidth} className={lg ? "mb-7" : "mb-5"} />
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    rows={1}
                    className={`w-full ${lg ? "px-5 py-4 text-2xl" : "px-4 py-3.5 text-xl"} outline-none border-2 ${
                        retroTheme === "mac-classic"
                            ? "rounded-lg border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)]"
                            : "rounded-none border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)]"
                    } focus:ring-2 focus:ring-[var(--retro-accent)] resize-none overflow-hidden leading-relaxed`}
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

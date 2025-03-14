import React, { useEffect, useRef, useState, useCallback } from "react";
import useTypingStore from "../store/store";
import quotesData from "../data/quotes.json";
import { calculateHangulAccuracy, countKeystrokes } from "../utils/hangulUtils";
import Keyboard from "./Keyboard";
import LanguageToggle from "./LanguageToggle";

const TypingInput: React.FC = () => {
    const text = useTypingStore((state) => state.text);
    const setProgress = useTypingStore((state) => state.setProgress);
    const darkMode = useTypingStore((state) => state.darkMode);
    const setText = useTypingStore((state) => state.setText);
    const [language, setLanguage] = useState<"korean" | "english">("korean");

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
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [keyClickSound, setKeyClickSound] = useState<HTMLAudioElement | null>(
        null
    );
    const [errorSound, setErrorSound] = useState<HTMLAudioElement | null>(null);
    const [isValidInput, setIsValidInput] = useState<boolean>(true);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Key 대신 Code를 사용
        const keyCode = e.code.replace("Key", "").toLowerCase();
        setPressedKeys((prevKeys) => [...new Set([...prevKeys, keyCode])]);
    }, []);

    const toggleLanguage = () => {
        const newLanguage = language === "korean" ? "english" : "korean";
        setLanguage(newLanguage);
        const randomQuote = getRandomQuote(newLanguage);
        setText(randomQuote);
        setInput("");
        setStartTime(null);
    };

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const keyCode = e.code.replace("Key", "").toLowerCase();
        setPressedKeys((prevKeys) => prevKeys.filter((key) => key !== keyCode));
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    const getRandomQuote = (language: "korean" | "english") => {
        const quotesArray = quotesData[language];
        const randomIndex = Math.floor(Math.random() * quotesArray.length);
        return quotesArray[randomIndex];
    };

    const createAudio = (urls: string[]): HTMLAudioElement => {
        const audio = new Audio();
        audio.preload = "auto";

        const sourceElements = urls.map((url) => {
            const source = document.createElement("source");
            source.src = url;
            source.type = url.endsWith("mp3") ? "audio/mpeg" : "audio/wav";
            return source;
        });

        sourceElements.forEach((source) => audio.appendChild(source));

        audio.onerror = (e) => {
            console.error("Audio error:", e);
            if (audio.src !== urls[urls.length - 1]) {
                audio.src = urls[urls.indexOf(audio.src) + 1];
            }
        };

        return audio;
    };

    const initSounds = useCallback(() => {
        const clickSoundUrls = [
            `${window.location.origin}/sounds/keyclick.mp3`,
            `${window.location.origin}/sounds/keyclick.wav`,
        ];
        const clickSound = createAudio(clickSoundUrls);
        setKeyClickSound(clickSound);

        const errorSoundUrls = [
            `${window.location.origin}/sounds/error.mp3`,
            `${window.location.origin}/sounds/error.wav`,
        ];
        const errSound = createAudio(errorSoundUrls);
        setErrorSound(errSound);
    }, []);

    useEffect(() => {
        const handleUserGesture = () => {
            initSounds();
            document.removeEventListener("click", handleUserGesture);
            document.removeEventListener("keypress", handleUserGesture);
        };

        document.addEventListener("click", handleUserGesture);
        document.addEventListener("keypress", handleUserGesture);

        const initialRandomQuote = getRandomQuote("korean");
        setText(initialRandomQuote);

        if (inputRef.current) {
            inputRef.current.focus();
        }

        return () => {
            document.removeEventListener("click", handleUserGesture);
            document.removeEventListener("keypress", handleUserGesture);
        };
    }, [setText, initSounds]);

    // 정확도를 계산하는 useEffect
    useEffect(() => {
        const progress = (input.length / text.length) * 100;
        setProgress(progress);

        if (input.length > 0 && startTime !== null) {
            const currentTime = Date.now();
            // 시작 시간에 약간의 지연을 고려 (반응 시간 보정)
            const adjustedStartTime = startTime + 500; // 500ms 지연 보정
            const timeElapsedInMinutes = Math.max(
                0.1,
                (currentTime - adjustedStartTime) / 60000
            );

            // 실제 키 입력 횟수를 계산
            const keystrokes = countKeystrokes(input);

            // 분당 타자수 계산 (실제 키 입력 횟수 기준)
            let calculatedSpeed = Math.round(keystrokes / timeElapsedInMinutes);

            // 짧은 시간 동안의 타수 계산 보정 (초기 타수가 비현실적으로 높게 나오는 것 방지)
            if (timeElapsedInMinutes < 0.2) {
                // 12초 미만일 경우
                calculatedSpeed = Math.min(calculatedSpeed, 1000);
            }

            // 언어별 보정 계수 적용
            const languageMultiplier = language === "korean" ? 1.2 : 1.0; // 한글 가중치 상향 (1.1 -> 1.2)
            calculatedSpeed = Math.round(calculatedSpeed * languageMultiplier);

            setTypingSpeed(calculatedSpeed);

            const calculatedAccuracy = calculateHangulAccuracy(text, input);
            setAccuracy(calculatedAccuracy);
        } else {
            // 입력이 없을 때는 0으로 설정
            setTypingSpeed(0);
            setAccuracy(0);
        }
    }, [input, text, startTime, setProgress, language]);

    const playSound = (sound: HTMLAudioElement | null) => {
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch((error) => {
                console.error("Error playing sound:", error);
                // 여기에 폴백 메커니즘을 추가할 수 있습니다.
                // 예: 다른 오디오 파일 시도 또는 시각적 피드백으로 대체
            });
        }
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768); // Adjust this breakpoint as needed
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
        };

        checkMobile();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const lastChar = value.slice(-1); // 마지막으로 입력된 문자

        // 입력값이 비어있거나 백스페이스인 경우는 허용
        if (!value || value.length < input.length) {
            setInput(value);
            if (value.length < input.length) {
                playSound(errorSound);
            }
            return;
        }

        setIsValidInput(true);

        // 스페이스바는 항상 허용
        if (lastChar === " ") {
            setInput(value);
            playSound(keyClickSound);
            return;
        }
        // 마지막 문자 검증
        const isKoreanChar = /[\u3131-\u3163\uAC00-\uD7A3]/.test(lastChar);
        const isEnglishOrSpecialChar = /^[\u0020-\u007E\u00A0-\u00FF]*$/.test(
            lastChar
        ); // 영문 및 특수문자 허용

        // 현재 언어와 입력값이 일치하지 않으면 무시
        if (
            (language === "korean" && !isKoreanChar) ||
            (language === "english" && !isEnglishOrSpecialChar)
        ) {
            playSound(errorSound);
            setIsValidInput(false);
            setTimeout(() => setIsValidInput(true), 1000);
            return;
        }

        setIsValidInput(true);

        if (input.length === 0 && startTime === null) {
            setStartTime(Date.now());
        }

        // 현재 언어 설정
        if (/[\u3131-\u3163\uAC00-\uD7A3]/.test(value)) {
            setLanguage("korean");
        } else if (/^[\u0020-\u007E\u00A0-\u00FF]*$/.test(value)) {
            setLanguage("english");
        }

        playSound(keyClickSound);
        setInput(value);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

            // 입력 필드 초기화 및 상태 초기화
            setInput("");
            setStartTime(null);
            setTypingSpeed(0);
            setAccuracy(0);
            // 현재 language 상태를 사용하여 새로운 인용구 가져오기
            const randomQuote = getRandomQuote(language);
            setText(randomQuote);
        }
    };

    const renderText = () => {
        return text.split("").map((char, index) => {
            let className = "text-gray-400"; // 기본 스타일

            if (index < input.length) {
                if (input[index] === char) {
                    className = "text-green-500 font-semibold"; // 올바르게 입력된 문자
                } else {
                    className = "text-red-500 font-semibold"; // 잘못 입력된 문자
                }
            }

            return (
                <span key={index} className={className}>
                    {char}
                </span>
            );
        });
    };

    return (
        <div className={`mt-10 w-full max-w-4xl mx-auto`}>
            <LanguageToggle
                language={language}
                toggleLanguage={toggleLanguage}
            />
            <div
                className={`p-4 border rounded-lg text-3xl font-semibold leading-relaxed tracking-wide ${
                    darkMode
                        ? "bg-gray-800 text-gray-100 border-gray-700"
                        : "bg-white text-gray-900 border-gray-300"
                }`}
            >
                <div className="text-center mb-4">{renderText()}</div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    className={`w-full p-2 text-xl border rounded transition-colors duration-200
                ${
                    darkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-100 text-black"
                }
                ${
                    isValidInput
                        ? darkMode
                            ? "border-gray-600"
                            : "border-gray-300"
                        : "border-red-500 animate-shake"
                }
                ${!isValidInput && "ring-2 ring-red-500"}
            `}
                    placeholder=""
                    autoFocus
                />
                {!isValidInput && (
                    <p className="text-red-500 text-sm mt-1">
                        {language === "korean"
                            ? "한글만 입력 가능합니다"
                            : "영문만 입력 가능합니다"}
                    </p>
                )}
            </div>
            {!isMobile && (
                <Keyboard
                    pressedKeys={pressedKeys}
                    language={language}
                    darkMode={darkMode}
                />
            )}
            <div className="mt-6 text-center grid grid-cols-2 gap-4">
                <p className="text-lg text-gray-600">
                    현재 타이핑 속도:{" "}
                    <span className="text-xl font-bold">{typingSpeed}</span>{" "}
                    타/분
                </p>
                <p className="text-lg text-gray-600">
                    현재 정확도:{" "}
                    <span className="text-xl font-bold">{accuracy}</span>%
                </p>
                <p className="text-lg text-gray-600">
                    평균 타이핑 속도:{" "}
                    <span className="text-xl font-bold">
                        {allSpeeds.length > 0 ? averageSpeed : 0}
                    </span>{" "}
                    타/분
                </p>
                <p className="text-lg text-gray-600">
                    평균 정확도:{" "}
                    <span className="text-xl font-bold">
                        {allAccuracies.length > 0 ? averageAccuracy : 0}
                    </span>
                    %
                </p>
            </div>
        </div>
    );
};

export default TypingInput;

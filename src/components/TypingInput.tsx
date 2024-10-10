import React, { useEffect, useRef, useState } from "react";
import useTypingStore from "../store/store";
import quotesData from "../data/quotes.json";
import { decomposeHangul } from "../utils/hangulUtils"; // 유틸리티 함수 가져오기

const TypingInput: React.FC = () => {
    const text = useTypingStore((state) => state.text);
    const setProgress = useTypingStore((state) => state.setProgress);
    const darkMode = useTypingStore((state) => state.darkMode);
    const setText = useTypingStore((state) => state.setText);

    const [input, setInput] = useState<string>("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [typingSpeed, setTypingSpeed] = useState<number>(0);
    const [accuracy, setAccuracy] = useState<number>(0);
    const [previousSpeed, setPreviousSpeed] = useState<number | null>(null);
    const [previousAccuracy, setPreviousAccuracy] = useState<number | null>(null);
    const [allSpeeds, setAllSpeeds] = useState<number[]>([]);
    const [allAccuracies, setAllAccuracies] = useState<number[]>([]);
    const [averageSpeed, setAverageSpeed] = useState<number>(0);
    const [averageAccuracy, setAverageAccuracy] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const getRandomQuote = (language: "korean" | "english") => {
        const quotesArray = quotesData[language];
        const randomIndex = Math.floor(Math.random() * quotesArray.length);
        return quotesArray[randomIndex];
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
        const initialRandomQuote = getRandomQuote("korean");
        setText(initialRandomQuote);
    }, [setText]);

    useEffect(() => {
        const progress = (input.length / text.length) * 100;
        setProgress(progress);

        if (input.length > 0 && startTime !== null) {
            const currentTime = Date.now();
            const timeElapsedInMinutes = (currentTime - startTime) / 60000;
            const charactersTyped = input.length;
            const calculatedSpeed = Math.round(charactersTyped / timeElapsedInMinutes);
            setTypingSpeed(calculatedSpeed);

            // 정확도 계산
            const decomposedText = decomposeHangul(text);
            const decomposedInput = decomposeHangul(input);
            let correctChars = 0;

            for (let i = 0; i < decomposedInput.length; i++) {
                if (decomposedInput[i] === decomposedText[i]) {
                    correctChars++;
                }
            }

            const calculatedAccuracy = Math.round((correctChars / Math.max(decomposedInput.length, decomposedText.length)) * 100);
            setAccuracy(calculatedAccuracy);
        }
    }, [input, setProgress, text, startTime]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (input.length === 0 && startTime === null) {
            setStartTime(Date.now());
        }

        setInput(value);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            // 현재 속도와 정확도 기록
            setPreviousSpeed(typingSpeed);
            setPreviousAccuracy(accuracy);

            setAllSpeeds((prevSpeeds) => {
                const updatedSpeeds = [...prevSpeeds, typingSpeed];
                const totalSpeed = updatedSpeeds.reduce((acc, curr) => acc + curr, 0);
                setAverageSpeed(Math.round(totalSpeed / updatedSpeeds.length));
                return updatedSpeeds;
            });

            setAllAccuracies((prevAccuracies) => {
                const updatedAccuracies = [...prevAccuracies, accuracy];
                const totalAccuracy = updatedAccuracies.reduce((acc, curr) => acc + curr, 0);
                setAverageAccuracy(Math.round(totalAccuracy / updatedAccuracies.length));
                return updatedAccuracies;
            });

            // 입력 필드 초기화 및 상태 초기화
            setInput("");
            setStartTime(null);
            setTypingSpeed(0);
            setAccuracy(100); // 정확도 초기화
            const randomQuote = getRandomQuote("korean");
            setText(randomQuote); // 새로운 문장 설정
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
                    className={`w-full p-2 text-xl border rounded ${
                        darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"
                    }`}
                    placeholder="여기에 타이핑하세요..."
                    autoFocus
                />
            </div>

            <div className="mt-6 text-center grid grid-cols-2 gap-4">
                <p className="text-lg text-gray-600">
                    현재 타이핑 속도: <span className="text-xl font-bold">{typingSpeed}</span> 타/분
                </p>
                <p className="text-lg text-gray-600">
                    현재 정확도: <span className="text-xl font-bold">{accuracy}</span>%
                </p>
                {previousSpeed !== null && (
                    <p className="text-lg text-gray-600">
                        이전 문장 타이핑 속도: <span className="text-xl font-bold">{previousSpeed}</span> 타/분
                    </p>
                )}
                {previousAccuracy !== null && (
                    <p className="text-lg text-gray-600">
                        이전 문장 정확도: <span className="text-xl font-bold">{previousAccuracy}</span>%
                    </p>
                )}
                <p className="text-lg text-gray-600">
                    평균 타이핑 속도: <span className="text-xl font-bold">{averageSpeed}</span> 타/분
                </p>
                <p className="text-lg text-gray-600">
                    평균 정확도: <span className="text-xl font-bold">{averageAccuracy}</span>%
                </p>
            </div>
        </div>
    );
};

export default TypingInput;

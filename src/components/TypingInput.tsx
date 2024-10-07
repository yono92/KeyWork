import React, { useEffect, useRef, useState } from "react";
import useTypingStore from "../store/store";
import quotesData from "../data/quotes.json"; // JSON 파일 import

const TypingInput: React.FC = () => {
    const text = useTypingStore((state) => state.text); // Zustand에서 텍스트 상태 가져오기
    const setProgress = useTypingStore((state) => state.setProgress); // 진행 상황 업데이트 함수 가져오기
    const darkMode = useTypingStore((state) => state.darkMode); // 다크모드 상태 가져오기
    const setText = useTypingStore((state) => state.setText); // 텍스트 설정 함수 가져오기

    const [input, setInput] = useState<string>(""); // 사용자 입력 값
    const [startTime, setStartTime] = useState<number | null>(null); // 타이핑 시작 시간
    const [wpm, setWpm] = useState<number>(0); // 현재 문장의 WPM 저장
    const [previousWpm, setPreviousWpm] = useState<number | null>(null); // 이전 문장의 WPM
    const [allWpm, setAllWpm] = useState<number[]>([]); // 모든 문장의 WPM 기록
    const [averageWpm, setAverageWpm] = useState<number>(0); // 평균 WPM
    const inputRef = useRef<HTMLInputElement>(null);

    // 문구를 랜덤으로 선택하는 함수
    const getRandomQuote = (language: "korean" | "english") => {
        const quotesArray = quotesData[language];
        const randomIndex = Math.floor(Math.random() * quotesArray.length);
        return quotesArray[randomIndex];
    };

    // 초기 랜덤 문구 설정 및 언어 전환 시 랜덤 문구 설정
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
        const initialRandomQuote = getRandomQuote("korean");
        setText(initialRandomQuote); // Zustand 상태 업데이트
    }, [setText]);

    useEffect(() => {
        const progress = (input.length / text.length) * 100;
        setProgress(progress);

        if (input.length > 0 && startTime !== null) {
            const currentTime = Date.now();
            const timeElapsedInMinutes = (currentTime - startTime) / 60000; // 경과 시간(분 단위)
            const wordsTyped = input.length / 5; // 5자를 1단어로 간주
            const calculatedWpm = wordsTyped / timeElapsedInMinutes;
            setWpm(Math.round(calculatedWpm));
        }
    }, [input, setProgress, text.length, startTime]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // 첫 입력 시 타이핑 시작 시간 기록
        if (input.length === 0 && startTime === null) {
            setStartTime(Date.now());
        }

        setInput(value);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // 엔터 키가 입력된 경우 처리
        if (e.key === "Enter") {
            setPreviousWpm(wpm); // 현재 문장의 WPM을 이전 WPM으로 저장

            // WPM 기록을 업데이트하고 평균 WPM 계산
            setAllWpm((prevWpm) => {
                const updatedWpm = [...prevWpm, wpm];
                const totalWpm = updatedWpm.reduce(
                    (acc, curr) => acc + curr,
                    0
                );
                setAverageWpm(Math.round(totalWpm / updatedWpm.length));
                return updatedWpm;
            });

            setInput(""); // 입력 필드 초기화
            setStartTime(null); // 타이핑 시작 시간 초기화
            setWpm(0); // WPM 초기화
            const randomQuote = getRandomQuote("korean"); // 새로운 랜덤 문구 선택
            setText(randomQuote); // Zustand에 새로운 문구 설정
        }
    };

    const renderText = () => {
        return text.split("").map((char, index) => {
            let className = "text-gray-400"; // 기본 스타일 (아직 입력되지 않은 텍스트)

            if (index < input.length) {
                if (input[index] === char) {
                    className = "text-green-500 font-semibold"; // 올바르게 입력된 텍스트
                } else {
                    className = "text-red-500 font-semibold"; // 잘못 입력된 텍스트
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
                className={`p-4 border rounded-lg text-3xl font-semibold leading-relaxed tracking-wide text-center ${
                    darkMode
                        ? "bg-gray-800 text-gray-100 border-gray-700"
                        : "bg-white text-gray-900 border-gray-300"
                }`}
            >
                {renderText()}
            </div>

            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-text"
                autoFocus
            />

            <div className="mt-6 text-center">
                <p className="text-lg text-gray-600">
                    현재 타이핑 속도:{" "}
                    <span className="text-xl font-bold">{wpm}</span> WPM
                </p>
                {previousWpm !== null && (
                    <p className="text-lg text-gray-600">
                        이전 문장의 타이핑 속도:{" "}
                        <span className="text-xl font-bold">{previousWpm}</span>{" "}
                        WPM
                    </p>
                )}
                <p className="text-lg text-gray-600">
                    평균 타이핑 속도:{" "}
                    <span className="text-xl font-bold">{averageWpm}</span> WPM
                </p>
            </div>
        </div>
    );
};

export default TypingInput;

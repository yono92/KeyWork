import React, { useEffect } from "react";
import Header from "./Header";
import ProgressBar from "./ProgressBar";
import TypingInput from "./TypingInput";
import FallingWordsGame from "./FallingWordsGame";
import DarkModeToggle from "./DarkModeToggle";
import Footer from "./Footer";
import useTypingStore from "../store/store";

// Props 타입 정의 추가
interface MainLayoutProps {
    gameMode: "practice" | "falling-words";
}

// Props 타입을 컴포넌트에 적용
const MainLayout: React.FC<MainLayoutProps> = ({ gameMode }) => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const setGameMode = useTypingStore((state) => state.setGameMode);

    // URL에서 받은 gameMode를 스토어에 동기화
    useEffect(() => {
        setGameMode(gameMode);
    }, [gameMode, setGameMode]);

    return (
        <div className={`${darkMode ? "dark" : ""} flex flex-col min-h-screen`}>
            <div className="flex-grow bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        {gameMode === "falling-words" ? (
                            <FallingWordsGame />
                        ) : (
                            <>
                                <ProgressBar />
                                <TypingInput />
                            </>
                        )}
                    </div>
                </main>
            </div>
            <Footer />
            <DarkModeToggle />
        </div>
    );
};

export default MainLayout;

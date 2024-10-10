import React from "react";
import Header from "./Header";
import ProgressBar from "./ProgressBar";
import TypingText from "./TypingText";
import TypingInput from "./TypingInput";
import DarkModeToggle from "./DarkModeToggle";
import useTypingStore from "../store/store";

const MainLayout: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);

    return (
        <div className={darkMode ? "dark" : ""}>
            <div className="min-h-screen bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
                {" "}
                {/* 배경색과 텍스트 색상 수정 */}
                <Header />
                <main className="flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-4xl">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-lg">KeyWork</div>
                        </div>
                        <ProgressBar />
                        <TypingInput />
                    </div>
                </main>
                <DarkModeToggle />
            </div>
        </div>
    );
};

export default MainLayout;

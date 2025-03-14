import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import useTypingStore from "./store/store";
import RightSidebar from "./components/RightSidebar";
import useMediaQuery from "./hooks/useMediaQuery ";

const App: React.FC = () => {
    const isMobile = useMediaQuery("(max-width: 768px)"); // 반응형 처리
    const darkMode = useTypingStore((state) => state.darkMode);
    const isSmallScreen = useMediaQuery("(max-width: 1535px)");

    return (
        <div className={`${darkMode ? "dark" : ""} relative`}>
            <div className="flex">
                <div className="flex-grow">
                    <Routes>
                        <Route
                            path="/practice"
                            element={<MainLayout gameMode="practice" />}
                        />
                        <Route
                            path="/falling-words"
                            element={<MainLayout gameMode="falling-words" />}
                        />
                        <Route path="/" element={<Navigate to="/practice" />} />
                    </Routes>
                </div>
                {/* 프로덕션 + 데스크톱에서만 사이드바 표시 */}
                {!isMobile && !isSmallScreen && <RightSidebar />}
            </div>
        </div>
    );
};

export default App;

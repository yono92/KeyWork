import React from "react";
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
                    <MainLayout />
                </div>
                {/* 프로덕션 + 데스크톱에서만 사이드바 표시 */}
                {!isMobile && !isSmallScreen && <RightSidebar />}
            </div>
        </div>
    );
};

export default App;

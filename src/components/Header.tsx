import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    const navigate = useNavigate();
    const location = useLocation();

    const gameModes = [
        { id: "practice", name: "문장연습" },
        { id: "falling-words", name: "소나기(BETA)" },
    ] as const;

    const handleGameModeSelect = (mode: "practice" | "falling-words") => {
        navigate(`/${mode}`);
        setIsMenuOpen(false);
    };

    // 홈으로 이동하는 함수 추가
    const navigateToHome = () => {
        navigate("/");
    };

    return (
        <header className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div
                className="flex items-center"
                onClick={navigateToHome} // 클릭 이벤트 추가
                style={{ cursor: "pointer" }}
            >
                {/* 로고 이미지를 글씨 앞에 배치 */}
                {/* <img src={logo} alt="KeyWork Logo" className="h-10 mr-2" /> */}
                <div className="text-2xl font-bold">KeyWork</div>
            </div>
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-xl"
                >
                    {isMenuOpen ? "✕" : "☰"}
                </button>

                {isMenuOpen && (
                    <>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                            {gameModes.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() =>
                                        handleGameModeSelect(mode.id)
                                    }
                                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700
                                        ${
                                            location.pathname === `/${mode.id}`
                                                ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                                                : "text-gray-700 dark:text-gray-300"
                                        }`}
                                >
                                    {mode.name}
                                </button>
                            ))}
                        </div>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-20 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;

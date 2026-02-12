import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import useTypingStore from "./store/store";
import SideNav from "./components/SideNav";

const App: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);

    return (
        <div className={`${darkMode ? "dark" : ""}`}>
            <div className="h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-[#0c1222] dark:via-[#111a2e] dark:to-[#0c1222]">
                <div className="h-full box-border p-2.5 md:p-3.5">
                    <div className="flex h-full gap-2.5 md:gap-3.5">
                        <SideNav />
                        <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;

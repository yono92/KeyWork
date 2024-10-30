import React from "react";
import Header from "./Header";
import ProgressBar from "./ProgressBar";
import TypingInput from "./TypingInput";
import DarkModeToggle from "./DarkModeToggle";
import Footer from "./Footer";
import useTypingStore from "../store/store";

const MainLayout: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);

    return (
        <div className={`${darkMode ? "dark" : ""} flex flex-col min-h-screen`}>
            <div className="flex-grow bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        {/* <h1 className="text-2xl font-bold mb-6">KeyWork</h1> */}
                        <ProgressBar />
                        <TypingInput />
                    </div>
                </main>
            </div>
            <Footer />
            <DarkModeToggle />
        </div>
    );
};

export default MainLayout;

import React from "react";
import useTypingStore from "../store/store";
import ResponsiveCoupangAd from "./ResponsiveCoupangAd";

const RightSidebar: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);

    return (
        <aside
            className={`fixed top-20 right-4 w-[300px] // 광고 너비 조정
                rounded-lg shadow-lg overflow-hidden z-10 
                ${darkMode ? "bg-gray-800/50" : "bg-white/50"} 
                backdrop-blur-sm`}
            style={{ height: "auto", maxWidth: "300px" }} // 레이아웃 최적화
        >
            <div className="flex flex-col items-center gap-4">
                <ResponsiveCoupangAd />
            </div>
        </aside>
    );
};

export default RightSidebar;

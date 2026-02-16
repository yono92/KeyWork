import React from "react";

interface PauseOverlayProps {
    language: "korean" | "english";
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ language }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
        <div className="text-center">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">PAUSED</h2>
            <p className="text-sm sm:text-lg text-slate-300">
                {language === "korean" ? "ESC를 눌러 계속" : "Press ESC to continue"}
            </p>
        </div>
    </div>
);

export default PauseOverlay;

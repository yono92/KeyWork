import React from "react";
import useTypingStore from "../../store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PauseOverlayProps {
    language: "korean" | "english";
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ language }) => {
    const retroTheme = useTypingStore((s) => s.retroTheme);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 z-30">
            <Card className={`w-full max-w-xs sm:max-w-sm animate-panel-in ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
                <CardContent className="text-center px-8 py-7 sm:px-10 sm:py-8">
                    <Badge variant="secondary" className="mb-3">
                        ESC
                    </Badge>
                    <h2 className="text-3xl sm:text-5xl font-bold mb-3 text-[var(--retro-text)]">PAUSED</h2>
                    <p className="text-sm sm:text-lg text-[var(--retro-text)]/80">
                    {language === "korean" ? "ESC를 눌러 계속" : "Press ESC to continue"}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default PauseOverlay;

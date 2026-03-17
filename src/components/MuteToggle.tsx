import React, { useState, useRef, useEffect, useCallback } from "react";
import { VolumeX, Volume2, Volume1 } from "lucide-react";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";

interface MuteToggleProps {
    className?: string;
}

const MuteToggle: React.FC<MuteToggleProps> = ({ className = "" }) => {
    const isMuted = useTypingStore((state) => state.isMuted);
    const toggleMute = useTypingStore((state) => state.toggleMute);
    const volume = useTypingStore((state) => state.volume);
    const setVolume = useTypingStore((state) => state.setVolume);
    const [showSlider, setShowSlider] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
            setShowSlider(false);
        }
    }, []);

    useEffect(() => {
        if (showSlider) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showSlider, handleClickOutside]);

    const VolumeIcon = isMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div ref={wrapperRef} className="relative">
            <Button
                onClick={toggleMute}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setShowSlider((v) => !v);
                }}
                variant="ghost"
                size="icon"
                className={`${className} text-slate-700 dark:text-slate-200`}
                aria-label={isMuted ? "음소거 해제" : "음소거"}
                title="Right-click for volume"
            >
                <VolumeIcon size={16} />
            </Button>

            {showSlider && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 retro-panel bg-[var(--retro-surface)] p-2 z-50 w-8">
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(e) => setVolume(Number(e.target.value) / 100)}
                        className="w-20 h-2 accent-[var(--retro-accent)] cursor-pointer"
                        style={{
                            writingMode: "vertical-lr",
                            direction: "rtl",
                            height: 80,
                            width: 16,
                        }}
                        aria-label="Volume"
                    />
                    <p className="text-center text-[8px] font-bold mt-1 text-[var(--retro-text)]/70 tabular-nums">
                        {Math.round(volume * 100)}
                    </p>
                </div>
            )}
        </div>
    );
};

export default MuteToggle;

import React from "react";
import { BsVolumeMuteFill, BsVolumeUpFill } from "react-icons/bs";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";

interface MuteToggleProps {
    className?: string;
}

const MuteToggle: React.FC<MuteToggleProps> = ({ className = "" }) => {
    const isMuted = useTypingStore((state) => state.isMuted);
    const toggleMute = useTypingStore((state) => state.toggleMute);

    return (
        <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className={`${className} text-slate-700 dark:text-slate-200`}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
        >
            {isMuted ? (
                <BsVolumeMuteFill size={16} />
            ) : (
                <BsVolumeUpFill size={16} />
            )}
        </Button>
    );
};

export default MuteToggle;

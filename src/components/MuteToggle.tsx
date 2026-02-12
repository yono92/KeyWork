import React from "react";
import { BsVolumeMuteFill, BsVolumeUpFill } from "react-icons/bs";
import useTypingStore from "../store/store";

interface MuteToggleProps {
    className?: string;
}

const MuteToggle: React.FC<MuteToggleProps> = ({ className = "" }) => {
    const isMuted = useTypingStore((state) => state.isMuted);
    const toggleMute = useTypingStore((state) => state.toggleMute);

    return (
        <button
            onClick={toggleMute}
            className={`${className}
                w-9 h-9 flex items-center justify-center
                rounded-lg focus:outline-none
                transition-all duration-200 hover:-translate-y-0.5
                text-slate-500 hover:text-sky-600
                dark:text-slate-400 dark:hover:text-sky-400
                hover:bg-sky-50 dark:hover:bg-white/5
            `}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
        >
            {isMuted ? (
                <BsVolumeMuteFill size={16} />
            ) : (
                <BsVolumeUpFill size={16} />
            )}
        </button>
    );
};

export default MuteToggle;

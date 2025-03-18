import React from "react";
import { BsVolumeMuteFill, BsVolumeUpFill } from "react-icons/bs";
import useTypingStore from "../store/store";

const MuteToggle: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const isMuted = useTypingStore((state) => state.isMuted);
    const toggleMute = useTypingStore((state) => state.toggleMute);

    return (
        <button
            onClick={toggleMute}
            className={`fixed bottom-4 right-36 
                flex items-center gap-2 
                p-3 rounded-full shadow-lg 
                focus:outline-none
                transition-colors duration-200
                ${
                    darkMode
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }
            `}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
        >
            {isMuted ? (
                <BsVolumeMuteFill size={24} />
            ) : (
                <BsVolumeUpFill size={24} />
            )}
        </button>
    );
};

export default MuteToggle;

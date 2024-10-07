import React from "react";
import useTypingStore from "../store/store";

const ProgressBar: React.FC = () => {
    const progress = useTypingStore((state) => state.progress);

    return (
        <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
            <div
                className="h-full"
                style={{
                    width: `${progress}%`,
                    backgroundColor: "greenyellow",
                }}
            ></div>
        </div>
    );
};

export default ProgressBar;

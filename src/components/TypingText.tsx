import React from "react";
import useTypingStore from "../store/store";

const TypingText: React.FC = () => {
    const text = useTypingStore((state) => state.text);

    return (
        <p className="text-2xl leading-relaxed">
            {text.split("\n").map((line, index) => (
                <span key={index}>
                    {line}
                    <br />
                </span>
            ))}
        </p>
    );
};

export default TypingText;

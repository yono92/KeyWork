import React, { useRef } from "react";
import useTypingStore from "../../store/store";

interface GameInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    disabled?: boolean;
    placeholder?: string;
    inputRef?: React.Ref<HTMLInputElement>;
    className?: string;
}

const GameInput: React.FC<GameInputProps> = ({
    value,
    onChange,
    onSubmit,
    disabled,
    placeholder,
    inputRef,
    className,
}) => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const isComposingRef = useRef(false);

    return (
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (
                    e.key === "Enter" &&
                    !isComposingRef.current &&
                    !e.nativeEvent.isComposing &&
                    onSubmit
                ) {
                    onSubmit();
                }
            }}
            onCompositionStart={() => {
                isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
                isComposingRef.current = false;
            }}
            disabled={disabled}
            className={`px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                darkMode
                    ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                    : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
            } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 ${className ?? "w-full"}`}
            placeholder={placeholder}
            autoComplete="off"
        />
    );
};

export default GameInput;

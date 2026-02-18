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
    const pendingSubmitRef = useRef(false);

    return (
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    if (isComposingRef.current || e.nativeEvent.isComposing) {
                        // 한국어 IME 조합 중 Enter → 조합 종료 후 submit 예약
                        pendingSubmitRef.current = true;
                    } else if (onSubmit) {
                        onSubmit();
                    }
                }
            }}
            onCompositionStart={() => {
                isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
                isComposingRef.current = false;
                // 조합 완료된 최종 값 동기화
                onChange(e.currentTarget.value);
                if (pendingSubmitRef.current) {
                    pendingSubmitRef.current = false;
                    // React 상태 업데이트 후 submit 실행
                    setTimeout(() => {
                        if (onSubmit) onSubmit();
                    }, 0);
                }
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

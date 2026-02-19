import React, { useRef } from "react";
import useTypingStore from "../../store/store";
import { Input } from "@/components/ui/input";

interface GameInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    inputRef?: React.Ref<HTMLInputElement>;
    className?: string;
}

const GameInput: React.FC<GameInputProps> = ({
    value,
    onChange,
    onSubmit,
    disabled,
    placeholder,
    ariaLabel,
    inputRef,
    className,
}) => {
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const isComposingRef = useRef(false);
    const pendingSubmitRef = useRef(false);

    return (
        <Input
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
            name="game-input"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            inputMode="text"
            aria-label={ariaLabel ?? placeholder ?? "Game input"}
            className={`h-auto px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg outline-none border-2 disabled:opacity-50 ${
                retroTheme === "mac-classic"
                    ? "rounded-lg border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)]"
                    : "rounded-none border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)]"
            } focus:ring-2 focus:ring-[var(--retro-accent)] ${className ?? "w-full"}`}
            placeholder={placeholder}
        />
    );
};

export default GameInput;

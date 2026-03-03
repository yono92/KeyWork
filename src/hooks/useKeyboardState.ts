import { useState, useCallback, useEffect } from "react";

const normalizeCode = (code: string): string => {
    if (code.startsWith("Key")) return code.slice(3).toLowerCase();
    if (code.startsWith("Digit")) return code.slice(5);

    const codeMap: Record<string, string> = {
        Backquote: "`",
        Minus: "-",
        Equal: "=",
        BracketLeft: "[",
        BracketRight: "]",
        Backslash: "\\",
        Semicolon: ";",
        Quote: "'",
        Comma: ",",
        Period: ".",
        Slash: "/",
        Space: "space",
        Enter: "enter",
        Tab: "tab",
        Backspace: "backspace",
        CapsLock: "capslock",
        ShiftLeft: "shiftleft",
        ShiftRight: "shiftright",
        ControlLeft: "controlleft",
        ControlRight: "controlright",
        AltLeft: "altleft",
        AltRight: "altright",
        MetaLeft: "metaleft",
        MetaRight: "metaright",
    };

    return codeMap[code] || code.toLowerCase();
};

const MODIFIER_KEYS = [
    "shiftleft",
    "shiftright",
    "controlleft",
    "controlright",
    "altleft",
    "altright",
    "metaleft",
    "metaright",
] as const;

const syncModifierKeys = (keys: string[], e: KeyboardEvent): string[] => {
    const next = keys.filter((key) => !MODIFIER_KEYS.includes(key as (typeof MODIFIER_KEYS)[number]));
    if (e.shiftKey) next.push("shiftleft");
    if (e.ctrlKey) next.push("controlleft");
    if (e.altKey) next.push("altleft");
    if (e.metaKey) next.push("metaleft");
    return [...new Set(next)];
};

/**
 * 키보드 물리 키 상태 추적 — Keyboard 시각 컴포넌트에 전달용
 */
export function useKeyboardState() {
    const [pressedKeys, setPressedKeys] = useState<string[]>([]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const keyCode = normalizeCode(e.code);
        setPressedKeys((prevKeys) => {
            if (keyCode === "fn") {
                return syncModifierKeys(prevKeys, e);
            }
            return syncModifierKeys([...new Set([...prevKeys, keyCode])], e);
        });
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const keyCode = normalizeCode(e.code);
        setPressedKeys((prevKeys) =>
            syncModifierKeys(
                prevKeys.filter((key) => key !== keyCode && key !== "fn"),
                e
            )
        );
    }, []);

    useEffect(() => {
        const handleWindowBlur = () => setPressedKeys([]);
        const handleVisibilityChange = () => {
            if (document.hidden) setPressedKeys([]);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [handleKeyDown, handleKeyUp]);

    return { pressedKeys };
}

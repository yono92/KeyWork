import React from "react";

type KeyboardSize = "compact" | "normal" | "large";

interface KeyboardProps {
    pressedKeys: string[];
    language: "english" | "korean";
    darkMode: boolean;
    platform: "mac" | "windows";
    compact?: boolean;
    size?: KeyboardSize;
}

const ENGLISH_LAYOUT_BASE = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
    ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
    ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter"],
    ["Shift-L", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift-R"],
];

const KOREAN_LAYOUT_BASE = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
    ["Tab", "ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ", "[", "]", "\\"],
    ["Caps", "ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ", ";", "'", "Enter"],
    ["Shift-L", "ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ", ",", ".", "/", "Shift-R"],
];

const WINDOWS_BOTTOM_ROW = ["Ctrl-L", "Win", "Alt-L", "Space", "Alt-R", "Fn", "Ctrl-R"];
const MAC_BOTTOM_ROW = ["Fn", "Ctrl-L", "Option-L", "Cmd-L", "Space", "Cmd-R", "Option-R"];

const Keyboard: React.FC<KeyboardProps> = ({
    pressedKeys = [],
    language = "english",
    darkMode = false,
    platform = "windows",
    compact = false,
    size: sizeProp,
}) => {
    const size: KeyboardSize = sizeProp ?? (compact ? "compact" : "normal");
    const baseLayout = language === "korean" ? KOREAN_LAYOUT_BASE : ENGLISH_LAYOUT_BASE;
    const bottomRow = platform === "mac" ? MAC_BOTTOM_ROW : WINDOWS_BOTTOM_ROW;
    const layout = [...baseLayout, bottomRow];

    const SPECIAL_KEY_MAP: Record<string, string[]> = {
        Backspace: ["backspace"],
        Tab: ["tab"],
        Caps: ["capslock"],
        Enter: ["enter"],
        "Shift-L": ["shiftleft"],
        "Shift-R": ["shiftright"],
        Space: ["space"],
        "Ctrl-L": ["controlleft"],
        "Ctrl-R": ["controlright"],
        Win: ["metaleft"],
        "Alt-L": ["altleft"],
        "Alt-R": ["altright"],
        "Option-L": ["altleft"],
        "Option-R": ["altright"],
        "Cmd-L": ["metaleft"],
        "Cmd-R": ["metaright"],
    };

    const getKeyClass = (key: string): string => {
        // 한글-영문 키 매핑 추가
        const koreanToEnglish: { [key: string]: string } = {
            ㅂ: "q",
            ㅈ: "w",
            ㄷ: "e",
            ㄱ: "r",
            ㅅ: "t",
            ㅛ: "y",
            ㅕ: "u",
            ㅑ: "i",
            ㅐ: "o",
            ㅔ: "p",
            ㅁ: "a",
            ㄴ: "s",
            ㅇ: "d",
            ㄹ: "f",
            ㅎ: "g",
            ㅗ: "h",
            ㅓ: "j",
            ㅏ: "k",
            ㅣ: "l",
            ㅋ: "z",
            ㅌ: "x",
            ㅊ: "c",
            ㅍ: "v",
            ㅠ: "b",
            ㅜ: "n",
            ㅡ: "m",
        };

        const isKeyPressed = () => {
            if (SPECIAL_KEY_MAP[key]) {
                return SPECIAL_KEY_MAP[key].some((mappedKey) =>
                    pressedKeys.includes(mappedKey)
                );
            }

            const lowercaseKey = key.toLowerCase();
            if (language === "korean" && koreanToEnglish[key]) {
                return pressedKeys.includes(koreanToEnglish[key]);
            }
            return pressedKeys.includes(lowercaseKey);
        };

        const pressed = isKeyPressed();

        let baseClass = "flex items-center justify-center rounded-lg cursor-pointer transition-all duration-75 ease-out font-semibold select-none ";

        if (darkMode) {
            if (pressed) {
                baseClass += "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)] border border-sky-400/50 scale-[0.97] ";
            } else {
                baseClass += "bg-[#1e2a3e] text-slate-300 border border-white/[0.06] hover:bg-[#253349] hover:text-white ";
            }
        } else {
            if (pressed) {
                baseClass += "bg-sky-400 text-white shadow-lg shadow-sky-400/30 border border-sky-300 scale-[0.97] ";
            } else {
                baseClass += "bg-white text-slate-700 border border-slate-200/80 shadow-sm hover:bg-slate-50 hover:shadow-md ";
            }
        }

        const S = {
            compact: {
                key: "w-8 h-8 text-xs", wide: "w-16 h-8 text-[11px]", mid: "w-14 h-8 text-[11px]",
                shift: "w-20 h-8 text-[11px]", space: "w-40 h-8 text-[11px]", cmd: "w-16 h-7 text-[10px]", mod: "w-12 h-7 text-[10px]",
            },
            normal: {
                key: "w-9 h-9 text-sm", wide: "w-18 h-9 text-xs", mid: "w-15 h-9 text-xs",
                shift: "w-22 h-9 text-xs", space: "w-44 h-9 text-xs", cmd: "w-20 h-9 text-[11px]", mod: "w-14 h-9 text-[11px]",
            },
            large: {
                key: "flex-1 h-14 text-base", wide: "flex-[1.7] h-14 text-sm", mid: "flex-[1.5] h-14 text-sm",
                shift: "flex-[2] h-14 text-sm", space: "flex-[5] h-14 text-sm", cmd: "flex-[1.5] h-14 text-xs", mod: "flex-1 h-14 text-xs",
            },
        }[size];

        switch (key) {
            case "Backspace":
            case "Enter":
                return baseClass + S.wide;
            case "Tab":
            case "Caps":
                return baseClass + S.mid;
            case "Shift-L":
            case "Shift-R":
                return baseClass + S.shift;
            case "Space":
                return baseClass + S.space;
            case "Cmd-L":
            case "Cmd-R":
                return baseClass + S.cmd;
            case "Option-L":
            case "Option-R":
            case "Ctrl-L":
            case "Ctrl-R":
            case "Alt-L":
            case "Alt-R":
            case "Win":
            case "Fn":
                return baseClass + S.mod;
            default:
                return baseClass + S.key;
        }
    };

    const renderKey = (key: string) => {
        const displayKey = key
            .replace(/-[LR]$/, "")
            .replace("Option", "Opt");
        return (
            <div key={key} className={getKeyClass(key)}>
                {displayKey}
            </div>
        );
    };

    const isLg = size === "large";
    const wrapPad = { compact: "px-3 py-2.5", normal: "px-4 py-3", large: "px-8 py-5 w-full" }[size];
    const rowGap = { compact: "gap-[3px] mb-[3px]", normal: "gap-1 mb-1", large: "gap-2 mb-2 w-full" }[size];

    return (
        <div
            className={`
                flex flex-col items-center ${wrapPad} rounded-2xl ${isLg ? "" : "mx-auto"}
                ${
                    darkMode
                        ? "bg-white/[0.02] border border-white/[0.05]"
                        : "bg-slate-50/50 border border-slate-200/40"
                }
            `}
        >
            {layout.map((row, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className={`flex ${isLg ? "" : "justify-center"} ${rowGap}`}
                >
                    {row.map(renderKey)}
                </div>
            ))}
        </div>
    );
};

export default React.memo(Keyboard);

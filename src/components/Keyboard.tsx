import React from "react";

interface KeyboardProps {
    pressedKeys: string[];
    language: "english" | "korean";
    darkMode: boolean;
    platform: "mac" | "windows";
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
}) => {
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
        Fn: ["fn"],
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
        
        let baseClass = `
            flex items-center justify-center 
            border rounded-md shadow-md cursor-pointer 
            transition-all duration-100 ease-in-out 
            text-sm font-bold
        `;

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

        if (darkMode) {
            baseClass += ` 
                border-gray-600 
                ${
                    isKeyPressed()
                        ? "bg-blue-700 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }
            `;
        } else {
            baseClass += ` 
                border-gray-400 
                ${
                    isKeyPressed()
                        ? "bg-blue-200 text-gray-800"
                        : "bg-white text-gray-800 hover:bg-gray-100"
                }
            `;
        }

        if (isKeyPressed()) {
            baseClass += " transform translate-y-px shadow-sm";
        }

        switch (key) {
            case "Backspace":
                return baseClass + " w-24 h-12";
            case "Tab":
            case "Caps":
                return baseClass + " w-20 h-12";
            case "Enter":
                return baseClass + " w-24 h-12";
            case "Shift-L":
            case "Shift-R":
                return baseClass + " w-28 h-12";
            case "Space":
                return baseClass + " w-64 h-12";
            case "Cmd-L":
            case "Cmd-R":
            case "Option-L":
            case "Option-R":
            case "Ctrl-L":
            case "Ctrl-R":
            case "Alt-L":
            case "Alt-R":
            case "Win":
            case "Fn":
                return baseClass + " w-20 h-12";
            default:
                return baseClass + " w-12 h-12";
        }
    };

    const renderKey = (key: string) => {
        const displayKey = key
            .replace(/-[LR]$/, "")
            .replace("Cmd", "Command")
            .replace("Option", "Opt");
        return (
            <div key={key} className={getKeyClass(key)}>
                {displayKey}
            </div>
        );
    };

    return (
        <div
            className={`
            flex flex-col items-center p-6 rounded-xl shadow-lg max-w-4xl mx-auto my-8
            ${darkMode ? "bg-gray-800" : "bg-gray-200"}
        `}
        >
            {layout.map((row, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="flex justify-center mb-2"
                >
                    {row.map(renderKey)}
                </div>
            ))}
        </div>
    );
};

export default React.memo(Keyboard);

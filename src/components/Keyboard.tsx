import React from "react";

const Keyboard = ({
    pressedKeys = [],
    language = "english",
    darkMode = false,
}) => {
    const englishLayout = [
        [
            "`",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "-",
            "=",
            "Backspace",
        ],
        [
            "Tab",
            "Q",
            "W",
            "E",
            "R",
            "T",
            "Y",
            "U",
            "I",
            "O",
            "P",
            "[",
            "]",
            "\\",
        ],
        [
            "Caps",
            "A",
            "S",
            "D",
            "F",
            "G",
            "H",
            "J",
            "K",
            "L",
            ";",
            "'",
            "Enter",
        ],
        ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift"],
        ["Ctrl", "Win", "Alt", "Space", "Alt", "Fn", "Ctrl"],
    ];

    const koreanLayout = [
        [
            "`",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "-",
            "=",
            "Backspace",
        ],
        [
            "Tab",
            "ㅂ",
            "ㅈ",
            "ㄷ",
            "ㄱ",
            "ㅅ",
            "ㅛ",
            "ㅕ",
            "ㅑ",
            "ㅐ",
            "ㅔ",
            "[",
            "]",
            "\\",
        ],
        [
            "Caps",
            "ㅁ",
            "ㄴ",
            "ㅇ",
            "ㄹ",
            "ㅎ",
            "ㅗ",
            "ㅓ",
            "ㅏ",
            "ㅣ",
            ";",
            "'",
            "Enter",
        ],
        [
            "Shift",
            "ㅋ",
            "ㅌ",
            "ㅊ",
            "ㅍ",
            "ㅠ",
            "ㅜ",
            "ㅡ",
            ",",
            ".",
            "/",
            "Shift",
        ],
        ["Ctrl", "Win", "Alt", "Space", "Alt", "Fn", "Ctrl"],
    ];

    const layout = language === "korean" ? koreanLayout : englishLayout;

    const getKeyClass = (key) => {
        let baseClass = `
            flex items-center justify-center 
            border rounded-md shadow-md cursor-pointer 
            transition-all duration-100 ease-in-out 
            text-sm font-bold
        `;

        if (darkMode) {
            baseClass += ` 
                border-gray-600 
                ${
                    pressedKeys?.includes(key)
                        ? "bg-blue-700 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }
            `;
        } else {
            baseClass += ` 
                border-gray-400 
                ${
                    pressedKeys?.includes(key)
                        ? "bg-blue-200 text-gray-800"
                        : "bg-white text-gray-800 hover:bg-gray-100"
                }
            `;
        }

        if (pressedKeys?.includes(key)) {
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
            case "Shift":
                return baseClass + " w-28 h-12";
            case "Space":
                return baseClass + " w-64 h-12";
            default:
                return baseClass + " w-12 h-12";
        }
    };

    return (
        <div
            className={`
            flex flex-col items-center p-6 rounded-xl shadow-lg max-w-4xl mx-auto my-8
            ${darkMode ? "bg-gray-800" : "bg-gray-200"}
        `}
        >
            {layout.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center mb-2">
                    {row.map((key) => (
                        <div key={key} className={getKeyClass(key)}>
                            {key}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default Keyboard;
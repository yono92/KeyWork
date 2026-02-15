import React from "react";
import { render } from "@testing-library/react";
import DictationGame from "../../src/components/DictationGame";
import FallingWordsGame from "../../src/components/FallingWordsGame";
import TypingDefenseGame from "../../src/components/TypingDefenseGame";
import TypingInput from "../../src/components/TypingInput";
import TypingRaceGame from "../../src/components/TypingRaceGame";
import WordChainGame from "../../src/components/WordChainGame";
import useTypingStore from "../../src/store/store";

describe("game components smoke", () => {
    beforeEach(() => {
        useTypingStore.setState({
            darkMode: false,
            progress: 0,
            text: "Start typing practice.",
            input: "",
            gameMode: "practice",
            language: "korean",
            isMuted: true,
            highScore: 0,
            difficulty: "normal",
            mobileMenuOpen: false,
        });
    });

    it("renders TypingInput", () => {
        const { container } = render(<TypingInput />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders FallingWordsGame", () => {
        const { container } = render(<FallingWordsGame />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders TypingDefenseGame", () => {
        const { container } = render(<TypingDefenseGame />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders TypingRaceGame", () => {
        const { container } = render(<TypingRaceGame />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders DictationGame", () => {
        const { container } = render(<DictationGame />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders WordChainGame", () => {
        const { container } = render(<WordChainGame />);
        expect(container.firstChild).toBeTruthy();
    });
});

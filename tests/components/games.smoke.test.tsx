import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import FallingWordsGame from "../../src/components/FallingWordsGame";
import TypingInput from "../../src/components/TypingInput";
import WordChainGame from "../../src/components/WordChainGame";
import TetrisGame from "../../src/components/TetrisGame";
import useTypingStore from "../../src/store/store";

describe("game components smoke", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
        useTypingStore.setState({
            darkMode: false,
            progress: 0,
            text: "Start typing practice.",
            gameMode: "practice",
            language: "korean",
            isMuted: true,
            highScore: 0,
            difficulty: "normal",
            mobileMenuOpen: false,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders TypingInput", () => {
        const { container } = render(<TypingInput />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders FallingWordsGame", () => {
        const { container } = render(<FallingWordsGame />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders WordChainGame", () => {
        const { container } = render(<WordChainGame />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders TetrisGame", () => {
        const { container } = render(<TetrisGame />);
        expect(container.firstChild).toBeTruthy();
    });
});

import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import DictationGame from "../../src/components/DictationGame";
import FallingWordsGame from "../../src/components/FallingWordsGame";
import TypingDefenseGame from "../../src/components/TypingDefenseGame";
import TypingInput from "../../src/components/TypingInput";
import TypingRaceGame from "../../src/components/TypingRaceGame";
import WordChainGame from "../../src/components/WordChainGame";
import TetrisGame from "../../src/components/TetrisGame";
import useTypingStore from "../../src/store/store";

describe("game components smoke", () => {
    beforeEach(() => {
        // smoke 테스트에서는 비동기 데이터 로딩 완료를 기다리지 않으므로
        // fetch를 pending 상태로 고정해 act 경고를 방지한다.
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
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

    it("renders TetrisGame", () => {
        const { container } = render(<TetrisGame />);
        expect(container.firstChild).toBeTruthy();
    });
});

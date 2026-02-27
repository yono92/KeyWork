import React from "react";
import { render, screen } from "@testing-library/react";
import MainLayout from "../../src/components/MainLayout";
import useTypingStore from "../../src/store/store";

vi.mock("../../src/components/TypingInput", () => ({
    default: () => <div data-testid="typing-input" />,
}));
vi.mock("../../src/components/FallingWordsGame", () => ({
    default: () => <div data-testid="falling-words" />,
}));
vi.mock("../../src/components/WordChainGame", () => ({
    default: () => <div data-testid="word-chain" />,
}));
vi.mock("../../src/components/TypingRunnerGame", () => ({
    default: () => <div data-testid="typing-runner" />,
}));
vi.mock("../../src/components/TetrisGame", () => ({
    default: () => <div data-testid="tetris" />,
}));

describe("MainLayout", () => {
    beforeEach(() => {
        useTypingStore.setState({
            darkMode: false,
            progress: 0,
            text: "Start typing practice.",
            input: "",
            gameMode: "practice",
            language: "korean",
            isMuted: false,
            highScore: 0,
            difficulty: "normal",
            mobileMenuOpen: false,
        });
    });

    it("renders practice view", () => {
        render(<MainLayout gameMode="practice" />);
        expect(screen.getByTestId("typing-input")).toBeInTheDocument();
    });

    it("renders falling words view", () => {
        render(<MainLayout gameMode="falling-words" />);
        expect(screen.getByTestId("falling-words")).toBeInTheDocument();
    });

    it("renders tetris view", () => {
        render(<MainLayout gameMode="tetris" />);
        expect(screen.getByTestId("tetris")).toBeInTheDocument();
    });
});

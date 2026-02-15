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
vi.mock("../../src/components/TypingDefenseGame", () => ({
    default: () => <div data-testid="typing-defense" />,
}));
vi.mock("../../src/components/TypingRaceGame", () => ({
    default: () => <div data-testid="typing-race" />,
}));
vi.mock("../../src/components/DictationGame", () => ({
    default: () => <div data-testid="dictation" />,
}));
vi.mock("../../src/components/WordChainGame", () => ({
    default: () => <div data-testid="word-chain" />,
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
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AppFrame from "../../src/components/AppFrame";
import DarkModeToggle from "../../src/components/DarkModeToggle";
import Footer from "../../src/components/Footer";
import Header from "../../src/components/Header";
import Keyboard from "../../src/components/Keyboard";
import LanguageToggle from "../../src/components/LanguageToggle";
import Logo from "../../src/components/Logo";
import MuteToggle from "../../src/components/MuteToggle";
import ProgressBar from "../../src/components/ProgressBar";
import useTypingStore from "../../src/store/store";

describe("UI components", () => {
    beforeEach(() => {
        globalThis.__TEST_PATHNAME__ = "/practice";
        useTypingStore.setState({
            darkMode: false,
            progress: 25,
            text: "Start typing practice.",
            input: "",
            gameMode: "practice",
            language: "english",
            isMuted: false,
            highScore: 0,
            difficulty: "normal",
            mobileMenuOpen: false,
        });
    });

    it("renders logo and footer", () => {
        render(
            <>
                <Logo />
                <Footer />
            </>
        );
        expect(screen.getByText("Key")).toBeInTheDocument();
        expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });

    it("renders header title based on language/path", () => {
        render(<Header />);
        expect(screen.getByText("Practice")).toBeInTheDocument();
    });

    it("toggles dark/language/mute state via buttons", () => {
        const { container } = render(
            <>
                <DarkModeToggle />
                <LanguageToggle />
                <MuteToggle />
            </>
        );
        const buttons = container.querySelectorAll("button");
        fireEvent.click(buttons[0]);
        fireEvent.click(buttons[1]);
        fireEvent.click(buttons[2]);
        expect(useTypingStore.getState().darkMode).toBe(true);
        expect(useTypingStore.getState().language).toBe("korean");
        expect(useTypingStore.getState().isMuted).toBe(true);
    });

    it("renders progress bar and keyboard", () => {
        const { container } = render(
            <>
                <ProgressBar trackWidth={200} />
                <Keyboard
                    pressedKeys={["a"]}
                    language="english"
                    darkMode={false}
                    platform="windows"
                />
            </>
        );
        expect(container.querySelectorAll("div").length).toBeGreaterThan(1);
    });

    it("renders app frame children", () => {
        render(
            <AppFrame>
                <div>child</div>
            </AppFrame>
        );
        expect(screen.getByText("child")).toBeInTheDocument();
    });
});

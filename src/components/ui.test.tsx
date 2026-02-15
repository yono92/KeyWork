import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AppFrame from "./AppFrame";
import DarkModeToggle from "./DarkModeToggle";
import Footer from "./Footer";
import Header from "./Header";
import Keyboard from "./Keyboard";
import LanguageToggle from "./LanguageToggle";
import Logo from "./Logo";
import MuteToggle from "./MuteToggle";
import ProgressBar from "./ProgressBar";
import useTypingStore from "../store/store";

describe("UI components", () => {
    beforeEach(() => {
        globalThis.__TEST_PATHNAME__ = "/practice";
        useTypingStore.setState({
            darkMode: false,
            progress: 25,
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
        expect(screen.getByText("문장연습")).toBeInTheDocument();
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
        expect(useTypingStore.getState().language).toBe("english");
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

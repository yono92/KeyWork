import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import * as nav from "next/navigation";
import SideNav from "../../src/components/SideNav";
import useTypingStore from "../../src/store/store";

describe("SideNav", () => {
    beforeEach(() => {
        globalThis.__TEST_PATHNAME__ = "/practice";
        const mockPush = (nav as unknown as { __mockPush: ReturnType<typeof vi.fn> }).__mockPush;
        mockPush.mockClear();
        useTypingStore.setState({
            darkMode: false,
            progress: 0,
            text: "Start typing practice.",
            gameMode: "practice",
            language: "english",
            isMuted: false,
            highScore: 0,
            difficulty: "normal",
            mobileMenuOpen: false,
        });
    });

    it("renders menu labels by language", () => {
        render(<SideNav />);
        expect(screen.getAllByText("Practice").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Word Chain").length).toBeGreaterThan(0);
    });

    it("calls router push when visible menu is clicked", () => {
        render(<SideNav />);
        const target = screen.getAllByRole("button", { name: "Word Chain" })[0];
        fireEvent.click(target);
        const mockPush = (nav as unknown as { __mockPush: ReturnType<typeof vi.fn> }).__mockPush;
        expect(mockPush).toHaveBeenCalledWith("/word-chain");
    });

    it("can navigate to tetris mode", () => {
        render(<SideNav />);
        const target = screen.getAllByRole("button", { name: "Tetris" })[0];
        fireEvent.click(target);
        const mockPush = (nav as unknown as { __mockPush: ReturnType<typeof vi.fn> }).__mockPush;
        expect(mockPush).toHaveBeenCalledWith("/tetris");
    });
});

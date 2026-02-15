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
            input: "",
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
    });

    it("calls router push when menu is clicked", () => {
        render(<SideNav />);
        const target = screen.getAllByRole("button", { name: "Falling Words" })[0];
        fireEvent.click(target);
        const mockPush = (nav as unknown as { __mockPush: ReturnType<typeof vi.fn> }).__mockPush;
        expect(mockPush).toHaveBeenCalledWith("/falling-words");
    });
});

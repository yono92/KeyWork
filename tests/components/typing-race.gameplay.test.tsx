import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TypingRaceGame from "../../src/components/TypingRaceGame";
import proverbsData from "../../src/data/proverbs.json";
import useTypingStore from "../../src/store/store";

describe("TypingRaceGame gameplay", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(Math, "random").mockReturnValue(0);

        useTypingStore.setState({
            darkMode: false,
            language: "english",
            isMuted: true,
            difficulty: "normal",
            retroTheme: "win98",
            xp: 0,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        act(() => {
            vi.runOnlyPendingTimers();
        });
        vi.useRealTimers();
    });

    it("starts countdown after start button click", () => {
        const { unmount } = render(<TypingRaceGame />);

        const startButton = screen.getByRole("button", { name: "Start" });
        const input = screen.getByRole("textbox");

        expect(input).toBeDisabled();
        act(() => {
            fireEvent.click(startButton);
        });
        expect(input).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();

        unmount();
    });

    it("moves to next round when sentence is completed", () => {
        const { unmount } = render(<TypingRaceGame />);

        act(() => {
            fireEvent.click(screen.getByRole("button", { name: "Start" }));
        });
        act(() => {
            vi.advanceTimersByTime(2600);
        });

        const sentence = proverbsData.english[0];
        const input = screen.getByRole("textbox");
        act(() => {
            fireEvent.change(input, { target: { value: sentence } });
        });

        const roundLabel = screen.getByText("Round").parentElement;
        expect(roundLabel).toHaveTextContent("2");
        expect(screen.getAllByText("20 WPM").length).toBeGreaterThan(0);

        act(() => {
            vi.advanceTimersByTime(600);
        });
        unmount();
    });
});

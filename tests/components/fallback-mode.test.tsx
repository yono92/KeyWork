import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TypingInput from "../../src/components/TypingInput";
import FallingWordsGame from "../../src/components/FallingWordsGame";
import useTypingStore from "../../src/store/store";

describe("fallback mode UI", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
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
            retroTheme: "win98",
            xp: 0,
            _hydrated: true,
        });
    });

    it("shows practice fallback notice when wikipedia request fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

        render(<TypingInput />);

        await waitFor(() => {
            expect(
                screen.getByText(/속담 연습 모드로 전환되었습니다/)
            ).toBeInTheDocument();
        });
    });

    it("shows falling words fallback notice when krdict request fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));

        render(<FallingWordsGame />);

        await waitFor(() => {
            expect(
                screen.getByText(/로컬 단어로 진행 중입니다/)
            ).toBeInTheDocument();
        });
    });
});

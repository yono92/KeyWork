import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TypingInput from "../../src/components/TypingInput";
import FallingWordsGame from "../../src/components/FallingWordsGame";
import useTypingStore from "../../src/store/store";

vi.mock("@/components/auth/AuthProvider", () => ({
    useAuthContext: () => ({
        user: null,
        profile: null,
        isLoggedIn: false,
    }),
}));

describe("fallback mode UI", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
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
            retroTheme: "win98",
            xp: 0,
            _hydrated: true,
        });
    });

    it("does not show practice fallback notice in local corpus mode", () => {
        render(<TypingInput />);
        expect(screen.queryByText(/속담 연습 모드로 전환되었습니다/)).not.toBeInTheDocument();
    });

    it("shows falling words fallback notice when krdict request fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));

        render(<FallingWordsGame />);

        await waitFor(() => {
            expect(
                screen.getByText(/기본 단어장으로 진행합니다/)
            ).toBeInTheDocument();
        });
    });
});

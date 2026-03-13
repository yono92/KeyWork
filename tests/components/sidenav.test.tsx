import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import * as nav from "next/navigation";
import SideNav from "../../src/components/SideNav";
import useTypingStore from "../../src/store/store";

const authContext = {
    user: null,
    profile: null,
    isLoggedIn: false,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateNickname: vi.fn(),
};

const userStatsState = {
    stats: null as null | {
        progression: {
            level: number;
            progressPercent: number;
        };
    },
    loading: false,
};

vi.mock("../../src/components/auth/AuthProvider", () => ({
    useAuthContext: () => authContext,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../src/hooks/useUserStats", () => ({
    useUserStats: () => userStatsState,
}));

describe("SideNav", () => {
    beforeEach(() => {
        globalThis.__TEST_PATHNAME__ = "/practice";
        const mockPush = (nav as unknown as { __mockPush: ReturnType<typeof vi.fn> }).__mockPush;
        mockPush.mockClear();
        Object.assign(authContext, {
            user: null,
            profile: null,
            isLoggedIn: false,
            loading: false,
        });
        Object.assign(userStatsState, {
            stats: null,
            loading: false,
        });
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

    it("keeps the account section visible while auth is loading", () => {
        Object.assign(authContext, {
            loading: true,
        });

        render(<SideNav />);

        expect(screen.getAllByRole("button", { name: "Checking account..." })[0]).toBeDisabled();
        expect(screen.getAllByRole("button", { name: "Leaderboard" })[0]).toBeInTheDocument();
    });

    it("shows the player level in the account section for logged-in users", () => {
        Object.assign(authContext, {
            user: { id: "user-1" },
            profile: { nickname: "PlayerOne", avatar_config: null },
            isLoggedIn: true,
            loading: false,
        });
        Object.assign(userStatsState, {
            stats: { progression: { level: 7, progressPercent: 42 } },
        });

        render(<SideNav />);

        expect(screen.getByLabelText("Level 7, 42% progress")).toBeInTheDocument();
    });
});

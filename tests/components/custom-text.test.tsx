import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TypingInput from "@/components/TypingInput";
import CustomTextManager from "@/components/practice/CustomTextManager";
import useTypingStore from "@/store/store";

const mocks = vi.hoisted(() => ({
    auth: {
        isLoggedIn: false,
    },
    customTexts: {
        texts: [] as Array<{
            id: number;
            user_id: string;
            title: string;
            content: string;
            language: string;
            created_at: string;
            updated_at: string;
        }>,
        loading: false,
        addText: vi.fn(),
        updateText: vi.fn(),
        deleteText: vi.fn(),
    },
    practice: {
        advanceToNextPrompt: vi.fn(),
    },
}));

vi.mock("@/components/auth/AuthProvider", () => ({
    useAuthContext: () => ({
        user: mocks.auth.isLoggedIn ? { id: "user-1" } : null,
        profile: null,
        isLoggedIn: mocks.auth.isLoggedIn,
    }),
}));

vi.mock("@/hooks/useCustomTexts", () => ({
    useCustomTexts: () => mocks.customTexts,
}));

vi.mock("@/hooks/usePracticeText", () => ({
    usePracticeText: () => mocks.practice,
}));

describe("custom text UI", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mocks.auth.isLoggedIn = false;
        mocks.customTexts.texts = [];
        mocks.customTexts.loading = false;
        useTypingStore.setState({
            darkMode: false,
            progress: 0,
            text: "테스트 문장입니다",
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

    it("disables the custom text source for signed-out users", () => {
        render(<TypingInput />);

        expect(screen.getByRole("button", { name: "내 텍스트" })).toBeDisabled();
    });

    it("shows a fallback notice when custom source is selected without saved texts", () => {
        mocks.auth.isLoggedIn = true;
        localStorage.setItem("keywork_practice_source", "custom");

        render(<TypingInput />);

        expect(
            screen.getByText("등록된 내 텍스트가 없어 속담으로 이어서 연습 중입니다.")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "텍스트 추가" })).toBeInTheDocument();
    });

    it("surfaces save errors inside the custom text manager", async () => {
        const failingAdd = vi.fn().mockRejectedValue(new Error("insert failed"));

        render(
            <CustomTextManager
                texts={[]}
                loading={false}
                ko
                rounded={false}
                onAdd={failingAdd}
                onUpdate={vi.fn()}
                onDelete={vi.fn()}
                onClose={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "추가" }));
        fireEvent.change(screen.getByPlaceholderText("예: 뉴스 기사, 소설 첫 문장..."), {
            target: { value: "긴 연습 문장" },
        });
        fireEvent.change(screen.getByPlaceholderText("연습할 텍스트를 입력하세요..."), {
            target: { value: "사용자 정의 연습 텍스트입니다." },
        });
        fireEvent.click(screen.getByRole("button", { name: "저장" }));

        await waitFor(() => {
            expect(screen.getByText("저장 중 문제가 발생했습니다. 다시 시도해 주세요.")).toBeInTheDocument();
        });
    });
});

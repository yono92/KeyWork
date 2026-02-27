import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "../../app/page";

describe("app/page", () => {
    it("renders mode selection landing page", () => {
        render(<HomePage />);
        expect(screen.getByText("타이핑 게임 모드 선택")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "바로 시작" })).toHaveAttribute("href", "/practice");
        expect(screen.getByRole("link", { name: /테트리스/ })).toHaveAttribute("href", "/tetris");
    });
});

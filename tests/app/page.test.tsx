import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "../../app/page";

describe("app/page", () => {
    it("renders quick start link to /practice", () => {
        render(<HomePage />);
        const startLink = screen.getByRole("link", { name: "바로 시작" });
        expect(startLink).toHaveAttribute("href", "/practice");
    });
});

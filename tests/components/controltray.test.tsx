import React from "react";
import { render, screen } from "@testing-library/react";
import ControlTray from "../../src/components/navigation/ControlTray";

vi.mock("../../src/components/ThemeToggle", () => ({
    default: ({ className = "", compact = false }: { className?: string; compact?: boolean }) => (
        <button type="button" data-testid="theme-toggle" data-compact={compact} className={className}>
            theme
        </button>
    ),
}));

vi.mock("../../src/components/FxToggle", () => ({
    default: ({ className = "" }: { className?: string }) => (
        <button type="button" data-testid="fx-toggle" className={className}>
            fx
        </button>
    ),
}));

vi.mock("../../src/components/MuteToggle", () => ({
    default: ({ className = "" }: { className?: string }) => (
        <button type="button" data-testid="mute-toggle" className={className}>
            mute
        </button>
    ),
}));

vi.mock("../../src/components/LanguageToggle", () => ({
    default: ({ className = "" }: { className?: string }) => (
        <button type="button" data-testid="language-toggle" className={className}>
            lang
        </button>
    ),
}));

vi.mock("../../src/components/DarkModeToggle", () => ({
    default: ({ className = "" }: { className?: string }) => (
        <button type="button" data-testid="darkmode-toggle" className={className}>
            dark
        </button>
    ),
}));

describe("ControlTray", () => {
    it("renders full layout as five-column tray", () => {
        const { container } = render(<ControlTray />);
        const tray = container.firstElementChild;

        expect(tray).toHaveClass("grid");
        expect(tray).toHaveClass("grid-cols-5");
        expect(screen.getByTestId("theme-toggle")).toHaveAttribute("data-compact", "false");
    });

    it("renders compact layout as single column before lg", () => {
        const { container } = render(<ControlTray variant="compact" />);
        const tray = container.firstElementChild;

        expect(tray?.className).toContain("grid-cols-1");
        expect(tray?.className).toContain("lg:grid-cols-5");
        expect(screen.getByTestId("theme-toggle")).toHaveAttribute("data-compact", "true");
    });
});

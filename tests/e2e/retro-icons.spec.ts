import { test } from "@playwright/test";

const SCREENSHOTS_DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Icons & Progress Bar", () => {
    test("Practice with retro progress bar", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        // Type something to show progress
        const input = page.locator("textarea");
        if (await input.isVisible()) {
            await input.fill("테스트");
            await page.waitForTimeout(500);
        }
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/icons-progress-bar.png`, fullPage: false });
    });
});

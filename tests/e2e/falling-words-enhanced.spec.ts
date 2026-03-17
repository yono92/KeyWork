import { test } from "@playwright/test";
const DIR = "tests/e2e/screenshots/retro-theme";

test.describe("FallingWords Enhanced", () => {
    test("Game in progress with words falling", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/falling-words");
        await page.waitForTimeout(1500);
        // Start the game
        const startBtn = page.locator('button:has-text("시작")');
        if (await startBtn.isVisible()) await startBtn.click();
        await page.waitForTimeout(5000); // Wait for countdown + words to spawn
        await page.screenshot({ path: `${DIR}/falling-enhanced-gameplay.png` });
    });

    test("Dark mode gameplay", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("darkMode", "true");
        });
        await page.goto("/falling-words");
        await page.waitForTimeout(1500);
        const startBtn = page.locator('button:has-text("시작")');
        if (await startBtn.isVisible()) await startBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${DIR}/falling-enhanced-dark.png` });
    });
});

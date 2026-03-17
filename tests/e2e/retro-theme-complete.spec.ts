import { test } from "@playwright/test";

const SCREENSHOTS_DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Complete Retro Theme Audit", () => {
    test("FallingWords arcade scorebar + bezel", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/falling-words");
        await page.waitForTimeout(1500);
        // Start game
        const startBtn = page.locator('button:has-text("시작")');
        if (await startBtn.isVisible()) {
            await startBtn.click();
            await page.waitForTimeout(4000); // Wait for countdown
        }
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/complete-falling-arcade.png`, fullPage: false });
    });

    test("Defense game with bezel", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/typing-defense");
        await page.waitForTimeout(1500);
        const easyBtn = page.locator('button:has-text("Easy")');
        if (await easyBtn.isVisible()) {
            await easyBtn.click();
            await page.waitForTimeout(2000);
        }
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/complete-defense-bezel.png`, fullPage: false });
    });

    test("FX toggle with phosphor indicator", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("darkMode", "true");
            localStorage.setItem("phosphorColor", "green");
        });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/complete-fx-phosphor-indicator.png`, fullPage: false });
    });
});

import { test } from "@playwright/test";

const SCREENSHOTS_DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Final Retro Theme Audit", () => {
    test("Dark mode phosphor glow on stats", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("darkMode", "true");
            localStorage.setItem("phosphorColor", "green");
        });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/final-dark-phosphor-green-stats.png`, fullPage: false });
    });

    test("Dark mode amber phosphor", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("darkMode", "true");
            localStorage.setItem("phosphorColor", "amber");
        });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/final-dark-phosphor-amber-stats.png`, fullPage: false });
    });

    test("Dictation with cassette (started)", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/dictation");
        await page.waitForTimeout(1500);
        // Click Easy to start game
        const easyBtn = page.locator('button:has-text("Easy")');
        if (await easyBtn.isVisible()) {
            await easyBtn.click();
            await page.waitForTimeout(1500);
        }
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/final-dictation-cassette-playing.png`, fullPage: false });
    });

    test("Win98 with title buttons", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("retroTheme", "win98");
        });
        await page.goto("/tetris");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/final-win98-tetris.png`, fullPage: false });
    });
});

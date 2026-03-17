import { test } from "@playwright/test";

const SCREENSHOTS_DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Retro Theme V2 Audit", () => {
    test("Falling words INSERT COIN", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/falling-words");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-falling-words-insert-coin.png`, fullPage: false });
    });

    test("Dictation cassette tape", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/dictation");
        await page.waitForTimeout(2000);
        // Start game to see cassette
        const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
        if (await startBtn.isVisible()) {
            await startBtn.click();
            await page.waitForTimeout(1000);
        }
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-dictation-cassette.png`, fullPage: false });
    });

    test("Word chain retro bubbles", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/word-chain");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-word-chain.png`, fullPage: false });
    });

    test("Desktop light win98 explicit", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        // Force win98 theme
        await page.addInitScript(() => {
            localStorage.setItem("retroTheme", "win98");
        });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-desktop-win98-explicit.png`, fullPage: false });
    });

    test("Desktop dark phosphor green", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("darkMode", "true");
            localStorage.setItem("phosphorColor", "green");
        });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-desktop-dark-phosphor-green.png`, fullPage: false });
    });

    test("Desktop dark phosphor amber", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem("darkMode", "true");
            localStorage.setItem("phosphorColor", "amber");
        });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-desktop-dark-phosphor-amber.png`, fullPage: false });
    });

    test("Tetris with accent", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/tetris");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-tetris-accent.png`, fullPage: false });
    });
});

import { test } from "@playwright/test";

const SCREENSHOTS_DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Retro Theme Audit", () => {
    test("Desktop 1920x1080 - light win98", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-light-win98.png`, fullPage: false });
    });

    test("Desktop 1920x1080 - dark win98", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(1500);
        // Toggle dark mode
        await page.evaluate(() => {
            document.documentElement.classList.add("dark");
            localStorage.setItem("darkMode", "true");
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-dark-win98.png`, fullPage: false });
    });

    test("Desktop 1920x1080 - light mac-classic", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(1500);
        // Toggle to mac-classic
        await page.evaluate(() => {
            document.documentElement.setAttribute("data-retro-theme", "mac-classic");
            localStorage.setItem("retroTheme", "mac-classic");
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-light-mac.png`, fullPage: false });
    });

    test("Desktop 1920x1080 - dark mac-classic", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(1500);
        await page.evaluate(() => {
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-retro-theme", "mac-classic");
            localStorage.setItem("darkMode", "true");
            localStorage.setItem("retroTheme", "mac-classic");
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-dark-mac.png`, fullPage: false });
    });

    test("Mobile 375x812 - light win98", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/mobile-light-win98.png`, fullPage: false });
    });

    test("Desktop FX OFF", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(1500);
        await page.evaluate(() => {
            localStorage.setItem("fxEnabled", "false");
        });
        await page.reload();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-fx-off.png`, fullPage: false });
    });

    test("Tetris page", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/tetris");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-tetris.png`, fullPage: false });
    });

    test("Falling words page", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/falling-words");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/desktop-falling-words.png`, fullPage: false });
    });
});

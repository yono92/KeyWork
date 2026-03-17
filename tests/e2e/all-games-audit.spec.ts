import { test } from "@playwright/test";
const DIR = "tests/e2e/screenshots/retro-theme";

test.describe("All Games Visual Audit", () => {
    test("Practice - light", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-practice-light.png` });
    });

    test("Practice - dark", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => { localStorage.setItem("darkMode", "true"); });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-practice-dark.png` });
    });

    test("Falling Words - start screen", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/falling-words");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-falling-start.png` });
    });

    test("Falling Words - gameplay dark", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => { localStorage.setItem("darkMode", "true"); });
        await page.goto("/falling-words");
        await page.waitForTimeout(1500);
        const btn = page.locator('button:has-text("시작")');
        if (await btn.isVisible()) await btn.click();
        await page.waitForTimeout(6000);
        await page.screenshot({ path: `${DIR}/all-falling-dark-gameplay.png` });
    });

    test("Word Chain - gameplay", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/word-chain");
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${DIR}/all-wordchain.png` });
    });

    test("Word Chain - dark", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => { localStorage.setItem("darkMode", "true"); });
        await page.goto("/word-chain");
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${DIR}/all-wordchain-dark.png` });
    });

    test("Typing Runner - start", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/typing-runner");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-runner-start.png` });
    });

    test("Typing Runner - dark", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => { localStorage.setItem("darkMode", "true"); });
        await page.goto("/typing-runner");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-runner-dark.png` });
    });

    test("Tetris - start", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/tetris");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-tetris-start.png` });
    });

    test("Tetris - dark", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => { localStorage.setItem("darkMode", "true"); });
        await page.goto("/tetris");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-tetris-dark.png` });
    });

    test("Mobile - practice", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-mobile-practice.png` });
    });

    test("Mobile - falling words", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("/falling-words");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/all-mobile-falling.png` });
    });
});

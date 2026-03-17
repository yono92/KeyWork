import { test } from "@playwright/test";
const DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Retro Audit Final", () => {
    test("Tetris pixel font", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/tetris");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/audit-tetris-pixel.png` });
    });
    test("WordChain retro panels", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/word-chain");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/audit-wordchain-retro.png` });
    });
    test("Practice tabs retro", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/audit-practice-tabs.png` });
    });
    test("Runner retro panels", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/typing-runner");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${DIR}/audit-runner-retro.png` });
    });
});

import { test } from "@playwright/test";
const DIR = "tests/e2e/screenshots/retro-theme";

test.describe("Enhanced Games Audit", () => {
    test("WordChain pixel HUD + timer bar", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/word-chain");
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${DIR}/enhanced-wordchain.png` });
    });

    test("Runner pixel HUD", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/typing-runner");
        await page.waitForTimeout(1500);
        const btn = page.locator('button:has-text("시작")');
        if (await btn.isVisible()) await btn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${DIR}/enhanced-runner-gameplay.png` });
    });

    test("Practice retro cursor", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForTimeout(2000);
        // Focus on textarea
        const textarea = page.locator("textarea");
        if (await textarea.isVisible()) await textarea.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${DIR}/enhanced-practice-cursor.png` });
    });

    test("WordChain dark timer bar", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => { localStorage.setItem("darkMode", "true"); });
        await page.goto("/word-chain");
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${DIR}/enhanced-wordchain-dark.png` });
    });
});

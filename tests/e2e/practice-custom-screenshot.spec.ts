import { test } from "@playwright/test";

test.describe("Practice custom text screenshots", () => {
    test("practice with source tabs - desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/practice");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        await page.screenshot({
            path: "tests/e2e/screenshots/practice-source-tabs-desktop.png",
            fullPage: false,
        });
    });

    test("practice with source tabs - mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("/practice");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        await page.screenshot({
            path: "tests/e2e/screenshots/practice-source-tabs-mobile.png",
            fullPage: false,
        });
    });
});

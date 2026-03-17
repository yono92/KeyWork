import { test } from "@playwright/test";

test.describe("Profile stats screenshots", () => {
    test("profile page with stats - desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/profile");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        await page.screenshot({
            path: "tests/e2e/screenshots/profile-stats-desktop.png",
            fullPage: true,
        });
    });

    test("profile page with stats - mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("/profile");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        await page.screenshot({
            path: "tests/e2e/screenshots/profile-stats-mobile.png",
            fullPage: true,
        });
    });
});

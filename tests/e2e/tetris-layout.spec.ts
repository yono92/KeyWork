import { test } from "@playwright/test";

test("tetris layout - desktop 1920x1080", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto("/tetris");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/e2e/screenshots/tetris-desktop.png", fullPage: false });
    await ctx.close();
});

test("tetris layout - desktop 1440x900", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/tetris");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/e2e/screenshots/tetris-desktop-md.png", fullPage: false });
    await ctx.close();
});

test("tetris layout - mobile 375x812", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto("/tetris");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/e2e/screenshots/tetris-mobile.png", fullPage: false });
    await ctx.close();
});

test("tetris layout - tablet 768x1024", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto("/tetris");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/e2e/screenshots/tetris-tablet.png", fullPage: false });
    await ctx.close();
});

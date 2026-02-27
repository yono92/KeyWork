import { expect, test } from "@playwright/test";

test("랜딩에서 연습 모드로 이동할 수 있다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "타이핑 게임 모드 선택" })).toBeVisible();

    await page.getByRole("link", { name: "바로 시작" }).click();
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByRole("heading", { name: "문장연습" })).toBeVisible();
});

test("랜딩에서 끝말잇기 모드 카드로 이동할 수 있다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /끝말잇기/ }).click();
    await expect(page).toHaveURL(/\/word-chain$/);
});

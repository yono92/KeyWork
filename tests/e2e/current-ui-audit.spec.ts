import { test } from '@playwright/test';

const pages = [
  { name: 'practice', path: '/practice' },
  { name: 'falling-words', path: '/falling-words' },
  { name: 'word-chain', path: '/word-chain' },
  { name: 'typing-runner', path: '/typing-runner' },
  { name: 'tetris', path: '/tetris' },
  { name: 'typing-defense', path: '/typing-defense' },
  { name: 'dictation', path: '/dictation' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'profile', path: '/profile' },
];

for (const { name, path } of pages) {
  test(`screenshot ${name} desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tests/e2e/screenshots/audit-${name}-desktop.png`, fullPage: false });
  });

  test(`screenshot ${name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tests/e2e/screenshots/audit-${name}-mobile.png`, fullPage: false });
  });
}

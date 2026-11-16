import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const errorsOf = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

async function openBoard(page, url = '/#/board') {
  await page.goto(url);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await expect(page.locator('#board .case').first()).toBeVisible();
}

test('title → PRESS START → the heist board', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await expect(page.locator('#titleName')).toHaveAttribute('aria-label', 'JOHN');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await expect(page.locator('#board .case')).toHaveCount(2);
  await expect(page.locator('#board .skill')).toHaveCount(9);
  await expect(page.locator('#board .calling a[href*="linkedin.com/in/"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('old #/talk links land on the board', async ({ page }) => {
  await openBoard(page, '/#/talk');
});

test('hovering a skill lights exactly its red strings and projects', async ({ page, isMobile }) => {
  test.skip(isMobile, 'strings are desktop-only');
  await openBoard(page);
  await expect(page.locator('#strings .string')).toHaveCount(14);
  await page.locator('.skill[data-skill="flask"]').hover();
  await expect(page.locator('#strings .string.lit')).toHaveCount(1);
  await expect(page.locator('#strings .string.lit')).toHaveAttribute('data-case', 'arcas');
  await expect(page.locator('.case[data-case="arcas"]')).toHaveClass(/lit/);
  await expect(page.locator('.case[data-case="meliona"]')).not.toHaveClass(/lit/);
  const d = await page.locator('#strings .string.lit').getAttribute('d');
  const [, x1, y1] = d.match(/^M([\d.]+) ([\d.]+)/);
  const [, x2, y2] = d.match(/([\d.]+) ([\d.]+)$/);
  expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThan(100); // a real string, not a dot
});

test('lighting every string unlocks Full Recon', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover flow');
  await openBoard(page);
  for (const el of await page.locator('.skill').all()) await el.hover();
  await expect(page.locator('#achCount')).toHaveText('1/7');
});

test('phone: tapping a skill highlights the project that proves it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  await openBoard(page);
  await page.locator('.skill[data-skill="docker"]').tap();
  await expect(page.locator('.case[data-case="meliona"]')).toHaveClass(/lit/);
  await expect(page.locator('.case[data-case="arcas"]')).not.toHaveClass(/lit/);
});

test('case file opens a dossier with objectives, loot and live links', async ({ page }) => {
  await openBoard(page);
  await page.locator('.case[data-case="arcas"] .case-open').click();
  const modal = page.locator('#modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('199 of 201 hidden errors caught');
  await expect(modal.locator('a[href*="excel-anomaly-hunter"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  // just opening the file does NOT clear the case
  await expect(page.locator('.case[data-case="arcas"] .clear-stamp')).toHaveCount(0);
});

test('a case is CLEARED only after visiting its project link and coming back', async ({ page, context }) => {
  await context.route(/excel-anomaly-hunter/, (r) => r.fulfill({ body: 'project page' }));
  await openBoard(page);
  const card = page.locator('.case[data-case="arcas"]');
  const [popup] = await Promise.all([context.waitForEvent('page'), card.locator('a[data-clear]').first().click()]);
  await popup.close();
  // simulate the visitor leaving and coming back to this tab
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(card.locator('.clear-stamp')).toHaveCount(1);
  await expect(card.locator('.clear-stamp')).toHaveAttribute('aria-label', 'Cleared');
  await expect(page.locator('.case[data-case="meliona"] .clear-stamp')).toHaveCount(0);
  // it stays cleared after a reload
  await page.reload();
  await expect(page.locator('.case[data-case="arcas"] .clear-stamp')).toHaveCount(1);
});

test('?company=Google pins a personal note and reorders', async ({ page }) => {
  await openBoard(page, '/?company=Google#/board');
  await expect(page.locator('.note-company')).toContainText("Wait, someone from Google? I've been expecting you.");
});

test('?company= is sanitized and rendered as text only', async ({ page }) => {
  await openBoard(page, '/?company=%3Cimg%20src=x%20onerror=alert(1)%3EAcme#/board');
  await expect(page.locator('.note-company')).toContainText('Wait, someone from img srcx onerroralert1Acme?');
  await expect(page.locator('#board img')).toHaveCount(0);
});

test('deep links open sections directly, and Esc returns to the board', async ({ page }) => {
  for (const id of ['missions', 'skills', 'different', 'stats', 'side-quests', 'contact', 'system']) {
    await page.goto(`/#/${id}`);
    await expect(page.locator('body')).toHaveAttribute('data-screen', id);
    await expect(page.locator('#page h2.ransom')).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
});

test('Quick View has the real PDF, and the PDF is served', async ({ page, request }) => {
  await page.goto('/#/quick');
  await expect(page.locator('#paper')).toContainText('Georgia State University');
  await expect(page.locator('#paper')).toContainText('727 of 728 checks passed');
  const href = await page.locator('#quickPdf').getAttribute('href');
  const res = await request.get(`/${href}`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
});

test('contact leads with LinkedIn and never shows a phone number', async ({ page }) => {
  await page.goto('/#/contact');
  const primary = page.locator('.contact-btns .btn-primary');
  await expect(primary).toContainText('LinkedIn');
  await expect(primary).toHaveAttribute('href', /linkedin\.com\/in\//);
  await expect(page.locator('body')).not.toContainText('555-0100');
});

test('keyboard: 1 opens a case file, Q for Quick View, Esc back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test is desktop only');
  await openBoard(page);
  await page.keyboard.press('1');
  await expect(page.locator('#modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'quick');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
});

test('flipping the HUD bars unlocks an achievement that survives reload', async ({ page, isMobile }) => {
  test.skip(isMobile, 'HUD bars are hidden on phones');
  await openBoard(page);
  await page.keyboard.press('f');
  await expect(page.locator('#hudBars')).toHaveClass(/flipped/);
  await expect(page.locator('#achCount')).toHaveText('1/7');
  await page.reload();
  await expect(page.locator('#achCount')).toHaveText('1/7');
});

test('dev console: john.run() unlocks Inspector', async ({ page }) => {
  await openBoard(page);
  const reply = await page.evaluate(() => window.john.run());
  expect(reply).toContain('Thanks for looking under the hood');
  await expect(page.locator('#achCount')).toHaveText('1/7');
});

test('works with motion enabled too (start sequence + board reveal finish)', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto('/');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board', { timeout: 5000 });
  await expect(page.locator('#board .case').first()).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('phone: no horizontal scroll and thumb-sized targets', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  await openBoard(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.locator('.skill').first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('no phone number anywhere in the built site', async () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  const text = walk('dist').filter((f) => /\.(html|js|css|svg|json)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  expect(text).not.toMatch(/555[-.\s]?0100/);
  expect(text).not.toMatch(/\(555\)/);
});

test('progress is saved: returning visitors CONTINUE with their case log', async ({ page }) => {
  await page.goto('/#/skills');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'skills');
  await page.goto('/#/contact');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'contact');
  await page.goto('/#/');
  await page.reload();
  await expect(page.locator('#pressStart')).toHaveText('CONTINUE');
  await expect(page.locator('#saveLine')).toContainText('2/8 cleared');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await expect(page.locator('#progressChip')).toContainText('2/8');
  // starting over wipes the save
  await page.goto('/#/');
  await page.reload();
  await page.locator('.save-reset').click();
  await expect(page.locator('#pressStart')).toHaveText('PRESS START');
  await expect(page.locator('#saveLine')).toHaveCount(0);
});

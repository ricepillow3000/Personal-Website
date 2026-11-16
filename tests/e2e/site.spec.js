import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const errorsOf = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

/* Waits until John has finished talking and the hub choices are up. */
async function waitForHub(page) {
  await expect(page.locator('#choices .choice').first()).toBeVisible();
}

test('title → PRESS START → John greets the visitor', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await expect(page.locator('#titleName')).toHaveAttribute('aria-label', 'JOHN');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'talk');
  await expect(page.locator('#dialogText')).toContainText("I'm John");
  await waitForHub(page);
  await expect(page.locator('#choices .blade')).toHaveCount(7);
  expect(errors).toEqual([]);
});

const HUB = [
  ['built', 'missions', '199 of 201'],
  ['skills', 'skills', 'receipts'],
  ['different', 'different', 'short list']
];

for (const [choice, section, returnText] of HUB) {
  test(`hub choice "${choice}" → ${section} → back gives the right return line`, async ({ page }) => {
    await page.goto('/#/talk');
    await waitForHub(page);
    await page.locator(`.choice[data-choice="${choice}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', section);
    await expect(page.locator('#page h2.ransom')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'talk');
    await expect(page.locator('#dialogText')).toContainText(returnText);
    await expect(page.locator(`.choice[data-choice="${choice}"] .stamp`)).toHaveText('CLEARED!');
  });
}

test('radial menu: all seven resume blades, no console glyphs, hotkey 7 opens contact', async ({ page, isMobile }) => {
  await page.goto('/#/talk');
  await waitForHub(page);
  const words = await page.locator('#choices .blade').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').split(':')[0]));
  expect(words).toEqual(['MISSIONS', 'SKILLS', 'EDGE', 'RESUME', 'STATS', 'LEADER', 'CONTACT']);
  await expect(page.locator('#choices')).not.toContainText(/[△○□✕×]/);
  if (!isMobile) {
    await page.keyboard.press('7');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'contact');
  }
});

test('seeing every section ends with the quiet LinkedIn thank-you', async ({ page }) => {
  for (const id of ['missions', 'skills', 'different', 'stats', 'side-quests']) {
    await page.goto(`/#/${id}`);
    await expect(page.locator('body')).toHaveAttribute('data-screen', id);
  }
  await page.goto('/#/talk');
  await page.reload();
  await waitForHub(page);
  await page.locator('.choice[data-choice="built"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'missions');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialogText')).toContainText("My LinkedIn's right here");
  await expect(page.locator('.choice[data-choice="__linkedin"]')).toBeVisible();
});

test('mission dossier opens with objectives, loot and live links', async ({ page }) => {
  await page.goto('/#/missions');
  await page.locator('[data-mission="arcas"]').click();
  const modal = page.locator('#modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('199 of 201 hidden errors caught');
  await expect(modal.locator('a[href*="excel-anomaly-hunter"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(page.locator('[data-mission="arcas"] .stamp')).toHaveText('CLEARED!');
});

test('?company=Google personalizes the greeting and the visitor tag', async ({ page }) => {
  await page.goto('/?company=Google#/talk');
  await expect(page.locator('#dialogText')).toContainText("someone from Google? I've been expecting you");
  await expect(page.locator('#visitorTag')).toHaveText('TO: GOOGLE');
});

test('?company= is sanitized and rendered as text only', async ({ page }) => {
  await page.goto('/?company=%3Cimg%20src=x%20onerror=alert(1)%3EAcme#/talk');
  await expect(page.locator('#visitorTag')).toHaveText(`TO: ${'IMG SRCX ONERRORALERT1ACME'.slice(0, 30)}`);
  await expect(page.locator('#screen-talk img')).toHaveCount(0);
});

test('deep links open sections directly', async ({ page }) => {
  for (const id of ['missions', 'skills', 'different', 'stats', 'side-quests', 'contact', 'system']) {
    await page.goto(`/#/${id}`);
    await expect(page.locator('body')).toHaveAttribute('data-screen', id);
    await expect(page.locator('#page h2.ransom')).toBeVisible();
  }
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

test('contact card leads with LinkedIn and never shows a phone number', async ({ page }) => {
  await page.goto('/#/contact');
  const primary = page.locator('.contact-btns .btn-primary');
  await expect(primary).toContainText('LinkedIn');
  await expect(primary).toHaveAttribute('href', /linkedin\.com\/in\//);
  await expect(page.locator('body')).not.toContainText('555-0100');
});

test('keyboard: hotkeys, Q for Quick View, Esc back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test is desktop only');
  await page.goto('/#/talk');
  await waitForHub(page);
  await page.keyboard.press('2');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'skills');
  await page.keyboard.press('q');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'quick');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'talk');
  await waitForHub(page);
  await page.keyboard.press('s');
  await expect(page.locator('.choice').nth(1)).toBeFocused();
});

test('flipping the HUD bars unlocks an achievement that survives reload', async ({ page, isMobile }) => {
  test.skip(isMobile, 'HUD bars are hidden on phones');
  await page.goto('/#/talk');
  await waitForHub(page);
  await page.keyboard.press('f');
  await expect(page.locator('#hudBars')).toHaveClass(/flipped/);
  await expect(page.locator('#achCount')).toHaveText('1/7');
  await page.reload();
  await expect(page.locator('#achCount')).toHaveText('1/7');
});

test('dev console: john.run() unlocks Inspector', async ({ page }) => {
  await page.goto('/#/talk');
  const reply = await page.evaluate(() => window.john.run());
  expect(reply).toContain('Thanks for looking under the hood');
  await expect(page.locator('#achCount')).toHaveText('1/7');
});

test('works with motion enabled too (start sequence finishes)', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto('/');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'talk', { timeout: 5000 });
  await page.locator('#dialog').click();
  await waitForHub(page);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('phone: no horizontal scroll and thumb-sized choices', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  await page.goto('/#/talk');
  await waitForHub(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.locator('.choice').first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(48);
});

test('no phone number anywhere in the built site', async () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  const text = walk('dist').filter((f) => /\.(html|js|css|svg|json)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  expect(text).not.toMatch(/555[-.\s]?0100/);
  expect(text).not.toMatch(/\(555\)/);
});

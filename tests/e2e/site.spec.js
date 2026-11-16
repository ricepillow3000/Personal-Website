import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

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
  await expect(page.locator('#titleName')).toHaveAccessibleName('JOHN');
  await expect(page.getByRole('heading', { name: 'JOHN' })).toBeVisible();
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

test('flipping the GPA star unlocks an achievement that survives reload', async ({ page }) => {
  await openBoard(page);
  await page.locator('#board .gpa-burst').click();
  await expect(page.locator('#board .gpa-burst')).toHaveClass(/flipped/);
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

/* Reads every text string out of a PDF's compressed content streams. */
function pdfDigits(path) {
  const buf = readFileSync(path);
  const raw = buf.toString('latin1');
  let out = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    let data;
    try {
      data = inflateSync(buf.subarray(start, end)).toString('latin1');
    } catch {
      continue;
    }
    for (const x of data.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) out += x[1].replace(/\\(.)/g, '$1');
    for (const x of data.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
      const h = x[1].replace(/\s/g, '');
      for (let i = 0; i + 1 < h.length; i += 2) out += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
    }
  }
  return out.replace(/\D/g, '');
}

test('the downloadable resume PDF has no phone number', async () => {
  const digits = pdfDigits('dist/assets/John_Nguyen_Resume.pdf');
  expect(digits.length).toBeGreaterThan(20); // the reader really found text
  expect(digits).not.toContain('5550100');
});

test('a corrupted or hostile save can never crash the site or inject markup', async ({ page }) => {
  const errors = errorsOf(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('jn-resume-v1', JSON.stringify({
      visited: 5, cleared: '"]<img src=x onerror=window.__pwned=1>', lit: { a: 1 }, achievements: null,
      settings: { sound: '"><img src=x onerror=window.__pwned=1>', music: 'loud', reduceMotion: 'x' }
    }));
    sessionStorage.setItem('clear-pending', '"]<b>x</b>');
  });
  await openBoard(page);
  await page.goto('/#/system');
  await expect(page.locator('#page h2.ransom')).toBeVisible();
  await expect(page.locator('[data-toggle="sound"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#musicVol')).toHaveValue('0.5');
  await page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('hostile ?company= values render as plain text', async ({ page }) => {
  const errors = errorsOf(page);
  for (const bad of ['constructor', '__proto__', '<script>alert(1)</script>', '" onmouseover="alert(1)']) {
    await openBoard(page, `/?company=${encodeURIComponent(bad)}#/board`);
    expect(await page.locator('#board script').count()).toBe(0);
    await expect(page.locator('.note-company')).not.toContainText('Object');
  }
  expect(errors).toEqual([]);
});

test('progress is saved: returning visitors CONTINUE with their case log', async ({ page }) => {
  await page.goto('/#/skills');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'skills');
  await page.goto('/#/stats');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'stats');
  await page.goto('/#/');
  await page.reload();
  await expect(page.locator('#pressStart')).toHaveText('CONTINUE');
  await expect(page.locator('#saveLine')).toContainText('2/7 cleared');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await expect(page.locator('#progressChip')).toContainText('2/7');
  // starting over wipes the save
  await page.goto('/#/');
  await page.reload();
  await page.locator('.save-reset').click();
  await expect(page.locator('#pressStart')).toHaveText('PRESS START');
  await expect(page.locator('#saveLine')).toHaveCount(0);
});

/* ---- with animations ON: the timing bugs only show up when transitions really run ---- */
test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a newer navigation wins: no stale title slam, no stale visit', async ({ page }) => {
    const errors = errorsOf(page);
    await openBoard(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__punch = [];
      new MutationObserver(() => window.__punch.push(document.getElementById('punchText').textContent)).observe(document.getElementById('punchText'), { childList: true, characterData: true, subtree: true });
    });
    await page.evaluate(() => (location.hash = '#/stats'));
    await page.waitForTimeout(150);
    await page.evaluate(() => (location.hash = '#/contact'));
    await page.waitForTimeout(2500);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'contact');
    expect((await page.evaluate(() => window.__punch)).join(' ')).not.toContain('STATS');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('jn-resume-v1')).visited)).not.toContain('stats');
    expect(errors).toEqual([]);
  });

  test('leaving during the case-file cut-in does not pop the file over the next screen', async ({ page }) => {
    await openBoard(page);
    await page.waitForTimeout(1500);
    await page.locator('.case[data-case="arcas"] .case-open').click();
    await page.waitForTimeout(100);
    await page.evaluate(() => (location.hash = '#/quick'));
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'quick');
    await expect(page.locator('#modal')).toBeHidden();
  });

  test('keyboard: Enter on the sound button does not start the game, pages land focus on something real', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard check');
    await page.goto('/');
    await page.waitForTimeout(1200);
    await page.locator('#soundBtn').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    for (const id of ['missions', 'skills', 'stats', 'side-quests', 'system']) {
      await page.evaluate((x) => (location.hash = `#/${x}`), id);
      await expect(page.locator('body')).toHaveAttribute('data-screen', id);
      await page.waitForTimeout(2200);
      const tag = await page.evaluate(() => (document.activeElement === document.body ? 'BODY' : document.activeElement.closest('#page') ? 'PAGE' : 'ELSEWHERE'));
      expect(tag, `focus after opening ${id}`).toBe('PAGE');
    }
  });

  test('an open file traps focus and gives it back when closed', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard check');
    await openBoard(page);
    await page.waitForTimeout(1500);
    const opener = page.locator('.case[data-case="meliona"] .case-open');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#modal')).toBeVisible();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement.closest('#modal')))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal')).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('menu: opens with focus on the first item, Esc returns focus to MENU', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard check');
    await openBoard(page);
    await page.waitForTimeout(1500);
    await page.locator('#menuBtn').click();
    await expect(page.locator('#menuBtn')).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(500);
    await expect(page.locator('.stair-item').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#menuBtn')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#menuBtn')).toBeFocused();
  });
});

test('every CASE LOG item can be reached from the site itself (ALL CLEAR is possible)', async ({ page }) => {
  await openBoard(page);
  // open every MENU page (except SYSTEM, which is settings) by clicking, then mark both projects cleared
  for (const id of ['missions', 'skills', 'different', 'stats', 'side-quests']) {
    await page.locator('#menuBtn').click();
    await page.locator(`.stair-item[data-go="${id}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', id);
    await page.locator('#page .back-btn').click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  }
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('jn-resume-v1'));
    st.cleared = ['meliona', 'arcas'];
    localStorage.setItem('jn-resume-v1', JSON.stringify(st));
  });
  await page.goto('/#/');
  await page.reload();
  await expect(page.locator('#saveLine')).toContainText('ALL CLEAR');
});

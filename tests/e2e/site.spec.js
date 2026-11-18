import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/* Any US-style phone number, e.g. (555) 123-4567, 555-123-4567, 555.123.4567. No real digits live in this repo. */
const PHONE = /\(?\b\d{3}\)?[\s.-]*\d{3}[\s.-]\d{4}\b/;

const errorsOf = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

async function openBoard(page, url = '/#/board') {
  await page.goto(url);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await expect(page.locator('#board .pl-item').first()).toBeVisible();
}

test('title → PRESS START → THE PLAN: six chapters in order and a CONTINUE that points at chapter 1', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await expect(page.locator('#titleName')).toHaveAccessibleName('JOHN');
  await expect(page.getByRole('heading', { name: 'JOHN' })).toBeVisible();
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  const chapters = page.locator('#board .pl-item');
  await expect(chapters).toHaveCount(6);
  expect(await chapters.evaluateAll((els) => els.map((e) => e.dataset.ch))).toEqual(['stats', 'missions', 'skills', 'side-quests', 'different', 'contact']);
  await expect(page.locator('#board .plan-continue')).toHaveAttribute('href', '#/stats');
  await expect(page.locator('#board .plan-continue')).toContainText('START HERE');
  expect(errors).toEqual([]);
});

test('old #/talk links land on the board', async ({ page }) => {
  await openBoard(page, '/#/talk');
});

test('THE PLAN previews the chapter you point at, one line each', async ({ page, isMobile }) => {
  test.skip(isMobile, 'phones show the one-liners in the list instead of a card');
  await openBoard(page);
  await page.locator('.pl-item[data-ch="missions"]').hover();
  const card = page.locator('#board .plan-card');
  await expect(card.locator('.pc-ch')).toHaveText('CHAPTER 02');
  await expect(card.locator('.pc-name')).toHaveText('MISSIONS');
  await expect(card.locator('.pc-tease')).toContainText('2 live apps');
  await expect(card.locator('.pc-go')).toHaveAttribute('href', '#/missions');
});

test('opening all six chapters unlocks Full Recon, and CONTINUE moves on as you read', async ({ page }) => {
  await page.goto('/#/stats');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'stats');
  await openBoard(page);
  await expect(page.locator('#board .plan-continue')).toHaveAttribute('href', '#/missions');
  await expect(page.locator('.pl-item[data-ch="stats"]')).toHaveClass(/seen/);
  for (const id of ['missions', 'skills', 'side-quests', 'different', 'contact']) {
    await page.goto(`/#/${id}`);
    await expect(page.locator('body')).toHaveAttribute('data-screen', id);
  }
  await expect(page.locator('#achCount')).toHaveText('1/7');
});

test('phone: every chapter shows its one-liner and CONTINUE stays on screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  await openBoard(page);
  await expect(page.locator('.pl-item[data-ch="missions"] .pl-tease')).toBeVisible();
  const vh = page.viewportSize().height;
  const box = await page.locator('#board .plan-continue').boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(vh);
  expect(box.y).toBeGreaterThan(vh / 2); // pinned near the bottom, where the thumb is
});

test('case file opens a dossier with objectives, loot and live links', async ({ page }) => {
  await page.goto('/#/missions');
  await page.locator('.poster[data-mission="arcas"]').click();
  const modal = page.locator('#modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('199 of 201 planted errors caught');
  await expect(modal.locator('a[href*="excel-anomaly-hunter"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  // just opening the file does NOT clear the case
  await expect(page.locator('.poster[data-mission="arcas"] .clear-stamp')).toHaveCount(0);
});

test('a case is CLEARED only after visiting its project link and coming back', async ({ page, context }) => {
  await context.route(/excel-anomaly-hunter/, (r) => r.fulfill({ body: 'project page' }));
  await page.goto('/#/missions');
  await page.locator('.poster[data-mission="arcas"]').click();
  const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('#modal a[data-clear]').first().click()]);
  await popup.close();
  // simulate the visitor leaving and coming back to this tab
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await page.keyboard.press('Escape');
  const poster = page.locator('.poster[data-mission="arcas"]');
  await expect(poster.locator('.clear-stamp')).toHaveCount(1);
  await expect(page.locator('.poster[data-mission="meliona"] .clear-stamp')).toHaveCount(0);
  // it stays cleared after a reload
  await page.reload();
  await expect(page.locator('.poster[data-mission="arcas"] .clear-stamp')).toHaveCount(1);
});

test('?company=Google pins a personal note', async ({ page }) => {
  await openBoard(page, '/?company=Google#/board');
  await expect(page.locator('.plan-note')).toContainText("Wait, someone from Google? I've been expecting you.");
});

test('?company= is sanitized and rendered as text only', async ({ page }) => {
  await openBoard(page, '/?company=%3Cimg%20src=x%20onerror=alert(1)%3EAcme#/board');
  await expect(page.locator('.plan-note')).toContainText('Wait, someone from img srcx onerroralert1Acme?');
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
  await expect(page.locator('#paper')).toContainText('0 failures (727 of 728 checks)'); // word for word from the PDF
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
  await expect(page.locator('body')).not.toContainText(PHONE);
});

test('keyboard: 2 opens chapter 2, Q for Quick View, Esc back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test is desktop only');
  await openBoard(page);
  await page.keyboard.press('2');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'missions');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await page.keyboard.press('q');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'quick');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
});

test('flipping the off-the-record star on STATS unlocks an achievement that survives reload', async ({ page }) => {
  await page.goto('/#/stats');
  await page.locator('#page .gpa-burst').click();
  await expect(page.locator('#page .gpa-burst')).toHaveClass(/flipped/);
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
  await expect(page.locator('#board .plan-continue')).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('phone: no horizontal scroll and thumb-sized targets', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  await openBoard(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const sel of ['#board .pl-item', '#board .plan-continue']) {
    const box = await page.locator(sel).first().boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('no phone number anywhere in the built site', async () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  const text = walk('dist').filter((f) => /\.(html|js|css|svg|json)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  expect(text).not.toMatch(PHONE);
});

/* Reads every text string out of a PDF's compressed content streams. */
function pdfText(path) {
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
  return out;
}

test('the downloadable resume PDF has no phone number', async () => {
  const text = pdfText('dist/assets/John_Nguyen_Resume.pdf');
  expect(text).toContain('Nguyen'); // the reader really found text
  expect(text).not.toMatch(PHONE);
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
    await expect(page.locator('.plan-note')).not.toContainText('Object');
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
  await expect(page.locator('#saveLine')).toContainText('2/8 cleared');
  await page.locator('#pressStart').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
  await expect(page.locator('#progressChip')).toContainText('2/8');
  // starting over wipes the save
  await page.goto('/#/');
  await page.reload();
  await page.locator('.save-reset').click();
  await expect(page.locator('#pressStart')).toHaveText('PRESS START');
  await expect(page.locator('#saveLine')).toContainText('Progress wiped'); // only the Undo offer is left
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

  test('THE DROP: THE PLAN -> chapter 1 falls past the tower and lands on the page', async ({ page }) => {
    const errors = errorsOf(page);
    await openBoard(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => (location.hash = '#/stats'));
    await expect(page.locator('.fall')).toHaveCount(1);
    await expect(page.locator('.fall-sign .sr-only')).toHaveText('STATS'); // the sign is cut-out letters; this is its plain-text name
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'stats');
    await expect(page.locator('.fall')).toHaveCount(0, { timeout: 4000 }); // the film cut cleans itself up
    await expect(page.locator('#page .back-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('PRESS START: the train bursts out of the tunnel, blows the title away, and the board lands', async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto('/');
    await expect(page.locator('.bd-cam canvas')).toHaveCount(1, { timeout: 6000 }); // the platform (with its trash) is drawn once the art loads
    await page.locator('#pressStart').click({ force: true });
    await expect(page.locator('.fall.tunnel')).toHaveCount(1);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'board', { timeout: 4000 });
    await expect(page.locator('.fall.tunnel')).toHaveCount(0, { timeout: 4000 }); // the shot cleans up after itself
    expect(await page.locator('#backdrop').evaluate((b) => b.style.translate)).toBe(''); // the camera shake is reset
    expect(await page.locator('.title-block').evaluate((t) => t.style.transform)).toBe(''); // the title is back in place for next time
    expect(errors).toEqual([]);
  });

  test('NEXT EPISODE: pushing past the bottom of a page fills the fuse and rolls the next chapter', async ({ page, isMobile }) => {
    test.skip(isMobile, 'wheel input is desktop only (the button path is tested on every device)');
    const errors = errorsOf(page);
    await page.goto('/#/missions');
    await expect(page.locator('#page .next-ep')).toBeVisible();
    await page.locator('#screen-page').evaluate((s) => s.scrollTo(0, s.scrollHeight));
    await page.mouse.move(600, 400);
    await page.waitForTimeout(2000); // let the page's title slam finish (pushes during an animation don't count)
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(80);
    }
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'skills', { timeout: 4000 });
    expect(errors).toEqual([]);
  });

  test('leaving during the case-file cut-in does not pop the file over the next screen', async ({ page }) => {
    await page.goto('/#/missions');
    await page.waitForTimeout(1500);
    await page.locator('.poster[data-mission="arcas"]').click({ force: true }); // posters sway on purpose (idle motion)
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
    await page.goto('/#/missions');
    await page.waitForTimeout(1500);
    const opener = page.locator('.poster[data-mission="meliona"]');
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

  test('menu -> STATS (flip wipe) and a repeated hotkey still land focus on the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard check');
    await openBoard(page);
    await page.waitForTimeout(1500);
    await page.locator('#menuBtn').click();
    await page.waitForTimeout(500);
    await page.locator('.stair-item[data-go="stats"]').click();
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('#page')))).toBe(true);
    await page.keyboard.press('3');
    await page.waitForTimeout(400);
    await page.keyboard.press('3'); // same page again: must not cancel the entrance
    await page.waitForTimeout(2500);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'skills'); // menu order = chapter order: 3 is SKILLS
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('#page')))).toBe(true);
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
  // open every chapter from THE PLAN by clicking, then mark both projects cleared
  for (const id of ['stats', 'missions', 'skills', 'side-quests', 'different', 'contact']) {
    await page.locator(`.pl-item[data-ch="${id}"]`).click();
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

test('every story page ends with a NEXT EPISODE card that rolls the next chapter', async ({ page }) => {
  const order = ['stats', 'missions', 'skills', 'side-quests', 'different', 'contact', 'board'];
  await page.goto('/#/stats');
  for (let i = 1; i < order.length; i++) {
    await expect(page.locator('body')).toHaveAttribute('data-screen', order[i - 1]);
    await page.locator('#page [data-episode]').click({ force: true });
  }
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'board');
});

test('Start over can be undone', async ({ page }) => {
  await page.goto('/#/stats');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'stats');
  await page.goto('/#/');
  await page.reload();
  await expect(page.locator('#pressStart')).toHaveText('CONTINUE');
  await page.locator('.save-reset').click();
  await expect(page.locator('#pressStart')).toHaveText('PRESS START');
  await expect(page.locator('#saveLine')).toContainText('Progress wiped');
  await page.locator('.save-reset').click(); // Undo
  await expect(page.locator('#pressStart')).toHaveText('CONTINUE');
  await expect(page.locator('#saveLine')).toContainText('1/8');
});

test('Back closes an open case file instead of leaving the page', async ({ page }) => {
  await page.goto('/#/missions');
  await page.locator('.poster[data-mission="meliona"]').click();
  await expect(page.locator('#modal')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'missions');
  // closing with X does not leave a stray history step behind
  await page.locator('.poster[data-mission="meliona"]').click();
  await page.locator('#modalPanel [data-close]').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'missions');
});

test('Ctrl+K opens and closes the menu', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await openBoard(page);
  await page.keyboard.press('Control+k');
  await expect(page.locator('#menu')).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#menu')).toBeHidden();
});

test('every menu item fits on short laptop screens and phones held sideways', async ({ page, isMobile }) => {
  test.skip(isMobile, 'sizes are set by hand');
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 720], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/#/missions');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'missions');
    await page.locator('#menuBtn').click();
    await expect(page.locator('#menu')).toBeVisible();
    await page.waitForTimeout(1200); // the staircase slides in
    const bottoms = await page.$$eval('#stair .stair-item', (els) => els.map((e) => e.getBoundingClientRect().bottom));
    expect(bottoms.length).toBe(7);
    for (const b of bottoms) expect(b, `${width}x${height}`).toBeLessThanOrEqual(height);
    await page.keyboard.press('Escape');
  }
});

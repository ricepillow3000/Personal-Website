import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/scenes.css';
import './styles/print.css';
import './styles/backdrop.css';
import './styles/board.css';
import './styles/pages.css';

import { gsap } from 'gsap';
import { resume } from './data/resume.js';
import { readCompany } from './data/companies.js';
import { store } from './core/store.js';
import { $, $$, esc, reducedMotion } from './core/util.js';
import { mountBackdrop } from './fx/backdrop.js';
import { initClickFx, burst } from './fx/impact.js';
import { initClearing, hydrateStamps } from './ui/clear.js';
import { progress } from './core/progress.js';
import { slashWipe, blindsWipe, paperWipe, irisWipe, shatterWipe, stripesWipe, flipWipe, inkWipe, titlePunch, ripTransition, cutIn, enter, skipCurrent, isAnimating, shake } from './fx/transitions.js';
import { ransom, dropIn, NAME_SEED } from './ui/ransom.js';
import { renderDate } from './ui/hud.js';
import { createBoard } from './scenes/board.js';
import { toast } from './ui/toast.js';
import { createMenu, MENU_ITEMS } from './scenes/menu.js';
import { SECTION_RENDERERS, SECTION_TITLES, dossierMarkup, animateDossier } from './scenes/sections.js';
import { renderQuickView } from './scenes/quickview.js';
import { sfx, setSound, setMusicVolume } from './audio/audio.js';
import { unlock, refreshCounter, listMarkup } from './eggs/achievements.js';
import { armBee } from './eggs/bee.js';
import { installConsole } from './eggs/console.js';
import { bindInput, bindGamepad } from './input/input.js';

/* ---------------------------------------------------------------- setup */
const company = readCompany();
const ctx = { company };
mountBackdrop($('#backdrop'));
/* "Off the Record": the GPA star on the person card flips to the fun stats */
function flipGpa() {
  const b = $('#board .gpa-burst');
  if (!b) return;
  const on = !b.classList.contains('flipped');
  b.classList.toggle('flipped', on);
  b.setAttribute('aria-pressed', String(on));
  sfx(on ? 'hvPerson' : 'back');
  if (on) unlock('off-record');
}
document.addEventListener('click', (e) => {
  if (e.target.closest?.('.gpa-burst')) flipGpa();
});
/* how the next screen change should look; the menu asks for blinds */
let viaMenu = false;
const menu = createMenu((id) => {
  viaMenu = true;
  navigate(id);
});
renderDate();

let screen = null; // title | talk | page | quick
let pageId = null;
let pendingStart = false;
let lastFocus = null;

document.body.classList.toggle('reduce-motion', store.get().settings.reduceMotion === true);
ransom($('#titleName'), resume.first, NAME_SEED);
$('#titleHook').textContent = resume.titleHook || resume.hook;
$('#hudLinkedIn').href = resume.links.linkedin;
$('#quickPdf').href = resume.links.pdf;
renderQuickView($('#paper'));
refreshCounter();
installConsole();
syncSoundButton();

/* ---------------------------------------------------------------- routing */
const VALID = new Set(['title', 'board', 'quick', ...Object.keys(SECTION_RENDERERS)]);

function route() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'title';
  const id = raw === 'talk' ? 'board' : raw; // old links still work
  return VALID.has(id) ? id : 'title';
}

function navigate(id) {
  const hash = id === 'title' ? '#/' : `#/${id}`;
  if (window.location.hash === hash) show(id);
  else window.location.hash = hash;
}

window.addEventListener('hashchange', () => show(route()));

const modeOf = (id) => (id === 'title' || id === 'board' ? id : id === 'quick' ? 'quick' : 'page');

function activate(id) {
  const mode = modeOf(id);
  document.body.dataset.screen = id;
  document.body.dataset.mode = mode;
  $$('.screen').forEach((s) => s.classList.remove('active'));
  const el = mode === 'page' ? $('#screen-page') : $(`#screen-${mode}`);
  el.classList.add('active');
  el.scrollTop = 0;
  document.body.classList.remove('scrolled');
  renderKeyHints(mode);
}

let lastStyle = 'slash';
/* every menu destination gets its own transition */
const MENU_STYLE = { missions: 'shatter', skills: 'blinds', different: 'slash', stats: 'flip', 'side-quests': 'stripes', system: 'ink' };
const WIPES = { slash: slashWipe, blinds: blindsWipe, paper: paperWipe, iris: irisWipe, shatter: shatterWipe, stripes: stripesWipe, flip: flipWipe, ink: inkWipe };
/* Focus a target once its entrance animation has made it visible (a hidden element can't take focus).
   Gives up if the visitor has already moved focus somewhere themselves. */
function focusSoon(el, tries = 16, from = document.activeElement) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (document.activeElement === el || tries <= 0) return;
  setTimeout(() => {
    const now = document.activeElement;
    if (el.isConnected && (now === document.body || now === null || now === from)) focusSoon(el, tries - 1, from);
  }, 100);
}

let navSeq = 0; // a newer navigation cancels whatever an older one still had left to do
async function show(id) {
  const tok = ++navSeq;
  const prev = screen;
  const prevPage = pageId;
  if (prev === 'page' && pageId === id) return;
  if (prev === id && id !== 'page') return;
  menu.close(false);
  closeModal();
  const mode = modeOf(id);

  const swap = () => {
    if (tok !== navSeq) return;
    activate(id);
    screen = mode === 'page' ? 'page' : id;
    pageId = mode === 'page' ? id : null;
    if (mode === 'page') renderPage(id);
    if (mode === 'board') enterBoard();
  };

  if (prev === null) {
    swap();
  } else if (prev === 'title' && id === 'board' && pendingStart) {
    pendingStart = false;
    revealDelay = 1.3; // cards slam in on the frame the torn pieces are yanked away
    await ripTransition(swap);
  } else {
    // mix it up: each kind of move has its own wipe
    const style = viaMenu
      ? MENU_STYLE[id] || 'blinds'
      : id === 'system' || id === 'secret'
        ? 'blinds'
        : mode === 'quick'
          ? 'paper'
          : mode === 'board' && prev !== 'title'
            ? 'iris'
            : 'slash';
    await WIPES[style](swap);
    lastStyle = style;
  }
  if (tok !== navSeq) return;
  viaMenu = false;

  if (mode === 'title') introTitle();
  if (mode === 'page') {
    // the big title slam only follows the slash; menu/settings pages build in with kinetic letters instead
    if (lastStyle === 'slash' || prev === null) await titlePunch(SECTION_TITLES[id] || id.toUpperCase());
    if (tok !== navSeq) return;
    $$('#page [data-ransom]').forEach((h, i) => dropIn(h, i * 0.05));
    enter($('#page')); // back button, subtitle and other [data-in] items
    pageIntro?.($('#page')); // each page's own entrance
    focusSoon($('#page [data-nav]') || $('#page .back-btn'));
  }
  if (mode === 'quick') {
    track('quick_view');
    focusSoon($('#screen-quick .btn'));
  }
}

/* ---------------------------------------------------------------- title */
function introTitle() {
  renderSaveLine();
  dropIn($('#titleName'), 0.15);
  if (!reducedMotion()) gsap.from('#screen-title .title-codename, #screen-title .title-hook, #pressStart, #screen-title .quick-link', { x: -40, opacity: 0, stagger: 0.08, duration: 0.35, delay: 0.35, ease: 'back.out(2)', clearProps: 'all' });
  setTimeout(() => $('#pressStart').focus({ preventScroll: true }), 50);
}

/* ---------------------------------------------------------------- saved progress */
function renderProgress(celebrate) {
  const chip = $('#progressChip');
  if (!chip) return;
  const p = progress();
  const left = p.items.filter((i) => !i.done).map((i) => i.label);
  chip.classList.toggle('all', p.all);
  chip.setAttribute('aria-label', p.all ? 'Case log, all clear' : `Case log, ${p.done} of ${p.total}. Still to do: ${left.join(', ')}`);
  chip.title = p.all ? 'Everything cleared. Thanks for playing.' : `Still to do: ${left.join(' · ')}`;
  chip.innerHTML = p.all
    ? '<span class="pc-label">CASE LOG</span><span class="pc-all">ALL CLEAR!</span>'
    : `<span class="pc-label">CASE LOG</span><span class="pc-count"><b>${p.done}</b>/${p.total}</span>
       <span class="pc-bar" aria-hidden="true">${p.items.map((i) => `<i class="${i.done ? 'on' : ''}"></i>`).join('')}</span>
       <span class="pc-hint" aria-hidden="true">clear both cases · open every menu page</span>`;
  if (celebrate && !reducedMotion()) gsap.fromTo(chip, { scale: 1.6, rotation: -12 }, { scale: 1, rotation: -3, duration: 0.5, ease: 'elastic.out(1.4, .4)' });
}
let wasAll = progress().all;
store.onChange(() => {
  const p = progress();
  renderProgress(p.all && !wasAll);
  if (p.all && !wasAll) {
    setTimeout(() => {
      toast('Every case cleared. Thanks for playing.', 'ALL CLEAR!');
      sfx('treasure');
    }, 1600);
  }
  wasAll = p.all;
});

/* returning visitors: CONTINUE instead of starting from scratch (everything is saved) */
function renderSaveLine() {
  const p = progress();
  const btn = $('#pressStart');
  let line = $('#saveLine');
  if (!p.any) {
    btn.textContent = 'PRESS START';
    line?.remove();
    return;
  }
  btn.textContent = 'CONTINUE';
  if (!line) {
    line = document.createElement('p');
    line.id = 'saveLine';
    line.className = 'save-line';
    btn.after(line);
  }
  line.innerHTML = `<span class="save-dot" aria-hidden="true"></span>Save found · ${p.all ? 'ALL CLEAR' : `${p.done}/${p.total} cleared`} · <button type="button" class="save-reset">Start over</button>`;
  line.querySelector('.save-reset').addEventListener('click', () => {
    store.reset();
    try {
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
    sfx('back');
    renderSaveLine();
    renderProgress();
    $('#board').innerHTML = '';
    window.location.reload();
  });
}
renderSaveLine();

$('#pressStart').addEventListener('click', () => {
  sfx('select');
  unlock('first-words');
  pendingStart = true;
  navigate('board');
});

/* ---------------------------------------------------------------- heist board */
initClickFx();
// FULL STORY on the side quests gets a whip crack + level-clear jingle
document.addEventListener('click', (e) => {
  if (e.target.closest?.('.quest-more')) sfx('fanfare');
});
/* Once you scroll, the date (top-left) and stat box (bottom-left) slide away so they
   never sit on top of text; they snap back when you return to the top. */
$$('.screen').forEach((sc) =>
  sc.addEventListener('scroll', () => {
    if (sc.classList.contains('active')) document.body.classList.toggle('scrolled', sc.scrollTop > 30);
  }, { passive: true })
);
initClearing();
const board = createBoard($('#board'), ctx, {
  onOpenCase: (id, el) => openDossier(id, el),
  onAllStringsLit: () => unlock('full-recon')
});
hydrateStamps($('#board'));

let boardSeen = false;
let revealDelay = 0;
function enterBoard() {
  renderProgress();
  board.reveal(revealDelay);
  setTimeout(() => screen === 'board' && board.demo(), (revealDelay + 1.1) * 1000);
  revealDelay = 0;
  $('#board .case-open')?.focus({ preventScroll: true });
  if (!boardSeen) {
    boardSeen = true;
    soundHint();
    armBee(() => screen === 'board', onBee);
  }
}

function onBee() {
  unlock('bee');
  shake();
  toast('BEE!! Get it away!', 'JOHN');
}

/* ---------------------------------------------------------------- section pages */
let pageIntro = null;
/* Each page gets its own visual system: tag the page root with its id. */
function root0Class(id) {
  $('#page').className = `page-inner pg-${id}`;
}
function renderPage(id) {
  const r = SECTION_RENDERERS[id](ctx);
  pageIntro = r.intro || null;
  root0Class(id);
  const root = $('#page');
  root.innerHTML = r.html;
  root.querySelectorAll('[data-ransom]').forEach((h, i) => ransom(h, h.dataset.ransom, i + id.length));
  root.querySelectorAll('[data-mission]').forEach((b) => b.addEventListener('click', () => openDossier(b.dataset.mission, b)));
  root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => toggleSetting(b)));
  root.querySelector('#musicVol')?.addEventListener('input', (e) => setMusicVolume(Number(e.target.value)));
  r.after?.(root);
  hydrateStamps(root);
  if (id === 'contact') sfx('sparkle');
  store.addTo('visited', id);
}

let cutinShown = false;
async function openDossier(id, row) {
  const m = resume.missions.find((x) => x.id === id);
  sfx('select');
  if (m.bestStat && !cutinShown) {
    cutinShown = true;
    const at = navSeq;
    await cutIn(`${m.bestStat} CAUGHT`);
    if (at !== navSeq || !$('#modal').hidden || menu.isOpen()) return; // the visitor moved on during the cut-in
  }
  openModal(dossierMarkup(m));
  const title = $('#modalPanel [data-ransom]');
  if (title) ransom(title, title.dataset.ransom, 5); // the file name in cut-out letters
  animateDossier($('#modalPanel'), () => {
    sfx('thwack');
    shake($('#modalPanel'));
    const st = $('#modalPanel .loot li:last-child');
    if (st) {
      const r = st.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 1.2);
    }
  });
  if (reducedMotion()) sfx('thwack');
  store.addTo('opened', id);
  hydrateStamps($('#modalPanel'));
  unlock('case-file');
}

function toggleSetting(b) {
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? 'ON' : 'OFF';
  if (b.dataset.toggle === 'sound') {
    setSound(on);
    syncSoundButton();
  } else {
    store.setSetting('reduceMotion', on);
    document.body.classList.toggle('reduce-motion', on);
  }
  sfx('toggle');
}

/* ---------------------------------------------------------------- modal */
let closing = null;
function openModal(html) {
  if (closing) {
    closing.kill();
    closing = null;
    $('#modal').classList.remove('closing');
    gsap.set('#modalPanel', { clearProps: 'all' });
  }
  lastFocus = document.activeElement;
  $('#modalPanel').innerHTML = html;
  $('#modal').hidden = false;
  setBehindModal(true);
  $('#modalPanel [data-close]')?.focus({ preventScroll: true });
}

/* While a file is open, the page behind it can't be tabbed into or clicked (a real modal). */
function setBehindModal(on) {
  $$('#app, .hud-tl, .hud-tr, #menu, .skip-link').forEach((el) => (el.inert = on));
}

function closeModal() {
  if ($('#modal').hidden || closing) return false;
  setBehindModal(false); // before focus goes back: inert elements can't take focus
  const done = () => {
    closing = null;
    $('#modal').hidden = true;
    $('#modal').classList.remove('closing');
    $('#modalPanel').innerHTML = '';
    gsap.set('#modalPanel', { clearProps: 'all' });
  };
  lastFocus?.focus?.({ preventScroll: true });
  if (reducedMotion()) {
    done();
    return true;
  }
  $('#modal').classList.add('closing');
  closing = gsap.to('#modalPanel', { scale: 0.82, rotation: 4, y: 40, opacity: 0, duration: 0.16, ease: 'power3.in', onComplete: done });
  return true;
}

/* Tab and Shift+Tab cycle inside the open file instead of escaping to the browser bar. */
$('#modal').addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const items = [...$('#modalPanel').querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' || e.target.closest('[data-close]')) {
    sfx('back');
    closeModal();
  }
});

$('#achBtn').addEventListener('click', () => {
  sfx('select');
  openModal(`<button class="modal-x" type="button" data-close aria-label="Close">✕</button>
    <h2 class="dossier-title" id="modalTitle" style="margin-bottom:12px">ACHIEVEMENTS</h2>${listMarkup()}
    <p style="margin:14px 0 0;font-size:14px">All 7 unlock the director's cut, how my AI crew built this.</p>`);
});

/* ---------------------------------------------------------------- HUD + sound */
function syncSoundButton() {
  const on = store.get().settings.sound;
  $('#soundBtn').setAttribute('aria-pressed', String(on));
  const t = $('#page [data-toggle="sound"]'); // the SYSTEM page toggle, when it is open
  if (t) {
    t.setAttribute('aria-pressed', String(on));
    t.textContent = on ? 'ON' : 'OFF';
  }
}

/* Sound was left ON last visit: browsers only allow audio after a gesture, so the music
   picks back up on the visitor's first click or key press. */
if (store.get().settings.sound) {
  const resumeAudio = () => {
    window.removeEventListener('pointerdown', resumeAudio, true);
    window.removeEventListener('keydown', resumeAudio, true);
    if (store.get().settings.sound) setSound(true);
  };
  window.addEventListener('pointerdown', resumeAudio, true);
  window.addEventListener('keydown', resumeAudio, true);
}

$('#soundBtn').addEventListener('click', () => toggleSound());
function toggleSound() {
  const on = !store.get().settings.sound;
  setSound(on);
  syncSoundButton();
  if (on) sfx('toggle');
}

let hinted = false;
function soundHint() {
  if (hinted || store.get().settings.sound) return;
  hinted = true;
  $('#soundBtn').classList.add('wiggle');
  $('#soundTip').classList.add('show');
  setTimeout(() => $('#soundBtn').classList.remove('wiggle'), 1400);
}

$('#menuBtn').addEventListener('click', () => {
  menu.isOpen() ? menu.close() : menu.open();
});

function renderKeyHints(mode) {
  const sets = {
    board: [['TAB', 'MOVE'], ['⏎', 'OPEN'], ['1-2', 'CASE FILES'], ['F', 'FLIP'], ['Q', 'QUICK VIEW']],
    page: [['↑↓', 'MOVE'], ['⏎', 'OPEN'], ['ESC', 'BACK'], ['Q', 'QUICK VIEW']]
  };
  $('#keyhints').innerHTML = (sets[mode] || [])
    .map(([k, v]) => `<span><b>${esc(k)}</b>${esc(v)}</span>`)
    .join('');
}

/* ---------------------------------------------------------------- input */
function back() {
  if (closeModal()) return true;
  if (menu.isOpen()) {
    menu.close();
    return true;
  }
  if (screen === 'page' || screen === 'quick') {
    sfx('back');
    navigate('board');
    return true;
  }
  return false;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-back]')) {
    e.preventDefault();
    back();
  }
  const t = e.target.closest('[data-track]');
  if (t) track(t.dataset.track);
});

/* Any click skips a running animation. */
document.addEventListener('pointerdown', () => {
  if (isAnimating()) skipCurrent();
}, true);

function navItems() {
  const scope = !$('#modal').hidden ? $('#modal') : menu.isOpen() ? $('#menu') : screen === 'board' ? $('#screen-board') : screen === 'quick' ? $('#screen-quick') : $('#page');
  return [...scope.querySelectorAll('[data-nav], .btn, a[href]')].filter((el, i, arr) => el.offsetParent !== null && arr.indexOf(el) === i);
}

function moveFocus(dir) {
  const items = navItems();
  if (!items.length) return false;
  const i = items.indexOf(document.activeElement);
  const next = items[(i + dir + items.length) % items.length] || items[0];
  next.focus();
  if (!menu.isOpen()) next.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  return true;
}

function handle(action, e) {
  if (isAnimating() && (action === 'confirm' || action === 'back')) return skipCurrent();
  switch (action) {
    case 'up':
    case 'left':
      return screen === 'title' ? false : moveFocus(-1);
    case 'down':
    case 'right':
      return screen === 'title' ? false : moveFocus(1);
    case 'confirm':
      if (screen === 'title' && [document.body, null, $('#pressStart')].includes(document.activeElement)) {
        $('#pressStart').click();
        return true;
      }
      if (!e) {
        document.activeElement?.click();
        return true;
      }
      return false;
    case 'back':
      return back();
    case 'quick':
      if (screen === 'quick') return false;
      navigate('quick');
      return true;
    case 'flip':
      flipGpa();
      return true;
    case 'mute':
      toggleSound();
      return true;
    default:
      if (action.startsWith('hotkey:') && $('#modal').hidden) {
        const n = Number(action.split(':')[1]);
        if (screen === 'board' && !menu.isOpen() && n <= resume.missions.length) {
          const b = $$('#board .case-open')[n - 1];
          b?.click();
          return Boolean(b);
        }
        if (screen !== 'title' && MENU_ITEMS[n - 1]) {
          viaMenu = true;
          navigate(MENU_ITEMS[n - 1].id);
          return true;
        }
      }
      return false;
  }
}

bindInput(handle);
bindGamepad(handle, () => unlock('player-2'));

/* ---------------------------------------------------------------- analytics (cookie-free, optional) */
function track(name) {
  try {
    window.goatcounter?.count?.({ path: name, title: name, event: true });
  } catch {
    /* analytics must never break the page */
  }
}

if (resume.analytics.goatcounter) {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.crossOrigin = 'anonymous';
  s.dataset.goatcounter = `https://${resume.analytics.goatcounter}.goatcounter.com/count`;
  document.head.appendChild(s);
  if (company) s.addEventListener('load', () => track(`company:${company.key}`));
}

/* ---------------------------------------------------------------- motto (only if loading drags) */
setTimeout(() => {
  if (document.readyState === 'complete') return;
  const m = $('#motto');
  m.innerHTML = `<div><blockquote>“${esc(resume.motto.text)}”</blockquote><cite>— ${esc(resume.motto.by)}</cite></div>`;
  m.classList.add('show');
  const shownAt = Date.now();
  window.addEventListener('load', () => setTimeout(() => m.classList.remove('show'), Math.max(0, 1600 - (Date.now() - shownAt))), { once: true });
}, 1000);

/* ---------------------------------------------------------------- boot */
show(route());

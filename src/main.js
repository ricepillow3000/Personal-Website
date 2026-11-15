import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/scenes.css';
import './styles/print.css';

import { gsap } from 'gsap';
import { resume } from './data/resume.js';
import { script, SECTIONS } from './data/script.js';
import { readCompany } from './data/companies.js';
import { store } from './core/store.js';
import { $, $$, esc, wait, reducedMotion, timeOfDay } from './core/util.js';
import { createCity } from './fx/city.js';
import { slashWipe, titlePunch, startSequence, cutIn, enter, skipCurrent, isAnimating, shake, slam } from './fx/transitions.js';
import { ransom, dropIn } from './ui/ransom.js';
import { renderDate, createBars } from './ui/hud.js';
import { createConversation, hubItems } from './scenes/conversation.js';
import { createMenu, MENU_ITEMS } from './scenes/menu.js';
import { SECTION_RENDERERS, dossierMarkup, animateDossier } from './scenes/sections.js';
import { renderQuickView } from './scenes/quickview.js';
import { sfx, setSound, setMusicVolume } from './audio/audio.js';
import { unlock, refreshCounter, listMarkup } from './eggs/achievements.js';
import { armBee } from './eggs/bee.js';
import { installConsole } from './eggs/console.js';
import { bindInput, bindGamepad } from './input/input.js';

/* ---------------------------------------------------------------- setup */
const company = readCompany();
const ctx = { company };
const city = createCity($('#city'));
const convo = createConversation();
const bars = createBars(() => unlock('off-record'));
const menu = createMenu((id) => navigate(id));
const tod = renderDate();

let screen = null; // title | talk | page | quick
let pageId = null;
let greeted = false;
let thanked = false;
let pendingStart = false;
let hubPage = 1;
let lastFocus = null;

document.body.classList.toggle('reduce-motion', store.get().settings.reduceMotion === true);
if (company) $('#visitorTag').textContent = company.name.toUpperCase();
ransom($('#titleName'), resume.first, 11);
$('#titleHook').textContent = resume.hook;
$('#quickPdf').href = resume.links.pdf;
renderQuickView($('#paper'));
refreshCounter();
installConsole();
syncSoundButton();

/* ---------------------------------------------------------------- routing */
const VALID = new Set(['title', 'talk', 'quick', ...Object.keys(SECTION_RENDERERS)]);

function route() {
  const id = window.location.hash.replace(/^#\/?/, '') || 'title';
  return VALID.has(id) ? id : 'title';
}

export function navigate(id) {
  const hash = id === 'title' ? '#/' : `#/${id}`;
  if (window.location.hash === hash) show(id);
  else window.location.hash = hash;
}

window.addEventListener('hashchange', () => show(route()));

const modeOf = (id) => (id === 'title' || id === 'talk' ? id : id === 'quick' ? 'quick' : 'page');

function activate(id) {
  const mode = modeOf(id);
  document.body.dataset.screen = id;
  document.body.dataset.mode = mode;
  $$('.screen').forEach((s) => s.classList.remove('active'));
  const el = mode === 'page' ? $('#screen-page') : $(`#screen-${mode}`);
  el.classList.add('active');
  el.scrollTop = 0;
  city.setMode(mode === 'title' ? 'title' : mode === 'talk' ? 'talk' : 'page');
  $('#city').style.filter = mode === 'page' ? 'brightness(.42) saturate(.7)' : mode === 'quick' ? 'brightness(.2)' : '';
  renderKeyHints(mode);
}

async function show(id) {
  const prev = screen;
  const prevPage = pageId;
  if (prev === 'page' && pageId === id) return;
  if (prev === id && id !== 'page') return;
  menu.close();
  closeModal();
  const mode = modeOf(id);

  const swap = () => {
    activate(id);
    screen = mode === 'page' ? 'page' : id;
    pageId = mode === 'page' ? id : null;
    if (mode === 'page') renderPage(id);
  };

  if (prev === null) {
    swap();
  } else if (prev === 'title' && id === 'talk' && pendingStart) {
    pendingStart = false;
    await startSequence(city, swap);
  } else {
    await slashWipe(swap);
  }

  if (mode === 'title') introTitle();
  if (mode === 'talk') await enterTalk(prev === 'page' ? prevPage : prev);
  if (mode === 'page') {
    await titlePunch(SECTION_RENDERERS[id](ctx).title);
    enter($('#page'));
    $('#page [data-nav]')?.focus({ preventScroll: true });
  }
  if (mode === 'quick') {
    track('quick_view');
    $('#screen-quick .btn')?.focus({ preventScroll: true });
  }
}

/* ---------------------------------------------------------------- title */
function introTitle() {
  dropIn($('#titleName'), 0.15);
  if (!reducedMotion()) gsap.from('#screen-title .title-codename, #screen-title .title-hook, #pressStart, #screen-title .quick-link', { x: -40, opacity: 0, stagger: 0.08, duration: 0.35, delay: 0.35, ease: 'back.out(2)', clearProps: 'all' });
  setTimeout(() => $('#pressStart').focus({ preventScroll: true }), 50);
}

$('#pressStart').addEventListener('click', () => {
  sfx('snare');
  unlock('first-words');
  pendingStart = true;
  navigate('talk');
});

/* ---------------------------------------------------------------- conversation */
async function enterTalk(from) {
  hubPage = 1;
  convo.clearChoices();
  const vars = { timeOfDay: tod.word, company: company ? company.name : '' };
  if (!greeted) {
    greeted = true;
    await convo.say(company ? script.companyGreeting : script.greeting, vars);
    if (tod.key === 'late') {
      await wait(700);
      await convo.say(script.lateNight);
    }
    soundHint();
    armBee(() => screen === 'talk', onBee);
  } else if (!thanked && SECTIONS.every((s) => store.has('visited', s))) {
    thanked = true;
    await convo.say(script.allSeen);
    showHub(true);
    return;
  } else {
    await convo.say(script.returns[from] || script.returns.default);
  }
  showHub();
}

function showHub(withLinkedIn = false) {
  const order = company?.order?.choices;
  let items = hubItems(script, hubPage, order);
  if (withLinkedIn && hubPage === 1) items = [{ key: '__linkedin', label: script.allSeenChoice, primary: true }, ...items];
  const buttons = convo.showChoices(items, onPick);
  buttons[0]?.focus({ preventScroll: true });
}

async function onPick(key) {
  if (key === '__more' || key === '__back') {
    hubPage = key === '__more' ? 2 : 1;
    await slashSwapChoices();
    return;
  }
  if (key === '__linkedin') {
    track('linkedin_click');
    window.open(resume.links.linkedin, '_blank', 'noopener');
    showHub(true);
    return;
  }
  const choice = script.choices[key];
  await convo.say(choice.reply);
  await wait(reducedMotion() ? 150 : 450);
  navigate(choice.to);
}

async function slashSwapChoices() {
  if (!reducedMotion()) {
    await gsap.to('#choices', { x: 60, skewX: -20, opacity: 0, duration: 0.14 });
    gsap.set('#choices', { clearProps: 'all' });
  }
  showHub();
}

function onBee() {
  unlock('bee');
  bars.spike();
  shake();
  convo.say(script.bee).then(() => wait(1200)).then(() => {
    if (screen === 'talk') convo.say(script.beeAfter);
  });
}

/* ---------------------------------------------------------------- section pages */
function renderPage(id) {
  const r = SECTION_RENDERERS[id](ctx);
  const root = $('#page');
  root.innerHTML = r.html;
  root.querySelectorAll('[data-ransom]').forEach((h, i) => ransom(h, h.dataset.ransom, i + id.length));
  root.querySelectorAll('[data-mission]').forEach((b) => b.addEventListener('click', () => openDossier(b.dataset.mission, b)));
  root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => toggleSetting(b)));
  root.querySelector('#musicVol')?.addEventListener('input', (e) => setMusicVolume(Number(e.target.value)));
  r.after?.(root);
  if (id === 'contact') sfx('toms');
  if (store.addTo('visited', id) && SECTIONS.every((s) => store.has('visited', s))) unlock('full-recon');
}

let cutinShown = false;
async function openDossier(id, row) {
  const m = resume.missions.find((x) => x.id === id);
  sfx('snare');
  if (m.bestStat && !cutinShown) {
    cutinShown = true;
    await cutIn(`${m.bestStat} CAUGHT`);
  }
  openModal(dossierMarkup(m));
  const tl = animateDossier($('#modalPanel'));
  tl.eventCallback?.('onComplete', () => {
    sfx('crash');
    shake($('#modalPanel'));
  });
  if (reducedMotion()) sfx('crash');
  if (store.addTo('opened', id) && !row.querySelector('.stamp')) {
    row.insertAdjacentHTML('beforeend', '<span class="stamp stamp-cleared">CLEARED!</span>');
    slam(row.querySelector('.stamp'));
  }
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
    city.restart();
  }
  sfx('snare');
}

/* ---------------------------------------------------------------- modal */
function openModal(html) {
  lastFocus = document.activeElement;
  $('#modalPanel').innerHTML = html;
  $('#modal').hidden = false;
  $('#modalPanel [data-close]')?.focus({ preventScroll: true });
}

function closeModal() {
  if ($('#modal').hidden) return false;
  $('#modal').hidden = true;
  $('#modalPanel').innerHTML = '';
  lastFocus?.focus?.({ preventScroll: true });
  return true;
}

$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' || e.target.closest('[data-close]')) {
    sfx('kick');
    closeModal();
  }
});

$('#achBtn').addEventListener('click', () => {
  sfx('snare');
  openModal(`<button class="modal-x" type="button" data-close aria-label="Close">✕</button>
    <h2 class="dossier-title" id="modalTitle" style="margin-bottom:12px">ACHIEVEMENTS</h2>${listMarkup()}
    <p style="margin:14px 0 0;font-size:14px">All 7 unlock a behind-the-scenes card in SYSTEM.</p>`);
});

/* ---------------------------------------------------------------- HUD + sound */
function syncSoundButton() {
  $('#soundBtn').setAttribute('aria-pressed', String(store.get().settings.sound));
}

$('#soundBtn').addEventListener('click', () => toggleSound());
function toggleSound() {
  const on = !store.get().settings.sound;
  setSound(on);
  syncSoundButton();
  if (on) sfx('snare');
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
  sfx('snare');
  menu.isOpen() ? menu.close() : menu.open();
});

function renderKeyHints(mode) {
  const sets = {
    talk: [['↑↓', 'SELECT'], ['⏎', 'CONFIRM'], ['1-5', 'PICK'], ['F', 'FLIP'], ['Q', 'QUICK VIEW']],
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
    sfx('kick');
    navigate('talk');
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
  const scope = !$('#modal').hidden ? $('#modal') : menu.isOpen() ? $('#menu') : screen === 'talk' ? $('#choices') : screen === 'quick' ? $('#screen-quick') : $('#page');
  return [...scope.querySelectorAll('[data-nav], .btn, a[href]')].filter((el, i, arr) => el.offsetParent !== null && arr.indexOf(el) === i);
}

function moveFocus(dir) {
  const items = navItems();
  if (!items.length) return false;
  const i = items.indexOf(document.activeElement);
  const next = items[(i + dir + items.length) % items.length] || items[0];
  next.focus();
  if (screen !== 'talk' && !menu.isOpen()) next.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  sfx('hat');
  return true;
}

function handle(action, e) {
  if (isAnimating() && (action === 'confirm' || action === 'back')) return skipCurrent();
  if (screen === 'talk' && convo.isTyping() && action === 'confirm') {
    convo.finishLine();
    return true;
  }
  switch (action) {
    case 'up':
    case 'left':
      return screen === 'title' ? false : moveFocus(-1);
    case 'down':
    case 'right':
      return screen === 'title' ? false : moveFocus(1);
    case 'confirm':
      if (screen === 'title' && document.activeElement?.tagName !== 'A') {
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
      bars.flip();
      return true;
    case 'mute':
      toggleSound();
      return true;
    default:
      if (action.startsWith('hotkey:')) {
        const n = Number(action.split(':')[1]);
        if (screen === 'talk' && !menu.isOpen()) {
          const b = $$('#choices .choice')[n - 1];
          b?.click();
          return Boolean(b);
        }
        if (screen !== 'title' && MENU_ITEMS[n - 1]) {
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
  s.src = '//gc.zgo.at/count.js';
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
const first = route();
if (first !== 'title') greeted = first === 'talk' ? false : greeted;
show(first);

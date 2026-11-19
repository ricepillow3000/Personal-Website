/* Tiny persistent store. Every read/write is wrapped: private windows,
   blocked storage or previews must never break the site.

   Save files (Nov 19, John's save-screen reference: "they press continue and get redirected to a
   section where they can create a new save data or continue, and they have multiple sections to save
   the data"): SLOTS files, each with its own game (chapters read, projects cleared, secrets) and its
   own record (created, last saved, play time, the last place visited). The settings (sound, music,
   motion) belong to the visitor, not to a file. store.get() is the ACTIVE file's game plus the
   settings, so the rest of the site reads and writes it exactly as before. A visitor who never picks
   a file (a deep link) gets one the first time anything is saved: their last file, else the first
   empty one. Saves from before files (v1) become File 1. */

const KEY = 'jn-resume-v1'; // (the same key: the v2 layout inside it has `v: 2`)
export const SLOTS = 5;
const GAME = ['visited', 'opened', 'cleared', 'lit', 'achievements'];

const game = () => ({ visited: [], opened: [], cleared: [], lit: [], achievements: [] });
const record = () => ({ created: 0, saved: 0, playMs: 0, last: '' });
const settings0 = () => ({ sound: true, soundChosen: false, music: 0.5, reduceMotion: null });
const ids = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x)).slice(0, 80) : []);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
const hasGame = (g) => GAME.some((k) => g[k].length > 0);

function cleanGame(g) {
  const out = game();
  if (g && typeof g === 'object') GAME.forEach((k) => { out[k] = ids(g[k]); });
  return out;
}
function cleanSlot(s) {
  if (!s || typeof s !== 'object') return null;
  const m = s.meta && typeof s.meta === 'object' ? s.meta : {};
  return { ...cleanGame(s), meta: { created: num(m.created), saved: num(m.saved), playMs: num(m.playMs), last: ids([m.last])[0] || '' } };
}
function cleanSettings(st) {
  const d = settings0();
  if (!st || typeof st !== 'object') return d;
  const music = Number(st.music);
  return {
    // sound is ON by default (Nov 19, John); a visitor's own choice is kept (soundChosen). Saves from
    // before the switch to on-by-default hold the old default `false`, not a choice.
    sound: st.soundChosen === true ? st.sound === true : true,
    soundChosen: st.soundChosen === true,
    music: Number.isFinite(music) ? Math.min(1, Math.max(0, music)) : d.music,
    reduceMotion: typeof st.reduceMotion === 'boolean' ? st.reduceMotion : null
  };
}

function load() {
  const doc = { v: 2, settings: settings0(), active: null, slots: Array(SLOTS).fill(null) };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return doc;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return doc;
    doc.settings = cleanSettings(data.settings);
    if (data.v === 2 && Array.isArray(data.slots)) {
      for (let i = 0; i < SLOTS; i++) doc.slots[i] = cleanSlot(data.slots[i]);
      const a = Number(data.active);
      doc.active = Number.isInteger(a) && a >= 0 && a < SLOTS && doc.slots[a] ? a : null;
    } else {
      // a save from before files: it becomes File 1
      const g = cleanGame(data);
      if (hasGame(g)) {
        const now = Date.now();
        doc.slots[0] = { ...g, meta: { created: now, saved: now, playMs: 0, last: '' } };
        doc.active = 0;
      }
    }
  } catch {
    /* unreadable: start clean */
  }
  return doc;
}

const doc = load();
// the active file's game + the settings: what the rest of the site reads (store.get())
const state = { ...game(), settings: doc.settings };
if (doc.active !== null) GAME.forEach((k) => { state[k] = [...doc.slots[doc.active][k]]; });
const listeners = new Set();

function write() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}
/** the file the game is being saved to; a visitor who never picked one gets their last, else the first empty */
let pendingPlace = ''; // where the visitor is before their first save makes a file (a deep link)
function ensureSlot() {
  if (doc.active !== null) return doc.active;
  let i = doc.slots.findIndex((s) => !s);
  if (i < 0) i = 0;
  const now = Date.now();
  doc.slots[i] = { ...game(), meta: { ...record(), created: now, saved: now, last: pendingPlace } };
  doc.active = i;
  return i;
}
function save() {
  const i = ensureSlot();
  const s = doc.slots[i];
  GAME.forEach((k) => { s[k] = [...state[k]]; });
  s.meta.saved = Date.now();
  write();
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  addTo(list, value) {
    if (!Array.isArray(state[list])) state[list] = [];
    if (state[list].includes(value)) return false;
    state[list].push(value);
    save();
    return true;
  },
  has: (list, value) => Array.isArray(state[list]) && state[list].includes(value),
  setSetting(name, value) {
    state.settings[name] = value;
    write(); // (settings belong to the visitor, not to a file)
    listeners.forEach((fn) => fn(state));
  },
  /** the active file's game wiped (its record stays) */
  reset() {
    GAME.forEach((k) => { state[k] = []; });
    save();
  },

  /* ---- save files ---- */
  /** every file: null (empty) or a copy of its game and record */
  slots: () => doc.slots.map((s) => (s ? JSON.parse(JSON.stringify(s)) : null)),
  active: () => doc.active,
  /** play a file: an empty one starts a new game in it, a saved one is loaded */
  useSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i >= SLOTS) return;
    const now = Date.now();
    if (!doc.slots[i]) doc.slots[i] = { ...game(), meta: { ...record(), created: now, saved: now } };
    doc.active = i;
    GAME.forEach((k) => { state[k] = [...doc.slots[i][k]]; });
    doc.slots[i].meta.saved = now;
    write();
    listeners.forEach((fn) => fn(state));
  },
  /** erase a file (the game playing it, if any, starts clean, with no file until it saves again) */
  eraseSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i >= SLOTS) return;
    doc.slots[i] = null;
    if (doc.active === i) {
      doc.active = null;
      GAME.forEach((k) => { state[k] = []; });
    }
    write();
    listeners.forEach((fn) => fn(state));
  },
  /** the place the active file was last at (a chapter or THE PLAN), for its save slip */
  touch(place) {
    if (!/^[a-z0-9-]{1,40}$/.test(place)) return;
    if (doc.active === null) { pendingPlace = place; return; } // (kept for the file the first save makes)
    doc.slots[doc.active].meta.last = place;
    write();
  },
  /** time played on the active file */
  addPlay(ms) {
    if (doc.active === null || !(ms > 0)) return;
    doc.slots[doc.active].meta.playMs += Math.min(ms, 60000);
    write();
  }
};

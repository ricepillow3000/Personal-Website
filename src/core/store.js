/* Tiny persistent store. Every read/write is wrapped: private windows,
   blocked storage or previews must never break the site. */

const KEY = 'jn-resume-v1';

const defaults = () => ({
  visited: [],
  opened: [],
  cleared: [],
  achievements: [],
  settings: { sound: false, music: 0.5, reduceMotion: null }
});

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...data, settings: { ...d.settings, ...(data.settings || {}) } };
  } catch {
    return defaults();
  }
}

const state = load();
const listeners = new Set();

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: keep working in memory */
  }
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
    save();
  },
  reset() {
    Object.assign(state, defaults());
    save();
  }
};

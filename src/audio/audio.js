import { resume } from '../data/resume.js';
import { store } from '../core/store.js';

/* Drum-kit sound engine. Off by default; the AudioContext is created on the first
   click that turns sound on (browser autoplay rules).
   Until John's e-kit recordings exist, every hit is synthesized here. Setting
   resume.assets.drumSamples = true swaps in /assets/audio/{name}.ogg. */

let ac = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;
const samples = {};
let music = null;

const enabled = () => store.get().settings.sound;

function ensure() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.55;
  sfxBus.connect(master);
  musicBus = ac.createGain();
  musicBus.gain.value = store.get().settings.music * 0.6;
  musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (resume.assets.drumSamples) loadSamples();
  return ac;
}

async function loadSamples() {
  await Promise.all(
    ['hat', 'snare', 'kick', 'crash', 'toms'].map(async (n) => {
      try {
        const res = await fetch(`assets/audio/${n}.ogg`);
        if (res.ok) samples[n] = await ac.decodeAudioData(await res.arrayBuffer());
      } catch {
        /* keep the synth fallback */
      }
    })
  );
}

function playSample(name, bus, gain = 1, at = ac.currentTime) {
  const src = ac.createBufferSource();
  src.buffer = samples[name];
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(bus);
  src.start(at);
}

/* ---------- synth voices ---------- */
function noise(bus, { at, dur, type = 'highpass', freq = 7000, q = 0.8, gain = 0.4 }) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.02);
}

function sweep(bus, at, from, to, dur, gain, q = 1) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0008, at);
  g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.85);
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur + 0.03);
  src.connect(f).connect(g).connect(bus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.05);
}

function tone(bus, { at, dur, from, to, type = 'sine', gain = 0.6 }) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + dur + 0.02);
}

const VOICES = {
  hat: (bus, at, v = 1) => noise(bus, { at, dur: 0.05, freq: 8000, gain: 0.32 * v }),
  tick: (bus, at) => noise(bus, { at, dur: 0.025, freq: 9500, gain: 0.12 }),
  snare: (bus, at, v = 1) => {
    noise(bus, { at, dur: 0.16, type: 'bandpass', freq: 2200, q: 0.6, gain: 0.55 * v });
    tone(bus, { at, dur: 0.1, from: 260, to: 160, type: 'triangle', gain: 0.35 * v });
  },
  kick: (bus, at, v = 1) => tone(bus, { at, dur: 0.32, from: 140, to: 42, gain: 0.95 * v }),
  crash: (bus, at, v = 1) => noise(bus, { at, dur: 1.1, freq: 5200, q: 0.3, gain: 0.35 * v }),
  /* PAPER RIP: one continuous tear (no clicky gaps). Band-passed noise whose loudness
     flutters quickly like fibres giving way, rising in pitch, with a crisp edge layer. */
  rip: (bus, at, v = 1, dur = 0.38) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(700, at);
    bp.frequency.exponentialRampToValueAtTime(2400, at + dur);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0008, at);
    let t = at;
    while (t < at + dur) {
      // fibres tearing: fast, uneven swells that never drop to silence
      t += 0.009 + Math.random() * 0.018;
      g.gain.linearRampToValueAtTime((0.22 + Math.random() * 0.38) * v, t);
    }
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur + 0.06);
    src.connect(bp).connect(lp).connect(g).connect(bus);
    src.start(at, Math.random() * 0.4);
    src.stop(at + dur + 0.08);
    // the crisp torn edge on top
    const edge = ac.createBufferSource();
    edge.buffer = noiseBuf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4200;
    const eg = ac.createGain();
    eg.gain.setValueAtTime(0.0008, at);
    eg.gain.exponentialRampToValueAtTime(0.09 * v, at + dur * 0.7);
    eg.gain.exponentialRampToValueAtTime(0.0008, at + dur + 0.04);
    edge.connect(hp).connect(eg).connect(bus);
    edge.start(at, Math.random() * 0.4);
    edge.stop(at + dur + 0.06);
  },
  /* the title-page tear uses the same paper rip, stretched to the tug length */
  tear: (bus, at, v = 1, dur = 0.4) => VOICES.rip(bus, at, v, dur),
  /* fast air swipe for slashes */
  whoosh: (bus, at, v = 1) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(500, at);
    f.frequency.exponentialRampToValueAtTime(4200, at + 0.2);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0008, at);
    g.gain.exponentialRampToValueAtTime(0.4 * v, at + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.24);
    src.connect(f).connect(g).connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + 0.26);
  },
  /* ---------- UI + transition sounds: deliberately NOT drum sounds, so they never
     blend into the drum music. Cartoon pops, blips, paper and metal. ---------- */
  hover: (bus, at) => tone(bus, { at, dur: 0.045, from: 1500, to: 2100, type: 'triangle', gain: 0.11 }),
  select: (bus, at) => {
    tone(bus, { at, dur: 0.07, from: 480, to: 1250, type: 'triangle', gain: 0.36 }); // cartoon "pop"
    tone(bus, { at: at + 0.045, dur: 0.09, from: 1250, to: 1300, type: 'sine', gain: 0.18 });
    noise(bus, { at, dur: 0.015, type: 'bandpass', freq: 3200, q: 2, gain: 0.25 }); // tiny paper click
  },
  back: (bus, at) => tone(bus, { at, dur: 0.14, from: 760, to: 240, type: 'triangle', gain: 0.3 }), // "bwoop"
  toggle: (bus, at) => {
    tone(bus, { at, dur: 0.05, from: 880, to: 900, type: 'square', gain: 0.07 });
    tone(bus, { at: at + 0.06, dur: 0.07, from: 1320, to: 1340, type: 'square', gain: 0.07 });
  },
  menuOpen: (bus, at) => [523, 659, 784, 1047].forEach((f, i) => tone(bus, { at: at + i * 0.035, dur: 0.12, from: f, to: f * 1.01, type: 'triangle', gain: 0.2 })),
  menuClose: (bus, at) => [1047, 784, 523].forEach((f, i) => tone(bus, { at: at + i * 0.03, dur: 0.08, from: f, to: f * 0.98, type: 'triangle', gain: 0.16 })),
  /* air swipe under the slash wipe */
  swish: (bus, at) => VOICES.whoosh(bus, at, 0.8),
  /* page lands: short wooden "thwack" (higher and shorter than any kick) */
  thwack: (bus, at, v = 1) => {
    tone(bus, { at, dur: 0.09, from: 340, to: 150, type: 'triangle', gain: 0.55 * v });
    noise(bus, { at, dur: 0.06, type: 'bandpass', freq: 1700, q: 1.2, gain: 0.45 * v });
  },
  /* small stamp / sticker landing */
  thunk: (bus, at) => {
    tone(bus, { at, dur: 0.07, from: 620, to: 330, type: 'sine', gain: 0.5 });
    noise(bus, { at, dur: 0.04, type: 'bandpass', freq: 1900, q: 1.5, gain: 0.3 });
  },
  /* glitter after a hit */
  sparkle: (bus, at) => [2637, 3520, 3136, 4186].forEach((f, i) => tone(bus, { at: at + i * 0.04, dur: 0.09, from: f, to: f, type: 'triangle', gain: 0.08 })),
  /* rising suck-in before a big hit (anticipation) */
  riser: (bus, at) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(900, at + 0.24);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(400, at);
    f.frequency.exponentialRampToValueAtTime(3500, at + 0.24);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0008, at);
    g.gain.exponentialRampToValueAtTime(0.16, at + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.27);
    o.connect(f).connect(g).connect(bus);
    o.start(at);
    o.stop(at + 0.3);
    VOICES.whoosh(bus, at + 0.04, 0.7);
  },
  /* the big CLEARED! stamp: deep sub drop + metal "KLANG" + paper smack, then a cartoon victory sting */
  stamp: (bus, at) => {
    tone(bus, { at, dur: 0.7, from: 95, to: 28, type: 'sine', gain: 1.0 }); // sub drop, longer and deeper than a kick
    [233, 330, 466, 587].forEach((f, i) => tone(bus, { at, dur: 0.42 - i * 0.05, from: f * 1.06, to: f, type: 'square', gain: 0.07 })); // inharmonic metal clang
    noise(bus, { at, dur: 0.12, type: 'lowpass', freq: 2600, q: 0.7, gain: 0.7 }); // paper/ink smack
    noise(bus, { at: at + 0.01, dur: 0.35, type: 'bandpass', freq: 900, q: 3, gain: 0.25 }); // ring-out
    // victory sting: quick rising arpeggio that lands on a held, wobbling top note
    [784, 1047, 1319].forEach((f, i) => tone(bus, { at: at + 0.14 + i * 0.05, dur: 0.1, from: f, to: f, type: 'triangle', gain: 0.22 }));
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1568, at + 0.29);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 9;
    const lg = ac.createGain();
    lg.gain.value = 18;
    lfo.connect(lg).connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0008, at + 0.29);
    g.gain.exponentialRampToValueAtTime(0.22, at + 0.31);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.75);
    o.connect(g).connect(bus);
    o.start(at + 0.29);
    lfo.start(at + 0.29);
    o.stop(at + 0.8);
    lfo.stop(at + 0.8);
  },
  /* cartoon "zip" for things flying across the screen */
  zip: (bus, at) => tone(bus, { at, dur: 0.2, from: 2600, to: 320, type: 'triangle', gain: 0.18 }),
  /* ratchet clicks for the blinds transition */
  ratchet: (bus, at) => { for (let i = 0; i < 6; i++) tone(bus, { at: at + i * 0.028, dur: 0.012, from: 1100 + i * 140, to: 1100 + i * 140, type: 'square', gain: 0.07 }); },
  /* paper sheet sliding */
  paper: (bus, at) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(900, at);
    f.frequency.exponentialRampToValueAtTime(2600, at + 0.3);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0008, at);
    g.gain.exponentialRampToValueAtTime(0.22, at + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.32);
    src.connect(f).connect(g).connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + 0.34);
  },
  /* TREASURE GET (achievements): original chiptune-style "item get" fanfare.
     A fast glittering run up two octaves, a tiny breath, then a bright held major chord
     with bell shimmer and twinkles on top. Feels like opening a chest, not a drum hit. */
  treasure: (bus, at) => {
    const run = [72, 76, 79, 84, 88, 91, 96]; // C5 E5 G5 C6 E6 G6 C7
    run.forEach((n, i) => {
      const f = 440 * 2 ** ((n - 69) / 12);
      tone(bus, { at: at + i * 0.045, dur: 0.09, from: f, to: f, type: 'square', gain: 0.045 });
      tone(bus, { at: at + i * 0.045, dur: 0.12, from: f, to: f, type: 'triangle', gain: 0.1 });
    });
    const c = at + run.length * 0.045 + 0.06;
    [84, 88, 91, 96].forEach((n, i) => {
      // held chord: square + triangle with a gentle vibrato-free bell tail
      const f = 440 * 2 ** ((n - 69) / 12);
      const o = ac.createOscillator();
      o.type = i % 2 ? 'triangle' : 'square';
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0008, c);
      g.gain.exponentialRampToValueAtTime(i % 2 ? 0.1 : 0.035, c + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, c + 1.1);
      o.connect(g).connect(bus);
      o.start(c);
      o.stop(c + 1.15);
    });
    // twinkles that sparkle above the chord
    [2093, 2637, 3136, 4186, 3520, 5274].forEach((f, i) => tone(bus, { at: c + 0.08 + i * 0.07, dur: 0.16, from: f, to: f, type: 'sine', gain: 0.06 }));
    tone(bus, { at: c, dur: 0.5, from: 130.8, to: 130.8, type: 'triangle', gain: 0.18 }); // warm low C under it
  },
  /* ---- section hover sounds: each kind of card has its own little arcade voice ---- */
  hvCase: (bus, at) => { // case files: "bip-BOP" two-step, like selecting a stage
    tone(bus, { at, dur: 0.05, from: 660, to: 660, type: 'square', gain: 0.045 });
    tone(bus, { at: at + 0.055, dur: 0.08, from: 990, to: 990, type: 'square', gain: 0.045 });
  },
  hvPerson: (bus, at) => { // person card: friendly cartoon "boing"
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(320, at);
    o.frequency.exponentialRampToValueAtTime(760, at + 0.06);
    o.frequency.exponentialRampToValueAtTime(420, at + 0.18);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0008, at);
    g.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.2);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + 0.22);
  },
  hvQuest: (bus, at) => [523, 659, 784].forEach((f, i) => tone(bus, { at: at + i * 0.035, dur: 0.07, from: f, to: f, type: 'triangle', gain: 0.1 })), // side quests: quick "do-mi-sol"
  hvFact: (bus, at) => tone(bus, { at, dur: 0.09, from: 1900, to: 620, type: 'square', gain: 0.035 }), // facts: tiny laser "pew"
  hvCard: (bus, at) => { // calling card: paper flick + one glint
    noise(bus, { at, dur: 0.05, type: 'bandpass', freq: 2600, q: 2.5, gain: 0.18 });
    tone(bus, { at: at + 0.04, dur: 0.12, from: 2637, to: 2637, type: 'sine', gain: 0.06 });
  },
  hvPoster: (bus, at) => sweep(bus, at, 1800, 600, 0.07, 0.14, 2), // posters: tape "thwip"
  hvRow: (bus, at) => tone(bus, { at, dur: 0.04, from: 1200, to: 1500, type: 'square', gain: 0.03 }), // list rows: tiny tick-up
  /* LEVEL CLEAR (Full Story): a whip crack, then an original bright 8-bit victory jingle:
     quick climbing arpeggio, a two-note "ta-da", and a held sparkling top note. */
  fanfare: (bus, at) => {
    VOICES.whip(bus, at, 0.8);
    const t = at + 0.16;
    const sq = (n, when, len, g = 0.05) => {
      const f = 440 * 2 ** ((n - 69) / 12);
      tone(bus, { at: when, dur: len, from: f, to: f, type: 'square', gain: g });
      tone(bus, { at: when, dur: len, from: f * 2, to: f * 2, type: 'triangle', gain: g * 1.2 });
    };
    [67, 71, 74, 79, 83, 86].forEach((n, i) => sq(n, t + i * 0.055, 0.07)); // G4 B4 D5 G5 B5 D6
    sq(88, t + 0.38, 0.09, 0.06); // E6
    sq(91, t + 0.48, 0.5, 0.06); //  G6 held
    [2637, 3136, 3951].forEach((f, i) => tone(bus, { at: t + 0.52 + i * 0.06, dur: 0.2, from: f, to: f, type: 'sine', gain: 0.05 }));
    tone(bus, { at: t + 0.48, dur: 0.45, from: 98, to: 98, type: 'triangle', gain: 0.18 }); // bass G under the last note
  },
  /* achievement chime */
  chime: (bus, at) => [1319, 1976].forEach((f, i) => tone(bus, { at: at + i * 0.09, dur: 0.3, from: f, to: f, type: 'sine', gain: 0.2 })),
  /* WHIP: a lash whooshes in and CRACKS at at+0.11 (schedule it 0.11s before the hit) */
  whip: (bus, at, v = 1) => {
    sweep(bus, at, 450, 5200, 0.11, 0.55 * v, 1.1);
    const c = at + 0.11;
    noise(bus, { at: c, dur: 0.012, type: 'highpass', freq: 1400, q: 0.4, gain: 1.4 * v }); // the crack
    noise(bus, { at: c, dur: 0.05, type: 'bandpass', freq: 3200, q: 1.2, gain: 0.6 * v });
    tone(bus, { at: c, dur: 0.035, from: 2600, to: 900, type: 'square', gain: 0.12 * v });
    tone(bus, { at: c, dur: 0.1, from: 190, to: 60, type: 'sine', gain: 0.7 * v }); // body
    noise(bus, { at: c + 0.045, dur: 0.18, type: 'bandpass', freq: 2400, q: 2, gain: 0.12 * v }); // slap-back
  },
  /* glass shards locking: bright tinkle + crack */
  glass: (bus, at) => {
    noise(bus, { at, dur: 0.03, type: 'highpass', freq: 3000, q: 0.5, gain: 0.8 });
    [3520, 4699, 5274, 6272].forEach((f, i) => tone(bus, { at: at + 0.01 + i * 0.022, dur: 0.18, from: f, to: f * 0.99, type: 'sine', gain: 0.07 }));
    tone(bus, { at, dur: 0.08, from: 260, to: 120, type: 'triangle', gain: 0.35 });
  },
  /* lighter lash for things flying across the screen */
  whipSmall: (bus, at) => VOICES.whip(bus, at, 0.5),
  /* two quick wind-up swishes before the big crack */
  whipWind: (bus, at) => {
    sweep(bus, at, 300, 2400, 0.12, 0.25, 1);
    sweep(bus, at + 0.13, 380, 3000, 0.1, 0.3, 1);
  },
  toms: (bus, at) => {
    [220, 170, 130, 100].forEach((f, i) => tone(bus, { at: at + i * 0.07, dur: 0.22, from: f, to: f * 0.6, gain: 0.55 }));
  }
};

/** Play a named SFX. UI uses hover/select/back/toggle/menu*; transitions use swish/thwack/
    riser/stamp/zip/thunk/sparkle/ratchet/paper/tear/chime. Drum names stay for the music.
    `dur` is only used by tear (seconds of ripping). */
export function sfx(name, dur) {
  if (!enabled() || !ensure()) return;
  if (ac.state === 'suspended') ac.resume();
  if (name === 'tick') name = 'hover';
  const sampleName = name;
  if (samples[sampleName]) {
    playSample(sampleName, sfxBus, 1);
    return;
  }
  VOICES[name]?.(sfxBus, ac.currentTime, 1, dur);
}

/* ---------- music: "Neon Rain" - original acid-jazz night theme, 92 BPM, swung ----------
   Electric-piano jazz voicings, a walking/sliding bass, a swung ride groove (still drums:
   John is a drummer), an airy flute lead, a shimmering pad and bell sparkles, all sent
   through a long reverb and an echo so it floats. 8-bar form; the melody comes and goes. */
const BPM = 92;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const N = (name) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 12 * (Number(m[3]) + 1) + base;
};
// [root, rootless voicing] per bar
const FORM = [
  ['D2', ['F3', 'A3', 'C4', 'E4']], //   Dm9
  ['G2', ['F3', 'A3', 'B3', 'E4']], //   G13
  ['C2', ['E3', 'G3', 'B3', 'D4']], //   Cmaj9
  ['A2', ['G3', 'Bb3', 'C#4', 'F4']], // A7(b9 b13)
  ['Bb1', ['A3', 'C4', 'D4', 'F4']], //  Bbmaj9
  ['G2', ['Bb3', 'D4', 'F4', 'A4']], //  Gm9
  ['E2', ['D3', 'G3', 'Bb3', 'E4']], //  Em7b5
  ['A2', ['G3', 'C#4', 'F4', 'Bb4']] //  A7(b9 b13)
].map(([r, v]) => [N(r), v.map(N)]);
// lead melody: [step, note, length in 16ths] per bar (original)
const MELODY = [
  [[0, 'A4', 3], [4, 'C5', 2], [6, 'D5', 2], [8, 'E5', 6], [14, 'D5', 2]],
  [[0, 'F5', 4], [6, 'E5', 2], [8, 'D5', 2], [10, 'B4', 5]],
  [[0, 'E5', 6], [8, 'G5', 4], [12, 'D5', 4]],
  [[0, 'C#5', 4], [4, 'Bb4', 2], [6, 'A4', 2], [8, 'G4', 7]],
  [[2, 'D5', 2], [4, 'F5', 2], [6, 'A5', 4], [10, 'G5', 2], [12, 'F5', 4]],
  [[0, 'D5', 4], [4, 'Bb4', 4], [8, 'A4', 2], [10, 'F4', 6]],
  [[0, 'G4', 2], [2, 'Bb4', 2], [4, 'D5', 4], [8, 'C5', 2], [10, 'Bb4', 2], [12, 'G4', 4]],
  [[0, 'A4', 8], [10, 'C#5', 2], [12, 'E5', 4]]
].map((bar) => bar.map(([st, n, len]) => [st, N(n), len]));

let fx = null; // { dry, verb, echo }
function musicFx() {
  if (fx) return fx;
  // long airy reverb from a generated impulse response
  const len = ac.sampleRate * 3.2;
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  const conv = ac.createConvolver();
  conv.buffer = ir;
  const verb = ac.createGain();
  verb.gain.value = 0.55;
  verb.connect(conv);
  const wet = ac.createGain();
  wet.gain.value = 0.42;
  conv.connect(wet).connect(musicBus);
  // dotted-eighth echo with a darkening feedback loop
  const echo = ac.createGain();
  const dl = ac.createDelay(2);
  dl.delayTime.value = (60 / BPM) * 0.75;
  const fb = ac.createGain();
  fb.gain.value = 0.38;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  echo.connect(dl);
  dl.connect(lp).connect(fb).connect(dl);
  const echoOut = ac.createGain();
  echoOut.gain.value = 0.3;
  lp.connect(echoOut).connect(musicBus);
  echoOut.connect(verb);
  fx = { dry: musicBus, verb, echo };
  return fx;
}

/** routes a voice to dry + reverb (+ echo) */
function send(node, { dry = 1, verb = 0.4, echo = 0 } = {}) {
  const f = musicFx();
  const d = ac.createGain();
  d.gain.value = dry;
  node.connect(d).connect(f.dry);
  if (verb) {
    const v = ac.createGain();
    v.gain.value = verb;
    node.connect(v).connect(f.verb);
  }
  if (echo) {
    const e = ac.createGain();
    e.gain.value = echo;
    node.connect(e).connect(f.echo);
  }
}

/* electric piano: FM tine with a soft bell attack and a little tremolo */
function epiano(at, notes, dur, vel = 1) {
  const out = ac.createGain();
  out.gain.value = 1;
  const trem = ac.createOscillator();
  trem.frequency.value = 4.6;
  const tg = ac.createGain();
  tg.gain.value = 0.12;
  trem.connect(tg).connect(out.gain);
  trem.start(at);
  trem.stop(at + dur + 0.2);
  send(out, { dry: 0.8, verb: 0.55, echo: 0.08 });
  notes.forEach((n, i) => {
    const t0 = at + i * 0.012 + Math.random() * 0.008;
    const f = midi(n);
    const car = ac.createOscillator();
    car.frequency.value = f;
    const mod = ac.createOscillator();
    mod.frequency.value = f * 1;
    const mi = ac.createGain();
    mi.gain.setValueAtTime(f * 1.6, t0);
    mi.gain.exponentialRampToValueAtTime(f * 0.08, t0 + 0.35);
    mod.connect(mi).connect(car.frequency);
    const tine = ac.createOscillator(); // the bright "ding"
    tine.frequency.value = f * 7;
    const tgn = ac.createGain();
    tgn.gain.setValueAtTime(0.012 * vel, t0);
    tgn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    tine.connect(tgn).connect(out);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.075 * vel, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.032 * vel, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    car.connect(g).connect(out);
    [car, mod, tine].forEach((o) => {
      o.start(t0);
      o.stop(t0 + dur + 0.1);
    });
  });
}

/* round sliding bass (sine + filtered saw), with a little glide into each note */
function jazzBass(at, note, dur, slideFrom) {
  const f = midi(note);
  const o = ac.createOscillator();
  const s = ac.createOscillator();
  s.type = 'sawtooth';
  [o, s].forEach((x) => {
    x.frequency.setValueAtTime(slideFrom ? midi(slideFrom) : f, at);
    x.frequency.exponentialRampToValueAtTime(f, at + (slideFrom ? 0.06 : 0.001));
  });
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, at);
  lp.frequency.exponentialRampToValueAtTime(260, at + 0.18);
  const sg = ac.createGain();
  sg.gain.value = 0.35;
  s.connect(sg).connect(lp);
  o.connect(lp);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.3, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.13, at + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  lp.connect(g);
  send(g, { dry: 1, verb: 0.08 });
  [o, s].forEach((x) => {
    x.start(at);
    x.stop(at + dur + 0.05);
  });
}

/* airy flute lead: sine + breath noise, delayed vibrato */
function flute(at, note, dur) {
  const f = midi(note);
  const o = ac.createOscillator();
  o.frequency.value = f;
  const vib = ac.createOscillator();
  vib.frequency.value = 5.4;
  const vg = ac.createGain();
  vg.gain.setValueAtTime(0, at);
  vg.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.35, dur * 0.6));
  vib.connect(vg).connect(o.frequency);
  const breath = ac.createBufferSource();
  breath.buffer = noiseBuf;
  const bf = ac.createBiquadFilter();
  bf.type = 'bandpass';
  bf.frequency.value = f * 2;
  bf.Q.value = 6;
  const bg = ac.createGain();
  bg.gain.value = 0.05;
  breath.connect(bf).connect(bg);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.07, at + 0.05);
  g.gain.setValueAtTime(0.07, at + Math.max(0.06, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur + 0.12);
  o.connect(g);
  bg.connect(g);
  send(g, { dry: 0.75, verb: 0.7, echo: 0.45 });
  o.start(at);
  vib.start(at);
  breath.start(at, Math.random() * 0.5);
  [o, vib, breath].forEach((x) => x.stop(at + dur + 0.2));
}

/* shimmering pad: detuned saws, slow filter swell, mostly reverb */
function pad(at, notes, dur) {
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2;
  lp.frequency.setValueAtTime(500, at);
  lp.frequency.linearRampToValueAtTime(1800, at + dur * 0.5);
  lp.frequency.linearRampToValueAtTime(600, at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.018, at + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  lp.connect(g);
  send(g, { dry: 0.4, verb: 1 });
  notes.forEach((n) => [-7, 7].forEach((det) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(n + 12);
    o.detune.value = det;
    o.connect(lp);
    o.start(at);
    o.stop(at + dur + 0.05);
  }));
}

/* tiny bell sparkle (ethereal glints between phrases) */
function bell(at, note, vel = 1) {
  const o = ac.createOscillator();
  o.frequency.value = midi(note);
  const m = ac.createOscillator();
  m.frequency.value = midi(note) * 3.5;
  const mg = ac.createGain();
  mg.gain.value = midi(note) * 0.8;
  m.connect(mg).connect(o.frequency);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.025 * vel, at);
  g.gain.exponentialRampToValueAtTime(0.0005, at + 1.4);
  o.connect(g);
  send(g, { dry: 0.5, verb: 0.9, echo: 0.6 });
  [o, m].forEach((x) => {
    x.start(at);
    x.stop(at + 1.5);
  });
}

/* swung ride cymbal: metallic partials + bright noise */
function ride(at, v = 1) {
  noise(musicBus, { at, dur: 0.5, type: 'highpass', freq: 6500, q: 0.5, gain: 0.09 * v });
  [2900, 4170, 5310].forEach((f) => tone(musicBus, { at, dur: 0.35, from: f, to: f, type: 'square', gain: 0.006 * v }));
}

function startSynthLoop() {
  const beat = 60 / BPM;
  const sixteenth = beat / 4;
  const swing = beat / 6 * 0.75; // triplet-feel swing on the off-beat eighths
  let step = 0;
  let next = ac.currentTime + 0.12;
  const id = setInterval(() => {
    while (next < ac.currentTime + 0.3) {
      const s = step % 16;
      const barN = Math.floor(step / 16);
      const bar = barN % 8;
      const cycle = Math.floor(barN / 8) % 4; // 0 intro, 1-2 melody, 3 melody up high + sparkles
      const at = next + (s % 4 === 2 ? swing : 0);
      const [root, voicing] = FORM[bar];
      const nextRoot = FORM[(bar + 1) % 8][0];

      // drums: light swung ride groove, soft kick, brushy backbeat with ghost notes
      if ([0, 4, 6, 8, 12, 14].includes(s)) ride(at, s % 4 === 0 ? 1 : 0.6);
      if (s === 4 || s === 12) VOICES.hat(musicBus, at, 0.22);
      if (s === 0 || (s === 10 && bar % 2)) VOICES.kick(musicBus, at, 0.3);
      if (s === 4 || s === 12) VOICES.snare(musicBus, at, 0.16);
      if (s === 7 || s === 15) VOICES.snare(musicBus, at, 0.05);
      if (bar === 7 && cycle === 3 && s === 12) VOICES.toms(musicBus, at);

      // keys: chord on 1 (and a syncopated stab on the "and" of 2 every other bar)
      if (s === 0) epiano(at, voicing, beat * 3.6, 1);
      if (s === 6 && bar % 2) epiano(at, voicing.slice(1), beat * 1.4, 0.6);
      if (s === 0 && bar % 2 === 0) pad(at, voicing, beat * 8);

      // walking / sliding bass
      if (s === 0) jazzBass(at, root, beat * 1.4, root - 5);
      if (s === 6) jazzBass(at, root + 12, beat * 0.45);
      if (s === 8) jazzBass(at, root + 7, beat * 0.9);
      if (s === 14) jazzBass(at, nextRoot - 1, beat * 0.45);

      // melody: rests in the intro cycle, sings in cycles 1-3 (an octave up in cycle 3)
      if (cycle > 0) MELODY[bar].forEach(([st, n, len]) => st === s && flute(at, n + (cycle === 3 ? 12 : 0), len * sixteenth * 0.95));
      // bell glints at the end of every other bar
      if (s === 12 && bar % 2 === 1) [voicing[3] + 24, voicing[1] + 24].forEach((n, i) => bell(at + i * beat * 0.5, n, cycle === 3 ? 1.2 : 0.8));

      next += sixteenth;
      step += 1;
    }
  }, 60);
  return { stop: () => clearInterval(id) };
}

function startRecordedLoop() {
  const el = new Audio('assets/audio/loop.ogg');
  el.loop = true;
  const node = ac.createMediaElementSource(el);
  node.connect(musicBus);
  el.play().catch(() => {});
  return { stop: () => el.pause() };
}

export function startMusic() {
  if (!enabled() || !ensure() || music) return;
  if (ac.state === 'suspended') ac.resume();
  music = resume.assets.drumLoop ? startRecordedLoop() : startSynthLoop();
}

export function stopMusic() {
  music?.stop();
  music = null;
}

export function setMusicVolume(v) {
  store.setSetting('music', v);
  if (musicBus) musicBus.gain.setTargetAtTime(v * 0.6, ac.currentTime, 0.05);
}

/** Music gets quieter while John's lines type. */
export function duck(on) {
  if (!musicBus) return;
  const v = store.get().settings.music * 0.6;
  musicBus.gain.setTargetAtTime(on ? v * 0.45 : v, ac.currentTime, 0.12);
}

export function setSound(on) {
  store.setSetting('sound', on);
  if (on) {
    ensure();
    ac?.resume();
    startMusic();
  } else {
    stopMusic();
  }
}

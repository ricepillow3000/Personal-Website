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
  /* paper rip: a crackle of tiny band-passed noise grains that climbs in pitch */
  tear: (bus, at, v = 1, dur = 1) => {
    let t = 0;
    while (t < dur) {
      const k = t / dur;
      noise(bus, { at: at + t, dur: 0.02 + Math.random() * 0.05, type: 'bandpass', freq: 1400 + k * 2600 + Math.random() * 900, q: 1.4, gain: (0.18 + Math.random() * 0.3) * v });
      t += 0.012 + Math.random() * 0.03;
    }
  },
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
  toms: (bus, at) => {
    [220, 170, 130, 100].forEach((f, i) => tone(bus, { at: at + i * 0.07, dur: 0.22, from: f, to: f * 0.6, gain: 0.55 }));
  }
};

/** Play a named SFX: hat | tick | snare | kick | crash | toms | tear | whoosh.
    `dur` is only used by tear (seconds of ripping). */
export function sfx(name, dur) {
  if (!enabled() || !ensure()) return;
  if (ac.state === 'suspended') ac.resume();
  const sampleName = name === 'tick' ? 'hat' : name;
  if (samples[sampleName]) {
    playSample(sampleName, sfxBus, name === 'tick' ? 0.25 : 1);
    return;
  }
  VOICES[name]?.(sfxBus, ac.currentTime, 1, dur);
}

/* ---------- music: lo-fi city night, 85 BPM, 16 bars ---------- */
const BPM = 85;
const CHORDS = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [48, 52, 55, 59], // Cmaj7
  [55, 59, 62, 65] //  G7
];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function keys(at, notes, dur) {
  notes.forEach((n, i) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midi(n);
    o.detune.value = (Math.random() - 0.5) * 12;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1300;
    const g = ac.createGain();
    const t0 = at + i * 0.018;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(f).connect(g).connect(musicBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });
}

function bass(at, note, dur) {
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = midi(note - 24);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.32, at + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(musicBus);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function startSynthLoop() {
  const beat = 60 / BPM;
  const sixteenth = beat / 4;
  let step = 0;
  let next = ac.currentTime + 0.1;
  const id = setInterval(() => {
    while (next < ac.currentTime + 0.25) {
      const s = step % 16;
      const bar = Math.floor(step / 16) % 16;
      const swing = s % 2 ? sixteenth * 0.18 : 0;
      const at = next + swing;
      if (s === 0 || s === 10) VOICES.kick(musicBus, at, 0.7);
      if (s === 4 || s === 12) VOICES.snare(musicBus, at, 0.35);
      if (s % 2 === 0) VOICES.hat(musicBus, at, s % 4 ? 0.25 : 0.45);
      if (s === 0) {
        const chord = CHORDS[Math.floor(bar / 2) % 4];
        if (bar % 2 === 0) keys(at, chord, beat * 7.5);
        bass(at, chord[0], beat * 1.6);
      }
      if (s === 8) bass(at, CHORDS[Math.floor(bar / 2) % 4][2] - 12, beat * 1.2);
      if (bar === 15 && s === 14) VOICES.toms(musicBus, at);
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

import { store } from '../core/store.js';

/* Sound engine. Off by default; the AudioContext is created on the first
   click that turns sound on (browser autoplay rules). The realistic foley (train, wind, street,
   glass, paper, impacts) is real recordings (CC0 / CC BY / CC BY-SA, credits in
   src/data/credits.js and on SETTINGS), each picked by an ears check; game sounds (UI blips,
   fanfares) and the few moments no recording passed (whip, neon buzz, CRT, horn) are synthesized. */

let ac = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;
let brownBuf = null; // deep, natural rumble noise (wind roar, traffic)
let music = null;

const enabled = () => store.get().settings.sound;

function ensure() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.9;
  // safety limiter: fast transients (a whip crack lasts 12 ms) slip past the slower glue
  // compressor, so this catches them before the speakers and nothing ever clips
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  // last stop: a soft clipper (tanh curve) so even a transient that outruns the limiter can never
  // clip; it rounds peaks smoothly instead of crackling
  const clip = ac.createWaveShaper();
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.abs(x) < 0.74 ? x : Math.sign(x) * (0.74 + 0.18 * Math.tanh((Math.abs(x) - 0.74) / 0.18)); // ceiling 0.92
  }
  clip.curve = curve;
  clip.oversample = '4x';
  master.connect(limiter).connect(clip).connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.7; // louder overall; the compressor keeps the big film moments from clipping
  const glue = ac.createDynamicsCompressor(); // keeps the layered film foley from clipping
  glue.threshold.value = -12;
  glue.ratio.value = 4;
  sfxBus.connect(glue).connect(master);
  musicBus = ac.createGain();
  musicBus.gain.value = store.get().settings.music * 0.6;
  musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  brownBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const bd = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bd.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    bd[i] = last * 3.5;
  }
  loadClips();
  return ac;
}

/* ---------- real recordings ----------
   Fetched only once sound is on (8 clips, ~130 KB, mono MP3). Each entry is where its moment (the pass, the
   crack, the hit) sits inside the clip, in seconds, so it can land on the exact frame. Until a clip
   has loaded (or if it fails), its voice plays the synthesized version instead. */
const CLIP_HIT = {
  'whoosh-b': 0.04,
  'paper-slide': 0.23,
  'hit-slap': 0.1,
  'metal-clang': 0.01,
  'car-pass': 1.77,
  'train-pass': 0.82, // the loudest wheel crash as the tram passes the mic
  'train-brake': 0, // starts on the cut: the squeal peaks ~1.2s in, as the station stops in the windows
  'glass-break': 0.11, // the pane giving way
};
const clips = {};
let clipsReady = null;
function loadClips() {
  if (clipsReady || !ac) return clipsReady;
  const decode = (b) => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)); // callback form: older Safari
  clipsReady = Promise.all(Object.keys(CLIP_HIT).map((name) => fetch(`assets/sfx/${name}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then(decode)
    .then((buf) => { clips[name] = buf; })
    .catch(() => {})));
  return clipsReady;
}
/** For tests and offline renders: resolves once every recording has loaded (or failed). */
export const soundsReady = () => (ensure() ? loadClips() : Promise.resolve());

/** Play a recording. align: its moment lands at `at` (else it starts at `at`). env: [[t, gain]...]
    gain ramps over its own time (seconds from its start). Returns false if it isn't loaded. */
function clip(bus, name, at, { gain = 1, rate = 1, lowpass = 0, highpass = 0, align = true, env = null, rateTo = 0, side = 0 } = {}) {
  const buf = clips[name];
  if (!buf) return false;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const start = align ? at - CLIP_HIT[name] / rate : at;
  src.playbackRate.setValueAtTime(rate, Math.max(start, ac.currentTime));
  if (rateTo) src.playbackRate.linearRampToValueAtTime(rateTo, start + buf.duration / ((rate + rateTo) / 2));
  let node = src;
  const filt = (type, f) => {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    node.connect(b);
    node = b;
  };
  if (lowpass) filt('lowpass', lowpass);
  if (highpass) filt('highpass', highpass);
  const g = ac.createGain();
  if (env) {
    g.gain.setValueAtTime(env[0][1] * gain, Math.max(start, 0));
    env.slice(1).forEach(([t, v]) => g.gain.linearRampToValueAtTime(v * gain, start + t));
  } else {
    g.gain.value = gain;
  }
  node.connect(g).connect(side ? pan(bus, side) : bus);
  const now = ac.currentTime;
  if (start >= now) src.start(start);
  else if (now - start < buf.duration / rate) src.start(now, (now - start) * rate);
  else return true;
  return true;
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


/* ---------- realistic foley for the film cuts (still all synthesized) ---------- */
// a shaped gain: silent -> peak at `a` -> silent at `end` (exponential, like real sounds)
function env(bus, at, a, peak, end) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0008, at);
  g.gain.exponentialRampToValueAtTime(peak, at + a);
  g.gain.exponentialRampToValueAtTime(0.0008, end);
  g.connect(bus);
  return g;
}
function loopNoise(at, end) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.start(at, Math.random() * 0.9);
  src.stop(end + 0.05);
  return src;
}
function lfo(at, end, hz, depth, target) {
  const o = ac.createOscillator();
  o.frequency.value = hz;
  const g = ac.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start(at);
  o.stop(end + 0.05);
}
/* a car horn: two detuned square tones through a small speaker (band-limited), far away */
function carHorn(bus, at, dur, [f1, f2], gain) {
  const g = env(bus, at, 0.015, gain, at + dur);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1600;
  lp.connect(g);
  [f1, f2].forEach((f) => {
    const o = ac.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    o.connect(lp);
    o.start(at);
    o.stop(at + dur + 0.05);
  });
}
/* a subway horn: a three-note chord of reedy sawtooth tones (the classic minor-ish chord) with a
   little wobble. It can arrive and leave like a real train: `fadeIn` seconds swelling up from far
   away (muffled at first, clearer as it nears), loudest at `peak` seconds, then the pitch drops
   (Doppler) and it fades away behind you */
function trainHorn(bus, at, dur, gain, { fadeIn = 0.07, peak = null, drop = 1 } = {}) {
  const end = at + dur;
  const top = at + (peak ?? fadeIn);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0008, at);
  if (peak === null) {
    g.gain.exponentialRampToValueAtTime(gain, top);
    g.gain.setValueAtTime(gain, end - 0.1);
  } else {
    g.gain.exponentialRampToValueAtTime(gain * 0.12, at + fadeIn); // far off in the tunnel
    g.gain.exponentialRampToValueAtTime(gain, top); // closer and closer
    g.gain.setValueAtTime(gain, top + 0.06);
  }
  g.gain.exponentialRampToValueAtTime(0.0008, end);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(peak === null ? 2600 : 650, at);
  if (peak !== null) {
    lp.frequency.exponentialRampToValueAtTime(3200, top); // the tunnel stops muffling it
    lp.frequency.exponentialRampToValueAtTime(1100, end); // and it trails off behind us
  }
  const body = ac.createBiquadFilter(); // the horn's bell
  body.type = 'peaking';
  body.frequency.value = 900;
  body.gain.value = 7;
  lp.connect(body).connect(g).connect(bus);
  [311.1, 370, 466.2].forEach((f) => [-5, 5].forEach((cents) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.detune.value = cents;
    const hi = drop !== 1 ? f * 1.03 : f; // approaching: a touch sharp
    o.frequency.setValueAtTime(hi * 0.96, at);
    o.frequency.exponentialRampToValueAtTime(hi, at + 0.09);
    if (drop !== 1) {
      const pass = peak === null ? end - dur * 0.35 : top - 0.08;
      o.frequency.setValueAtTime(hi, pass);
      o.frequency.exponentialRampToValueAtTime(f * drop, Math.min(end, pass + 0.28));
    }
    lfo(at, end, 5.5, 2.2, o.frequency);
    o.connect(lp);
    o.start(at);
    o.stop(end + 0.05);
  }));
}
/* ---------- the skyscraper fall, layer by layer (all live synthesis, built to sound real) ---------- */
function loopBuf(buf, at, end) {
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start(at, Math.random() * 1.5);
  src.stop(end + 0.05);
  return src;
}
function pan(bus, v) {
  if (!ac.createStereoPanner) return bus;
  const p = ac.createStereoPanner();
  p.pan.value = v;
  p.connect(bus);
  return p;
}
/* random gusts: slow noise steering a gain, so the wind never wobbles like a machine */
function gusts(at, end, rate, depth, target) {
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = rate;
  const g = ac.createGain();
  g.gain.value = depth;
  loopBuf(noiseBuf, at, end).connect(lp).connect(g).connect(target);
}
/* the roar of air when you fall fast: deep brown noise opening up with speed, gusting, plus a thin
   high hiss of air past your ears */
function airRoar(bus, at, dur, { from, to, gain, up = true }) {
  const end = at + dur;
  const g = env(bus, at, up ? dur * 0.9 : 0.05, gain, end);
  const gust = ac.createGain();
  gust.gain.value = 0.75;
  gusts(at, end, 7, 0.9, gust.gain);
  gust.connect(g);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.5;
  lp.frequency.setValueAtTime(from, at);
  lp.frequency.exponentialRampToValueAtTime(to, end);
  loopBuf(brownBuf, at, end).connect(lp).connect(gust);
  const hiss = ac.createBiquadFilter();
  hiss.type = 'highpass';
  hiss.frequency.value = 3500;
  const hg = ac.createGain();
  hg.gain.value = 0.05;
  loopBuf(noiseBuf, at, end).connect(hiss).connect(hg).connect(gust);
}
/* every floor's window ledge rushing past: a short "whom", left then right, closer and closer
   together as the fall speeds up */
function floorsPassing(bus, at, dur, { gapFrom, gapTo, gain }) {
  let t = 0;
  let i = 0;
  while (t < dur - 0.05) {
    const p = t / dur;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(900 + p * 600, at + t);
    f.frequency.exponentialRampToValueAtTime(320 + p * 200, at + t + 0.1); // pitch falls as it passes
    const g = ac.createGain();
    const v = gain * (0.35 + 0.65 * p);
    g.gain.setValueAtTime(0.0008, at + t);
    g.gain.exponentialRampToValueAtTime(v, at + t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0008, at + t + 0.12);
    src.connect(f).connect(g).connect(pan(bus, i % 2 ? 0.45 : -0.45));
    src.start(at + t, Math.random() * 0.8);
    src.stop(at + t + 0.14);
    t += gapFrom + (gapTo - gapFrom) * p;
    i++;
  }
}
/* your clothes flapping in the wind: mid noise chopped by a fast flutter that speeds up */
function flapping(bus, at, dur, gain) {
  const end = at + dur;
  const g = env(bus, at, dur * 0.8, gain, end);
  const chop = ac.createGain();
  chop.gain.value = 0.5;
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(14, at);
  o.frequency.linearRampToValueAtTime(32, end);
  const od = ac.createGain();
  od.gain.value = 0.5;
  o.connect(od).connect(chop.gain);
  o.start(at);
  o.stop(end + 0.05);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 750;
  bp.Q.value = 0.9;
  loopBuf(noiseBuf, at, end).connect(bp).connect(chop).connect(g);
}
/* a car going by down on the street: a swell of tire noise that rises and falls in pitch */
function carPass(bus, at, dur, gain, side) {
  const src = loopBuf(brownBuf, at, at + dur);
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(380, at);
  f.frequency.exponentialRampToValueAtTime(900, at + dur * 0.5);
  f.frequency.exponentialRampToValueAtTime(300, at + dur);
  src.connect(f).connect(env(pan(bus, side), at, dur * 0.5, gain, at + dur));
}
/* the city street below: low traffic rumble, cars passing, horns from different sides, a siren
   somewhere, a bus's air brakes. rising = you're falling toward it */
function cityBelow(bus, at, dur, { gain, rising = true }) {
  const end = at + dur;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(rising ? 220 : 520, at);
  lp.frequency.exponentialRampToValueAtTime(rising ? 520 : 200, end);
  loopBuf(brownBuf, at, end).connect(lp).connect(env(bus, at, rising ? dur * 0.95 : 0.05, gain, end));
  const k = gain / 0.6;
  if (rising) {
    carPass(bus, at + dur * 0.15, dur * 0.6, 0.18 * k, -0.6);
    carPass(bus, at + dur * 0.45, dur * 0.55, 0.24 * k, 0.5);
    carHorn(pan(bus, 0.55), at + dur * 0.38, 0.22, [349, 440], 0.05 * k);
    carHorn(pan(bus, -0.4), at + dur * 0.7, 0.08, [392, 494], 0.07 * k);
    carHorn(pan(bus, -0.4), at + dur * 0.8, 0.12, [392, 494], 0.08 * k);
    noise(pan(bus, 0.3), { at: at + dur * 0.86, dur: 0.18, type: 'highpass', freq: 3800, q: 0.5, gain: 0.06 * k }); // bus air brakes
  } else {
    carHorn(pan(bus, 0.4), at + 0.05, 0.2, [349, 440], 0.04 * k);
  }
  const siren = ac.createOscillator(); // a siren a few blocks away, wailing up and down
  siren.type = 'sawtooth';
  siren.frequency.value = 900;
  lfo(at, end, 1.1, 260, siren.frequency);
  const sb = ac.createBiquadFilter();
  sb.type = 'bandpass';
  sb.frequency.value = 1000;
  sb.Q.value = 1.2;
  siren.connect(sb).connect(env(pan(bus, -0.7), at, rising ? dur * 0.9 : 0.05, gain * 0.05, end));
  siren.start(at);
  siren.stop(end + 0.05);
}
/* a subway car shaking: loose panels and grab rails rattling (quick metal ticks at random) over
   a low judder of the whole body. faster = the ticks crowd together and the judder speeds up */
function rattle(bus, at, dur, { gain, from = 1, to = 1 }) {
  let t = 0;
  while (t < dur) {
    const p = t / dur;
    const v = gain * (from + (to - from) * p);
    noise(pan(bus, Math.random() * 1.2 - 0.6), { at: at + t, dur: 0.018 + Math.random() * 0.02, type: 'bandpass', freq: 2400 + Math.random() * 3800, q: 6, gain: v * (0.4 + Math.random() * 0.6) });
    t += (0.02 + Math.random() * 0.05) / Math.max(0.3, from + (to - from) * p);
  }
  const end = at + dur;
  const judder = ac.createGain();
  judder.gain.value = 0.6;
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(7 * from + 3, at);
  o.frequency.linearRampToValueAtTime(7 * to + 3, end);
  const od = ac.createGain();
  od.gain.value = 0.4;
  o.connect(od).connect(judder.gain);
  o.start(at);
  o.stop(end + 0.05);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 110;
  loopBuf(brownBuf, at, end).connect(lp).connect(judder).connect(env(bus, at, dur * 0.3, gain * 2.2, end));
}
/* steel wheels grinding on a curve: a thin, wavering high screech */
function screech(bus, at, dur, gain) {
  const g = env(bus, at, dur * 0.5, gain, at + dur);
  [3700, 5150].forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    lfo(at, at + dur, 11 + i * 4, 60, o.frequency);
    o.connect(g);
    o.start(at);
    o.stop(at + dur + 0.05);
  });
}
/* one wheel crossing a rail joint: a dull metal clack with a low thump */
function clack(bus, at, v) {
  noise(bus, { at, dur: 0.05, type: 'bandpass', freq: 1300, q: 1.4, gain: 0.5 * v });
  noise(bus, { at, dur: 0.02, type: 'highpass', freq: 5200, q: 0.7, gain: 0.16 * v });
  tone(bus, { at, dur: 0.07, from: 120, to: 55, gain: 0.55 * v });
}
/* one punchy steel wheel slamming over a rail joint (John, Nov 18: "louder, punchy in the ear"):
   a hard click for the attack, the steel body, a short metallic ring, and a deep thump you feel */
function railHit(bus, at, v, side = 0) {
  const b = pan(bus, side);
  noise(b, { at, dur: 0.016, type: 'highpass', freq: 2400, q: 0.7, gain: 2.6 * v }); // the click
  noise(b, { at, dur: 0.08, type: 'bandpass', freq: 1700, q: 1.0, gain: 2.3 * v }); // steel body
  [[880, 0.26], [1390, 0.2], [2310, 0.13], [3570, 0.08]].forEach(([f, g]) => tone(b, { at, dur: 0.15, from: f, to: f * 0.985, type: 'triangle', gain: g * v })); // ring
  tone(b, { at, dur: 0.14, from: 105, to: 42, gain: 0.9 * v }); // thump
}
/* wheels on the track: "ka-chunk ka-chunk" pairs for each car, the gap between them shrinking as
   the train speeds up (or growing as it brakes), over a steel rumble. punch: railHit instead of the
   dull clack, panned from the tunnel (left) toward us (right) as the train passes. */
function rails(bus, at, dur, { gapFrom = 0.3, gapTo = 0.1, vFrom = 0.3, vTo = 1, gain = 0.5, rumble = 0.4, punch = false } = {}) {
  const end = at + dur;
  let t = at;
  while (t < end - 0.02) {
    const p = (t - at) / dur;
    const gap = gapFrom + (gapTo - gapFrom) * p;
    const v = gain * (vFrom + (vTo - vFrom) * p);
    if (punch) {
      const side = -0.5 + p * 1.1;
      railHit(bus, t, v, side);
      railHit(bus, t + Math.min(0.08, gap * 0.32), v * 0.8, side);
    } else {
      clack(bus, t, v);
      clack(bus, t + Math.min(0.08, gap * 0.32), v * 0.85);
    }
    t += gap;
  }
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(110, at);
  lp.frequency.exponentialRampToValueAtTime(vTo > vFrom ? 380 : 140, end);
  loopBuf(brownBuf, at, end).connect(lp).connect(env(bus, at, vTo > vFrom ? dur * 0.85 : 0.08, rumble * 1.4, end));
}
/* brakes: steel squealing on steel, two high tones beating against each other */
function squeal(bus, at, dur, gain) {
  const g = env(bus, at, dur * 0.4, gain, at + dur);
  [2930, 3390].forEach((f, i) => {
    const o = ac.createOscillator();
    o.frequency.value = f;
    lfo(at, at + dur, 7 + i * 3, 25, o.frequency);
    o.connect(g);
    o.start(at);
    o.stop(at + dur + 0.05);
  });
}
/* loose paper caught in a gust: quick high flutters */
function flutter(bus, at, dur, gain) {
  for (let t = 0; t < dur; t += 0.035 + Math.random() * 0.03) {
    noise(bus, { at: at + t, dur: 0.03, type: 'bandpass', freq: 2600 + Math.random() * 2400, q: 2.5, gain: gain * (0.5 + Math.random() * 0.5) });
  }
}

const VOICES = {
  hat: (bus, at, v = 1) => noise(bus, { at, dur: 0.05, freq: 8000, gain: 0.32 * v }),
  snare: (bus, at, v = 1) => {
    noise(bus, { at, dur: 0.16, type: 'bandpass', freq: 2200, q: 0.6, gain: 0.55 * v });
    tone(bus, { at, dur: 0.1, from: 260, to: 160, type: 'triangle', gain: 0.35 * v });
  },
  kick: (bus, at, v = 1) => tone(bus, { at, dur: 0.32, from: 140, to: 42, gain: 0.95 * v }),
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
  // THE RISE: rushing wind as you rocket up, the street below falling away
  rise: (bus, at) => {
    airRoar(bus, at, 0.8, { from: 1800, to: 240, gain: 1.6, up: false });
    floorsPassing(bus, at + 0.05, 0.5, { gapFrom: 0.05, gapTo: 0.14, gain: 0.3 });
    cityBelow(bus, at, 0.55, { gain: 0.45, rising: false });
  },
  // NEXT STOP: a short horn, wheels clacking as it brakes, brake squeal, the station chime
  /* NEXT STOP, riding inside the car: the floor rumbling, the car rattling, wheels over the rail
     joints slowing down, muffled tunnel wind outside, the brakes squealing, then the station chime */
  train: (bus, at) => {
    rails(bus, at, 1.0, { gapFrom: 0.085, gapTo: 0.3, vFrom: 1, vTo: 0.45, gain: 0.6, rumble: 0.6, punch: true });
    rattle(bus, at, 0.95, { gain: 0.12, from: 1.4, to: 0.4 });
    airRoar(bus, at, 0.8, { from: 520, to: 200, gain: 0.7, up: false });
    squeal(bus, at + 0.45, 0.55, 0.05);
    tone(bus, { at: at + 0.98, dur: 0.24, from: 1319, to: 1319, type: 'sine', gain: 0.1 }); // ding
    tone(bus, { at: at + 1.16, dur: 0.36, from: 1047, to: 1047, type: 'sine', gain: 0.1 }); // dong
  },
  // PRESS START: a rumble deep in the tunnel, the horn, wheels hammering the rail joints faster and
  // louder, the horn's pitch dropping as it passes, the blast of air and the paper flying
  // (pass: when the nose passes the camera; the train brakes in, so this is ~1.2 s, see subway.js)
  tunnel: (bus, at, v, { pass = 0.74 } = {}) => {
    const d = pass - 0.74; // everything after the first rumble moves with the nose
    rails(bus, at, 1.3 + d, { gapFrom: 0.3, gapTo: 0.07, vFrom: 0.3, vTo: 1, gain: 1.0, rumble: 0.85, punch: true }); // the track: loud and punchy
    // one long horn: faint as the headlights appear, loudest as the nose passes us, then gone
    trainHorn(bus, at + 0.02, 1.5 + d, 0.15, { fadeIn: 0.3, peak: pass, drop: pass + 0.14 }); // lower so the wheels are heard
    // the wall of air the train shoves out of the tunnel ahead of itself, then its wake
    airRoar(bus, at + 0.2 + d, 0.6, { from: 160, to: 1600, gain: 1.1 }); // pulled back so the wheels cut through
    airRoar(bus, at + pass + 0.04, 0.6, { from: 1800, to: 300, gain: 1.0, up: false });
    rattle(bus, at + 0.3, 1.0 + d, { gain: 0.16, from: 0.4, to: 1.6 }); // the cars shaking as they storm past
    screech(bus, at + 0.4, 0.5 + d, 0.05); // the brakes biting as it comes out of the tunnel
    flutter(bus, at + pass - 0.14, 0.45, 0.14);
  },
  // THE DROP: the wind roars louder as you fall, and the busy street below rushes up at you
  fall: (bus, at) => {
    airRoar(bus, at, 1.05, { from: 200, to: 2400, gain: 1.9 });
    floorsPassing(bus, at + 0.2, 0.8, { gapFrom: 0.16, gapTo: 0.045, gain: 0.42 });
    flapping(bus, at + 0.15, 0.9, 0.22);
    cityBelow(bus, at, 1.05, { gain: 0.6 });
  },
  /* glass taking a hit: a sharp tink and the crackle of cracks running out */
  crack: (bus, at) => {
    tone(bus, { at, dur: 0.12, from: 4200, to: 3900, type: 'sine', gain: 0.16 });
    for (let i = 0; i < 7; i++) noise(bus, { at: at + 0.01 + i * 0.018, dur: 0.02, type: 'highpass', freq: 3500 + i * 300, q: 1, gain: 0.25 - i * 0.025 });
  },
  /* the pane giving way: a burst, then pieces tinkling down for a moment */
  shatter: (bus, at) => {
    noise(bus, { at, dur: 0.25, type: 'highpass', freq: 2200, q: 0.6, gain: 0.5 });
    tone(bus, { at, dur: 0.18, from: 160, to: 70, gain: 0.35 });
    for (let i = 0; i < 12; i++) {
      const t = at + 0.06 + i * 0.035 + Math.random() * 0.03;
      tone(bus, { at: t, dur: 0.07, from: 2800 + Math.random() * 3200, to: 2600 + Math.random() * 2600, type: 'sine', gain: 0.05 + Math.random() * 0.05 });
    }
  },
  /* a night street: traffic going by both ways, a horn, the city hum */
  city: (bus, at) => {
    cityBelow(bus, at, 0.7, { gain: 0.45, rising: false });
    carPass(bus, at, 0.45, 0.3, -0.5);
    carPass(bus, at + 0.12, 0.45, 0.25, 0.5);
    carHorn(pan(bus, 0.3), at + 0.08, 0.16, [392, 494], 0.06);
  },
  /* a big LED billboard switching on: an electrical buzz and a hum */
  buzz: (bus, at) => {
    tone(bus, { at, dur: 0.2, from: 120, to: 120, type: 'square', gain: 0.05 });
    noise(bus, { at, dur: 0.12, type: 'bandpass', freq: 2400, q: 3, gain: 0.12 });
  },
  /* an old monitor switching off: a falling hum and a click */
  crtOff: (bus, at) => {
    tone(bus, { at, dur: 0.3, from: 520, to: 60, type: 'sawtooth', gain: 0.08 });
    noise(bus, { at: at + 0.3, dur: 0.03, type: 'bandpass', freq: 2500, q: 2, gain: 0.3 });
  },
  /* ...and back on: a burst of static and the rising whine of the tube */
  crtOn: (bus, at) => {
    noise(bus, { at, dur: 0.18, type: 'highpass', freq: 1800, q: 0.5, gain: 0.22 });
    tone(bus, { at, dur: 0.25, from: 5000, to: 9000, type: 'sine', gain: 0.02 });
  },
  /* hitting the ground after the fall: a deep boom under the usual thwack */
  land: (bus, at) => {
    tone(bus, { at, dur: 0.45, from: 75, to: 32, gain: 0.9 });
    noise(bus, { at, dur: 0.16, type: 'lowpass', freq: 900, q: 0.7, gain: 0.5 });
    VOICES.thwack(bus, at, 0.8);
  },
  /* page lands: short wooden "thwack" (higher and shorter than any kick) */
  thwack: (bus, at, v = 1, vol = 1) => {
    tone(bus, { at, dur: 0.09, from: 340, to: 150, type: 'triangle', gain: 0.55 * v * vol });
    noise(bus, { at, dur: 0.06, type: 'bandpass', freq: 1700, q: 1.2, gain: 0.45 * v * vol });
  },
  /* small stamp / sticker landing */
  thunk: (bus, at) => {
    tone(bus, { at, dur: 0.07, from: 620, to: 330, type: 'sine', gain: 0.5 });
    noise(bus, { at, dur: 0.04, type: 'bandpass', freq: 1900, q: 1.5, gain: 0.3 });
  },
  /* glitter after a hit */
  sparkle: (bus, at) => [2637, 3520, 3136, 4186].forEach((f, i) => tone(bus, { at: at + i * 0.04, dur: 0.09, from: f, to: f, type: 'triangle', gain: 0.08 })),
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
  /* WHIP: a lash whooshes in and CRACKS at at+0.11 (schedule it 0.11s before the hit) */
  whip: (bus, at, v = 1) => {
    sweep(bus, at, 450, 5200, 0.11, 0.55 * v, 1.1);
    const c = at + 0.11;
    noise(bus, { at: c, dur: 0.012, type: 'highpass', freq: 1400, q: 0.4, gain: 0.9 * v }); // the crack
    noise(bus, { at: c, dur: 0.05, type: 'bandpass', freq: 3200, q: 1.2, gain: 0.6 * v });
    tone(bus, { at: c, dur: 0.035, from: 2600, to: 900, type: 'square', gain: 0.12 * v });
    tone(bus, { at: c, dur: 0.1, from: 190, to: 60, type: 'sine', gain: 0.7 * v }); // body
    noise(bus, { at: c + 0.045, dur: 0.18, type: 'bandpass', freq: 2400, q: 2, gain: 0.12 * v }); // slap-back
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
    stamp/zip/thunk/sparkle/paper/rip/whip/fanfare/treasure.
    `arg` is seconds of ripping for rip/tear, or the volume (0-1) for thwack. */
const live = new Set();
/* Real recordings only where one passed BOTH ears checks (DESIGN.md "Sound"): alone (3 listens,
   averaged) and against the synthesized voice in a blind A/B (5 rounds, majority): the whoosh, the
   whip wind-up, Quick View's paper slide, the sticker slap, the CLEARED stamp's clang + slap, the car
   on the city billboard, the train passing (PRESS START), the train braking (NEXT STOP), the glass
   shattering. Everything else (wind, paper tear, folder slap, whip crack, horn, chime, neon buzz,
   CRT, UI, fanfares) stays synthesized: the recordings lost or none was reachable. The code-made
   versions stay as SYNTH fallbacks until a clip has loaded. Levels were matched to them by offline renders. */
const SYNTH = { ...VOICES };
/* clip levels, matched to the synthesized versions by offline renders (peaks kept under 1.0) */
const TRAIN = { pass: 0.66, horn: 0.1, brake: 0.32, glass: 0.5 };
Object.assign(VOICES, {
  whoosh: (bus, at, v = 1) => clip(bus, 'whoosh-b', at + 0.06, { gain: 0.6 * v, align: false }) || SYNTH.whoosh(bus, at, v),
  whipWind: (bus, at) => (clip(bus, 'whoosh-b', at, { gain: 0.35, align: false, rate: 0.85 }) && clip(bus, 'whoosh-b', at + 0.13, { gain: 0.45, align: false, rate: 1.1 })) || SYNTH.whipWind(bus, at),
  paper: (bus, at) => clip(bus, 'paper-slide', at, { gain: 0.35, align: false }) || SYNTH.paper(bus, at), // Quick View's sheet slides up
  flip: (bus, at) => SYNTH.paper(bus, at), // the case file's cover swings open (the recording lost its A/B)
  thunk: (bus, at) => clip(bus, 'hit-slap', at, { gain: 0.35, rate: 1.4 }) || SYNTH.thunk(bus, at),
  /* CLEARED: the real metal clang + folder slap on the frame of impact, the synth sub drop under it,
     then the victory sting (a game sound, so it stays synthesized) */
  stamp: (bus, at) => {
    if (!clips['metal-clang']) return SYNTH.stamp(bus, at);
    clip(bus, 'metal-clang', at, { gain: 0.6 });
    clip(bus, 'hit-slap', at, { gain: 0.75 });
    tone(bus, { at, dur: 0.7, from: 95, to: 28, type: 'sine', gain: 0.8 });
    [784, 1047, 1319].forEach((f, i) => tone(bus, { at: at + 0.14 + i * 0.05, dur: 0.1, from: f, to: f, type: 'triangle', gain: 0.22 }));
    tone(bus, { at: at + 0.29, dur: 0.46, from: 1568, to: 1568, type: 'triangle', gain: 0.2 });
  },
  /* PRESS START: a real tram storming past the mic (steel wheels slamming the rail joints, motor,
     air), its loudest crash on the frame the nose passes the camera; under it, the recorded brakes
     squealing as the train brakes in (Nov 19, "feel real"). The horn and the paper flying stay
     synthesized (no recorded horn passed). Faded out under the cut to the board.
     { pass, cut }: when the nose passes and when the cut comes (seconds after the start). */
  tunnel: (bus, at, v, { pass = 0.74, cut = 1.25 } = {}) => {
    const s0 = pass - CLIP_HIT['train-pass']; // the clip's own start, relative to at
    if (!clip(bus, 'train-pass', at + pass, { gain: TRAIN.pass, env: [[0, 1], [cut - s0, 1], [cut + 0.45 - s0, 0]] })) return SYNTH.tunnel(bus, at, v, { pass });
    clip(bus, 'train-brake', at + Math.max(0, pass - 0.9), { gain: TRAIN.brake * 0.55, env: [[0, 0], [0.35, 1], [cut + 0.45 - Math.max(0, pass - 0.9), 0]] }); // squeal peaks just after the nose
    trainHorn(bus, at + 0.02, 1.5 + (pass - 0.74), TRAIN.horn, { fadeIn: 0.3, peak: pass, drop: pass + 0.14 });
    flutter(bus, at + pass - 0.14, 0.45, 0.14);
  },
  /* NEXT STOP: a real train braking into a station (wheels grinding, the brake squeal swelling as
     the station stops in the windows), then the two-note station chime (a PA tone, synthesized) */
  train: (bus, at) => {
    if (!clip(bus, 'train-brake', at, { gain: TRAIN.brake, env: [[0, 1], [1.3, 1], [1.75, 0]] })) return SYNTH.train(bus, at);
    tone(bus, { at: at + 0.98, dur: 0.24, from: 1319, to: 1319, type: 'sine', gain: 0.1 }); // ding
    tone(bus, { at: at + 1.16, dur: 0.36, from: 1047, to: 1047, type: 'sine', gain: 0.1 }); // dong
  },
  /* the pane giving way: a real window smashing, a low thump under it for weight */
  shatter: (bus, at) => {
    if (!clip(bus, 'glass-break', at, { gain: TRAIN.glass })) return SYNTH.shatter(bus, at);
    tone(bus, { at, dur: 0.18, from: 160, to: 70, gain: 0.3 });
  },
  /* the city billboard: a real car rushes past under the light trails, a horn far off */
  city: (bus, at) => {
    if (!clip(bus, 'car-pass', at + 0.32, { gain: 0.2, side: 0.25 })) return SYNTH.city(bus, at);
    carHorn(pan(bus, -0.4), at + 0.12, 0.16, [392, 494], 0.04);
  },
});

const lastAt = {}; // when each sound last started (see sfx)
export function sfx(name, arg) {
  if (!enabled() || !ensure()) return;
  if (ac.state === 'suspended') ac.resume();
  // the same sound twice within 35 ms is never meant (a fast sweep across a list): stacking it
  // only smears into a stutter, so the second one is dropped
  if (ac.currentTime - (lastAt[name] ?? -1) < 0.035) return;
  lastAt[name] = ac.currentTime;
  const g = ac.createGain(); // each sound gets its own fader, so a skipped shot can be hushed
  g.connect(sfxBus);
  live.add(g);
  setTimeout(() => live.delete(g), 2500);
  VOICES[name]?.(g, ac.currentTime, 1, arg);
}

/** Fade out every sound that is still playing (a film cut was skipped). */
export function hush() {
  if (!ac) return;
  live.forEach((g) => g.gain.setTargetAtTime(0, ac.currentTime, 0.03));
  live.clear();
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

function startMusic() {
  if (!enabled() || !ensure() || music) return;
  if (ac.state === 'suspended') ac.resume();
  music = startSynthLoop();
}

function stopMusic() {
  music?.stop();
  music = null;
}

export function setMusicVolume(v) {
  store.setSetting('music', v);
  if (musicBus) musicBus.gain.setTargetAtTime(v * 0.6, ac.currentTime, 0.05);
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

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
let duck = null;

const enabled = () => store.get().settings.sound;

function ensure() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ac = new AC({ latencyHint: 'balanced' }); } catch { ac = new AC(); } // (a little more buffer: no crackle over Bluetooth when the phone is busy)
  window.__acGen = (window.__acGen || 0) + 1; // (how many engines this page has built; the tests read it)
  window.__acState = () => ac?.state;
  window.__musicPos = () => (music ? music.position() : null); // (tests: the song's place, in 16ths)
  window.__masterGain = () => master?.gain.value; // (tests: the whole mix's level)
  ac.onstatechange = () => { if (!ac) return; if (ac.state === 'interrupted') stale = true; if (ac.state !== 'running' && !document.hidden && enabled()) armUnlock(); }; // (iOS takes the audio away for a call, Siri, another app: 'interrupted'. Such an engine may never come back, so the next tap builds a new one, see rebuild)
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
  duck = ac.createGain(); // the music dips under sound effects (sfx)
  musicBus.connect(duck).connect(master);
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
   Fetched only once sound is on (13 clips, ~210 KB, mono MP3). Each entry is where its moment (the pass, the
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
  // Nov 19 (John: "the sounds I want revised are the train... the transition where you fall from a skyscraper")
  'train-horn': 0, // a real metro car horn
  'metro-brake': 0, // a real metro squealing into its station
  'paper-rip': 0.338, // the paper giving way
  'fall-wind': 0, // a real 25 m/s gale: the fall
  'land-boom': 0.02, // a real deep boom with a thwack on top: the landing
  'knife-thunk': 0.001, // a real wood impact (Kenney, CC0): the dagger's point landing in your stop
  'street-life': 0, // a real busy street (Oculus Audio Pack 01, CC BY 4.0): the SIDE QUESTS square
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
/* a short metallic ring: a few detuned oscillators (freq, wave, cents) through one filter, instant
   attack, exponential decay (used by the hover sounds) */
function metalRing(bus, at, oscs, { hp = 0, bp = 0, q = 0.7, peak = 0.08, decay = 0.045 }) {
  const f = ac.createBiquadFilter();
  f.type = bp ? 'bandpass' : 'highpass';
  f.frequency.value = bp || hp;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  f.connect(g).connect(bus);
  oscs.forEach(([freq, type, cents]) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = cents;
    o.connect(f);
    o.start(at);
    o.stop(at + decay + 0.005);
  });
}
/* a pitch-swept transient (a blade snap, a card hitting home, a thud) */
function snap(bus, at, from, to, dur, peak, type = 'sine') {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + dur + 0.005);
}
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

/* a blade stuck in a board, rattling: a ringing blade chopped by a smooth LFO whose rate falls as the
   swing dies, and a woody knock on each swing (alternating sides), the whole thing decaying away */
function bladeRattle(bus, at, dur) {
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(0.3, at + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  const chop = ac.createGain();
  chop.gain.value = 0.5;
  const lfo = ac.createOscillator();
  lfo.type = 'sine'; // (a square chop clicked: it read as a digital glitch)
  lfo.frequency.setValueAtTime(24, at);
  lfo.frequency.exponentialRampToValueAtTime(15, at + dur);
  const depth = ac.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(chop.gain);
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1050;
  f.Q.value = 1.1;
  const ring = ac.createOscillator();
  ring.type = 'triangle';
  ring.frequency.value = 1880;
  const rg = ac.createGain();
  rg.gain.value = 0.55;
  ring.connect(rg).connect(f); // (no buzzy body: a sawtooth under it read as electronic)
  f.connect(chop).connect(amp).connect(bus);
  [ring, lfo].forEach((o) => { o.start(at); o.stop(at + dur + 0.02); });
  // a little woody knock each time the blade swings back (24 -> 15 a second, quieter as it settles)
  for (let t = 0, k = 0; t < dur * 0.8; k++) {
    const r = 24 * (15 / 24) ** (t / dur);
    noise(bus, { at: at + t, dur: 0.016, type: 'bandpass', freq: 1200 + (k % 2) * 500, q: 1.6, gain: 0.3 * (1 - t / dur) ** 2 }); // (alternate sides of the swing)
    t += 1 / r;
  }
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
/* The Doppler dip as the train passes: the horn's pitch after it has gone by, as a share of its
   pitch while it comes (a real receding horn drops a little, never rises). Nov 19 bug: this used to
   be computed from the pass TIME (pass + 0.14 = 1.09 once the train got faster), so the horn bent UP
   into a whine as the train left the screen. */
const HORN_DOPPLER = 0.9;
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
/* BUSY STREET LIFE (Nov 21, John: "add busy street life sound effects" to the SIDE QUESTS square): a real
   recording of a busy street (crowd babble, footsteps, traffic; `street-life`). A synthesized crowd was tried
   first and failed by ear (its babble read as "shakers" and "footsteps on gravel"), so until the clip has
   loaded only a quiet traffic bed and a far horn stand in. */
function streetFallback(bus, at, dur) {
  noise(bus, { at, dur, type: 'lowpass', freq: 170, gain: 0.08 });
  noise(bus, { at, dur, type: 'bandpass', freq: 900, q: 0.6, gain: 0.03 });
  carHorn(pan(bus, 0.6), at + 0.9, 0.2, [370, 466], 0.02);
}
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
/* the train before it is seen: a rumble far down the tunnel that grows through the still beat, jumps as the train breaks
   out, holds while it passes and sinks as it brakes; over it, faintly, the rails singing (steel carrying the wheels' noise
   ahead of the train), cut off the moment it arrives */
function farRumble(bus, at, burst, pass, cut) {
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(50, at);
  lp.frequency.exponentialRampToValueAtTime(130, at + burst);
  lp.frequency.exponentialRampToValueAtTime(260, at + pass);
  lp.frequency.exponentialRampToValueAtTime(120, at + cut + 0.4);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0008, at);
  g.gain.exponentialRampToValueAtTime(0.45, at + Math.max(0.05, burst - 0.03));
  g.gain.exponentialRampToValueAtTime(1.15, at + burst + 0.05);
  g.gain.setValueAtTime(1.15, at + pass + 0.3);
  g.gain.exponentialRampToValueAtTime(0.6, at + cut);
  g.gain.exponentialRampToValueAtTime(0.0008, at + cut + 0.45);
  loopBuf(brownBuf, at, at + cut + 0.5).connect(lp).connect(g).connect(bus);
  const sing = ac.createGain();
  sing.gain.setValueAtTime(0.0008, at);
  sing.gain.exponentialRampToValueAtTime(0.011, at + Math.max(0.1, burst - 0.02));
  sing.gain.exponentialRampToValueAtTime(0.0008, at + burst + 0.06);
  sing.connect(bus);
  [2140, 2810].forEach((f, i) => {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(f, at);
    o.frequency.linearRampToValueAtTime(f * 1.04, at + burst);
    lfo(at, at + burst + 0.1, 9 + i * 4, 18, o.frequency);
    o.connect(sing);
    o.start(at);
    o.stop(at + burst + 0.12);
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
  /* Hover: the menu's sharp metallic "shing/snap" (Nov 19, John's 3-layer spec; no noise burst, all
     synthesized, nothing copied from any game). Under 60 ms, +/-3% pitch per hover so a fast scroll
     sounds organic; every layer is its own little node chain, so hovers overlap freely (the master
     limiter and soft clipper keep a pile-up from clipping).
     1 metallic ring: a 1420 Hz square and a 3180 Hz triangle, detuned a few cents, through a 1200 Hz
       high-pass, decaying in 45 ms;
     2 blade/card snap: a sine swept 4200 -> 1400 Hz in 18 ms, the tactile punch;
     3 double hit: a quieter ring 14 ms later, a heavy switch locking in. */
  hover: (bus, at) => {
    const p = 1 + (Math.random() * 2 - 1) * 0.03;
    metalRing(bus, at, [[1420 * p, 'square', 0], [3180 * p, 'triangle', 7]], { hp: 1200, peak: 0.085, decay: 0.045 });
    snap(bus, at, 4200 * p, 1400 * p, 0.018, 0.12);
    metalRing(bus, at + 0.014, [[1420 * p * 1.02, 'square', -5], [3180 * p * 1.02, 'triangle', 4]], { hp: 1200, peak: 0.035, decay: 0.03 });
  },
  /* Big buttons (THE PLAN's chapter button, PRESS START, NEXT): a heavier "lock-on", as layered as the
     menu's: 1 a deeper metal clang (880 Hz square + 2210 Hz triangle, detuned, through a 1600 Hz
     band-pass, 70 ms); 2 a blade being drawn, a triangle rising 1600 -> 5200 Hz in 24 ms; 3 22 ms later
     the chamber locks: a sine thud falling 260 -> 90 Hz with a bright tick on top. Under 100 ms. */
  hoverBig: (bus, at) => {
    const p = 1 + (Math.random() * 2 - 1) * 0.03;
    metalRing(bus, at, [[880 * p, 'square', 0], [2210 * p, 'triangle', 9]], { bp: 1600, q: 2.5, peak: 0.08, decay: 0.07 });
    snap(bus, at, 1600 * p, 5200 * p, 0.024, 0.07, 'triangle');
    snap(bus, at + 0.022, 260 * p, 90 * p, 0.045, 0.2);
    metalRing(bus, at + 0.022, [[1900 * p, 'square', 0], [4200 * p, 'triangle', -6]], { hp: 1500, peak: 0.05, decay: 0.025 });
  },
  /* Confirm: heavier and lower than the hover, a bass thump with a stylized slash and a gunshot-like
     punch (a crack, a short low burst, a bright sweep falling across it), plus a short metal ring. */
  select: (bus, at) => {
    tone(bus, { at, dur: 0.16, from: 170, to: 48, gain: 0.65 }); // the thump
    noise(bus, { at, dur: 0.05, type: 'lowpass', freq: 1600, q: 0.7, gain: 0.55 }); // the punch
    noise(bus, { at, dur: 0.008, type: 'highpass', freq: 4000, gain: 0.6 }); // the crack
    sweep(bus, at + 0.01, 5200, 1400, 0.08, 0.35, 1.2); // the slash
    [[2350, 0.06, 0.06], [3720, 0.045, 0.04]].forEach(([f, d, g]) => tone(bus, { at: at + 0.005, dur: d, from: f, to: f * 0.98, gain: g }));
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
  // PRESS START, the burst (Nov 22, see VOICES.tunnel): a still beat with a rumble far down the tunnel, then the train breaks
  // out: the horn, the blast of air, wheels hammering the rail joints fast and slowing as it brakes, the brakes biting at the end
  // (burst: when the nose breaks out of the tunnel; pass: when it passes the camera; cut: the cut to the board; see subway.js)
  tunnel: (bus, at, v, { burst = 0.53, pass = 0.95, cut = 2.6 } = {}) => {
    farRumble(bus, at, burst, pass, cut);
    rails(bus, at + burst, cut - burst + 0.3, { gapFrom: 0.07, gapTo: 0.2, vFrom: 1, vTo: 0.6, gain: 1.0, rumble: 0.5, punch: true }); // the track: loud and punchy
    // one long horn: a breath of it in the tunnel, a blast as the train breaks out, loudest as the nose passes us, then gone
    trainHorn(bus, at + burst - 0.2, 1.7, 0.16, { fadeIn: 0.2, peak: pass - burst + 0.2, drop: HORN_DOPPLER });
    // the wall of air the train shoves out of the tunnel ahead of itself, then its wake
    airRoar(bus, at + burst - 0.06, 0.45, { from: 200, to: 2000, gain: 1.1 });
    airRoar(bus, at + pass + 0.04, 0.7, { from: 1800, to: 300, gain: 1.0, up: false });
    rattle(bus, at + burst, cut - burst, { gain: 0.16, from: 1.6, to: 0.5 }); // the cars shaking as they storm past
    screech(bus, at + cut - 1.0, 1.1, 0.05); // the brakes biting as it slows
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
  street: (bus, at) => clip(bus, 'street-life', at, { gain: 1, align: false }) || streetFallback(bus, at, 2.1),
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
  /* ---- boxes that punch in as you scroll, and taps on cards (Nov 19, John: "scrolling down, I don't
     hear the sound effects for each box... don't make all the sound effects sound the same").
     Each page's boxes have their own voice, all in the house style (short metal snaps, blades,
     cut paper), and `i` (the box's place on the page) nudges each one so a run of boxes climbs. */
  // SIDE QUESTS: a map pin stabbed into the route (a dull thock + a bright tip), then a two-note glint
  // that climbs a step for every stop further down the route
  questPin: (bus, at, v = 1, i = 0) => {
    const k = 2 ** ([0, 2, 4, 7, 9, 12][i % 6] / 12);
    snap(bus, at, 300, 95, 0.06, 0.24);
    noise(bus, { at, dur: 0.012, type: 'highpass', freq: 5200, gain: 0.26 });
    metalRing(bus, at + 0.004, [[2100 * k, 'triangle', 0], [3300 * k, 'square', 6]], { hp: 1600, peak: 0.05, decay: 0.05 });
    tone(bus, { at: at + 0.05, dur: 0.07, from: 1175 * k, to: 1175 * k, type: 'triangle', gain: 0.07 });
    tone(bus, { at: at + 0.09, dur: 0.12, from: 1568 * k, to: 1568 * k, type: 'triangle', gain: 0.06 });
  },
  // THE LINE MAP: the stiletto THROWN into your stop (Nov 20, John: "like a throwing dart... it lands, it
  // shakes like a rattle"; then: "add a realistic sound of a knife, or like a dart being shot"): the real
  // whoosh as it flies, a REAL wood impact as the point bites in (Kenney's Impact Sounds, CC0; a real
  // knife "chop" won alone but read as a wet, fleshy stab in the mix, and lost the blind A/B 2 of 6), then
  // the synth rattle of the stuck blade (a ringing blade and a woody knock per swing, 24 -> 15 a second)
  stab: (bus, at) => {
    const hit = at + 0.16;
    // the flight: the real whoosh peaking just before it lands (synth air if the clip isn't in yet)
    if (!clip(bus, 'whoosh-b', hit - 0.05, { gain: 0.75, rate: 1.15 })) sweep(bus, at, 700, 2200, 0.15, 0.22, 0.7);
    // the landing: a solid synth thock, the real slap slowed, a REAL wood impact (the point biting into the
    // board) and a little ring of the steel
    snap(bus, hit, 300, 58, 0.11, 0.6);
    noise(bus, { at: hit, dur: 0.02, type: 'highpass', freq: 3800, gain: 0.38 });
    clip(bus, 'hit-slap', hit, { gain: 1.05, rate: 0.8 });
    clip(bus, 'knife-thunk', hit, { gain: 1 });
    clip(bus, 'metal-clang', hit + 0.012, { gain: 0.3, rate: 1.25 });
    bladeRattle(bus, hit + 0.05, 0.8);
  },
  // MY EDGE: a comic panel slapped down (a paper slap, a low thud, a crisp edge)
  panelSlap: (bus, at, v = 1, i = 0) => {
    const p = 1 + (i % 4) * 0.06;
    noise(bus, { at, dur: 0.07, type: 'bandpass', freq: 1100 * p, q: 1.2, gain: 0.42 });
    snap(bus, at, 180 * p, 60, 0.08, 0.34);
    noise(bus, { at: at + 0.003, dur: 0.01, type: 'highpass', freq: 4600, gain: 0.3 });
  },
  // STATS: an ID card snapped onto the board (a hard plastic click and a short glint)
  cardSnap: (bus, at) => {
    noise(bus, { at, dur: 0.006, type: 'highpass', freq: 3800, gain: 0.32 });
    snap(bus, at, 2600, 900, 0.02, 0.1, 'triangle');
    metalRing(bus, at + 0.012, [[2480, 'triangle', 0], [3720, 'sine', 5]], { hp: 2000, peak: 0.045, decay: 0.07 });
  },
  // MISSIONS: a wanted poster stapled up (two quick staple bites and a low knock)
  staple: (bus, at, v = 1, i = 0) => {
    const p = 1 + (i % 3) * 0.05;
    [0, 0.045].forEach((d, j) => {
      noise(bus, { at: at + d, dur: 0.014, type: 'bandpass', freq: (j ? 3600 : 3000) * p, q: 2, gain: 0.4 });
      snap(bus, at + d, 900 * p, 400 * p, 0.018, 0.08, 'square');
    });
    snap(bus, at, 140, 60, 0.07, 0.22);
  },
  // SETTINGS and behind the scenes: a terminal panel switching on (a short square blip up, a tick)
  panelOn: (bus, at, v = 1, i = 0) => {
    const p = 1 + (i % 4) * 0.08;
    tone(bus, { at, dur: 0.035, from: 660 * p, to: 660 * p, type: 'square', gain: 0.065 });
    tone(bus, { at: at + 0.04, dur: 0.05, from: 990 * p, to: 1320 * p, type: 'square', gain: 0.065 });
    noise(bus, { at, dur: 0.008, type: 'highpass', freq: 6000, gain: 0.18 });
  },
  // SKILLS: a row slid in on a blade (a short rising air cut and a tick)
  rowSlide: (bus, at, v = 1, i = 0) => {
    sweep(bus, at, 1800, 5600, 0.045, 0.5, 2.2);
    tone(bus, { at: at + 0.035, dur: 0.035, from: 1500 + (i % 5) * 120, to: 1800 + (i % 5) * 120, type: 'square', gain: 0.07 });
  },
  /* SKILLS, picking a skill on the chart: a blade locks onto the row, then the meter levels up, one
     rising tick per block the skill has filled (a level 6 climbs six steps), and a MAX skill ends on
     a bright ring. So every skill sounds as high as it ranks. */
  skillUp: (bus, at, v = 1, n = 5) => {
    const p = 1 + (Math.random() * 2 - 1) * 0.02;
    snap(bus, at, 3400 * p, 1200 * p, 0.02, 0.1);
    metalRing(bus, at, [[1660 * p, 'square', 0], [2490 * p, 'triangle', 6]], { hp: 1300, peak: 0.05, decay: 0.035 });
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    for (let k = 0; k < n; k++) {
      const f = 880 * 2 ** (scale[k] / 12) * p;
      tone(bus, { at: at + 0.03 + k * 0.03, dur: 0.035, from: f, to: f, type: 'square', gain: 0.03 + k * 0.003 });
    }
    if (n >= 10) metalRing(bus, at + 0.33, [[3520, 'triangle', 0], [5274, 'sine', 4]], { hp: 2400, peak: 0.07, decay: 0.22 });
  },
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
const TRAIN = { pass: 0.66, horn: 0.25, brake: 0.32, metro: 0.3, glass: 0.5 };
/* ---------- the loading screen (src/ui/loader.js; first the lock, Nov 19, John: "the lock actually makes
   lock noises... hear the pins click up, then a sound easing into the first screen"; now TAKE YOUR
   TIME: lockTick for each letter that fills, wordDone for each word that completes, underline when TIME
   is underlined).
   All synthesized. A pin: a tiny dry click, a short bright ring from the pin and a low tick as its
   spring seats; each pin a step higher. The key: a short metal scrape, then a solid clunk with a
   ring as the bolt gives. The doorway: air rushing through the keyhole, swelling and settling, a low
   swell opening up under it and a soft high note as the station appears. ---------- */
VOICES.lockPin = (bus, at, v = 1, i = 0) => {
  const p = 1 + i * 0.12; // (a clear step up per pin)
  noise(bus, { at, dur: 0.006, type: 'highpass', freq: 4200, gain: 0.45 });
  metalRing(bus, at, [[2650 * p, 'triangle', 0], [4100 * p, 'sine', 6]], { hp: 1800, peak: 0.11, decay: 0.05 });
  tone(bus, { at: at + 0.012, dur: 0.03, from: 420 * p, to: 300 * p, type: 'square', gain: 0.05 });
};
VOICES.wordDone = (bus, at, v = 1, i = 0) => { // a word of TAKE YOUR TIME is complete: the pin click plus a knock under it
  VOICES.lockPin(bus, at, v, i);
  snap(bus, at, 240 * (1 + i * 0.1), 80, 0.07, 0.3);
  noise(bus, { at, dur: 0.03, type: 'bandpass', freq: 1200, q: 1.2, gain: 0.25 });
};
VOICES.underline = (bus, at) => { // a felt marker swiped under TIME: a short squeaky drag, rising
  sweep(bus, at, 1600, 3800, 0.22, 0.16, 3.2);
  noise(bus, { at: at + 0.2, dur: 0.02, type: 'bandpass', freq: 2400, q: 2, gain: 0.18 }); // the marker lifts
};
VOICES.lockTick = (bus, at, v = 1, n = 0) => { // the tension wrench as the keyhole fills: soft, rising
  const p = 1 + n / 160;
  noise(bus, { at, dur: 0.004, type: 'highpass', freq: 6000, gain: 0.16 });
  metalRing(bus, at, [[3200 * p, 'triangle', 0]], { hp: 2400, peak: 0.035, decay: 0.018 });
};
/* the dive into the O (the loading screen's ENTER THE STATION, Nov 19): the camera rushes at the word,
   a rising air rush with a low swell under it, landing on the doorway's whoosh as the hole opens */
VOICES.portal = (bus, at) => {
  sweep(bus, at, 320, 2600, 0.36, 0.26, 1.3); // the rush, rising
  sweep(bus, at + 0.05, 1400, 6200, 0.3, 0.09, 2.4); // the air's hiss on top
  tone(bus, { at, dur: 0.4, from: 70, to: 140, gain: 0.22 }); // the swell under it
  noise(bus, { at, dur: 0.008, type: 'highpass', freq: 5000, gain: 0.3 }); // the snap as it starts
};
VOICES.doorway = (bus, at) => {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(300, at);
  bp.frequency.exponentialRampToValueAtTime(2200, at + 0.7);
  bp.frequency.exponentialRampToValueAtTime(480, at + 1.5);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.3, at + 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
  src.connect(bp).connect(g).connect(bus);
  src.start(at);
  src.stop(at + 1.7);
  tone(bus, { at, dur: 1.4, from: 55, to: 98, gain: 0.16 }); // opening up
  tone(bus, { at: at + 1.05, dur: 0.6, from: 1568, to: 1568, gain: 0.045 }); // the station appears
};

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
  /* PRESS START, THE BURST (Nov 22, John: "make the train pop out impactfully with a lot of impact and impactful train
     sounds. Make it faster and make it longer. That way it gives the user a surprise"). Sound makes a surprise out of a
     quiet moment and a hit, so the voice is three beats, each on the picture's own frames (subway.js shotSound):
     (1) STILL, until `burst`: almost nothing. A rumble far down the tunnel, growing, and the rails starting to sing.
     (2) THE BURST: on the frame the nose breaks out of the mouth, the real metro horn blasts (a breath of it in the tunnel
         first, then full, its pitch only ever falling as it goes by), a deep boom and the wall of air the train shoves out
         of the tunnel; the real tram's pass comes up from under it, its loudest wheel crash on the frame the nose passes
         the camera (`pass`), and the wake of air after it.
     (3) THE PASS, to `cut`: seven cars. A second take of the tram's pass, slower and lower, carries on under the first; a
         steel hit lands for every bogie as it passes the camera (`wheels`: the same times the camera is jolted), close
         together and light while it storms, heavier and further apart as it brakes; the recorded brakes squeal up to the
         cut; paper in the wind. Everything fades under the cut to the board.
     The same recordings as before (no new downloads); the horn and the paper stay synthesized until the clips load. */
  tunnel: (bus, at, v, { burst = 0.53, pass = 0.95, cut = 2.6, wheels = [] } = {}) => {
    const s0 = pass - CLIP_HIT['train-pass']; // the clip's own start, relative to at
    // the first take: a murmur while the station is still, up at once as the train breaks out, its crash on the nose
    if (!clip(bus, 'train-pass', at + pass, { gain: TRAIN.pass * 0.95, env: [[0, 0.06], [Math.max(0.02, burst - s0 - 0.05), 0.16], [Math.max(0.05, burst - s0 + 0.09), 1], [1.6, 1], [2.02, 0]] })) return SYNTH.tunnel(bus, at, v, { burst, pass, cut });
    // the second take, slower and lower (the cars still coming as it brakes), its own crash a second after the nose
    const p2 = pass + 0.95; const s2 = p2 - CLIP_HIT['train-pass'] / 0.9;
    clip(bus, 'train-pass', at + p2, { gain: TRAIN.pass * 0.8, rate: 0.9, env: [[0, 0], [0.45, 1], [Math.max(0.5, cut - s2), 0.9], [cut + 0.45 - s2, 0]] });
    farRumble(bus, at, burst, pass, cut);
    // the horn: the real metro car horn. A breath of it down the tunnel, the blast as it breaks out, falling away after the nose
    const h0 = burst - 0.2;
    if (!clip(bus, 'train-horn', at + h0, { gain: TRAIN.horn * 1.3, align: false, rate: 1.03, rateTo: 0.93, env: [[0, 0], [0.14, 0.12], [0.26, 1], [pass - h0 + 0.2, 1], [1.4, 0.3], [1.72, 0]] })) {
      trainHorn(bus, at + h0, 1.7, 0.16, { fadeIn: 0.2, peak: pass - h0, drop: HORN_DOPPLER });
    }
    // the hit as it breaks out: a deep boom, and the air it shoves out of the tunnel; then its wake as the nose goes by
    clip(bus, 'land-boom', at + burst, { gain: 0.42, lowpass: 600 }); // (only its deep part: the hit is felt, the horn and the steel are heard)
    airRoar(bus, at + burst - 0.06, 0.42, { from: 220, to: 1800, gain: 0.7 });
    airRoar(bus, at + pass + 0.03, 0.8, { from: 1700, to: 280, gain: 0.8, up: false });
    // a steel hit for every bogie passing the camera (two wheel sets: ka-chunk), on the frames the camera is jolted
    wheels.forEach(([tw, w]) => {
      const vol = 0.07 + 0.17 * w; // light in the storm, a full thump as it brakes
      railHit(bus, at + tw, vol, 0.25);
      railHit(bus, at + tw + Math.min(0.07, 0.058 * w), vol * 0.8, 0.25);
    });
    // the brakes: the recorded squeal, swelling to its peak just before the cut
    clip(bus, 'train-brake', at + cut - 1.45, { gain: TRAIN.brake * 0.5, env: [[0, 0], [0.5, 0.7], [1.2, 1], [1.9, 0]] });
    flutter(bus, at + pass - 0.14, 0.45, 0.14);
    flutter(bus, at + pass + 0.55, 0.6, 0.07);
  },
  /* NEXT STOP: a real train braking into a station (wheels grinding, the brake squeal swelling as
     the station stops in the windows), then the two-note station chime (a PA tone, synthesized) */
  train: (bus, at) => {
    // a real metro braking into its station, the brakes squealing to a stop (won 2 of 3 rounds over the tram)
    if (!clip(bus, 'metro-brake', at, { gain: TRAIN.metro, align: false, env: [[0, 1], [1.3, 1], [1.75, 0]] })
      && !clip(bus, 'train-brake', at, { gain: TRAIN.brake, env: [[0, 1], [1.3, 1], [1.75, 0]] })) return SYNTH.train(bus, at);
    tone(bus, { at: at + 0.98, dur: 0.24, from: 1319, to: 1319, type: 'sine', gain: 0.1 }); // ding
    tone(bus, { at: at + 1.16, dur: 0.36, from: 1047, to: 1047, type: 'sine', gain: 0.1 }); // dong
  },
  /* the pane giving way: a real window smashing, a low thump under it for weight */
  shatter: (bus, at) => {
    if (!clip(bus, 'glass-break', at, { gain: TRAIN.glass })) return SYNTH.shatter(bus, at);
    tone(bus, { at, dur: 0.18, from: 160, to: 70, gain: 0.3 });
  },
  /* THE DROP, all real recordings (Nov 19; Gemini picked this mix 3 rounds of 3): the board tears like paper
     (a real rip), the fall is a real gale rising as you speed up (25 m/s wind, swelling over the drop and cut
     off on impact), the landing a real deep boom with a thwack. THE RISE runs the gale the other way. */
  tear: (bus, at, v = 1, dur = 0.4) => clip(bus, 'paper-rip', at, { gain: 0.68 * v, align: false }) || SYNTH.tear(bus, at, v, dur),
  fall: (bus, at) => clip(bus, 'fall-wind', at, { gain: 0.9, align: false, env: [[0, 0.05], [0.8, 1], [0.85, 1], [1.0, 0]] }) || SYNTH.fall(bus, at),
  land: (bus, at) => clip(bus, 'land-boom', at, { gain: 0.9 }) || SYNTH.land(bus, at),
  rise: (bus, at) => clip(bus, 'fall-wind', at, { gain: 0.55, align: false, env: [[0, 1], [0.25, 1], [0.8, 0]] }) || SYNTH.rise(bus, at),
  /* the city billboard: a real car rushes past under the light trails, a horn far off */
  city: (bus, at) => {
    if (!clip(bus, 'car-pass', at + 0.32, { gain: 0.2, side: 0.25 })) return SYNTH.city(bus, at);
    carHorn(pan(bus, -0.4), at + 0.12, 0.16, [392, 494], 0.04);
  },
});

const lastAt = {}; // when each sound last started (see sfx)
export function sfx(name, arg) {
  if (!enabled()) return;
  if (!ac && !activated()) return; // no audio engine (and no sound downloads) before the visitor's first tap or key
  if (!ensure()) return;
  if (ac.state !== 'running') ac.resume().catch(() => {}); // ('suspended', or iOS's own 'interrupted')
  // the same sound twice within 35 ms is never meant (a fast sweep across a list): stacking it
  // only smears into a stutter, so the second one is dropped
  if (ac.currentTime - (lastAt[name] ?? -1) < (name === 'hover' ? 0.015 : 0.035)) return; // hovers may overlap: rapid moves stay snappy
  lastAt[name] = ac.currentTime;
  if (music) { // duck the music under the effect: a light dip for hovers, a deeper one for the rest
    const t = ac.currentTime;
    if (duck.gain.cancelAndHoldAtTime) duck.gain.cancelAndHoldAtTime(t); // hold where it is: a jump here was a click in the music
    else { duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(duck.gain.value, t); }
    duck.gain.setTargetAtTime(name === 'hover' || name === 'hoverBig' ? 0.8 : 0.5, t, 0.012);
    duck.gain.setTargetAtTime(1, t + (name === 'tunnel' ? (arg?.cut ?? 1.4) : name === 'train' ? 1.4 : 0.22), 0.25); // (the train shot: the music stays under it until the cut)
  }
  const g = ac.createGain(); // each sound gets its own fader, so a skipped shot can be hushed
  g.connect(sfxBus);
  live.add(g);
  setTimeout(() => live.delete(g), name === 'tunnel' ? 4200 : 2500); // (the train shot runs 2.6 s and fades for half a second more: a skip near its end must still find it)
  VOICES[name]?.(g, ac.currentTime, 1, arg);
  window.__sfxLog?.push(name); // (tests set this array to hear what played)
}

/** Fade out every sound that is still playing (a film cut was skipped). */
export function hush() {
  if (!ac) return;
  live.forEach((g) => g.gain.setTargetAtTime(0, ac.currentTime, 0.03));
  live.clear();
}

/* ---------- music: "Last Train" (src/audio/music.js), an original late-night acid-jazz / lo-fi
   neo-soul loop. Its code downloads only once sound is turned on. It ducks under the sound effects
   (sfx() dips the duck fader for a moment) so a click or a film cut always reads clearly. */
let musicLoading = false;
/* the lock picks with its own sounds: the music waits until its doorway has opened */
let musicHeld = false;
export function holdMusic(until) {
  musicHeld = true;
  until.then(() => { musicHeld = false; if (enabled() && ac && ac.state === 'running') startMusic(); });
}
function startMusic() {
  if (musicHeld) return;
  if (!enabled() || !ensure() || music || musicLoading) return;
  if (ac.state === 'suspended') ac.resume();
  musicLoading = true;
  import('./music.js').then(({ createMusic }) => {
    musicLoading = false;
    if (!enabled() || music) return; // sound went off while it loaded
    music = createMusic(ac, musicBus);
    music.start(resumePoint());
  }, () => { musicLoading = false; }); // offline: no music, sound effects still work
}

function stopMusic() {
  rememberMusic();
  music?.stop();
  music = null;
}

export function setMusicVolume(v) {
  store.setSetting('music', v);
  if (musicBus) musicBus.gain.setTargetAtTime(v * 0.6, ac.currentTime, 0.05);
}


export function setSound(on) {
  store.setSetting('sound', on);
  store.setSetting('soundChosen', true);
  if (on) {
    /* switching the sound on is the visitor asking for sound NOW: if the engine has been away (the page was hidden since it
       was built) or is not running, it gets a new one inside this very click, never a resume() that may not take */
    if (ac && (stale || wasHidden || ac.state !== 'running')) rebuild();
    ensure();
    ac?.resume().catch(() => {});
    startMusic();
    if (ac && ac.state !== 'running') armUnlock();
  } else {
    stopMusic();
  }
}

/* ---------- waking the sound up (Nov 19, John: "with the audio on, when I leave the site and come back
   the audio doesn't work, even though it says it's on, and I have to toggle it off and on").
   Two bugs: (1) the wake-up listened for pointerdown, but on a phone a finger touching down does not
   count as permission to play (only lifting it, a click or a key does), so it failed once and then
   stopped listening; (2) leaving the page (another app, another tab, a locked phone) puts the audio
   engine to sleep and nothing woke it. Now: the first tap, click or key wakes it (and keeps trying
   until it really runs); leaving the page pauses the sound, coming back resumes it where it left off,
   and if the phone needs another tap first (iOS after a call or a lock), the next tap does it. */
const activated = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
export const audioLive = () => Boolean(ac && ac.state === 'running');
/* ---------- an engine that does not come back (Nov 22, John: "on phone, when I use the app and then I swiped out of it to do
   other things and I come back, noise doesn't work, even if I toggle the sound on and off").
   Root cause: the fix above trusted the old engine. Everything it did on the way back (the resume on return, the resume on
   the next tap, the toggle) called resume() on the SAME AudioContext, and the toggle only stopped and restarted the music on
   it. On an iPhone the system takes the audio away when the app is left (the context goes 'interrupted', a state the code
   did not even ask about: sfx() only resumed a 'suspended' one), and a context left that way can stay dead for good: resume()
   never settles, or it says 'running' with a clock that stands still, and then no call on that object ever makes a sound
   again. Nothing ever built a new one, so nothing the visitor could do short of reloading brought the sound back.
   Now: an engine that has been away is not trusted. (1) On an iPhone or iPad every return marks it stale. (2) Everywhere,
   the return is checked: 450 ms later the engine must be 'running' AND its clock must have moved, or it is stale.
   (3) A stale engine is thrown away and a new one is built inside the visitor's next tap, click or key (where a phone
   allows sound to start), and the music starts again on it. (4) Switching the sound on by hand always gets a new engine
   if the page was ever hidden. The recordings are kept (a decoded sound works in any engine), so nothing downloads twice. */
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let stale = false; // the engine may be dead: the next gesture builds a new one
let wasHidden = false; // the page has been hidden since this engine was built
function rebuild() {
  const old = ac;
  stale = false; wasHidden = false;
  if (!old) return;
  stopMusic();
  live.clear();
  Object.keys(lastAt).forEach((k) => delete lastAt[k]); // (those times were on the old engine's clock)
  old.onstatechange = null;
  ac = null; master = null; sfxBus = null; musicBus = null; duck = null;
  try { old.close().catch(() => {}); } catch { /* already closed */ }
  ensure();
}
/** Is the engine really running? Its state must say so and its clock must be moving. If not, it is stale. */
function probe() {
  const a = ac;
  if (!a) return;
  const t0 = a.currentTime;
  setTimeout(() => {
    if (a !== ac || document.hidden || !enabled()) return;
    if (a.state !== 'running' || a.currentTime <= t0) { stale = true; armUnlock(); }
  }, 450);
}
const UNLOCK = ['pointerup', 'click', 'touchend', 'keydown'];
let unlockArmed = false;
function onUnlock(e) {
  if (e.type === 'keydown' && e.key === 'Escape') return; // Escape doesn't let a page start audio
  if (!enabled()) { disarm(); return; }
  if (stale) rebuild(); // a new engine, built inside this gesture
  if (!ensure()) return;
  const a = ac;
  a.resume().then(() => { if (a === ac && a.state === 'running' && !stale) disarm(); }, () => {});
  startMusic();
}
function disarm() {
  unlockArmed = false;
  UNLOCK.forEach((t) => window.removeEventListener(t, onUnlock, true));
}
function armUnlock() {
  if (unlockArmed) return;
  unlockArmed = true;
  UNLOCK.forEach((t) => window.addEventListener(t, onUnlock, true));
}
function wake() {
  if (!ac || !enabled()) return;
  if (IOS) { stale = true; armUnlock(); return; } // (an iPhone's engine is not asked to carry on: the next tap builds a new one)
  ac.resume().catch(() => {});
  probe();
  startMusic();
}
/** Boot: with sound on, the first gesture starts it; leaving pauses it, coming back resumes it. */
export function initAudio() {
  if (enabled()) armUnlock();
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) { wasHidden = true; quiet(true); }
    else { unquiet(); wake(); }
  });
  window.addEventListener('pagehide', () => quiet(true)); // (leaving for another page, or the browser freezing this one)
  window.addEventListener('pageshow', (e) => { if (e.persisted) { unquiet(); wake(); } }); // back from the browser's page cache
  // a link that leaves (a new tab, LinkedIn, GitHub, a live app, the mail app): fade out BEFORE the page goes away
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || !ac || e.defaultPrevented) return;
    const href = a.getAttribute('href') || '';
    const leaves = a.target === '_blank' || /^(mailto:|tel:)/i.test(href) || (/^https?:/i.test(href) && new URL(href, location.href).origin !== location.origin);
    if (!leaves) return;
    quiet(false);
    setTimeout(() => { if (!document.hidden) unquiet(); }, 1500); // (nothing actually left, e.g. no mail app: the sound comes back)
  });
}

/* ---------- leaving without a buzz, coming back where the music was (Nov 23, John: "when clicking the links, sometimes the
   sound or the music kind of bugs out like a bee buzzing in your ear. And then when you go back, the music restarts straight
   from zero"). Root causes: (1) the engine was paused (or, on a phone, taken away by the system) in the middle of whatever was
   playing, at full level: a phone can then repeat its last few milliseconds of sound, a buzz. (2) The music kept no place: a
   new engine (an iPhone always gets one on return) or a reload started the song from its first beat. Now every exit fades the
   whole mix to silence in ~40 ms before the engine pauses, the song's place is kept (also in this tab's session storage, for a
   page that reloads on return), and the music comes back from that beat with its usual soft fade-in. */
const POS_KEY = 'jn-music-pos';
let musicPos = null;
function rememberMusic() {
  if (!music || !ac) return;
  try { musicPos = music.position(); } catch { return; }
  try { sessionStorage.setItem(POS_KEY, JSON.stringify({ n: musicPos, at: Date.now() })); } catch { /* private mode */ }
}
function resumePoint() {
  if (musicPos !== null) return musicPos;
  try {
    const v = JSON.parse(sessionStorage.getItem(POS_KEY) || 'null');
    if (v && Number.isFinite(v.n) && Date.now() - v.at < 30 * 60 * 1000) return v.n; // (half an hour away: start fresh)
  } catch { /* nothing kept */ }
  return 0;
}
let quietTimer = 0;
function quiet(pause) {
  if (!ac || !master) return;
  rememberMusic();
  const t = ac.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + 0.04);
  clearTimeout(quietTimer);
  if (pause) { const a = ac; quietTimer = setTimeout(() => { if (a === ac && document.hidden) a.suspend().catch(() => {}); }, 60); }
}
function unquiet() {
  clearTimeout(quietTimer);
  if (!ac || !master) return;
  const t = ac.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0.9, t + 0.25);
}

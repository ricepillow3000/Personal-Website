/* ---------- music: "Last Train" - an original late-night acid-jazz / lo-fi neo-soul loop ----------
   Nov 19, John: "late-night acid jazz, lo-fi neo-soul... dreamy, no harsh resolutions". Written for
   this site, not copied from any game or song. Everything is synthesized with Web Audio (no files):

   - 75 BPM, slightly swung 16ths, D Dorian, a 16-bar loop: the 8-bar form plays twice, chords and
     groove the first time, the melody joins the second time, then it loops seamlessly.
   - Rhodes-style electric piano (FM sine with a soft bell tine), stereo tremolo, low-pass ~1.8 kHz.
   - Round sub bass, laid back behind the beat, syncopated root / 5th / 7th.
   - A dusty kit: kick on 1 and the "and" of 3, rim + brush on 2 and 4, swung hats.
   - A low organ pad, vinyl crackle, a little tape wow, a small room.
   - Velocity and timing are humanized on every hit, so no two passes are identical.

   Loaded only after sound is turned on (a dynamic import from audio.js), scheduled with a lookahead
   timer (cheap: a few short-lived nodes per 16th), paused while the tab is hidden, and it ducks
   under sound effects (audio.js). */

// ----- edit these -----
export const TEMPO = 75; // beats per minute (74-76 sits best)
const SWING = 0.17; // how late the off-16ths land, as a share of a 16th (0 straight, 0.33 triplets)
const BASS_LAG = 0.018; // seconds the bass sits behind the beat (laid back)
/* One chord per bar, in D Dorian (Bbmaj7#11 is borrowed from D minor for a dreamy lift):
   [bass root, its 7th above the root in semitones, electric-piano voicing (rootless), name] */
export const CHORDS = [
  ['D2', 10, ['F3', 'A3', 'C4', 'E4'], 'Dm9'],
  ['E2', 10, ['G3', 'B3', 'D4', 'A4'], 'Em11'],
  ['F2', 11, ['A3', 'C4', 'E4', 'G4'], 'Fmaj9'],
  ['G2', 10, ['F3', 'C4', 'D4', 'A4'], 'G9sus4'],
  ['A2', 10, ['G3', 'B3', 'C4', 'E4'], 'Am9'],
  ['Bb1', 11, ['F3', 'A3', 'D4', 'E4'], 'Bbmaj7#11'],
  ['C2', 11, ['E3', 'G3', 'B3', 'D4'], 'Cmaj9'],
  ['A1', 10, ['G3', 'B3', 'D4', 'E4'], 'A9sus4'],
];
/* The melody (second time through): per bar, [16th step, note, length in 16ths]. Sparse on purpose. */
const MELODY = [
  [[2, 'A4', 4], [6, 'C5', 2], [8, 'D5', 6]],
  [[2, 'B4', 3], [5, 'A4', 2], [8, 'G4', 6]],
  [[4, 'G4', 2], [6, 'A4', 2], [8, 'C5', 4], [12, 'E5', 4]],
  [[0, 'D5', 8], [10, 'C5', 2], [12, 'A4', 4]],
  [[2, 'E5', 4], [6, 'D5', 2], [8, 'B4', 6]],
  [[0, 'A4', 4], [4, 'F4', 3], [8, 'E5', 8]],
  [[2, 'D5', 2], [4, 'E5', 2], [6, 'G5', 5], [12, 'B4', 4]],
  [[0, 'A4', 10]],
];
// ----------------------

const AHEAD = 0.2; // seconds scheduled ahead
const LEVEL = 0.6; // the loop's own level: it sits under the site's sound effects
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const N = (name) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  return 12 * (Number(m[3]) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const FORM = CHORDS.map(([root, seventh, voicing]) => ({ root: N(root), seventh, voicing: voicing.map(N) }));
const LEAD = MELODY.map((bar) => bar.map(([st, n, len]) => [st, N(n), len]));

export function createMusic(ac, dest) {
  const six = 60 / TEMPO / 4;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const human = (v) => v * rnd(0.86, 1.08);

  // ----- the shared chain: out -> warm tape -> dusty top end -> dest -----
  const out = ac.createGain();
  out.gain.value = 0.0001;
  const tape = ac.createWaveShaper(); // gentle tape saturation
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(1.4 * x) / Math.tanh(1.4);
  }
  tape.curve = curve;
  const dust = ac.createBiquadFilter(); // rolled-off top, like an old record
  dust.type = 'lowpass';
  dust.frequency.value = 7200;
  dust.Q.value = 0.4;
  const low = ac.createBiquadFilter(); // a little warmth
  low.type = 'lowshelf';
  low.frequency.value = 180;
  low.gain.value = 2;
  out.connect(tape).connect(dust).connect(low).connect(dest);

  const noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // a small room (generated impulse, 1.6 s)
  const room = ac.createConvolver();
  const len = Math.floor(ac.sampleRate * 1.6);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
  }
  room.buffer = ir;
  const roomIn = ac.createGain();
  const roomOut = ac.createGain();
  roomOut.gain.value = 0.28;
  roomIn.connect(room).connect(roomOut).connect(out);
  const send = (node, wet) => {
    if (!wet) return;
    const g = ac.createGain();
    g.gain.value = wet;
    node.connect(g).connect(roomIn);
  };

  // tape wow: one slow LFO bends every keyboard note a few cents
  const wow = ac.createOscillator();
  wow.frequency.value = 0.55;
  const wowDepth = ac.createGain();
  wowDepth.gain.value = 5; // cents
  wow.connect(wowDepth);

  // electric piano bus: low-pass ~1.8 kHz, then a stereo tremolo (left and right breathe in turn)
  const epIn = ac.createGain();
  const epLp = ac.createBiquadFilter();
  epLp.type = 'lowpass';
  epLp.frequency.value = 1800;
  epLp.Q.value = 0.5;
  const epMud = ac.createBiquadFilter(); // a small dip where the piano's body crowds the bass
  epMud.type = 'peaking';
  epMud.frequency.value = 300;
  epMud.Q.value = 1.4;
  epMud.gain.value = -2.5;
  epIn.connect(epMud).connect(epLp);
  const trem = ac.createOscillator();
  trem.frequency.value = 3.1;
  const tremDepth = ac.createGain();
  tremDepth.gain.value = 0.32;
  const tremInv = ac.createGain();
  tremInv.gain.value = -0.32;
  trem.connect(tremDepth);
  trem.connect(tremInv);
  [[-0.65, tremDepth], [0.65, tremInv]].forEach(([p, mod]) => {
    const g = ac.createGain();
    g.gain.value = 0.68;
    mod.connect(g.gain);
    const pan = ac.createStereoPanner();
    pan.pan.value = p;
    epLp.connect(g).connect(pan).connect(out);
  });
  send(epLp, 0.32);

  // vinyl crackle + hiss, looping
  const crackBuf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const cd = crackBuf.getChannelData(0);
  for (let i = 0; i < cd.length; i++) {
    cd[i] = (Math.random() * 2 - 1) * 0.02; // hiss
    if (Math.random() < 0.00045) cd[i] = (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 1); // a pop
  }
  const crackle = ac.createBufferSource();
  crackle.buffer = crackBuf;
  crackle.loop = true;
  const cHp = ac.createBiquadFilter();
  cHp.type = 'highpass';
  cHp.frequency.value = 900;
  const cG = ac.createGain();
  cG.gain.value = 0.05;
  crackle.connect(cHp).connect(cG).connect(out);

  const shared = [wow, trem, crackle];
  let started = false;
  const startShared = (t) => {
    if (started) return;
    started = true;
    shared.forEach((n) => n.start(t));
  };

  // ----- voices -----
  const noiseHit = (t, { type, freq, q = 0.7, a = 0.002, d, gain, to = out, wet = 0 }) => {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(f).connect(g).connect(to);
    send(g, wet);
    s.start(t, Math.random() * 0.8);
    s.stop(t + a + d + 0.02);
  };
  const kick = (t, v) => {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(118, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.38);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
    noiseHit(t, { type: 'lowpass', freq: 1300, d: 0.012, gain: 0.07 * v }); // the beater
  };
  const rim = (t, v) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 830;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07 * v, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g).connect(out);
    send(g, 0.25);
    o.start(t);
    o.stop(t + 0.04);
    noiseHit(t, { type: 'bandpass', freq: 1900, q: 3, d: 0.035, gain: 0.13 * v, wet: 0.2 }); // the click
    noiseHit(t - 0.01, { type: 'bandpass', freq: 2800, q: 0.6, a: 0.02, d: 0.17, gain: 0.04 * v }); // the brush swish
  };
  const hat = (t, v, open = false) => noiseHit(t, { type: 'highpass', freq: 7200, q: 0.6, d: open ? 0.22 : 0.04, gain: 0.06 * v });

  /* Rhodes-style note: a sine carrier, FM'd by a sine whose depth falls fast (the "bark" mellowing
     into a round tone), plus a soft bell tine; harder hits bark more */
  const ep = (t, n, dur, vel, wet = 0) => {
    const f = midi(n);
    const car = ac.createOscillator();
    car.frequency.value = f;
    const mod = ac.createOscillator();
    mod.frequency.value = f;
    const mi = ac.createGain();
    mi.gain.setValueAtTime(f * (0.6 + 1.1 * vel), t);
    mi.gain.exponentialRampToValueAtTime(f * 0.06, t + 0.5);
    mod.connect(mi).connect(car.frequency);
    wowDepth.connect(car.detune);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.024 * vel, t + 0.45);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.09);
    car.connect(g).connect(epIn);
    const nodes = [car, mod];
    if (f * 7 < 5500) {
      const tine = ac.createOscillator();
      tine.frequency.value = f * 7;
      const tg = ac.createGain();
      tg.gain.setValueAtTime(0.008 * vel, t);
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      tine.connect(tg).connect(epIn);
      nodes.push(tine);
    }
    send(g, wet);
    nodes.forEach((o) => {
      o.start(t);
      o.stop(t + dur + 0.6);
    });
    car.onended = () => wowDepth.disconnect(car.detune); // unhook the wow, or it piles up forever
  };
  const chord = (t, notes, dur, vel) => notes.forEach((n, i) => ep(t + i * rnd(0.009, 0.017), n, dur, human(vel)));

  /* round sub bass: a sine with a whisper of its octave, a soft attack, sitting behind the beat */
  const bass = (t, n, dur, v) => {
    const f = midi(n);
    const o = ac.createOscillator();
    o.frequency.value = f;
    const o2 = ac.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2;
    const g2 = ac.createGain();
    g2.gain.value = 0.18;
    o2.connect(g2);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.2 * v, t + dur * 0.6);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
    o.connect(g);
    g2.connect(g);
    g.connect(out);
    [o, o2].forEach((x) => {
      x.start(t);
      x.stop(t + dur + 0.3);
    });
  };

  /* low organ pad: three soft drawbars (1x, 2x, 3x) under a dark filter, slow swell */
  const organ = (t, notes, dur) => {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 950;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.034, t + dur * 0.3);
    g.gain.setValueAtTime(0.034, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
    lp.connect(g).connect(out);
    send(g, 0.5);
    notes.forEach((n) => [[1, 1], [2, 0.45], [3, 0.2]].forEach(([h, a]) => {
      const o = ac.createOscillator();
      o.frequency.value = midi(n) * h;
      wowDepth.connect(o.detune);
      const og = ac.createGain();
      og.gain.value = a;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + dur + 0.3);
      o.onended = () => wowDepth.disconnect(o.detune);
    }));
  };

  // comping rhythms for the electric piano: [step, length in 16ths, velocity, top notes only]
  const COMP = [
    [[0, 6, 0.85, false], [7, 2, 0.5, true], [10, 5, 0.68, false]],
    [[0, 9, 0.8, false], [11, 3, 0.55, true], [14, 2, 0.45, true]],
  ];

  /** Everything that happens on 16th number `n` of the song, landing at grid time `t`. */
  function step(n, t) {
    startShared(t);
    const s = n % 16;
    const barN = Math.floor(n / 16) % 16; // 16-bar loop
    const bar = barN % 8;
    const pass = barN < 8 ? 0 : 1; // 0 = chords + groove, 1 = the melody joins
    const at = t + (s % 2 ? SWING * six : 0) + rnd(-0.004, 0.004); // swung, a hair loose
    const c = FORM[bar];
    const next = FORM[(bar + 1) % 8];

    // drums
    if (s === 0) kick(at, human(1));
    if (s === 10) kick(at, human(0.78));
    if (s === 7 && bar % 4 === 3) kick(at, human(0.35)); // a ghost kick now and then
    if (s === 4 || s === 12) rim(at, human(s === 12 ? 0.95 : 0.85));
    if (s % 2 === 0) hat(at, human(s % 4 === 2 ? 0.75 : 0.5), s === 14 && bar % 2 === 1);
    else if (Math.random() < 0.3) hat(at, human(0.28));

    // bass: root, a syncopated 5th, the 7th or the octave, then a step toward the next chord
    const b = at + BASS_LAG;
    if (s === 0) bass(b, c.root, six * 5, human(1));
    if (s === 6) bass(b, c.root + 7, six * 2.2, human(0.7));
    if (s === 10) bass(b, c.root + (bar % 2 ? c.seventh : 12), six * 2.5, human(0.75));
    if (s === 14) bass(b, next.root + (Math.random() < 0.5 ? -1 : 2), six * 1.6, human(0.6));

    // keys
    COMP[bar % 2].forEach(([st, len, v, top]) => {
      if (st === s) chord(at, top ? c.voicing.slice(1) : c.voicing, len * six, pass ? v * 0.8 : v);
    });
    if (s === 0 && bar % 2 === 0) organ(at, c.voicing.slice(0, 3).map((x) => x - 12), six * 32);

    // melody, the second time through, an octave up from the comping
    if (pass) LEAD[bar].forEach(([st, note, len]) => { if (st === s) ep(at + rnd(0, 0.012), note, len * six, human(1.1), 0.5); });
  }

  let timer = 0;
  let n = 0;
  let next = 0;
  const tick = () => {
    while (next < ac.currentTime + AHEAD) {
      step(n, next);
      next += six;
      n += 1;
    }
  };
  // hidden tabs throttle timers to ~1 s, which would leave holes in the groove: pause instead
  const vis = () => {
    clearInterval(timer);
    timer = 0;
    if (document.hidden) return;
    next = Math.max(next, ac.currentTime + 0.06);
    timer = setInterval(tick, 25);
  };
  return {
    /** start (or restart) the loop, fading in */
    start() {
      if (timer) return;
      n = 0;
      next = ac.currentTime + 0.08;
      out.gain.cancelScheduledValues(ac.currentTime);
      out.gain.setValueAtTime(0.0001, ac.currentTime);
      out.gain.exponentialRampToValueAtTime(LEVEL, ac.currentTime + 1.2);
      timer = setInterval(tick, 25);
      tick();
      document.addEventListener('visibilitychange', vis);
    },
    /** fade out and free everything */
    stop() {
      clearInterval(timer);
      timer = 0;
      document.removeEventListener('visibilitychange', vis);
      out.gain.setTargetAtTime(0.0001, ac.currentTime, 0.12);
      setTimeout(() => {
        shared.forEach((x) => { try { x.stop(); } catch { /* never started */ } });
        out.disconnect();
      }, 900);
    },
    /** offline proof: schedule `count` 16ths from time `t0` (no timer) */
    render(t0, count) {
      out.gain.value = LEVEL;
      for (let i = 0; i < count; i++) step(i, t0 + i * six);
    },
  };
}

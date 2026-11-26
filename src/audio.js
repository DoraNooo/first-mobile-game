/**
 * GLOO — Pure Web Audio API procedural sound engine.
 *
 * Zero external assets, zero dependencies.
 * Generates:
 *  - Delicate, airy, chill melodic atmosphere: sparse plucked kalimba / harp /
 *    Rhodes-like arpeggio phrases on a lush pentatonic/Lydian scale with warm delay
 *    and plenty of breathing space.
 *  - Ultra-soft, high-passed (260Hz) shimmering breath swells (<= 0.025 gain)
 *    that drift gently in and out with zero bass hum or continuous drone.
 *  - Tactile organic SFX: chomp/gulp + combo chime, predator bite recoil,
 *    subtle predator heartbeat pulse, scale-up shimmer swell, cosmic victory chord,
 *    lava spit, shrink hit, pulse dash, heal chime, and story whisper chime.
 */

import { SCALES } from './scales.js';

const EPS = 0.0001;
const MASTER_VOLUME = 0.72;
const PAUSED_VOLUME = 0.22;
const PULSE_COOLDOWN_SEC = 0.7;
const BREATH_HIGHPASS_HZ = 260;
const BREATH_MAX_GAIN = 0.025;

// Major pentatonic ratios spanning two octaves (used for combo chimes)
const PENTATONIC_RATIOS = [
  1,
  9 / 8,
  5 / 4,
  3 / 2,
  5 / 3,
  2,
  9 / 4,
  5 / 2,
  3,
  10 / 3,
  4,
];

// Lush Pentatonic / Lydian scale ratios for sparse generative melodies
// Includes core pentatonic tones plus dreamy Lydian #4 (45/32) and maj7 (15/8)
const LYDIAN_SCALE_RATIOS = [
  1,
  9 / 8,
  5 / 4,
  45 / 32, // Lydian #4
  3 / 2,
  5 / 3,
  15 / 8,  // Major 7
  2,
  9 / 4,
  5 / 2,
  3,
];

// Curated gentle arpeggio patterns (indices into LYDIAN_SCALE_RATIOS)
const ARPEGGIO_PATTERNS = [
  [0, 2, 4],       // 1 - 3 - 5
  [0, 4, 7],       // 1 - 5 - 8
  [2, 4, 6, 7],    // 3 - 5 - 7 - 8
  [4, 2, 0],       // 5 - 3 - 1
  [0, 2, 3, 4],    // 1 - 3 - #4 - 5 (Lydian shimmer)
  [1, 4, 5, 8],    // 2 - 5 - 6 - 9
  [7, 4, 2],       // 8 - 5 - 3
  [0, 5, 7],       // 1 - 6 - 8
  [2, 4, 9],       // 3 - 5 - 10
];

// Scale-tier timbre profiles for melodic plucks & airy breath swells
const TIMBRE_PROFILES = [
  {
    // 0: Quantum — delicate crystalline kalimba
    pluckStyle: 'kalimba',
    pluckFilterHz: 2600,
    pluckWet: 0.65,
    breathRatios: [2, 3, 4.5],
    breathLowpassHz: 2400,
    breathPeak: 0.02,
    breathWet: 0.78,
  },
  {
    // 1: Micro — watery luminous kalimba
    pluckStyle: 'kalimba',
    pluckFilterHz: 2300,
    pluckWet: 0.66,
    breathRatios: [2, 2.5, 3],
    breathLowpassHz: 2200,
    breathPeak: 0.021,
    breathWet: 0.78,
  },
  {
    // 2: Forest — warm nocturnal Rhodes / marimba
    pluckStyle: 'rhodes',
    pluckFilterHz: 1550,
    pluckWet: 0.54,
    breathRatios: [1.5, 2, 3],
    breathLowpassHz: 1750,
    breathPeak: 0.022,
    breathWet: 0.72,
  },
  {
    // 3: City — mellow twilight Rhodes
    pluckStyle: 'rhodes',
    pluckFilterHz: 1450,
    pluckWet: 0.58,
    breathRatios: [1.5, 2.25, 3],
    breathLowpassHz: 1650,
    breathPeak: 0.022,
    breathWet: 0.74,
  },
  {
    // 4: Planetary — ethereal orbital harp
    pluckStyle: 'harp',
    pluckFilterHz: 2200,
    pluckWet: 0.76,
    breathRatios: [2, 3, 4],
    breathLowpassHz: 2100,
    breathPeak: 0.024,
    breathWet: 0.82,
  },
  {
    // 5: Cosmic — vast luminous harp
    pluckStyle: 'harp',
    pluckFilterHz: 2500,
    pluckWet: 0.8,
    breathRatios: [2, 3, 4.5],
    breathLowpassHz: 2300,
    breathPeak: 0.025,
    breathWet: 0.85,
  },
];

function safeDisconnect(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    try {
      nodes[i].disconnect();
    } catch (_) {
      // Ignore already-disconnected nodes
    }
  }
}

function smoothParam(param, target, now, timeConstant) {
  try {
    param.cancelScheduledValues(now);
    param.setTargetAtTime(target, now, timeConstant);
  } catch (_) {
    param.value = target;
  }
}

/**
 * Lift low scale roots into a clean, airy mid-high register (>= 240Hz)
 * so melodic plucks and breath swells never muddy the low end.
 */
function airyRootFreq(rawRoot) {
  let f = rawRoot || 261.63;
  while (f < 240) f *= 2;
  return f;
}

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.started = false;
    this.scaleIndex = 0;

    this._paused = false;
    this._lastPulseTime = -Infinity;
    this._phraseTimer = null;
    this._breathTimer = null;
    this._noiseBuffer = null;

    // Audio graph nodes
    this._masterGain = null;
    this._pauseGain = null;
    this._compressor = null;
    this._dryBus = null;
    this._wetBus = null;
  }

  /**
   * Create or resume the AudioContext, build the audio graph, and start the
   * sparse melodic atmosphere & gentle shimmering breath scheduler.
   * Safe to call multiple times.
   */
  start() {
    if (typeof window === 'undefined') return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (this.started && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      this.ctx = new AudioCtx();
    } catch (_) {
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this._buildGraph();
    this._noiseBuffer = this._createNoiseBuffer(1.0);

    // Start sparse generative melodic phrases and occasional airy breath swells
    this._scheduleNextPhrase(900);
    this._scheduleNextBreath(2400);

    this.started = true;
  }

  /**
   * Smoothly mute or unmute all audio. Returns the new muted state.
   */
  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.ctx && this._masterGain) {
      const now = this.ctx.currentTime;
      smoothParam(this._masterGain.gain, this.muted ? 0 : MASTER_VOLUME, now, 0.045);
    }
    return this.muted;
  }

  /**
   * Toggle mute state and return the new muted boolean.
   */
  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /**
   * Softly lower volume while paused and restore when resumed.
   */
  setPaused(paused) {
    this._paused = Boolean(paused);
    if (this.ctx && this._pauseGain) {
      const now = this.ctx.currentTime;
      smoothParam(this._pauseGain.gain, this._paused ? PAUSED_VOLUME : 1.0, now, 0.08);
    }
  }

  /**
   * Update active musical scale root and timbre profile for upcoming
   * generative phrases, breath swells, and harmonic SFX.
   */
  setScale(scaleIndex) {
    const clamped = Math.max(0, Math.min(SCALES.length - 1, Math.floor(scaleIndex) || 0));
    this.scaleIndex = clamped;
  }

  /**
   * Crisp, juicy, slightly wild organic bite-and-gulp sound with a tiny warm
   * harmonic chime that rises gently with combo.
   */
  playChomp(intensity = 1, combo = 1) {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const inten = Math.max(0.45, Math.min(2.0, Number(intensity) || 1));
    const clampedCombo = Math.max(1, Math.min(10, Math.floor(combo) || 1));
    const jitter = 0.94 + Math.random() * 0.12;

    // 1. Short filtered noise crunch (crisp organic bite)
    if (this._noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this._noiseBuffer;

      const crunchFilter = ctx.createBiquadFilter();
      crunchFilter.type = 'bandpass';
      const startCutoff = (1650 + Math.random() * 550) * jitter;
      crunchFilter.frequency.setValueAtTime(startCutoff, now);
      crunchFilter.frequency.exponentialRampToValueAtTime(Math.max(320, startCutoff * 0.42), now + 0.055);
      crunchFilter.Q.setValueAtTime(2.0, now);

      const crunchGain = ctx.createGain();
      const crunchPeak = Math.min(0.26, 0.15 * inten);
      crunchGain.gain.setValueAtTime(EPS, now);
      crunchGain.gain.exponentialRampToValueAtTime(crunchPeak, now + 0.006);
      crunchGain.gain.exponentialRampToValueAtTime(EPS, now + 0.058);
      crunchGain.gain.linearRampToValueAtTime(0, now + 0.068);

      noiseSrc.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(this._dryBus);

      const offset = Math.random() * 0.6;
      noiseSrc.start(now, offset, 0.08);
      noiseSrc.onended = () => safeDisconnect([noiseSrc, crunchFilter, crunchGain]);
    }

    // 2. Quick resonant pitch-dropping gulp/pop (juicy & slightly wild)
    const gulpOsc = ctx.createOscillator();
    gulpOsc.type = 'triangle';
    const basePop = (290 + Math.random() * 75) * jitter;
    gulpOsc.frequency.setValueAtTime(basePop * 0.78, now);
    gulpOsc.frequency.exponentialRampToValueAtTime(basePop * 1.24, now + 0.016);
    gulpOsc.frequency.exponentialRampToValueAtTime(Math.max(65, 96 / Math.sqrt(inten)), now + 0.115);

    const gulpFilter = ctx.createBiquadFilter();
    gulpFilter.type = 'lowpass';
    gulpFilter.frequency.setValueAtTime(1450 * jitter, now);
    gulpFilter.frequency.exponentialRampToValueAtTime(260, now + 0.115);
    gulpFilter.Q.setValueAtTime(4.8, now);

    const gulpGain = ctx.createGain();
    const gulpPeak = Math.min(0.32, 0.21 * inten);
    gulpGain.gain.setValueAtTime(EPS, now);
    gulpGain.gain.exponentialRampToValueAtTime(gulpPeak, now + 0.012);
    gulpGain.gain.exponentialRampToValueAtTime(EPS, now + 0.125);
    gulpGain.gain.linearRampToValueAtTime(0, now + 0.14);

    gulpOsc.connect(gulpFilter);
    gulpFilter.connect(gulpGain);
    gulpGain.connect(this._dryBus);

    gulpOsc.start(now);
    gulpOsc.stop(now + 0.145);
    gulpOsc.onended = () => safeDisconnect([gulpOsc, gulpFilter, gulpGain]);

    // 3. Tiny warm harmonic chime rising gently with combo (capped at 10)
    const root = SCALES[this.scaleIndex].musicRoot;
    const ratio = PENTATONIC_RATIOS[(clampedCombo - 1) % PENTATONIC_RATIOS.length];
    const octaveMult = root < 180 ? 2 : 1;
    const chimeFreq = Math.min(1800, root * octaveMult * ratio);

    const chimeOsc = ctx.createOscillator();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(chimeFreq, now + 0.015);

    const overtoneOsc = ctx.createOscillator();
    overtoneOsc.type = 'sine';
    overtoneOsc.frequency.setValueAtTime(chimeFreq * 2, now + 0.015);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.22, now + 0.015);

    const chimeGain = ctx.createGain();
    const chimePeak = Math.min(0.14, 0.075 + clampedCombo * 0.006);
    chimeGain.gain.setValueAtTime(EPS, now + 0.015);
    chimeGain.gain.exponentialRampToValueAtTime(chimePeak, now + 0.028);
    chimeGain.gain.exponentialRampToValueAtTime(EPS, now + 0.29);
    chimeGain.gain.linearRampToValueAtTime(0, now + 0.31);

    const chimeWet = ctx.createGain();
    chimeWet.gain.setValueAtTime(0.32, now + 0.015);

    chimeOsc.connect(chimeGain);
    overtoneOsc.connect(overtoneGain);
    overtoneGain.connect(chimeGain);
    chimeGain.connect(this._dryBus);
    chimeGain.connect(chimeWet);
    chimeWet.connect(this._wetBus);

    chimeOsc.start(now + 0.015);
    overtoneOsc.start(now + 0.015);
    chimeOsc.stop(now + 0.32);
    overtoneOsc.stop(now + 0.32);
    chimeOsc.onended = () =>
      safeDisconnect([chimeOsc, overtoneOsc, overtoneGain, chimeGain, chimeWet]);
  }

  /**
   * Visceral squishy splash + low thud when a predator bites the player.
   */
  playBiteRecoil() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Low visceral thud
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(140, now);
    thudOsc.frequency.exponentialRampToValueAtTime(38, now + 0.22);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(EPS, now);
    thudGain.gain.exponentialRampToValueAtTime(0.38, now + 0.012);
    thudGain.gain.exponentialRampToValueAtTime(EPS, now + 0.24);
    thudGain.gain.linearRampToValueAtTime(0, now + 0.26);

    thudOsc.connect(thudGain);
    thudGain.connect(this._dryBus);

    thudOsc.start(now);
    thudOsc.stop(now + 0.27);
    thudOsc.onended = () => safeDisconnect([thudOsc, thudGain]);

    // 2. Squishy resonant downward sweep
    const squishOsc = ctx.createOscillator();
    squishOsc.type = 'sawtooth';
    squishOsc.frequency.setValueAtTime(210, now);
    squishOsc.frequency.exponentialRampToValueAtTime(72, now + 0.19);

    const squishFilter = ctx.createBiquadFilter();
    squishFilter.type = 'bandpass';
    squishFilter.frequency.setValueAtTime(980, now);
    squishFilter.frequency.exponentialRampToValueAtTime(170, now + 0.19);
    squishFilter.Q.setValueAtTime(4.5, now);

    const squishGain = ctx.createGain();
    squishGain.gain.setValueAtTime(EPS, now);
    squishGain.gain.exponentialRampToValueAtTime(0.24, now + 0.016);
    squishGain.gain.exponentialRampToValueAtTime(EPS, now + 0.21);
    squishGain.gain.linearRampToValueAtTime(0, now + 0.23);

    squishOsc.connect(squishFilter);
    squishFilter.connect(squishGain);
    squishGain.connect(this._dryBus);

    squishOsc.start(now);
    squishOsc.stop(now + 0.24);
    squishOsc.onended = () => safeDisconnect([squishOsc, squishFilter, squishGain]);

    // 3. Wet splash burst
    if (this._noiseBuffer) {
      const splashSrc = ctx.createBufferSource();
      splashSrc.buffer = this._noiseBuffer;

      const splashFilter = ctx.createBiquadFilter();
      splashFilter.type = 'bandpass';
      splashFilter.frequency.setValueAtTime(1900, now);
      splashFilter.frequency.exponentialRampToValueAtTime(380, now + 0.25);
      splashFilter.Q.setValueAtTime(1.4, now);

      const splashGain = ctx.createGain();
      splashGain.gain.setValueAtTime(EPS, now);
      splashGain.gain.exponentialRampToValueAtTime(0.22, now + 0.018);
      splashGain.gain.exponentialRampToValueAtTime(EPS, now + 0.26);
      splashGain.gain.linearRampToValueAtTime(0, now + 0.28);

      const splashWet = ctx.createGain();
      splashWet.gain.setValueAtTime(0.2, now);

      splashSrc.connect(splashFilter);
      splashFilter.connect(splashGain);
      splashGain.connect(this._dryBus);
      splashGain.connect(splashWet);
      splashWet.connect(this._wetBus);

      splashSrc.start(now, Math.random() * 0.4, 0.3);
      splashSrc.onended = () =>
        safeDisconnect([splashSrc, splashFilter, splashGain, splashWet]);
    }
  }

  /**
   * Very subtle, low-volume organic heartbeat/thrum when a predator is actively
   * chasing the player. Internally rate-limited to at most once every 0.7s.
   */
  playPredatorPulse() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (now - this._lastPulseTime < PULSE_COOLDOWN_SEC) return;
    this._lastPulseTime = now;

    // Gentle organic "lub-dub" double thrum
    this._triggerThrum(now, 68, 44, 0.11, 0.17);
    this._triggerThrum(now + 0.16, 58, 38, 0.08, 0.19);
  }

  /**
   * Lush, magical ascending pentatonic shimmer swell when entering a new scale.
   */
  playScaleUp() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseFreq = airyRootFreq(SCALES[this.scaleIndex].musicRoot);

    // Warm rising harmonic swell (high-passed so it stays luminous, never muddy)
    const swellOsc1 = ctx.createOscillator();
    const swellOsc2 = ctx.createOscillator();
    swellOsc1.type = 'sine';
    swellOsc2.type = 'triangle';
    swellOsc1.frequency.setValueAtTime(baseFreq, now);
    swellOsc2.frequency.setValueAtTime(baseFreq * 1.5, now);

    const swellFilter = ctx.createBiquadFilter();
    swellFilter.type = 'lowpass';
    swellFilter.frequency.setValueAtTime(480, now);
    swellFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.75);
    swellFilter.frequency.exponentialRampToValueAtTime(750, now + 1.65);

    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(EPS, now);
    swellGain.gain.exponentialRampToValueAtTime(0.11, now + 0.55);
    swellGain.gain.exponentialRampToValueAtTime(EPS, now + 1.7);
    swellGain.gain.linearRampToValueAtTime(0, now + 1.78);

    const swellWet = ctx.createGain();
    swellWet.gain.setValueAtTime(0.58, now);

    swellOsc1.connect(swellFilter);
    swellOsc2.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(this._dryBus);
    swellGain.connect(swellWet);
    swellWet.connect(this._wetBus);

    swellOsc1.start(now);
    swellOsc2.start(now);
    swellOsc1.stop(now + 1.8);
    swellOsc2.stop(now + 1.8);
    swellOsc1.onended = () =>
      safeDisconnect([swellOsc1, swellOsc2, swellFilter, swellGain, swellWet]);

    // Cascading ascending pentatonic shimmer notes
    const notes = [1, 5 / 4, 3 / 2, 2, 5 / 2, 3];
    for (let i = 0; i < notes.length; i++) {
      const t = now + i * 0.085;
      const freq = Math.min(2600, baseFreq * notes[i]);
      const osc = ctx.createOscillator();
      const shimmer = ctx.createOscillator();
      osc.type = 'sine';
      shimmer.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      shimmer.frequency.setValueAtTime(freq * 2, t);
      shimmer.detune.setValueAtTime(5, t);

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.setValueAtTime(0.24, t);

      const env = ctx.createGain();
      const peak = 0.095 - i * 0.006;
      env.gain.setValueAtTime(EPS, t);
      env.gain.exponentialRampToValueAtTime(Math.max(0.03, peak), t + 0.035);
      env.gain.exponentialRampToValueAtTime(EPS, t + 1.05);
      env.gain.linearRampToValueAtTime(0, t + 1.12);

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(0.65, t);

      osc.connect(env);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(env);
      env.connect(this._dryBus);
      env.connect(wet);
      wet.connect(this._wetBus);

      osc.start(t);
      shimmer.start(t);
      osc.stop(t + 1.15);
      shimmer.stop(t + 1.15);
      osc.onended = () => safeDisconnect([osc, shimmer, shimmerGain, env, wet]);
    }
  }

  /**
   * Warm, luminous cosmic chord resolution for game victory.
   */
  playVictory() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const root = SCALES[SCALES.length - 1].musicRoot; // C3 (130.81 Hz)

    // Expansive luminous Cmaj9(add13) cosmic resolution
    const chordRatios = [1, 1.5, 2, 2.5, 3, 3.75, 4.5, 6];
    for (let i = 0; i < chordRatios.length; i++) {
      const t = now + i * 0.11;
      const freq = root * chordRatios[i];

      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime((i % 2 === 0 ? -1 : 1) * (3 + i), t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(2800, t + 1.1);
      filter.frequency.exponentialRampToValueAtTime(900, t + 3.8);

      const env = ctx.createGain();
      const peak = i < 2 ? 0.11 : 0.065;
      env.gain.setValueAtTime(EPS, t);
      env.gain.exponentialRampToValueAtTime(peak, t + 0.55);
      env.gain.exponentialRampToValueAtTime(peak * 0.65, t + 2.0);
      env.gain.exponentialRampToValueAtTime(EPS, t + 4.1);
      env.gain.linearRampToValueAtTime(0, t + 4.25);

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(0.75, t);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this._dryBus);
      env.connect(wet);
      wet.connect(this._wetBus);

      osc.start(t);
      osc.stop(t + 4.3);
      osc.onended = () => safeDisconnect([osc, filter, env, wet]);
    }

    // Gentle high celestial sparkle tail
    const sparkleRatios = [4, 5, 6, 8];
    for (let i = 0; i < sparkleRatios.length; i++) {
      const t = now + 0.65 + i * 0.22;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(root * sparkleRatios[i], t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(EPS, t);
      env.gain.exponentialRampToValueAtTime(0.055, t + 0.04);
      env.gain.exponentialRampToValueAtTime(EPS, t + 1.8);
      env.gain.linearRampToValueAtTime(0, t + 1.9);

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(0.85, t);

      osc.connect(env);
      env.connect(this._dryBus);
      env.connect(wet);
      wet.connect(this._wetBus);

      osc.start(t);
      osc.stop(t + 1.95);
      osc.onended = () => safeDisconnect([osc, env, wet]);
    }
  }

  /**
   * Sizzling molten launch pop + warm hiss when spitting lava.
   */
  playLavaSpit(level = 1) {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const lvl = Math.max(1, Math.min(4, Number(level) || 1));
    const jitter = 0.95 + Math.random() * 0.1;

    // 1. Molten liquid launch pop (snappy upward flick -> warm drop)
    const popOsc = ctx.createOscillator();
    popOsc.type = 'triangle';
    const startHz = (240 + lvl * 22) * jitter;
    popOsc.frequency.setValueAtTime(startHz, now);
    popOsc.frequency.exponentialRampToValueAtTime(startHz * 1.9, now + 0.018);
    popOsc.frequency.exponentialRampToValueAtTime(105, now + 0.125);

    const popFilter = ctx.createBiquadFilter();
    popFilter.type = 'lowpass';
    popFilter.frequency.setValueAtTime(1900 + lvl * 220, now);
    popFilter.frequency.exponentialRampToValueAtTime(340, now + 0.13);
    popFilter.Q.setValueAtTime(4.6, now);

    const popGain = ctx.createGain();
    const popPeak = Math.min(0.28, 0.19 + lvl * 0.022);
    popGain.gain.setValueAtTime(EPS, now);
    popGain.gain.exponentialRampToValueAtTime(popPeak, now + 0.01);
    popGain.gain.exponentialRampToValueAtTime(EPS, now + 0.135);
    popGain.gain.linearRampToValueAtTime(0, now + 0.15);

    popOsc.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(this._dryBus);

    popOsc.start(now);
    popOsc.stop(now + 0.155);
    popOsc.onended = () => safeDisconnect([popOsc, popFilter, popGain]);

    // 2. Warm sizzling molten hiss
    if (this._noiseBuffer) {
      const hissSrc = ctx.createBufferSource();
      hissSrc.buffer = this._noiseBuffer;

      const hissHp = ctx.createBiquadFilter();
      hissHp.type = 'highpass';
      hissHp.frequency.setValueAtTime(780, now);

      const hissBp = ctx.createBiquadFilter();
      hissBp.type = 'bandpass';
      hissBp.frequency.setValueAtTime((2800 + lvl * 240) * jitter, now);
      hissBp.frequency.exponentialRampToValueAtTime(920, now + 0.18 + lvl * 0.02);
      hissBp.Q.setValueAtTime(1.6, now);

      const hissDur = 0.19 + lvl * 0.025;
      const hissGain = ctx.createGain();
      const hissPeak = Math.min(0.22, 0.14 + lvl * 0.02);
      hissGain.gain.setValueAtTime(EPS, now);
      hissGain.gain.exponentialRampToValueAtTime(hissPeak, now + 0.014);
      hissGain.gain.exponentialRampToValueAtTime(EPS, now + hissDur);
      hissGain.gain.linearRampToValueAtTime(0, now + hissDur + 0.015);

      const hissWet = ctx.createGain();
      hissWet.gain.setValueAtTime(0.25, now);

      hissSrc.connect(hissHp);
      hissHp.connect(hissBp);
      hissBp.connect(hissGain);
      hissGain.connect(this._dryBus);
      hissGain.connect(hissWet);
      hissWet.connect(this._wetBus);

      hissSrc.start(now, Math.random() * 0.4, hissDur + 0.02);
      hissSrc.onended = () =>
        safeDisconnect([hissSrc, hissHp, hissBp, hissGain, hissWet]);
    }
  }

  /**
   * Satisfying sizzling shrink pitch-drop when a lava spit shrinks a predator.
   */
  playShrinkHit() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const jitter = 0.96 + Math.random() * 0.08;

    // 1. Elastic descending shrink pitch-drop
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sine';
    oscB.type = 'triangle';
    oscA.frequency.setValueAtTime(740 * jitter, now);
    oscA.frequency.exponentialRampToValueAtTime(195 * jitter, now + 0.21);
    oscB.frequency.setValueAtTime(1110 * jitter, now);
    oscB.frequency.exponentialRampToValueAtTime(290 * jitter, now + 0.19);

    const oscBGain = ctx.createGain();
    oscBGain.gain.setValueAtTime(0.35, now);

    const shrinkFilter = ctx.createBiquadFilter();
    shrinkFilter.type = 'lowpass';
    shrinkFilter.frequency.setValueAtTime(2600, now);
    shrinkFilter.frequency.exponentialRampToValueAtTime(420, now + 0.22);
    shrinkFilter.Q.setValueAtTime(4.0, now);

    const shrinkGain = ctx.createGain();
    shrinkGain.gain.setValueAtTime(EPS, now);
    shrinkGain.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
    shrinkGain.gain.exponentialRampToValueAtTime(EPS, now + 0.23);
    shrinkGain.gain.linearRampToValueAtTime(0, now + 0.25);

    const shrinkWet = ctx.createGain();
    shrinkWet.gain.setValueAtTime(0.32, now);

    oscA.connect(shrinkFilter);
    oscB.connect(oscBGain);
    oscBGain.connect(shrinkFilter);
    shrinkFilter.connect(shrinkGain);
    shrinkGain.connect(this._dryBus);
    shrinkGain.connect(shrinkWet);
    shrinkWet.connect(this._wetBus);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + 0.26);
    oscB.stop(now + 0.26);
    oscA.onended = () =>
      safeDisconnect([oscA, oscB, oscBGain, shrinkFilter, shrinkGain, shrinkWet]);

    // 2. Crisp molten sizzle burst on impact
    if (this._noiseBuffer) {
      const sizzleSrc = ctx.createBufferSource();
      sizzleSrc.buffer = this._noiseBuffer;

      const sizzleFilter = ctx.createBiquadFilter();
      sizzleFilter.type = 'bandpass';
      sizzleFilter.frequency.setValueAtTime(3400, now);
      sizzleFilter.frequency.exponentialRampToValueAtTime(1250, now + 0.14);
      sizzleFilter.Q.setValueAtTime(1.8, now);

      const sizzleGain = ctx.createGain();
      sizzleGain.gain.setValueAtTime(EPS, now);
      sizzleGain.gain.exponentialRampToValueAtTime(0.17, now + 0.008);
      sizzleGain.gain.exponentialRampToValueAtTime(EPS, now + 0.145);
      sizzleGain.gain.linearRampToValueAtTime(0, now + 0.16);

      sizzleSrc.connect(sizzleFilter);
      sizzleFilter.connect(sizzleGain);
      sizzleGain.connect(this._dryBus);

      sizzleSrc.start(now, Math.random() * 0.5, 0.17);
      sizzleSrc.onended = () => safeDisconnect([sizzleSrc, sizzleFilter, sizzleGain]);
    }
  }

  /**
   * Fluid whoosh + resonant water/air push wave when using pulse dash.
   */
  playPulseDash(level = 1) {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const lvl = Math.max(1, Math.min(4, Number(level) || 1));

    // 1. Fluid air/water whoosh
    if (this._noiseBuffer) {
      const whooshSrc = ctx.createBufferSource();
      whooshSrc.buffer = this._noiseBuffer;

      const whooshFilter = ctx.createBiquadFilter();
      whooshFilter.type = 'bandpass';
      whooshFilter.frequency.setValueAtTime(380, now);
      whooshFilter.frequency.exponentialRampToValueAtTime(1850 + lvl * 220, now + 0.09);
      whooshFilter.frequency.exponentialRampToValueAtTime(520, now + 0.28);
      whooshFilter.Q.setValueAtTime(2.1, now);

      const whooshGain = ctx.createGain();
      const whooshPeak = Math.min(0.26, 0.17 + lvl * 0.022);
      whooshGain.gain.setValueAtTime(EPS, now);
      whooshGain.gain.exponentialRampToValueAtTime(whooshPeak, now + 0.055);
      whooshGain.gain.exponentialRampToValueAtTime(EPS, now + 0.29);
      whooshGain.gain.linearRampToValueAtTime(0, now + 0.31);

      const whooshWet = ctx.createGain();
      whooshWet.gain.setValueAtTime(0.4, now);

      whooshSrc.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(this._dryBus);
      whooshGain.connect(whooshWet);
      whooshWet.connect(this._wetBus);

      whooshSrc.start(now, Math.random() * 0.35, 0.32);
      whooshSrc.onended = () =>
        safeDisconnect([whooshSrc, whooshFilter, whooshGain, whooshWet]);
    }

    // 2. Resonant fluid push wave
    const waveOsc = ctx.createOscillator();
    const harmOsc = ctx.createOscillator();
    waveOsc.type = 'sine';
    harmOsc.type = 'triangle';
    waveOsc.frequency.setValueAtTime(175, now);
    waveOsc.frequency.exponentialRampToValueAtTime(370 + lvl * 35, now + 0.085);
    waveOsc.frequency.exponentialRampToValueAtTime(210, now + 0.24);

    harmOsc.frequency.setValueAtTime(350, now);
    harmOsc.frequency.exponentialRampToValueAtTime(740 + lvl * 70, now + 0.085);
    harmOsc.frequency.exponentialRampToValueAtTime(420, now + 0.24);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.2, now);

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(1500 + lvl * 180, now);
    waveFilter.Q.setValueAtTime(2.6, now);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(EPS, now);
    waveGain.gain.exponentialRampToValueAtTime(0.18, now + 0.032);
    waveGain.gain.exponentialRampToValueAtTime(EPS, now + 0.25);
    waveGain.gain.linearRampToValueAtTime(0, now + 0.27);

    const waveWet = ctx.createGain();
    waveWet.gain.setValueAtTime(0.45, now);

    waveOsc.connect(waveFilter);
    harmOsc.connect(harmGain);
    harmGain.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(this._dryBus);
    waveGain.connect(waveWet);
    waveWet.connect(this._wetBus);

    waveOsc.start(now);
    harmOsc.start(now);
    waveOsc.stop(now + 0.28);
    harmOsc.stop(now + 0.28);
    waveOsc.onended = () =>
      safeDisconnect([waveOsc, harmOsc, harmGain, waveFilter, waveGain, waveWet]);
  }

  /**
   * Gentle ascending two-note warm chime when regaining a life droplet.
   */
  playHeal() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseFreq = airyRootFreq(SCALES[this.scaleIndex].musicRoot);
    const notes = [
      { ratio: 1.5, offset: 0, peak: 0.085, decay: 0.72 },
      { ratio: 2.0, offset: 0.115, peak: 0.1, decay: 1.05 },
    ];

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const t = now + n.offset;
      const freq = Math.min(1800, baseFreq * n.ratio);

      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      osc.type = 'sine';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      overtone.frequency.setValueAtTime(freq * 2, t);

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.16, t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(EPS, t);
      env.gain.exponentialRampToValueAtTime(n.peak, t + 0.018);
      env.gain.exponentialRampToValueAtTime(EPS, t + n.decay);
      env.gain.linearRampToValueAtTime(0, t + n.decay + 0.03);

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(0.62, t);

      osc.connect(env);
      overtone.connect(overtoneGain);
      overtoneGain.connect(env);
      env.connect(this._dryBus);
      env.connect(wet);
      wet.connect(this._wetBus);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + n.decay + 0.04);
      overtone.stop(t + n.decay + 0.04);
      osc.onended = () => safeDisconnect([osc, overtone, overtoneGain, env, wet]);
    }
  }

  /**
   * Ultra-soft crystalline whisper when a story dialogue card appears.
   */
  playStoryChime() {
    if (!this._canPlaySfx()) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseFreq = airyRootFreq(SCALES[this.scaleIndex].musicRoot);
    const notes = [
      { freq: Math.min(2000, baseFreq * 2), offset: 0, peak: 0.042 },
      { freq: Math.min(2400, baseFreq * 3), offset: 0.07, peak: 0.03 },
    ];

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const t = now + n.offset;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(EPS, t);
      env.gain.exponentialRampToValueAtTime(n.peak, t + 0.045);
      env.gain.exponentialRampToValueAtTime(EPS, t + 1.3);
      env.gain.linearRampToValueAtTime(0, t + 1.38);

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(0.85, t);

      osc.connect(env);
      env.connect(this._dryBus);
      env.connect(wet);
      wet.connect(this._wetBus);

      osc.start(t);
      osc.stop(t + 1.4);
      osc.onended = () => safeDisconnect([osc, env, wet]);
    }

    // Tiny airy whisper shimmer
    if (this._noiseBuffer) {
      const airSrc = ctx.createBufferSource();
      airSrc.buffer = this._noiseBuffer;

      const airHp = ctx.createBiquadFilter();
      airHp.type = 'highpass';
      airHp.frequency.setValueAtTime(2400, now);

      const airGain = ctx.createGain();
      airGain.gain.setValueAtTime(EPS, now);
      airGain.gain.exponentialRampToValueAtTime(0.012, now + 0.06);
      airGain.gain.exponentialRampToValueAtTime(EPS, now + 0.24);
      airGain.gain.linearRampToValueAtTime(0, now + 0.26);

      const airWet = ctx.createGain();
      airWet.gain.setValueAtTime(0.7, now);

      airSrc.connect(airHp);
      airHp.connect(airGain);
      airGain.connect(this._dryBus);
      airGain.connect(airWet);
      airWet.connect(this._wetBus);

      airSrc.start(now, Math.random() * 0.4, 0.28);
      airSrc.onended = () => safeDisconnect([airSrc, airHp, airGain, airWet]);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal graph & synthesis helpers
  // ---------------------------------------------------------------------------

  _canPlaySfx() {
    if (!this.started || !this.ctx || this.muted) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      return false;
    }
    return this.ctx.state === 'running';
  }

  _buildGraph() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Master output chain: dry/wet -> compressor -> pauseGain -> masterGain -> destination
    this._compressor = ctx.createDynamicsCompressor();
    this._compressor.threshold.setValueAtTime(-16, now);
    this._compressor.knee.setValueAtTime(18, now);
    this._compressor.ratio.setValueAtTime(3.0, now);
    this._compressor.attack.setValueAtTime(0.006, now);
    this._compressor.release.setValueAtTime(0.18, now);

    this._pauseGain = ctx.createGain();
    this._pauseGain.gain.setValueAtTime(this._paused ? PAUSED_VOLUME : 1.0, now);

    this._masterGain = ctx.createGain();
    this._masterGain.gain.setValueAtTime(this.muted ? 0 : MASTER_VOLUME, now);

    this._dryBus = ctx.createGain();
    this._dryBus.gain.setValueAtTime(1.0, now);

    this._wetBus = ctx.createGain();
    this._wetBus.gain.setValueAtTime(0.88, now);

    this._dryBus.connect(this._compressor);
    this._compressor.connect(this._pauseGain);
    this._pauseGain.connect(this._masterGain);
    this._masterGain.connect(ctx.destination);

    // High-pass the wet bus at 220Hz so reverb and delay tails stay crystalline and hum-free
    const wetHighpass = ctx.createBiquadFilter();
    wetHighpass.type = 'highpass';
    wetHighpass.frequency.setValueAtTime(220, now);
    this._wetBus.connect(wetHighpass);

    // Lush airy reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = this._createReverbImpulse(2.6, 2.5);

    const reverbFilter = ctx.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.setValueAtTime(2800, now);

    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.56, now);

    wetHighpass.connect(convolver);
    convolver.connect(reverbFilter);
    reverbFilter.connect(reverbGain);
    reverbGain.connect(this._compressor);

    // Warm dual-tap stereo-like filtered delay for plucked arpeggios
    const delayA = ctx.createDelay(1.0);
    const delayB = ctx.createDelay(1.0);
    delayA.delayTime.setValueAtTime(0.34, now);
    delayB.delayTime.setValueAtTime(0.51, now);

    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(1850, now);

    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.35, now);

    const delayOut = ctx.createGain();
    delayOut.gain.setValueAtTime(0.32, now);

    wetHighpass.connect(delayA);
    delayA.connect(delayFilter);
    delayFilter.connect(delayB);
    delayB.connect(delayFeedback);
    delayFeedback.connect(delayA);

    delayA.connect(delayOut);
    delayB.connect(delayOut);
    delayOut.connect(this._compressor);
  }

  _createNoiseBuffer(durationSec) {
    const ctx = this.ctx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _createReverbImpulse(durationSec, decay) {
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Soft fade-in over first ~15ms avoids metallic impulse attack
        const fadeIn = Math.min(1, i / (sampleRate * 0.015));
        const env = Math.pow(1 - t, decay) * fadeIn;
        channelData[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  /**
   * Schedule sparse, chill melodic kalimba / harp / Rhodes arpeggio phrases
   * separated by generous breathing space and delay tails.
   */
  _scheduleNextPhrase(delayMs) {
    if (this._phraseTimer !== null) {
      clearTimeout(this._phraseTimer);
    }
    const wait = typeof delayMs === 'number' ? delayMs : 3000 + Math.random() * 2600;
    this._phraseTimer = setTimeout(() => {
      this._phraseTimer = null;
      const phraseSpanMs = this._playMelodicPhrase();
      // Leave plenty of quiet breathing space after the phrase completes
      this._scheduleNextPhrase(phraseSpanMs + 2800 + Math.random() * 2600);
    }, wait);
  }

  _playMelodicPhrase() {
    if (!this.started || !this.ctx || this.muted || this._paused) return 0;
    if (this.ctx.state !== 'running') return 0;

    const now = this.ctx.currentTime;
    const baseRoot = airyRootFreq(SCALES[this.scaleIndex].musicRoot);
    const profile = TIMBRE_PROFILES[this.scaleIndex];

    const roll = Math.random();
    let indices;
    if (roll < 0.34) {
      // Single serene floating note
      const idx = Math.floor(Math.random() * LYDIAN_SCALE_RATIOS.length);
      indices = [idx];
    } else if (roll < 0.66) {
      // Gentle two-note interval
      const pat = ARPEGGIO_PATTERNS[Math.floor(Math.random() * ARPEGGIO_PATTERNS.length)];
      indices = pat.slice(0, 2);
    } else {
      // Lush 3-to-4 note arpeggio phrase
      indices = ARPEGGIO_PATTERNS[Math.floor(Math.random() * ARPEGGIO_PATTERNS.length)];
    }

    let offsetSec = 0;
    for (let i = 0; i < indices.length; i++) {
      const ratio = LYDIAN_SCALE_RATIOS[indices[i] % LYDIAN_SCALE_RATIOS.length];
      const freq = Math.min(2200, baseRoot * ratio);
      // Slight velocity contour so phrases feel human and delicate
      const velocity = 0.8 + Math.random() * 0.25 - i * 0.04;
      this._triggerPluckNote(now + offsetSec, freq, profile, Math.max(0.55, velocity));
      offsetSec += 0.29 + Math.random() * 0.19;
    }

    return Math.round(offsetSec * 1000);
  }

  _triggerPluckNote(startTime, freq, profile, velocity = 1.0) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    const lp = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const wet = ctx.createGain();

    hp.type = 'highpass';
    hp.frequency.setValueAtTime(220, startTime);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(profile.pluckFilterHz, startTime);
    lp.Q.setValueAtTime(0.7, startTime);

    let decaySec = 1.65;
    if (profile.pluckStyle === 'kalimba') {
      // Plucked kalimba tine: pure sine body + brief wooden/metallic upper partial
      osc.type = 'sine';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      overtone.frequency.setValueAtTime(freq * 3, startTime);

      overtoneGain.gain.setValueAtTime(0.18 * velocity, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(EPS, startTime + 0.075);

      const peak = 0.062 * velocity;
      env.gain.setValueAtTime(EPS, startTime);
      env.gain.exponentialRampToValueAtTime(peak, startTime + 0.01);
      env.gain.exponentialRampToValueAtTime(EPS, startTime + 1.6);
      env.gain.linearRampToValueAtTime(0, startTime + 1.68);
      decaySec = 1.72;
    } else if (profile.pluckStyle === 'rhodes') {
      // Warm Rhodes / mellow electric tine
      osc.type = 'triangle';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      overtoneGain.gain.setValueAtTime(0.16 * velocity, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(0.03 * velocity, startTime + 0.35);

      const peak = 0.068 * velocity;
      env.gain.setValueAtTime(EPS, startTime);
      env.gain.exponentialRampToValueAtTime(peak, startTime + 0.012);
      env.gain.exponentialRampToValueAtTime(EPS, startTime + 1.45);
      env.gain.linearRampToValueAtTime(0, startTime + 1.54);
      decaySec = 1.58;
    } else {
      // Ethereal plucked harp
      osc.type = 'sine';
      overtone.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      overtone.frequency.setValueAtTime(freq * 2, startTime);
      overtone.detune.setValueAtTime(5, startTime);

      overtoneGain.gain.setValueAtTime(0.15 * velocity, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(EPS, startTime + 0.45);

      const peak = 0.056 * velocity;
      env.gain.setValueAtTime(EPS, startTime);
      env.gain.exponentialRampToValueAtTime(peak, startTime + 0.016);
      env.gain.exponentialRampToValueAtTime(EPS, startTime + 2.15);
      env.gain.linearRampToValueAtTime(0, startTime + 2.25);
      decaySec = 2.3;
    }

    wet.gain.setValueAtTime(profile.pluckWet, startTime);

    osc.connect(hp);
    overtone.connect(overtoneGain);
    overtoneGain.connect(hp);
    hp.connect(lp);
    lp.connect(env);
    env.connect(this._dryBus);
    env.connect(wet);
    wet.connect(this._wetBus);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + decaySec);
    overtone.stop(startTime + decaySec);
    osc.onended = () => safeDisconnect([osc, overtone, overtoneGain, hp, lp, env, wet]);
  }

  /**
   * Schedule occasional, ultra-soft shimmering breath swells that fade gently
   * in and out with long silent rests in between — zero continuous hum/drone.
   */
  _scheduleNextBreath(delayMs) {
    if (this._breathTimer !== null) {
      clearTimeout(this._breathTimer);
    }
    const wait = typeof delayMs === 'number' ? delayMs : 6000 + Math.random() * 4500;
    this._breathTimer = setTimeout(() => {
      this._breathTimer = null;
      const swellDurationMs = this._triggerBreathSwell();
      this._scheduleNextBreath(swellDurationMs + 5500 + Math.random() * 4500);
    }, wait);
  }

  _triggerBreathSwell() {
    if (!this.started || !this.ctx || this.muted || this._paused) return 0;
    if (this.ctx.state !== 'running') return 0;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseRoot = airyRootFreq(SCALES[this.scaleIndex].musicRoot);
    const profile = TIMBRE_PROFILES[this.scaleIndex];

    const attackSec = 3.2 + Math.random() * 1.1;
    const releaseSec = 3.6 + Math.random() * 1.4;
    const totalSec = attackSec + releaseSec;

    // Dedicated 260Hz high-pass filter ensures ZERO bass buzz or hum
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(BREATH_HIGHPASS_HZ, now);
    hp.Q.setValueAtTime(0.7, now);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(profile.breathLowpassHz * 0.75, now);
    lp.frequency.exponentialRampToValueAtTime(profile.breathLowpassHz, now + attackSec);
    lp.frequency.exponentialRampToValueAtTime(profile.breathLowpassHz * 0.7, now + totalSec);

    const peakGain = Math.min(BREATH_MAX_GAIN, profile.breathPeak);
    const env = ctx.createGain();
    env.gain.setValueAtTime(EPS, now);
    env.gain.exponentialRampToValueAtTime(peakGain, now + attackSec);
    env.gain.exponentialRampToValueAtTime(EPS, now + totalSec);
    env.gain.linearRampToValueAtTime(0, now + totalSec + 0.08);

    const wet = ctx.createGain();
    wet.gain.setValueAtTime(profile.breathWet, now);

    hp.connect(lp);
    lp.connect(env);
    env.connect(this._dryBus);
    env.connect(wet);
    wet.connect(this._wetBus);

    const createdNodes = [hp, lp, env, wet];
    const ratios = profile.breathRatios;
    for (let i = 0; i < ratios.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 1 ? 'triangle' : 'sine';
      const freq = Math.max(BREATH_HIGHPASS_HZ * 1.15, Math.min(2400, baseRoot * ratios[i]));
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((i % 2 === 0 ? -1 : 1) * (4 + i * 2), now);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(i === 0 ? 0.45 : i === 1 ? 0.32 : 0.23, now);

      osc.connect(voiceGain);
      voiceGain.connect(hp);

      osc.start(now);
      osc.stop(now + totalSec + 0.12);
      createdNodes.push(osc, voiceGain);

      if (i === 0) {
        osc.onended = () => safeDisconnect(createdNodes);
      }
    }

    return Math.round(totalSec * 1000);
  }

  _triggerThrum(startTime, startFreq, endFreq, peakGain, duration) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(EPS, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.028);
    gain.gain.exponentialRampToValueAtTime(EPS, startTime + duration);
    gain.gain.linearRampToValueAtTime(0, startTime + duration + 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._dryBus);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.025);
    osc.onended = () => safeDisconnect([osc, filter, gain]);
  }
}

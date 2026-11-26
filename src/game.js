import {
  BASE_SIZE,
  SCALE_FACTOR,
  MAX_SIZE,
  NUM_SCALES,
  SCALES,
  sizeToProgress,
  scaleIndexToStartSize,
  getBlendedPalette,
  formatScientificSize,
  rgbString,
} from './scales.js';
import { SoundEngine } from './audio.js';
import { LavaBlob } from './blob.js';
import { EcosystemManager } from './entities.js';
import { ParticleSystem } from './particles.js';
import { StoryManager } from './story.js';
import { CutsceneManager } from './cutscenes.js';

const STATE = {
  TITLE: 'title',
  CUTSCENE: 'cutscene',
  PLAYING: 'playing',
  PAUSED: 'paused',
  DEFEAT: 'defeat',
  VICTORY: 'victory',
};

const HEAL_PREY_THRESHOLD = 6;
const HEAL_TIME_THRESHOLD = 8.0;
const BITES_STORAGE_KEY = 'charlie_bites_per_scale';
const DIFFICULTY_STORAGE_KEY = 'charlie_difficulty';
const CUTSCENES_STORAGE_KEY = 'charlie_cutscenes_enabled';

const DIFFICULTY_DESCRIPTIONS = {
  toddler: 'Sans danger · Idéal dès 3 ans : Charlie rebondit doucement sans jamais perdre !',
  chill: 'Rythme doux, prédateurs esquivables et 3 gouttelettes de vie qui se régénèrent.',
  wild: 'Chasse intense : prédateurs plus vifs, proies agiles et réflexes affûtés !',
};

class GlooGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // UI Elements (super-minimal HUD; health is diegetic via Charlie's 3 tethered droplets)
    this.hud = document.getElementById('hud');
    this.hudScaleName = document.getElementById('hud-scale-name');
    this.hudSizeLabel = document.getElementById('hud-size-label');
    this.hudProgressFill = document.getElementById('hud-progress-fill');
    this.progressTrack = this.hud.querySelector('.progress-track');
    this.dangerVignette = document.getElementById('danger-vignette');

    this.powersBar = document.getElementById('powers-bar');
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.btnPowerSpit = document.getElementById('btn-power-spit');
    this.btnPowerDash = document.getElementById('btn-power-dash');
    this.badgePowerSpit = document.getElementById('badge-power-spit');
    this.badgePowerDash = document.getElementById('badge-power-dash');

    this.sliderBites = document.getElementById('slider-bites');
    this.sliderBitesVal = document.getElementById('slider-bites-val');
    this.toggleCutscenes = document.getElementById('toggle-cutscenes');
    this.diffPills = Array.from(document.querySelectorAll('.diff-pill[data-diff]'));
    this.diffDesc = document.getElementById('diff-desc');

    this.cutsceneUI = document.getElementById('cutscene-ui');
    this.cutsceneChapter = document.getElementById('cutscene-chapter');
    this.cutsceneText = document.getElementById('cutscene-text');
    this.cutsceneDots = document.getElementById('cutscene-dots');
    this.btnCutsceneSkip = document.getElementById('btn-cutscene-skip');

    this.scaleBanner = document.getElementById('scale-banner');
    this.bannerEyebrow = document.getElementById('banner-eyebrow');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSub = document.getElementById('banner-sub');

    this.touchHint = document.getElementById('touch-hint');

    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayPause = document.getElementById('overlay-pause');
    this.overlayOptions = document.getElementById('overlay-options');
    this.overlayDefeat = document.getElementById('overlay-defeat');
    this.overlayVictory = document.getElementById('overlay-victory');
    this._optionsReturnOverlay = null;

    this.btnAudio = document.getElementById('btn-audio');
    this.iconSoundOn = document.getElementById('icon-sound-on');
    this.iconSoundOff = document.getElementById('icon-sound-off');

    // Core systems
    this.audio = new SoundEngine();
    this.blob = new LavaBlob(0, 0, BASE_SIZE);
    this.ecosystem = new EcosystemManager();
    this.particles = new ParticleSystem();
    this.cutscenes = new CutsceneManager({
      onCue: (cue) => {
        if (cue === 'scale') this.audio.playScaleUp?.();
        else if (cue === 'victory') this.audio.playVictory?.();
        else this.audio.playStoryChime?.();
      },
    });
    this.storyMoveTimer = 0;
    this.story = new StoryManager({
      onShow: () => {
        this.storyMoveTimer = 0;
        this.audio.playStoryChime?.();
      },
      onDismiss: (key) => {
        this.storyMoveTimer = 0;
        if (this.transition.active && key === `scale_${this.transition.toScale}`) {
          this.dismissScaleTransition();
        }
      },
    });

    // Growth pacing, difficulty & cutscene settings (persisted in localStorage, synced between Title & Pause)
    this.bitesPerScale = this._loadBitesPerScale();
    this.difficulty = this._loadDifficulty();
    this.cutscenesEnabled = this._loadCutscenesEnabled();
    this._syncBitesUI();
    this._syncCutscenesUI();

    // Viewport, Mobile Detection & Adaptive Performance Scaler
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this._detectMobile();
    this.perfTier = 0;
    this.dprCap = this.isMobile ? 1.35 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this._perfAvgMs = 16.67;
    this._perfSlowTime = 0;
    this._perfCooldown = 0;

    this.ecosystem.setMobileMode(this.isMobile);
    this.particles.configure({ isMobile: this.isMobile });

    // Reusable render & DOM caches (zero per-frame allocations / thrashing)
    this._viewBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, zoom: 1 };
    this._bgGrad = null;
    this._bgGradKey = '';
    this._horizonGrad = null;
    this._horizonGradH = 0;
    this._hudCache = { scaleName: '', sizeLabel: '', pctStr: '', ariaPct: '' };
    this._cdCache = { spitStr: '', spitOn: false, dashStr: '', dashOn: false };

    this.camera = {
      x: 0,
      y: 0,
      zoom: 2.8,
      shake: 0,
    };

    // Pointer / Multi-Touch state (tracked by movePointerId so 2nd finger powers never interrupt steering)
    this.pointer = {
      active: false,
      isTouch: false,
      movePointerId: null,
      screenX: this.width * 0.5,
      screenY: this.height * 0.5,
      worldX: 0,
      worldY: 0,
      rippleAlpha: 0,
    };

    // Translucent bottom-left virtual joystick state
    this.joystick = {
      active: false,
      pointerId: null,
      centerX: 0,
      centerY: 0,
      maxRadius: 36,
      dx: 0,
      dy: 0,
    };

    // Diegetic Vitality (Charlie's 3 tethered trailing lava-lamp droplets; 0 = vulnerable, next hit = defeat)
    this.maxHealth = 3;
    this.health = 3;
    this.healCounter = 0;
    this.noDamageTimer = 0;

    // Cinematic Story-Veiled Scale Transition state
    this.transition = {
      active: false,
      phase: 'idle', // 'in' | 'hold' | 'out' | 'idle'
      timer: 0,
      guard: 0,
      alpha: 0,
      fromScale: 0,
      toScale: 0,
      swapped: false,
    };

    // Evolving Multi-Touch Powers
    this.powerLevel = 1;
    this.powers = {
      spit: { cd: 0, maxCd: 2.6 },
      dash: { cd: 0, maxCd: 3.0 },
    };
    this.projectiles = [];
    this.setDifficulty(this.difficulty, false);

    // Game State
    this.state = STATE.TITLE;
    this.time = 0;
    this.playTime = 0;
    this.eatenCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.currentScaleIndex = 0;
    this.highestScaleIndex = 0;
    this.bannerTimer = 0;
    this.hintMovedTime = 0;
    this.hintDismissed = false;
    this.victoryShown = false;
    this.freeRoam = false;

    this.lastFrameTime = performance.now();

    this.resize();
    this.bindEvents();
    this.ecosystem.reset(this.blob);
    this.loop(this.lastFrameTime);
  }

  _detectMobile() {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse || Math.min(window.innerWidth, window.innerHeight) <= 540;
  }

  _stepDownPerformance() {
    if (this.perfTier >= 2) return;
    this.perfTier += 1;
    this._perfSlowTime = 0;
    this._perfCooldown = 2.0;
    this._perfAvgMs = 16.67;

    if (this.perfTier === 1) {
      this.dprCap = Math.min(this.dprCap, 1.0);
      this.particles.setMoteCount(this.isMobile ? 16 : 28);
      this.ecosystem.setPopulationCap(this.isMobile ? 22 : 34);
    } else {
      this.dprCap = Math.min(this.dprCap, 0.85);
      this.particles.setMoteCount(this.isMobile ? 10 : 18);
      this.ecosystem.setPopulationCap(this.isMobile ? 18 : 28);
    }
    this.resize();
  }

  _loadBitesPerScale() {
    try {
      const saved = parseInt(localStorage.getItem(BITES_STORAGE_KEY), 10);
      if (Number.isFinite(saved) && saved >= 3 && saved <= 50) {
        return saved;
      }
    } catch {
      // Ignore storage access errors in restricted webviews
    }
    return 18;
  }

  _loadDifficulty() {
    try {
      const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
      if (saved && DIFFICULTY_DESCRIPTIONS[saved]) {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'chill';
  }

  _syncBitesUI() {
    const str = String(this.bitesPerScale);
    if (this.sliderBites && this.sliderBitesVal) {
      this.sliderBites.value = str;
      this.sliderBitesVal.textContent = str;
    }
  }

  _loadCutscenesEnabled() {
    try {
      const saved = localStorage.getItem(CUTSCENES_STORAGE_KEY);
      if (saved === 'false') return false;
    } catch {
      // Ignore storage errors
    }
    return true;
  }

  _syncCutscenesUI() {
    if (this.toggleCutscenes) this.toggleCutscenes.checked = this.cutscenesEnabled;
  }

  openOptions(fromOverlay) {
    this._optionsReturnOverlay = fromOverlay || null;
    this._syncBitesUI();
    this._syncCutscenesUI();
    this.hideAllOverlays();
    if (this.overlayOptions) this.overlayOptions.classList.add('visible');
  }

  closeOptions() {
    if (this.overlayOptions) this.overlayOptions.classList.remove('visible');
    if (this._optionsReturnOverlay) {
      this._optionsReturnOverlay.classList.add('visible');
      this._optionsReturnOverlay = null;
    }
  }

  enterFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      try {
        const p2 = req.call(el);
        if (p2 && typeof p2.catch === 'function') p2.catch(() => {});
      } catch {
        // Ignore if unsupported
      }
    }
  }

  toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try {
          const p = exit.call(document);
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch {
          // Ignore
        }
      }
    } else {
      this.enterFullscreen();
    }
  }

  setCutscenesEnabled(enabled) {
    this.cutscenesEnabled = Boolean(enabled);
    this._syncCutscenesUI();
    try {
      localStorage.setItem(CUTSCENES_STORAGE_KEY, this.cutscenesEnabled ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }

  _syncCutsceneCaption() {
    const shot = this.cutscenes.getCurrentShot();
    if (!shot) return;
    if (this.cutsceneChapter) this.cutsceneChapter.textContent = shot.chapter;
    if (this.cutsceneText) this.cutsceneText.textContent = shot.text;
    if (this.cutsceneDots) {
      let html = '';
      for (let i = 0; i < shot.totalShots; i++) {
        html += `<span class="cutscene-dot${i === shot.shotNumber - 1 ? ' active' : ''}"></span>`;
      }
      this.cutsceneDots.innerHTML = html;
    }
  }

  playCutscene(cutsceneId, onComplete) {
    if (!this.cutscenesEnabled) {
      onComplete?.();
      return;
    }
    this.hideAllOverlays();
    this.story.hideImmediate();
    this.scaleBanner.classList.remove('show');
    this.bannerTimer = 0;
    this.hud.classList.add('hidden');
    this.powersBar.classList.add('hidden');
    if (this.joystickZone) this.joystickZone.classList.add('hidden');
    this.touchHint.classList.add('hidden');
    this.dangerVignette.classList.remove('active');
    this.resetJoystick();
    this.pointer.active = false;
    this.pointer.movePointerId = null;

    this.state = STATE.CUTSCENE;
    if (this.cutsceneUI) this.cutsceneUI.classList.remove('hidden');

    this.cutscenes.play(cutsceneId, () => {
      if (this.cutsceneUI) this.cutsceneUI.classList.add('hidden');
      this.lastFrameTime = performance.now();
      onComplete?.();
    });
    this._syncCutsceneCaption();
  }

  setDifficulty(mode, persist = true) {
    if (!DIFFICULTY_DESCRIPTIONS[mode]) mode = 'chill';
    this.difficulty = mode;
    this.ecosystem.setDifficulty(mode);
    if (persist) {
      try {
        localStorage.setItem(DIFFICULTY_STORAGE_KEY, mode);
      } catch {
        // Ignore storage errors
      }
    }
    for (const btn of this.diffPills) {
      const isMatch = btn.dataset.diff === mode;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    }
    if (this.diffDesc) {
      this.diffDesc.textContent = DIFFICULTY_DESCRIPTIONS[mode];
    }
    // In toddler mode, keep all 3 droplets topped up & playful fast powers
    if (mode === 'toddler') {
      this.health = this.maxHealth;
      this.blob.setHealthDroplets(this.health);
      this.powers.spit.maxCd = 1.4;
      this.powers.dash.maxCd = 1.6;
      this.updateDangerState();
    } else {
      this.powers.spit.maxCd = 2.6;
      this.powers.dash.maxCd = 3.0;
    }
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    if (this.perfTier === 0) {
      const mobile = this._detectMobile();
      if (mobile !== this.isMobile) {
        this.isMobile = mobile;
        this.dprCap = mobile ? 1.0 : 2;
        this.ecosystem.setMobileMode(mobile);
        this.particles.configure({ isMobile: mobile });
      }
    }
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._bgGradKey = '';
    this._horizonGradH = 0;
  }

  getTargetPlayerScreenRadius() {
    const minDim = Math.min(this.width, this.height);
    return Math.max(22, Math.min(34, minDim * 0.056));
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Unified Multi-Touch & Mouse Pointer Controls
    // Tracks touch steering by movePointerId so 2nd-finger power taps never interrupt steering.
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== STATE.PLAYING) return;
      if (this.transition.active && (this.transition.phase === 'in' || this.transition.phase === 'hold')) {
        if (this.transition.guard <= 0) {
          this.dismissScaleTransition();
        }
      }
      if (e.pointerType === 'touch') {
        if (this.pointer.movePointerId !== null) return;
        this.pointer.movePointerId = e.pointerId;
        this.pointer.isTouch = true;
      } else {
        this.pointer.isTouch = false;
      }
      this.pointer.active = true;
      this.pointer.screenX = e.clientX;
      this.pointer.screenY = e.clientY;
      this.pointer.rippleAlpha = 1;
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.state !== STATE.PLAYING) return;
      if (e.pointerType === 'touch') {
        if (e.pointerId !== this.pointer.movePointerId) return;
        this.pointer.screenX = e.clientX;
        this.pointer.screenY = e.clientY;
        if (this.pointer.active) {
          this.pointer.rippleAlpha = Math.max(this.pointer.rippleAlpha, 0.75);
        }
      } else {
        this.pointer.screenX = e.clientX;
        this.pointer.screenY = e.clientY;
        this.pointer.active = true;
        this.pointer.isTouch = false;
      }
    });

    const releasePointer = (e) => {
      if (this.joystick.active && e.pointerId === this.joystick.pointerId) {
        this.resetJoystick();
      }
      if (e.pointerType === 'touch' && e.pointerId === this.pointer.movePointerId) {
        this.pointer.active = false;
        this.pointer.movePointerId = null;
      }
    };
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    window.addEventListener('pointermove', (e) => {
      if (this.joystick.active && e.pointerId === this.joystick.pointerId) {
        this._updateJoystickFromClient(e.clientX, e.clientY);
      }
    });

    if (this.joystickZone) {
      this.joystickZone.addEventListener('pointerdown', (e) => {
        if (this.state !== STATE.PLAYING) return;
        e.preventDefault();
        e.stopPropagation();
        if (this.transition.active && (this.transition.phase === 'in' || this.transition.phase === 'hold')) {
          if (this.transition.guard <= 0) this.dismissScaleTransition();
          return;
        }
        if (this.joystick.pointerId !== null) return;
        const rect = this.joystickBase.getBoundingClientRect();
        this.joystick.centerX = rect.left + rect.width * 0.5;
        this.joystick.centerY = rect.top + rect.height * 0.5;
        this.joystick.maxRadius = Math.max(28, rect.width * 0.34);
        this.joystick.pointerId = e.pointerId;
        this.joystick.active = true;
        this.joystickZone.classList.add('active');
        this._updateJoystickFromClient(e.clientX, e.clientY);
      });
    }
    this.canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') {
        this.pointer.active = false;
      }
    });

    // Multi-Touch Power Buttons (pointerdown + stopPropagation so steering finger stays active)
    this.btnPowerSpit.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activateSpit();
    });

    this.btnPowerDash.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activateDash();
    });

    // Synced "Bouchées par monde" sliders (Title + Pause)
    const onBitesInput = (e) => {
      const val = Math.max(3, Math.min(50, parseInt(e.target.value, 10) || 18));
      this.bitesPerScale = val;
      this._syncBitesUI();
      try {
        localStorage.setItem(BITES_STORAGE_KEY, String(val));
      } catch {
        // Ignore storage errors
      }
    };
    if (this.sliderBites) this.sliderBites.addEventListener('input', onBitesInput);
    if (this.sliderBitesTitle) this.sliderBitesTitle.addEventListener('input', onBitesInput);

    // Difficulty selector pills (Title + Pause)
    for (const btn of this.diffPills) {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.diff;
        this.setDifficulty(mode, true);
        // Gentle preset suggestion on title screen when picking 3-year-old mode
        if (this.state === STATE.TITLE && mode === 'toddler' && this.bitesPerScale > 12) {
          this.bitesPerScale = 10;
          this._syncBitesUI();
        }
      });
    }

    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      this.enterFullscreen();
      this.audio.start();
      this.startNewJourney();
    });

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    document.getElementById('btn-pause').addEventListener('click', () => {
      if (this.state === STATE.PLAYING) this.setPaused(true);
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.enterFullscreen();
      if (this.state === STATE.PAUSED) this.setPaused(false);
    });

    document.getElementById('btn-restart-pause').addEventListener('click', () => {
      this.startNewJourney();
    });

    document.getElementById('btn-continue-scale').addEventListener('click', () => {
      this.continueAtCurrentScale();
    });

    document.getElementById('btn-restart-defeat').addEventListener('click', () => {
      this.startNewJourney();
    });

    document.getElementById('btn-freeroam').addEventListener('click', () => {
      this.freeRoam = true;
      this.hideAllOverlays();
      this.state = STATE.PLAYING;
      this.audio.setPaused(false);
      this.updateDangerState();
      this.story.trigger('victory');
    });

    document.getElementById('btn-restart-victory').addEventListener('click', () => {
      this.startNewJourney();
    });

    this.btnAudio.addEventListener('click', () => {
      this.audio.start();
      const muted = this.audio.toggleMute();
      this.iconSoundOn.classList.toggle('hidden', muted);
      this.iconSoundOff.classList.toggle('hidden', !muted);
    });

    // Cutscene mode toggle (inside Options overlay)
    if (this.toggleCutscenes) {
      this.toggleCutscenes.addEventListener('change', (e) => this.setCutscenesEnabled(e.target.checked));
    }

    // Dedicated Options overlay navigation
    const btnOptionsTitle = document.getElementById('btn-options-title');
    if (btnOptionsTitle) {
      btnOptionsTitle.addEventListener('click', () => this.openOptions(this.overlayTitle));
    }
    const btnOptionsPause = document.getElementById('btn-options-pause');
    if (btnOptionsPause) {
      btnOptionsPause.addEventListener('click', () => this.openOptions(this.overlayPause));
    }
    const btnOptionsClose = document.getElementById('btn-options-close');
    if (btnOptionsClose) {
      btnOptionsClose.addEventListener('click', () => this.closeOptions());
    }

    // Cutscene advance on tap/click + skip button
    if (this.cutsceneUI) {
      this.cutsceneUI.addEventListener('pointerdown', (e) => {
        if (this.state !== STATE.CUTSCENE) return;
        if (e.target === this.btnCutsceneSkip) return;
        e.preventDefault();
        if (this.cutscenes.advance()) {
          this._syncCutsceneCaption();
        }
      });
    }
    if (this.btnCutsceneSkip) {
      this.btnCutsceneSkip.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.state === STATE.CUTSCENE) {
          this.cutscenes.skip();
        }
      });
    }

    // Keyboard shortcuts (Pause, Mute, Cutscene advance, and Desktop Powers: A = Crachat de Lave, E = Onde & Élan)
    window.addEventListener('keydown', (e) => {
      const k = e.key ? e.key.toLowerCase() : '';
      if (this.state === STATE.CUTSCENE) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          if (this.cutscenes.advance()) this._syncCutsceneCaption();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          this.cutscenes.skip();
        }
        return;
      }
      if (e.code === 'Escape' || e.code === 'Space') {
        if (this.transition.active && (this.transition.phase === 'in' || this.transition.phase === 'hold')) {
          if (this.transition.guard <= 0) {
            e.preventDefault();
            this.dismissScaleTransition();
          }
          return;
        }
        if (this.state === STATE.PLAYING) {
          e.preventDefault();
          this.setPaused(true);
        } else if (this.state === STATE.PAUSED) {
          e.preventDefault();
          this.setPaused(false);
        }
      } else if (k === 'm') {
        this.btnAudio.click();
      } else if (this.state === STATE.PLAYING && !e.repeat) {
        if (k === 'a') {
          e.preventDefault();
          this.activateSpit();
        } else if (k === 'e' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          e.preventDefault();
          this.activateDash();
        }
      }
    });
  }

  hideAllOverlays() {
    this.overlayTitle.classList.remove('visible');
    this.overlayPause.classList.remove('visible');
    if (this.overlayOptions) this.overlayOptions.classList.remove('visible');
    this.overlayDefeat.classList.remove('visible');
    this.overlayVictory.classList.remove('visible');
  }

  getPowerLevel(scaleIndex) {
    if (scaleIndex >= 4) return 3;
    if (scaleIndex >= 2) return 2;
    return 1;
  }

  updatePowerLevelUI(level, animate = false) {
    const label = `Nv.${level}`;
    this.badgePowerSpit.textContent = label;
    this.badgePowerDash.textContent = label;

    if (animate) {
      for (const btn of [this.btnPowerSpit, this.btnPowerDash]) {
        btn.classList.remove('evolved');
        void btn.offsetWidth;
        btn.classList.add('evolved');
      }
    }
  }

  updatePowerCooldownUI() {
    const spitRatio = this.powers.spit.maxCd > 0 ? Math.max(0, this.powers.spit.cd / this.powers.spit.maxCd) : 0;
    const dashRatio = this.powers.dash.maxCd > 0 ? Math.max(0, this.powers.dash.cd / this.powers.dash.maxCd) : 0;

    const spitStr = spitRatio.toFixed(2);
    const spitOn = this.powers.spit.cd > 0.01;
    if (spitStr !== this._cdCache.spitStr) {
      this._cdCache.spitStr = spitStr;
      this.btnPowerSpit.style.setProperty('--cd', spitStr);
    }
    if (spitOn !== this._cdCache.spitOn) {
      this._cdCache.spitOn = spitOn;
      this.btnPowerSpit.classList.toggle('on-cooldown', spitOn);
    }

    const dashStr = dashRatio.toFixed(2);
    const dashOn = this.powers.dash.cd > 0.01;
    if (dashStr !== this._cdCache.dashStr) {
      this._cdCache.dashStr = dashStr;
      this.btnPowerDash.style.setProperty('--cd', dashStr);
    }
    if (dashOn !== this._cdCache.dashOn) {
      this._cdCache.dashOn = dashOn;
      this.btnPowerDash.classList.toggle('on-cooldown', dashOn);
    }
  }

  /**
   * Diegetic danger state: when Charlie has 0 tethered droplets left,
   * show pulsing crimson aura around Charlie + soft pulsing crimson screen-edge vignette.
   */
  updateDangerState() {
    const isCritical = this.state === STATE.PLAYING && this.health <= 0;
    this.dangerVignette.classList.toggle('active', isCritical);
    this.blob.lowHealth = isCritical;
  }

  /**
   * Smoothly regenerate +1 tethered lava droplet (after 6 prey eaten OR 8s without damage).
   */
  regenerateDroplet() {
    if (this.health >= this.maxHealth) return;
    this.health = Math.min(this.maxHealth, this.health + 1);
    this.healCounter = 0;
    this.noDamageTimer = 0;
    this.blob.setHealthDroplets(this.health);
    this.audio.playHeal?.();
    this.particles.spawnHealSparkle(this.blob.x, this.blob.y, this.blob.size);
    this.updateDangerState();
  }

  /**
   * Trigger a cinematic story-veiled scale transition (~0.85s luminous mist in,
   * dissolves old scale & seeds fresh new-scale species, holds softly until tapped,
   * then parts smoothly over ~0.95s).
   */
  startScaleTransition(fromScale, toScale, unlockedPowerLvl = 0) {
    this.ecosystem.dissolveOldScale(toScale);
    this.ecosystem.seedScale(this.blob, toScale);
    this.projectiles.length = 0;

    if (this.cutscenesEnabled) {
      this.playCutscene(`scale_${toScale}`, () => {
        this.hud.classList.remove('hidden');
        this.powersBar.classList.remove('hidden');
        if (this.joystickZone) this.joystickZone.classList.remove('hidden');
        this.state = STATE.PLAYING;
        this.blob.invulnTimer = Math.max(this.blob.invulnTimer, 1.4);
        this.camera.zoom = this.getTargetPlayerScreenRadius() / this.blob.size;
        this.updateDangerState();
        if (unlockedPowerLvl > 0) {
          this.story.trigger(`power_lv${unlockedPowerLvl}`);
        }
      });
      return;
    }

    // Cinématiques OFF: seamless transition with brief grace period
    this.blob.invulnTimer = Math.max(this.blob.invulnTimer, 1.2);
    this.showScaleBanner(toScale);
  }

  dismissScaleTransition() {
    if (!this.transition.active) return;
    if (this.transition.phase !== 'in' && this.transition.phase !== 'hold') return;

    if (!this.transition.swapped) {
      this.ecosystem.seedScale(this.blob, this.transition.toScale);
      this.transition.swapped = true;
    }
    this.transition.phase = 'out';
    this.transition.timer = 0;
    this.blob.invulnTimer = Math.max(this.blob.invulnTimer, 1.0);

    if (this.story.active && this.story.currentKey === `scale_${this.transition.toScale}`) {
      this.story.dismiss(true);
    }
  }

  updateTransition(dt) {
    if (!this.transition.active) return;

    if (this.transition.guard > 0) {
      this.transition.guard = Math.max(0, this.transition.guard - dt);
    }

    if (this.transition.phase === 'in') {
      this.transition.timer += dt;
      const t = Math.min(1, this.transition.timer / 0.85);
      // Smooth ease-in-out swell up to translucent luminous mist peak
      this.transition.alpha = 0.68 * (t * t * (3 - 2 * t));
      if (t >= 1) {
        if (!this.transition.swapped) {
          this.ecosystem.seedScale(this.blob, this.transition.toScale);
          this.transition.swapped = true;
        }
        this.transition.phase = 'hold';
        this.transition.timer = 0;
      }
    } else if (this.transition.phase === 'hold') {
      // Gentle breathing mist — never auto-dismisses; waits for user tap!
      this.transition.timer += dt;
      this.transition.alpha = 0.62 + 0.06 * Math.sin(this.transition.timer * 2.4);
    } else if (this.transition.phase === 'out') {
      this.transition.timer += dt;
      const t = Math.min(1, this.transition.timer / 0.95);
      this.transition.alpha = 0.64 * Math.pow(1 - t, 2);
      if (t >= 1) {
        this.transition.active = false;
        this.transition.phase = 'idle';
        this.transition.alpha = 0;
      }
    }
  }

  _updateJoystickFromClient(clientX, clientY) {
    const rawDx = clientX - this.joystick.centerX;
    const rawDy = clientY - this.joystick.centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const maxR = this.joystick.maxRadius;
    const clamped = Math.min(dist, maxR);
    const nx = dist > 0.001 ? rawDx / dist : 0;
    const ny = dist > 0.001 ? rawDy / dist : 0;
    const mag = clamped / maxR;

    this.joystick.dx = mag > 0.06 ? nx * mag : 0;
    this.joystick.dy = mag > 0.06 ? ny * mag : 0;

    if (this.joystickKnob) {
      const kx = nx * clamped;
      const ky = ny * clamped;
      this.joystickKnob.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0)`;
    }
  }

  resetJoystick() {
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
    if (this.joystickZone) this.joystickZone.classList.remove('active');
    if (this.joystickKnob) this.joystickKnob.style.transform = 'translate3d(0, 0, 0)';
  }

  startNewJourney() {
    this.hideAllOverlays();
    this.hud.classList.remove('hidden');
    this.powersBar.classList.remove('hidden');
    if (this.joystickZone) this.joystickZone.classList.remove('hidden');
    this.resetJoystick();

    this.blob.reset(0, 0, BASE_SIZE);
    this.particles.reset();
    this.ecosystem.reset(this.blob);
    this.story.reset();
    this.projectiles.length = 0;

    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.zoom = this.getTargetPlayerScreenRadius() / BASE_SIZE;
    this.camera.shake = 0;

    this.pointer.active = false;
    this.pointer.movePointerId = null;

    this.playTime = 0;
    this.eatenCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.currentScaleIndex = 0;
    this.highestScaleIndex = 0;
    this.victoryShown = false;
    this.freeRoam = false;
    this.health = this.maxHealth;
    this.healCounter = 0;
    this.noDamageTimer = 0;
    this.blob.setHealthDroplets(this.maxHealth);

    this.transition.active = false;
    this.transition.phase = 'idle';
    this.transition.alpha = 0;

    this.powerLevel = 1;
    this.powers.spit.cd = 0;
    this.powers.dash.cd = 0;
    this.hintMovedTime = 0;
    this.hintDismissed = false;

    this.audio.setScale(0);
    this.audio.setPaused(false);
    this.updateHUD(0);
    this.updateDangerState();
    this.updatePowerLevelUI(1, false);
    this.updatePowerCooldownUI();

    const beginPlay = () => {
      this.hud.classList.remove('hidden');
      this.powersBar.classList.remove('hidden');
      if (this.joystickZone) this.joystickZone.classList.remove('hidden');
      this.touchHint.classList.remove('hidden', 'fade-out');
      this.state = STATE.PLAYING;
      this.showScaleBanner(0);
      if (!this.cutscenesEnabled) {
        this.story.trigger('start');
      }
    };

    if (this.cutscenesEnabled) {
      this.cutscenes.preloadAll();
      this.playCutscene('intro', beginPlay);
    } else {
      beginPlay();
    }
  }

  continueAtCurrentScale() {
    this.hideAllOverlays();
    this.powersBar.classList.remove('hidden');
    if (this.joystickZone) this.joystickZone.classList.remove('hidden');
    this.resetJoystick();
    const startSize = scaleIndexToStartSize(this.currentScaleIndex) * 1.15;
    this.blob.reset(this.camera.x, this.camera.y, startSize);
    this.blob.invulnTimer = 2.0;
    this.health = this.maxHealth;
    this.healCounter = 0;
    this.noDamageTimer = 0;
    this.blob.setHealthDroplets(this.maxHealth);

    this.transition.active = false;
    this.transition.phase = 'idle';
    this.transition.alpha = 0;

    this.powers.spit.cd = 0;
    this.powers.dash.cd = 0;
    this.projectiles.length = 0;
    this.pointer.active = false;
    this.pointer.movePointerId = null;

    this.ecosystem.reset(this.blob);
    this.camera.zoom = this.getTargetPlayerScreenRadius() / startSize;
    this.state = STATE.PLAYING;
    this.audio.setPaused(false);

    const lvl = this.getPowerLevel(this.currentScaleIndex);
    this.powerLevel = lvl;
    this.updateDangerState();
    this.updatePowerLevelUI(lvl, false);
    this.updatePowerCooldownUI();
  }

  setPaused(paused) {
    if (paused) {
      this.state = STATE.PAUSED;
      this.pointer.active = false;
      this.pointer.movePointerId = null;
      this.audio.setPaused(true);
      this.dangerVignette.classList.remove('active');
      document.getElementById('pause-eaten').textContent = String(this.eatenCount);
      document.getElementById('pause-scale').textContent = SCALES[this.currentScaleIndex].name;
      if (this.sliderBites && this.sliderBitesVal) {
        this.sliderBites.value = String(this.bitesPerScale);
        this.sliderBitesVal.textContent = String(this.bitesPerScale);
      }
      this.overlayPause.classList.add('visible');
    } else {
      this.hideAllOverlays();
      this.state = STATE.PLAYING;
      this.audio.setPaused(false);
      this.updateDangerState();
      this.lastFrameTime = performance.now();
    }
  }

  showScaleBanner(scaleIndex) {
    const sc = SCALES[scaleIndex];
    if (!sc) return;
    this.bannerEyebrow.textContent = `ÉCHELLE ${sc.roman}`;
    this.bannerTitle.textContent = sc.poeticTitle;
    this.bannerSub.textContent = sc.unitSubtitle;
    this.scaleBanner.classList.add('show');
    this.bannerTimer = 3.6;
  }

  updateHUD(progress) {
    const idx = Math.min(NUM_SCALES - 1, Math.floor(progress));
    const pct = Math.max(0, Math.min(100, (progress / NUM_SCALES) * 100));
    const scaleName = SCALES[idx].name;
    const sizeLabel = formatScientificSize(progress);
    const pctStr = `${pct.toFixed(1)}%`;
    const ariaPct = String(Math.round(pct));

    if (scaleName !== this._hudCache.scaleName) {
      this._hudCache.scaleName = scaleName;
      this.hudScaleName.textContent = scaleName;
    }
    if (sizeLabel !== this._hudCache.sizeLabel) {
      this._hudCache.sizeLabel = sizeLabel;
      this.hudSizeLabel.textContent = sizeLabel;
    }
    if (pctStr !== this._hudCache.pctStr) {
      this._hudCache.pctStr = pctStr;
      this.hudProgressFill.style.width = pctStr;
    }
    if (ariaPct !== this._hudCache.ariaPct) {
      this._hudCache.ariaPct = ariaPct;
      this.progressTrack.setAttribute('aria-valuenow', ariaPct);
    }
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  triggerDefeat() {
    this.state = STATE.DEFEAT;
    this.pointer.active = false;
    this.pointer.movePointerId = null;
    this.dangerVignette.classList.remove('active');
    this.blob.lowHealth = false;
    this.transition.active = false;
    this.transition.alpha = 0;
    this.story.hideImmediate();
    this.audio.setPaused(true);
    this.overlayDefeat.classList.add('visible');
  }

  triggerVictory() {
    this.victoryShown = true;
    this.pointer.active = false;
    this.pointer.movePointerId = null;
    this.resetJoystick();
    this.dangerVignette.classList.remove('active');
    this.blob.lowHealth = false;
    this.transition.active = false;
    this.transition.alpha = 0;
    this.story.hideImmediate();
    document.getElementById('victory-eaten').textContent = String(this.eatenCount);
    document.getElementById('victory-time').textContent = this.formatDuration(this.playTime);

    const showVictoryCard = () => {
      this.state = STATE.VICTORY;
      this.audio.playVictory();
      this.overlayVictory.classList.add('visible');
    };

    if (this.cutscenesEnabled) {
      this.playCutscene('victory', showVictoryCard);
    } else {
      showVictoryCard();
    }
  }

  screenToWorld(sx, sy) {
    return {
      x: this.camera.x + (sx - this.width * 0.5) / this.camera.zoom,
      y: this.camera.y + (sy - this.height * 0.5) / this.camera.zoom,
    };
  }

  activateSpit() {
    if (this.state !== STATE.PLAYING || this.powers.spit.cd > 0) return;

    const lvl = this.powerLevel;
    const maxCd = lvl === 3 ? 2.8 : lvl === 2 ? 2.4 : 2.6;
    this.powers.spit.maxCd = maxCd;
    this.powers.spit.cd = maxCd;
    this.updatePowerCooldownUI();

    const size = this.blob.size;
    // Aim toward nearest predator within range, else fire along facing direction
    let aimAngle = this.blob.angle;
    let bestDistSq = Math.pow(size * 11.5, 2);
    const entities = this.ecosystem.entities;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.alive || e.size <= size * 0.96) continue;
      const dx = e.x - this.blob.x;
      const dy = e.y - this.blob.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        aimAngle = Math.atan2(dy, dx);
      }
    }

    const spawnOffset = size * 0.95;
    if (lvl === 1) {
      // Nv.1: Single fast molten lava glob (28% predator shrink)
      this.projectiles.push({
        x: this.blob.x + Math.cos(aimAngle) * spawnOffset,
        y: this.blob.y + Math.sin(aimAngle) * spawnOffset,
        vx: Math.cos(aimAngle) * size * 15.2,
        vy: Math.sin(aimAngle) * size * 15.2,
        radius: size * 0.28,
        life: 0,
        maxLife: 1.15,
        level: 1,
        isPlasma: false,
        aoeRadius: 0,
        shrinkFactor: 0.72,
        trailTimer: 0,
      });
    } else if (lvl === 2) {
      // Nv.2: 3-way magma fan (each glob shrinks predators by ~28%)
      const spread = [-0.22, 0, 0.22];
      for (let i = 0; i < spread.length; i++) {
        const a = aimAngle + spread[i];
        this.projectiles.push({
          x: this.blob.x + Math.cos(a) * spawnOffset,
          y: this.blob.y + Math.sin(a) * spawnOffset,
          vx: Math.cos(a) * size * 15.6,
          vy: Math.sin(a) * size * 15.6,
          radius: size * 0.25,
          life: 0,
          maxLife: 1.2,
          level: 2,
          isPlasma: false,
          aoeRadius: 0,
          shrinkFactor: 0.72,
          trailTimer: 0,
        });
      }
    } else {
      // Nv.3: Explosive solar plasma orb with AoE shrink (34% shrink in blast radius!)
      this.projectiles.push({
        x: this.blob.x + Math.cos(aimAngle) * spawnOffset,
        y: this.blob.y + Math.sin(aimAngle) * spawnOffset,
        vx: Math.cos(aimAngle) * size * 13.5,
        vy: Math.sin(aimAngle) * size * 13.5,
        radius: size * 0.44,
        life: 0,
        maxLife: 1.35,
        level: 3,
        isPlasma: true,
        aoeRadius: size * 3.8,
        shrinkFactor: 0.66,
        trailTimer: 0,
      });
    }

    this.blob.triggerSpit(aimAngle, lvl);
    this.audio.playLavaSpit?.(lvl);
    this.camera.shake = Math.min(6, this.camera.shake + 1.4 + lvl * 0.5);
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  activateDash() {
    if (this.state !== STATE.PLAYING || this.powers.dash.cd > 0) return;

    const lvl = this.powerLevel;
    const maxCd = lvl === 3 ? 2.6 : lvl === 2 ? 2.8 : 3.0;
    this.powers.dash.maxCd = maxCd;
    this.powers.dash.cd = maxCd;
    this.updatePowerCooldownUI();

    const size = this.blob.size;
    let dashAngle = this.blob.angle;
    if (this.pointer.active) {
      const dx = this.pointer.worldX - this.blob.x;
      const dy = this.pointer.worldY - this.blob.y;
      if (dx * dx + dy * dy > size * size * 0.16) {
        dashAngle = Math.atan2(dy, dx);
      }
    }

    const dashSpeed = size * (lvl === 3 ? 22.5 : lvl === 2 ? 18.5 : 14.5);
    this.blob.vx = Math.cos(dashAngle) * dashSpeed;
    this.blob.vy = Math.sin(dashAngle) * dashSpeed;
    this.blob.invulnTimer = Math.max(this.blob.invulnTimer, 0.26 + lvl * 0.06);
    this.blob.triggerDash(dashAngle, lvl);

    // Emit repelling shockwave that shoves nearby predators away
    const waveRadius = size * (lvl === 3 ? 7.8 : lvl === 2 ? 5.8 : 4.2);
    const pushForce = size * (lvl === 3 ? 17.0 : lvl === 2 ? 12.5 : 8.5);
    const entities = this.ecosystem.entities;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.alive || e.size <= size * 0.94) continue;
      const dx = e.x - this.blob.x;
      const dy = e.y - this.blob.y;
      const dist = Math.hypot(dx, dy);
      if (dist < waveRadius + e.size && dist > 0.001) {
        const falloff = 1 - Math.min(0.65, dist / (waveRadius + e.size) * 0.65);
        const nx = dx / dist;
        const ny = dy / dist;
        e.vx += nx * pushForce * falloff;
        e.vy += ny * pushForce * falloff;
        e.chaseTimer = 0;
      }
    }

    this.particles.spawnShockwave(this.blob.x, this.blob.y, size, waveRadius, lvl);
    this.audio.playDash?.(lvl);
    this.camera.shake = Math.min(9, this.camera.shake + 2.2 + lvl * 1.1);
    if (navigator.vibrate) {
      navigator.vibrate(18);
    }
  }

  updatePowers(dt) {
    let changed = false;
    if (this.powers.spit.cd > 0) {
      this.powers.spit.cd = Math.max(0, this.powers.spit.cd - dt);
      changed = true;
    }
    if (this.powers.dash.cd > 0) {
      this.powers.dash.cd = Math.max(0, this.powers.dash.cd - dt);
      changed = true;
    }
    if (changed) {
      this.updatePowerCooldownUI();
    }
  }

  _detonateProjectile(p, hitEntity = null) {
    const minShrunkSize = this.blob.size * 0.56;
    if (p.isPlasma) {
      // Nv.3 Solar plasma AoE shrink!
      const entities = this.ecosystem.entities;
      for (let j = 0; j < entities.length; j++) {
        const e = entities[j];
        if (!e.alive || e.size <= this.blob.size * 0.94) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= p.aoeRadius + e.size) {
          e.size = Math.max(minShrunkSize, e.size * p.shrinkFactor);
          const away = dist > 0.001 ? Math.atan2(dy, dx) : Math.atan2(p.vy, p.vx);
          const shove = this.blob.size * 6.5;
          e.vx += Math.cos(away) * shove;
          e.vy += Math.sin(away) * shove;
          e.chaseTimer = 0;
        }
      }
      this.particles.spawnLavaBurst(p.x, p.y, this.blob.size * 1.2, true);
      this.audio.playLavaHit?.(3);
      this.camera.shake = Math.min(9, this.camera.shake + 4.5);
    } else if (hitEntity) {
      hitEntity.size = Math.max(minShrunkSize, hitEntity.size * p.shrinkFactor);
      const impactAngle = Math.atan2(p.vy, p.vx);
      const shove = this.blob.size * 4.2;
      hitEntity.vx += Math.cos(impactAngle) * shove;
      hitEntity.vy += Math.sin(impactAngle) * shove;
      hitEntity.chaseTimer = 0;

      this.particles.spawnLavaBurst(p.x, p.y, hitEntity.size * 0.72, false);
      this.audio.playLavaHit?.(p.level);
      this.camera.shake = Math.min(7, this.camera.shake + 2.2);
    }
  }

  updateProjectiles(dt) {
    const entities = this.ecosystem.entities;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Subtle molten ember trail
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = p.isPlasma ? 0.035 : 0.055;
        this.particles._pushParticle({
          x: p.x + (Math.random() - 0.5) * p.radius * 0.6,
          y: p.y + (Math.random() - 0.5) * p.radius * 0.6,
          vx: -p.vx * 0.12,
          vy: -p.vy * 0.12,
          radius: p.radius * (p.isPlasma ? 0.42 : 0.36),
          color: p.isPlasma ? '#fde047' : '#ff9466',
          life: 0,
          maxLife: 0.24,
          drag: 4.0,
          twinkle: p.isPlasma,
          phase: Math.random() * Math.PI * 2,
        });
      }

      // Check impact against predators / near-predators
      let hit = null;
      for (let j = 0; j < entities.length; j++) {
        const e = entities[j];
        if (!e.alive || e.size <= this.blob.size * 0.94) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const reach = p.radius + e.size * 0.92;
        if (dx * dx + dy * dy <= reach * reach) {
          hit = e;
          break;
        }
      }

      if (hit) {
        this._detonateProjectile(p, hit);
        this.projectiles.splice(i, 1);
      } else if (p.life >= p.maxLife) {
        if (p.isPlasma) {
          this._detonateProjectile(p, null);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  drawProjectiles(ctx) {
    if (this.projectiles.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      const r = p.radius;
      const pulse = 0.9 + 0.12 * Math.sin(this.time * 18 + i);

      // Outer molten glow
      const glowR = r * (p.isPlasma ? 2.6 : 2.1) * pulse;
      const grad = ctx.createRadialGradient(p.x, p.y, r * 0.15, p.x, p.y, glowR);
      if (p.isPlasma) {
        grad.addColorStop(0, 'rgba(255, 252, 224, 0.95)');
        grad.addColorStop(0.35, 'rgba(253, 224, 71, 0.72)');
        grad.addColorStop(0.68, 'rgba(255, 118, 72, 0.28)');
        grad.addColorStop(1, 'rgba(255, 82, 64, 0)');
      } else {
        grad.addColorStop(0, 'rgba(255, 240, 195, 0.95)');
        grad.addColorStop(0.4, 'rgba(255, 148, 92, 0.65)');
        grad.addColorStop(1, 'rgba(255, 76, 68, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Core orb
      ctx.fillStyle = p.isPlasma ? '#fffbeb' : '#ffd185';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // Solar plasma corona ring for Nv.3
      if (p.isPlasma) {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
        ctx.lineWidth = r * 0.18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * (1.15 + 0.12 * Math.sin(this.time * 22)), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  update(dt) {
    this.time += dt;

    if (this.state === STATE.CUTSCENE) {
      this.cutscenes.update(dt);
      return;
    }

    // Gentle title screen ambient drift
    if (this.state === STATE.TITLE) {
      const targetX = Math.cos(this.time * 0.45) * 90;
      const targetY = Math.sin(this.time * 0.9) * 48;
      this.blob.update(dt, targetX, targetY, true, null, null, this.camera.zoom);
      const prevCamX = this.camera.x;
      const prevCamY = this.camera.y;
      this.camera.x += (this.blob.x - this.camera.x) * Math.min(1, dt * 3);
      this.camera.y += (this.blob.y - this.camera.y) * Math.min(1, dt * 3);
      this.camera.zoom = this.getTargetPlayerScreenRadius() / this.blob.size;
      const viewW = this.width / this.camera.zoom;
      const viewH = this.height / this.camera.zoom;
      this.ecosystem.update(dt, this.blob, viewW, viewH, 0);
      this.particles.update(dt, (this.camera.x - prevCamX) * this.camera.zoom, (this.camera.y - prevCamY) * this.camera.zoom, 0);
      return;
    }

    if (this.state !== STATE.PLAYING) {
      return;
    }

    this.story.update(dt);
    this.updateTransition(dt);

    // Pause action serenely while reading a world-transition story veil (waits for click/tap!)
    if (this.transition.active && (this.transition.phase === 'in' || this.transition.phase === 'hold')) {
      const targetZoom = this.getTargetPlayerScreenRadius() / this.blob.size;
      this.camera.zoom += (targetZoom - this.camera.zoom) * (1 - Math.exp(-dt * 2.5));
      this.particles.update(dt, 0, 0, 0);
      return;
    }

    this.playTime += dt;
    this.updatePowers(dt);

    // Passive droplet regeneration: 8 seconds without damage restores +1 tethered lava droplet
    if (this.health < this.maxHealth) {
      this.noDamageTimer += dt;
      if (this.noDamageTimer >= HEAL_TIME_THRESHOLD) {
        this.regenerateDroplet();
      }
    }

    // Banner fade-out
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.scaleBanner.classList.remove('show');
      }
    }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Pointer / Joystick steering
    let hasSteerTarget = this.pointer.active;
    if (this.joystick.active) {
      hasSteerTarget = Math.hypot(this.joystick.dx, this.joystick.dy) > 0.01;
      if (hasSteerTarget) {
        this.pointer.worldX = this.blob.x + this.joystick.dx * this.blob.size * 5.2;
        this.pointer.worldY = this.blob.y + this.joystick.dy * this.blob.size * 5.2;
      }
      if (!this.hintDismissed && hasSteerTarget) {
        this.hintMovedTime += dt;
        if (this.hintMovedTime > 1.5) {
          this.hintDismissed = true;
          this.touchHint.classList.add('fade-out');
          setTimeout(() => this.touchHint.classList.add('hidden'), 650);
        }
      }
      this.pointer.rippleAlpha = 0;
    } else {
      if (this.pointer.active) {
        this.pointer.rippleAlpha = Math.min(1, this.pointer.rippleAlpha + dt * 4);
        if (!this.hintDismissed) {
          this.hintMovedTime += dt;
          if (this.hintMovedTime > 1.8) {
            this.hintDismissed = true;
            this.touchHint.classList.add('fade-out');
            setTimeout(() => this.touchHint.classList.add('hidden'), 650);
          }
        }
      } else {
        this.pointer.rippleAlpha = Math.max(0, this.pointer.rippleAlpha - dt * 3.5);
      }

      // Convert pointer to world coordinates
      const worldPtr = this.screenToWorld(this.pointer.screenX, this.pointer.screenY);
      this.pointer.worldX = worldPtr.x;
      this.pointer.worldY = worldPtr.y;
    }

    const progress = sizeToProgress(this.blob.size);
    const viewW = this.width / this.camera.zoom;
    const viewH = this.height / this.camera.zoom;

    // Update ecosystem AI & get nearby threats/prey
    const ecoInfo = this.ecosystem.update(dt, this.blob, viewW, viewH, progress);
    const { nearestPrey, nearestPredator, predatorChasing } = ecoInfo;

    if (predatorChasing) {
      this.audio.playPredatorPulse();
    }

    // Update player fluid blob
    this.blob.update(
      dt,
      this.pointer.worldX,
      this.pointer.worldY,
      hasSteerTarget,
      nearestPrey,
      nearestPredator,
      this.camera.zoom
    );

    // Dismiss floating story card automatically after ~2.2s of active movement (stays open while still!)
    if (this.story.active && !this.transition.active) {
      const blobSpeed = Math.hypot(this.blob.vx, this.blob.vy);
      const isMoving = hasSteerTarget && blobSpeed > this.blob.size * 1.2;
      if (isMoving) {
        this.storyMoveTimer += dt;
        if (this.storyMoveTimer >= 2.2) {
          this.storyMoveTimer = 0;
          this.story.dismiss(true);
        }
      } else {
        this.storyMoveTimer = Math.max(0, this.storyMoveTimer - dt * 1.5);
      }
    } else {
      this.storyMoveTimer = 0;
    }

    // Update lava spit projectiles
    this.updateProjectiles(dt);

    // Resolve eating & predator collisions
    this.handleCollisions(progress);

    // Smooth logarithmic camera tracking & zoom
    const prevCamX = this.camera.x;
    const prevCamY = this.camera.y;
    const prevZoom = this.camera.zoom;

    const lookAheadX = this.blob.vx * 0.14;
    const lookAheadY = this.blob.vy * 0.14;
    const camLerp = 1 - Math.exp(-dt * 5.2);
    this.camera.x += (this.blob.x + lookAheadX - this.camera.x) * camLerp;
    this.camera.y += (this.blob.y + lookAheadY - this.camera.y) * camLerp;

    const targetZoom = this.getTargetPlayerScreenRadius() / this.blob.size;
    const zoomLerp = 1 - Math.exp(-dt * 2.8);
    this.camera.zoom += (targetZoom - this.camera.zoom) * zoomLerp;

    // Screen shake decay
    this.camera.shake = Math.max(0, this.camera.shake - dt * 28);

    // Update particles with camera parallax deltas
    const camDxScreen = (this.camera.x - prevCamX) * this.camera.zoom;
    const camDyScreen = (this.camera.y - prevCamY) * this.camera.zoom;
    const zoomDelta = (this.camera.zoom - prevZoom) / Math.max(0.0001, prevZoom);
    this.particles.update(dt, camDxScreen, camDyScreen, zoomDelta);

    // Check scale progression, cinematic veil transition, power evolution, & victory
    const newProgress = sizeToProgress(this.blob.size);
    const newScaleIdx = Math.min(NUM_SCALES - 1, Math.floor(newProgress));
    if (newScaleIdx !== this.currentScaleIndex) {
      const prevScaleIdx = this.currentScaleIndex;
      const ascending = newScaleIdx > prevScaleIdx;
      this.currentScaleIndex = newScaleIdx;
      this.audio.setScale(newScaleIdx);
      if (ascending && newScaleIdx > this.highestScaleIndex) {
        this.highestScaleIndex = newScaleIdx;
        this.audio.playScaleUp();

        const nextPowerLvl = this.getPowerLevel(newScaleIdx);
        let unlockedPowerLvl = 0;
        if (nextPowerLvl > this.powerLevel) {
          this.powerLevel = nextPowerLvl;
          this.updatePowerLevelUI(nextPowerLvl, true);
          this.audio.playPowerUnlock?.(nextPowerLvl);
          unlockedPowerLvl = nextPowerLvl;
        }

        if (this.cutscenesEnabled) {
          this.startScaleTransition(prevScaleIdx, newScaleIdx, unlockedPowerLvl);
        } else {
          const pal = getBlendedPalette(newProgress);
          this.particles.spawnScaleBurst(
            this.blob.x,
            this.blob.y,
            this.blob.size * 2.2,
            rgbString(pal.blobGlow)
          );
          this.startScaleTransition(prevScaleIdx, newScaleIdx, unlockedPowerLvl);
          if (unlockedPowerLvl > 0) {
            this.story.trigger(`power_lv${unlockedPowerLvl}`);
          }
        }
      }
    }

    if (!this.victoryShown && !this.freeRoam && this.blob.size >= MAX_SIZE) {
      this.triggerVictory();
    }

    this.updateHUD(newProgress);
  }

  handleCollisions(progress) {
    const entities = this.ecosystem.entities;
    const pal = getBlendedPalette(progress);

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (!e.alive) continue;

      const dx = e.x - this.blob.x;
      const dy = e.y - this.blob.y;
      const distSq = dx * dx + dy * dy;
      const reach = (this.blob.size + e.size) * 0.78;
      if (distSq > reach * reach) continue;

      // Edible prey
      if (e.size < this.blob.size * 0.94) {
        const preyAngle = Math.atan2(dy, dx);
        const preyRel = e.size / this.blob.size;
        const relIntensity = Math.min(1.5, Math.max(0.6, preyRel + 0.35));

        // Tunable logarithmic growth per bite ("Bouchées par monde")
        const nextSize = this.blob.size * Math.pow(SCALE_FACTOR, (preyRel / 0.62) / this.bitesPerScale);
        this.blob.size = this.freeRoam ? Math.min(MAX_SIZE * 1.6, nextSize) : Math.min(MAX_SIZE * 1.02, nextSize);

        this.eatenCount += 1;
        this.combo = Math.min(6, this.combo + 1);
        this.comboTimer = 1.9;

        // Eating 6 prey regenerates +1 tethered lava droplet
        if (this.health < this.maxHealth) {
          this.healCounter += 1;
          if (this.healCounter >= HEAL_PREY_THRESHOLD) {
            this.regenerateDroplet();
          }
        }

        this.blob.triggerChomp(preyAngle, relIntensity);
        this.particles.spawnEatBurst(
          e.x,
          e.y,
          e.size,
          e.species.color,
          e.species.accent,
          Math.round(8 + relIntensity * 6)
        );
        this.audio.playChomp(relIntensity, this.combo);
        this.camera.shake = Math.min(7, this.camera.shake + relIntensity * 2.1);

        if (navigator.vibrate) {
          navigator.vibrate(10);
        }

        this.ecosystem.removeEntity(e);
      } else if (e.size > this.blob.size * 1.06 && this.blob.invulnTimer <= 0) {
        const awayAngle = Math.atan2(-dy, -dx);

        // Toddler (3 ans) mode: harmless playful bounce, NEVER loses health or dies!
        if (this.difficulty === 'toddler') {
          const bounceSpeed = this.blob.size * 5.2;
          this.blob.vx = Math.cos(awayAngle) * bounceSpeed;
          this.blob.vy = Math.sin(awayAngle) * bounceSpeed;
          this.blob.invulnTimer = 0.55;
          this.particles.spawnShockwave(this.blob.x, this.blob.y, this.blob.size, this.blob.size * 3.4, 1);
          this.audio.playStoryChime?.();
          continue;
        }

        // Predator bite! Bursts 1 tethered lava droplet; if already at 0 droplets -> defeat!
        const knockSpeed = this.blob.size * 7.5;
        this.blob.vx = Math.cos(awayAngle) * knockSpeed;
        this.blob.vy = Math.sin(awayAngle) * knockSpeed;
        this.blob.triggerHurt(awayAngle);

        this.particles.spawnHurtBurst(
          this.blob.x,
          this.blob.y,
          this.blob.size,
          rgbString(pal.blobEdge)
        );
        this.audio.playBiteRecoil();
        this.camera.shake = 10;

        if (navigator.vibrate) {
          navigator.vibrate([24, 30, 24]);
        }

        if (this.health <= 0) {
          this.triggerDefeat();
          return;
        }

        this.health -= 1;
        this.healCounter = 0;
        this.noDamageTimer = 0;

        const poppedPos = this.blob.popHealthDroplet(this.health);
        this.particles.spawnHurtBurst(
          poppedPos.x,
          poppedPos.y,
          this.blob.size * 0.65,
          rgbString(pal.blobGlow)
        );

        const scaleFloor = scaleIndexToStartSize(this.currentScaleIndex) * 0.92;
        this.blob.size = Math.max(Math.max(BASE_SIZE, scaleFloor), this.blob.size * 0.92);
        this.updateDangerState();
      }
    }
  }

  /**
   * Draw distinct atmospheric background layers per scale with smooth crossfading.
   */
  _drawSingleScaleAtmosphere(ctx, scaleIdx, alpha, palette) {
    if (alpha <= 0.01) return;
    const w = this.width;
    const h = this.height;
    const t = this.time;
    const px = (this.camera.x * this.camera.zoom) * 0.08;
    const py = (this.camera.y * this.camera.zoom) * 0.08;
    const mobile = this.isMobile;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (scaleIdx === 0) {
      // Scale I — Quantique: soft drifting bioluminescent quantum haze (zero per-frame gradient allocations)
      const hazeCount = mobile ? 4 : 6;
      for (let i = 0; i < hazeCount; i++) {
        const bx = ((i * 223 - px * 0.4) % (w + 220) + (w + 220)) % (w + 220) - 110;
        const by = ((i * 157 - py * 0.4) % (h + 220) + (h + 220)) % (h + 220) - 110;
        const br = 55 + (i % 3) * 32 + Math.sin(t * 0.8 + i) * 10;
        const outerCol = i % 2 === 0 ? 'rgba(103, 232, 249, 0.028)' : 'rgba(253, 230, 138, 0.022)';
        const innerCol = i % 2 === 0 ? 'rgba(103, 232, 249, 0.032)' : 'rgba(253, 230, 138, 0.026)';
        ctx.fillStyle = outerCol;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = innerCol;
        ctx.beginPath();
        ctx.arc(bx, by, br * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scaleIdx === 1) {
      // Scale II — Microscopique: shimmering aquatic caustic light ribbons
      ctx.strokeStyle = 'rgba(134, 239, 172, 0.08)';
      ctx.lineWidth = 2.4;
      const ribbonCount = mobile ? 4 : 6;
      const xStep = mobile ? 64 : 48;
      for (let i = 0; i < ribbonCount; i++) {
        const yBase = ((i + 0.5) / ribbonCount) * h + Math.sin(t * 0.7 + i * 1.4) * 18;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += xStep) {
          const wave = Math.sin((x + px * 0.6) * 0.008 + t * 1.1 + i * 1.9) * 24;
          if (x === -20) ctx.moveTo(x, yBase + wave);
          else ctx.lineTo(x, yBase + wave);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(94, 234, 212, 0.05)';
      const bubbleCount = mobile ? 5 : 8;
      for (let i = 0; i < bubbleCount; i++) {
        const bx = ((i * 197 - px * 0.5) % (w + 160) + (w + 160)) % (w + 160) - 80;
        const by = ((i * 131 - py * 0.5) % (h + 160) + (h + 160)) % (h + 160) - 80;
        ctx.beginPath();
        ctx.arc(bx, by, 26 + (i % 3) * 18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scaleIdx === 2) {
      // Scale III — Sous-Bois: soft peripheral fern/leaf silhouettes + warm firefly bokeh
      ctx.fillStyle = 'rgba(10, 38, 26, 0.34)';
      const leafSpecs = [
        [0, 0, 0.55],
        [w, 0, 2.55],
        [0, h, -0.55],
        [w, h, -2.55],
      ];
      for (let i = 0; i < leafSpecs.length; i++) {
        const [lx, ly, rot] = leafSpecs[i];
        const sway = Math.sin(t * 0.8 + i * 1.5) * 0.05;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot + sway);
        ctx.beginPath();
        ctx.ellipse(90, 0, 120, 42, 0, 0, Math.PI * 2);
        ctx.ellipse(60, 46, 85, 28, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Warm golden-emerald forest bokeh
      const bokehCount = mobile ? 7 : 10;
      for (let i = 0; i < bokehCount; i++) {
        const bx = ((i * 211 - px * 0.45) % (w + 120) + (w + 120)) % (w + 120) - 60;
        const by = ((i * 149 - py * 0.45) % (h + 120) + (h + 120)) % (h + 120) - 60;
        const br = 18 + (i % 4) * 12;
        const pulse = 0.045 + 0.03 * Math.sin(t * 1.8 + i);
        ctx.fillStyle = i % 2 === 0
          ? `rgba(253, 224, 100, ${pulse.toFixed(3)})`
          : `rgba(74, 222, 128, ${pulse.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scaleIdx === 3) {
      // Scale IV — Nocturne: soft distant city light bokeh & subtle cached horizon glow
      if (!this._horizonGrad || this._horizonGradH !== h) {
        this._horizonGradH = h;
        const hg = ctx.createLinearGradient(0, h * 0.55, 0, h);
        hg.addColorStop(0, 'rgba(251, 191, 120, 0)');
        hg.addColorStop(1, 'rgba(251, 160, 90, 0.09)');
        this._horizonGrad = hg;
      }
      ctx.fillStyle = this._horizonGrad;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);

      const cityLights = mobile ? 10 : 16;
      for (let i = 0; i < cityLights; i++) {
        const bx = ((i * 173 - px * 0.4) % (w + 100) + (w + 100)) % (w + 100) - 50;
        const by = ((i * 113 - py * 0.4) % (h + 100) + (h + 100)) % (h + 100) - 50;
        const glow = 0.06 + 0.04 * Math.sin(t * 1.4 + i * 2.1);
        ctx.fillStyle = i % 3 === 0
          ? `rgba(147, 197, 253, ${glow.toFixed(3)})`
          : `rgba(253, 186, 116, ${glow.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(bx, by, 10 + (i % 3) * 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scaleIdx === 4) {
      // Scale V — Planétaire: crisp twinkling starfield + sweeping orbital arcs
      const starCount = mobile ? 22 : 36;
      for (let i = 0; i < starCount; i++) {
        const sx = ((i * 199 - px * 0.25) % w + w) % w;
        const sy = ((i * 137 - py * 0.25) % h + h) % h;
        const tw = 0.28 + 0.35 * Math.sin(t * (1.8 + (i % 5) * 0.4) + i * 1.7);
        ctx.fillStyle = `rgba(224, 242, 254, ${tw.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.9 + (i % 3) * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.075)';
      ctx.lineWidth = 1.1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.5, w * (0.28 * i), h * (0.18 * i), 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Scale VI — Cosmique: layered translucent cosmic nebula clouds + deep star clusters
      const clouds = [
        [0.24, 0.32, 0.34, 'rgba(244, 114, 182, 0.09)'],
        [0.74, 0.38, 0.38, 'rgba(56, 189, 248, 0.09)'],
        [0.52, 0.72, 0.36, 'rgba(251, 191, 36, 0.075)'],
      ];
      for (let i = 0; i < clouds.length; i++) {
        const [cxN, cyN, rN, col] = clouds[i];
        const cx = w * cxN + Math.sin(t * 0.25 + i * 2) * 24;
        const cy = h * cyN + Math.cos(t * 0.22 + i * 1.7) * 18;
        const rad = Math.max(w, h) * rN;
        const neb = ctx.createRadialGradient(cx, cy, rad * 0.05, cx, cy, rad);
        neb.addColorStop(0, col);
        neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = neb;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      const deepStars = mobile ? 26 : 42;
      for (let i = 0; i < deepStars; i++) {
        const sx = ((i * 223 - px * 0.2) % w + w) % w;
        const sy = ((i * 157 - py * 0.2) % h + h) % h;
        const tw = 0.25 + 0.4 * Math.sin(t * 2.2 + i * 1.3);
        ctx.fillStyle = i % 4 === 0
          ? `rgba(254, 240, 138, ${tw.toFixed(3)})`
          : `rgba(255, 255, 255, ${tw.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.85 + (i % 3) * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawScaleAtmosphere(ctx, progress, palette) {
    const clamped = Math.max(0, Math.min(NUM_SCALES - 0.0001, progress));
    const idx = Math.floor(clamped);
    const nextIdx = Math.min(NUM_SCALES - 1, idx + 1);
    const frac = clamped - idx;
    const blend = frac > 0.7 ? (frac - 0.7) / 0.3 : 0;

    this._drawSingleScaleAtmosphere(ctx, idx, 1 - blend, palette);
    if (blend > 0.01 && nextIdx !== idx) {
      this._drawSingleScaleAtmosphere(ctx, nextIdx, blend, palette);
    }
  }

  /**
   * Soft luminous mist/warp veil during cinematic story-veiled scale transitions.
   */
  drawTransitionVeil(ctx, palette) {
    if (!this.transition.active || this.transition.alpha <= 0.005) return;
    const w = this.width;
    const h = this.height;
    const a = this.transition.alpha;
    const targetScale = SCALES[this.transition.toScale] || palette.scale;
    const mote = targetScale.moteColor || palette.moteColor;
    const inner = targetScale.bgInner || palette.bgInner;

    ctx.save();
    const veilGrad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.08,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.78
    );
    veilGrad.addColorStop(0, rgbString(mote, a * 0.55));
    veilGrad.addColorStop(0.5, rgbString(inner, a * 0.82));
    veilGrad.addColorStop(1, rgbString(targetScale.bgOuter || palette.bgOuter, a * 0.92));
    ctx.fillStyle = veilGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle outward luminous warp rings
    ctx.strokeStyle = rgbString(mote, a * 0.42);
    ctx.lineWidth = 1.6;
    const maxR = Math.hypot(w, h) * 0.52;
    for (let i = 0; i < 3; i++) {
      const phase = ((this.time * 0.45 + i * 0.33) % 1);
      const r = maxR * (0.15 + phase * 0.85);
      ctx.globalAlpha = (1 - phase) * a * 0.55;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;

    if (this.state === STATE.CUTSCENE) {
      this.cutscenes.draw(ctx, this.width, this.height, this.time);
      return;
    }

    const progress = sizeToProgress(this.blob.size);
    const palette = getBlendedPalette(progress);

    // 1. Rich bioluminescent radial gradient background (cached when palette & viewport unchanged)
    const innerCol = rgbString(palette.bgInner);
    const outerCol = rgbString(palette.bgOuter);
    const bgKey = `${this.width}x${this.height}|${innerCol}|${outerCol}`;
    if (bgKey !== this._bgGradKey || !this._bgGrad) {
      this._bgGradKey = bgKey;
      const bgGrad = ctx.createRadialGradient(
        this.width * 0.5,
        this.height * 0.45,
        Math.min(this.width, this.height) * 0.05,
        this.width * 0.5,
        this.height * 0.5,
        Math.max(this.width, this.height) * 0.85
      );
      bgGrad.addColorStop(0, innerCol);
      bgGrad.addColorStop(1, outerCol);
      this._bgGrad = bgGrad;
    }
    ctx.fillStyle = this._bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 1b. Distinct atmospheric background layer per scale
    this.drawScaleAtmosphere(ctx, progress, palette);

    // 2. Ambient parallax background motes (screen space)
    this.particles.drawBackgroundMotes(ctx, this.width, this.height, palette, this.time);

    // 3. World-space camera transform
    ctx.save();
    let shakeX = 0;
    let shakeY = 0;
    if (this.camera.shake > 0.1) {
      shakeX = (Math.random() - 0.5) * this.camera.shake;
      shakeY = (Math.random() - 0.5) * this.camera.shake;
    }
    ctx.translate(this.width * 0.5 + shakeX, this.height * 0.5 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Compute world-space visible bounds for fast viewport culling & sub-5px LOD
    const halfViewW = (this.width * 0.5) / this.camera.zoom;
    const halfViewH = (this.height * 0.5) / this.camera.zoom;
    this._viewBounds.minX = this.camera.x - halfViewW;
    this._viewBounds.maxX = this.camera.x + halfViewW;
    this._viewBounds.minY = this.camera.y - halfViewH;
    this._viewBounds.maxY = this.camera.y + halfViewH;
    this._viewBounds.zoom = this.camera.zoom;

    // 4. Ecosystem entities (viewport-culled + LOD)
    this.ecosystem.draw(ctx, this.blob, this.time, this._viewBounds);

    // 5. Lava spit / solar plasma projectiles
    this.drawProjectiles(ctx);

    // 6. World-space particles (bursts, ripples, shockwaves)
    this.particles.drawWorldParticles(ctx);

    // 7. Charlie (lava-lamp blob + 3 diegetic tethered droplets)
    this.blob.draw(ctx, palette, this.time);

    ctx.restore();

    // 8. Cinematic story-veiled luminous mist/warp transition veil
    this.drawTransitionVeil(ctx, palette);

    // 9. Subtle finger / cursor luminous ring
    if (this.state === STATE.PLAYING && this.pointer.rippleAlpha > 0.02) {
      ctx.save();
      const alpha = this.pointer.rippleAlpha * 0.38;
      const ringRadius = this.pointer.isTouch ? 24 : 11;
      ctx.beginPath();
      ctx.arc(this.pointer.screenX, this.pointer.screenY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = rgbString(palette.blobGlow, alpha);
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.pointer.screenX, this.pointer.screenY, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = rgbString(palette.blobCore, alpha * 1.4);
      ctx.fill();
      ctx.restore();
    }
  }

  loop(now) {
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(rawDt, 0.05); // Clamp to avoid huge jumps on tab switch

    // Adaptive performance scaler: if sustained avg frame time > 24ms (< 42 FPS) for ~1.5s, step down DPR & motes
    if (this.state === STATE.PLAYING && this.perfTier < 2 && rawDt > 0 && rawDt < 0.25) {
      const frameMs = rawDt * 1000;
      this._perfAvgMs = this._perfAvgMs * 0.9 + frameMs * 0.1;
      if (this._perfCooldown > 0) {
        this._perfCooldown -= dt;
      } else if (this._perfAvgMs > 24) {
        this._perfSlowTime += dt;
        if (this._perfSlowTime >= 1.5) {
          this._stepDownPerformance();
        }
      } else {
        this._perfSlowTime = Math.max(0, this._perfSlowTime - dt * 0.5);
      }
    }

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GlooGame();
});

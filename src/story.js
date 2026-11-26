/**
 * CHARLIE — Poetic Story System
 * Handcrafted French narrative vignettes starring Charlie, triggered at key
 * moments of the journey (awakening, power evolutions, each scale transition,
 * and the cosmic finale).
 */

export const STORY_MOMENTS = {
  start: {
    chapter: 'PROLOGUE · CHARLIE',
    text: "Dans le silence vibrant du vide, Charlie s'éveille — petite goutte de lave accompagnée de ses trois bulles protectrices.",
  },
  scale_0: {
    chapter: 'ÉCHELLE I · QUANTIQUE',
    text: 'Autour de Charlie dansent quarks et photons, éclats minuscules dont naissent tous les mondes.',
  },
  scale_1: {
    chapter: "ÉCHELLE II · LA GOUTTE D'EAU",
    text: "Un voile d'eau s'ouvre : Charlie plonge dans un océan miniature peuplé de spores, d'amibes et de tardigrades.",
  },
  scale_2: {
    chapter: 'ÉCHELLE III · LA ROSÉE NOCTURNE',
    text: 'La brume du sous-bois se lève. Charlie glisse parmi les fourmis, les lucioles, les coccinelles et les grenouilles aux yeux d’or.',
  },
  scale_3: {
    chapter: 'ÉCHELLE IV · LA VILLE ENDORMIE',
    text: "Les feuilles cèdent la place aux lanternes tièdes. Charlie survole déjà les rues endormies et les toits illuminés.",
  },
  scale_4: {
    chapter: 'ÉCHELLE V · LE BALLET ORBITAL',
    text: "Charlie quitte la Terre pour la valse des lunes et des comètes. L'espace entier chante autour de son cœur de braise.",
  },
  scale_5: {
    chapter: "ÉCHELLE VI · L'INFINIMENT GRAND",
    text: "Étoiles, nébuleuses et galaxies spirales gravitent à portée de Charlie. La petite goutte d'autrefois embrasse l'univers.",
  },
  power_lv2: {
    chapter: 'ÉVOLUTION · CHARLIE NV.2',
    text: 'La lave de Charlie se déploie en triple gerbe de magma, et son onde de choc repousse loin les prédateurs.',
  },
  power_lv3: {
    chapter: 'ÉVOLUTION · CHARLIE NV.3',
    text: 'Énergie solaire atteinte ! Charlie projette un orbe de plasma explosif et déclenche une onde supernova.',
  },
  victory: {
    chapter: 'FINALE · UN AVEC LE COSMOS',
    text: "D'un frisson quantique jusqu'aux galaxies spirales, Charlie est devenu lumière infinie. Flotte librement parmi les étoiles.",
  },
};

const TAP_GUARD_SECONDS = 0.45;
const BETWEEN_GAP = 0.35;

export class StoryManager {
  constructor(options = {}) {
    this.boxEl = document.getElementById('story-box');
    this.chapterEl = document.getElementById('story-chapter');
    this.textEl = document.getElementById('story-text');
    this.onShow = typeof options.onShow === 'function' ? options.onShow : null;
    this.onDismiss = typeof options.onDismiss === 'function' ? options.onDismiss : null;

    this.seen = new Set();
    this.queue = [];
    this.active = false;
    this.currentKey = null;
    this.guardTimer = 0;
    this.gapTimer = 0;

    if (this.boxEl) {
      this.boxEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dismiss();
      });
    }
  }

  reset() {
    this.seen.clear();
    this.queue.length = 0;
    this.active = false;
    this.currentKey = null;
    this.guardTimer = 0;
    this.gapTimer = 0;
    if (this.boxEl) {
      this.boxEl.classList.remove('visible');
    }
  }

  hideImmediate() {
    this.active = false;
    this.currentKey = null;
    this.guardTimer = 0;
    if (this.boxEl) {
      this.boxEl.classList.remove('visible');
    }
  }

  trigger(key, { force = false, priority = false } = {}) {
    const moment = STORY_MOMENTS[key];
    if (!moment) return;
    if (!force && this.seen.has(key)) return;
    this.seen.add(key);

    const entry = { key, moment };
    if (priority) {
      // Show scale transition story immediately so it stays synced with the veil
      this._show(entry);
    } else if (this.active || this.gapTimer > 0) {
      this.queue.push(entry);
    } else {
      this._show(entry);
    }
  }

  _show(entry) {
    if (!this.boxEl || !this.chapterEl || !this.textEl) return;
    this.chapterEl.textContent = entry.moment.chapter;
    this.textEl.textContent = entry.moment.text;
    this.active = true;
    this.currentKey = entry.key;
    this.guardTimer = TAP_GUARD_SECONDS;
    this.boxEl.classList.add('visible');
    if (this.onShow) {
      this.onShow(entry.moment, entry.key);
    }
  }

  dismiss(force = false) {
    if (!this.active) return;
    if (!force && this.guardTimer > 0) return;

    const dismissedKey = this.currentKey;
    this.active = false;
    this.currentKey = null;
    this.guardTimer = 0;
    if (this.boxEl) {
      this.boxEl.classList.remove('visible');
    }
    if (this.onDismiss) {
      this.onDismiss(dismissedKey);
    }
    if (this.queue.length > 0) {
      this.gapTimer = BETWEEN_GAP;
    }
  }

  update(dt) {
    const step = Math.min(0.05, Math.max(0, dt || 0));
    if (this.active) {
      if (this.guardTimer > 0) {
        this.guardTimer = Math.max(0, this.guardTimer - step);
      }
      // Never auto-dismiss: wait for the player to tap/click!
    } else if (this.gapTimer > 0) {
      this.gapTimer -= step;
      if (this.gapTimer <= 0 && this.queue.length > 0) {
        const next = this.queue.shift();
        this._show(next);
      }
    }
  }
}

/**
 * GLOO — ParticleSystem
 * Manages screen-space parallax bioluminescent motes and world-space bursts
 * (chomp droplets + ripples, predator hurt lava scatter, and scale-up shimmer).
 * Designed for 60 FPS on mobile Canvas 2D without expensive shadowBlur calls.
 */

import { rgbString } from './scales.js';

const MOTE_COUNT = 52;
const MAX_PARTICLES = 260;
const MAX_RINGS = 32;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function wrap01(v) {
  const m = v % 1;
  return m < 0 ? m + 1 : m;
}

export class ParticleSystem {
  constructor() {
    this.motes = [];
    this.particles = [];
    this.rings = [];
    this._lastW = 1000;
    this._lastH = 1000;
    this._initMotes();
  }

  _initMotes() {
    this.motes = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      // 3 depth strata for subtle parallax
      const layer = i % 3;
      const depth = layer === 0 ? rand(0.22, 0.42) : layer === 1 ? rand(0.48, 0.72) : rand(0.76, 1.0);
      this.motes.push({
        nx: Math.random(),
        ny: Math.random(),
        depth,
        radius: (1.1 + depth * 2.1) * rand(0.75, 1.25),
        vx: rand(-0.008, 0.008) * depth,
        vy: rand(-0.011, 0.005) * depth,
        phase: rand(0, Math.PI * 2),
        twinkleSpeed: rand(1.1, 2.6),
        alpha: rand(0.22, 0.62) * (0.55 + depth * 0.45),
      });
    }
  }

  reset() {
    this.particles.length = 0;
    this.rings.length = 0;
    this._initMotes();
  }

  /**
   * World-space bite / chomp burst: glowing droplets + soft expanding ripple ring.
   */
  spawnEatBurst(x, y, radius, color = '#67e8f9', accent = '#ffffff', count = 14) {
    const r = Math.max(2, radius);
    const n = Math.max(4, Math.min(36, Math.round(count)));

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.35, 0.35);
      const spd = r * rand(1.9, 4.6);
      const isAccent = i % 3 === 0;
      this._pushParticle({
        x: x + Math.cos(a) * r * rand(0.1, 0.45),
        y: y + Math.sin(a) * r * rand(0.1, 0.45),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: r * rand(0.11, 0.25),
        color: isAccent ? accent : color,
        life: 0,
        maxLife: rand(0.36, 0.68),
        drag: 3.6,
        twinkle: false,
        phase: rand(0, Math.PI * 2),
      });
    }

    this._pushRing({
      x,
      y,
      radius: r * 0.55,
      maxRadius: r * 2.45,
      lineWidth: Math.max(1, r * 0.14),
      color: accent || color,
      life: 0,
      maxLife: 0.46,
      alpha: 0.65,
    });
  }

  /**
   * World-space hurt / lava scatter when grazed by a predator.
   */
  spawnHurtBurst(x, y, radius, color = '#ff6b6b') {
    const r = Math.max(2, radius);
    const warmPalette = [color, '#ff9f68', '#ffd180', '#ff5768'];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.28, 0.28);
      const spd = r * rand(2.4, 5.6);
      this._pushParticle({
        x: x + Math.cos(a) * r * rand(0.15, 0.5),
        y: y + Math.sin(a) * r * rand(0.15, 0.5),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: r * rand(0.12, 0.28),
        color: warmPalette[i % warmPalette.length],
        life: 0,
        maxLife: rand(0.42, 0.78),
        drag: 3.1,
        twinkle: false,
        phase: rand(0, Math.PI * 2),
      });
    }

    this._pushRing({
      x,
      y,
      radius: r * 0.65,
      maxRadius: r * 2.9,
      lineWidth: Math.max(1.2, r * 0.18),
      color: '#ff7070',
      life: 0,
      maxLife: 0.52,
      alpha: 0.72,
    });
  }

  /**
   * World-space scale-up shimmer: radiant double expanding rings + stardust.
   */
  spawnScaleBurst(x, y, radius, color = '#fde68a') {
    const r = Math.max(4, radius);
    const count = 30;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const spd = r * rand(2.2, 6.0);
      this._pushParticle({
        x: x + Math.cos(a) * r * rand(0.25, 0.7),
        y: y + Math.sin(a) * r * rand(0.25, 0.7),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: r * rand(0.09, 0.22),
        color: i % 2 === 0 ? color : '#ffffff',
        life: 0,
        maxLife: rand(0.65, 1.15),
        drag: 2.3,
        twinkle: true,
        phase: rand(0, Math.PI * 2),
      });
    }

    this._pushRing({
      x,
      y,
      radius: r * 0.75,
      maxRadius: r * 4.2,
      lineWidth: Math.max(1.5, r * 0.2),
      color,
      life: 0,
      maxLife: 0.85,
      alpha: 0.8,
    });

    this._pushRing({
      x,
      y,
      radius: r * 0.45,
      maxRadius: r * 3.0,
      lineWidth: Math.max(1, r * 0.12),
      color: '#ffffff',
      life: 0,
      maxLife: 0.65,
      alpha: 0.6,
    });
  }

  /**
   * World-space heal sparkle: gentle rising bioluminescent droplets + soft emerald-gold ring.
   */
  spawnHealSparkle(x, y, radius) {
    const r = Math.max(3, radius);
    const colors = ['#5eead4', '#a7f3d0', '#fde68a', '#ffffff'];
    const count = 16;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.25, 0.25);
      const spd = r * rand(1.4, 3.6);
      this._pushParticle({
        x: x + Math.cos(a) * r * rand(0.35, 0.85),
        y: y + Math.sin(a) * r * rand(0.35, 0.85),
        vx: Math.cos(a) * spd * 0.75,
        vy: Math.sin(a) * spd * 0.75 - r * rand(0.8, 1.8),
        radius: r * rand(0.08, 0.17),
        color: colors[i % colors.length],
        life: 0,
        maxLife: rand(0.55, 0.95),
        drag: 2.2,
        twinkle: true,
        phase: rand(0, Math.PI * 2),
      });
    }

    this._pushRing({
      x,
      y,
      radius: r * 0.6,
      maxRadius: r * 2.6,
      lineWidth: Math.max(1.2, r * 0.13),
      color: '#5eead4',
      life: 0,
      maxLife: 0.62,
      alpha: 0.72,
    });
  }

  /**
   * World-space molten lava / solar plasma impact splash.
   */
  spawnLavaBurst(x, y, radius, isPlasma = false) {
    const r = Math.max(3, radius);
    const palette = isPlasma
      ? ['#fff7cc', '#fde047', '#fb923c', '#ff5757']
      : ['#ffd185', '#ff9466', '#ff5e4d', '#ffffff'];
    const count = isPlasma ? 28 : 16;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
      const spd = r * rand(isPlasma ? 2.4 : 1.8, isPlasma ? 5.8 : 4.4);
      this._pushParticle({
        x: x + Math.cos(a) * r * rand(0.1, 0.4),
        y: y + Math.sin(a) * r * rand(0.1, 0.4),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: r * rand(0.1, isPlasma ? 0.24 : 0.2),
        color: palette[i % palette.length],
        life: 0,
        maxLife: rand(0.36, isPlasma ? 0.8 : 0.62),
        drag: 3.0,
        twinkle: isPlasma && i % 3 === 0,
        phase: rand(0, Math.PI * 2),
      });
    }

    this._pushRing({
      x,
      y,
      radius: r * 0.5,
      maxRadius: r * (isPlasma ? 3.8 : 2.5),
      lineWidth: Math.max(1.2, r * (isPlasma ? 0.22 : 0.15)),
      color: isPlasma ? '#fde047' : '#ff9466',
      life: 0,
      maxLife: isPlasma ? 0.62 : 0.46,
      alpha: isPlasma ? 0.85 : 0.7,
    });

    if (isPlasma) {
      this._pushRing({
        x,
        y,
        radius: r * 0.3,
        maxRadius: r * 2.6,
        lineWidth: Math.max(1, r * 0.14),
        color: '#ffffff',
        life: 0,
        maxLife: 0.48,
        alpha: 0.65,
      });
    }
  }

  /**
   * World-space repelling shockwave + propulsion streaks for Onde & Élan.
   */
  spawnShockwave(x, y, radius, maxRadius, level = 1) {
    const r = Math.max(3, radius);
    const waveR = Math.max(r * 2.8, maxRadius);
    const colors = level >= 3
      ? ['#fef08a', '#67e8f9', '#ff9466', '#ffffff']
      : level === 2
        ? ['#67e8f9', '#5eead4', '#ffd185', '#ffffff']
        : ['#5eead4', '#a7f3d0', '#ffffff'];

    const count = 12 + level * 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const spd = r * rand(2.5, 4.8 + level * 1.1);
      this._pushParticle({
        x: x + Math.cos(a) * r * 0.6,
        y: y + Math.sin(a) * r * 0.6,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: r * rand(0.08, 0.16),
        color: colors[i % colors.length],
        life: 0,
        maxLife: rand(0.38, 0.65),
        drag: 3.2,
        twinkle: level >= 3,
        phase: rand(0, Math.PI * 2),
      });
    }

    this._pushRing({
      x,
      y,
      radius: r * 0.7,
      maxRadius: waveR,
      lineWidth: Math.max(1.4, r * (0.14 + level * 0.04)),
      color: level >= 3 ? '#fde047' : '#5eead4',
      life: 0,
      maxLife: 0.52 + level * 0.08,
      alpha: 0.78,
    });

    if (level >= 2) {
      this._pushRing({
        x,
        y,
        radius: r * 0.45,
        maxRadius: waveR * 0.78,
        lineWidth: Math.max(1, r * 0.11),
        color: level >= 3 ? '#ff9466' : '#a7f3d0',
        life: 0,
        maxLife: 0.46 + level * 0.06,
        alpha: 0.62,
      });
    }

    if (level >= 3) {
      this._pushRing({
        x,
        y,
        radius: r * 0.35,
        maxRadius: waveR * 0.55,
        lineWidth: Math.max(1, r * 0.1),
        color: '#ffffff',
        life: 0,
        maxLife: 0.42,
        alpha: 0.68,
      });
    }
  }

  _pushParticle(p) {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  _pushRing(ring) {
    if (this.rings.length >= MAX_RINGS) {
      this.rings.shift();
    }
    this.rings.push(ring);
  }

  /**
   * Advance motes (with camera parallax) and world-space particles/rings.
   * @param {number} dt - Delta time in seconds.
   * @param {number} camDx - Camera horizontal delta (screen px or world units).
   * @param {number} camDy - Camera vertical delta (screen px or world units).
   * @param {number} zoomDelta - Relative zoom change (e.g. zoom/prevZoom - 1).
   */
  update(dt, camDx = 0, camDy = 0, zoomDelta = 0) {
    const step = Math.min(0.05, Math.max(0, dt || 0));

    // Normalize camera pan smoothly into screen-fraction parallax, clamped against spikes
    const invW = 1 / Math.max(320, this._lastW);
    const invH = 1 / Math.max(320, this._lastH);
    const panX = Math.max(-0.08, Math.min(0.08, camDx * invW * 0.65));
    const panY = Math.max(-0.08, Math.min(0.08, camDy * invH * 0.65));
    const zPull = Math.max(-0.08, Math.min(0.08, zoomDelta * 0.6));

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      m.phase += m.twinkleSpeed * step;

      let nx = m.nx + (m.vx + Math.sin(m.phase * 0.7) * 0.004 * m.depth) * step - panX * m.depth;
      let ny = m.ny + (m.vy + Math.cos(m.phase * 0.55) * 0.004 * m.depth) * step - panY * m.depth;

      // Subtle radial zoom parallax around screen center
      if (zPull !== 0) {
        nx += (nx - 0.5) * zPull * m.depth;
        ny += (ny - 0.5) * zPull * m.depth;
      }

      m.nx = wrap01(nx);
      m.ny = wrap01(ny);
    }

    // Update world-space droplets
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += step;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const damp = Math.exp(-p.drag * step);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.twinkle) {
        p.phase += step * 14;
      }
    }

    // Update world-space ripple rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life += step;
      if (ring.life >= ring.maxLife) {
        this.rings.splice(i, 1);
      }
    }
  }

  /**
   * Draw ambient screen-space bioluminescent motes.
   * Call in screen space (before camera transform).
   */
  drawBackgroundMotes(ctx, width, height, palette, time = 0) {
    this._lastW = width;
    this._lastH = height;

    const moteRGB = (palette && palette.moteColor) ? palette.moteColor : [140, 235, 225];
    const haloColor = rgbString(moteRGB, 0.16);
    const coreColor = rgbString(moteRGB, 0.85);

    ctx.save();
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      const x = m.nx * width;
      const y = m.ny * height;
      const twinkle = 0.6 + 0.4 * Math.sin(time * m.twinkleSpeed + m.phase);
      const a = m.alpha * twinkle;
      const r = m.radius * (0.9 + 0.18 * twinkle);

      // Soft outer halo
      ctx.globalAlpha = a;
      ctx.fillStyle = haloColor;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.1, 0, Math.PI * 2);
      ctx.fill();

      // Luminous core
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draw world-space burst particles and expanding ripple rings.
   * Call inside the camera world transform.
   */
  drawWorldParticles(ctx) {
    if (this.rings.length === 0 && this.particles.length === 0) return;

    ctx.save();

    // Expanding soft ripple rings
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const t = ring.life / ring.maxLife;
      const easeOut = 1 - Math.pow(1 - t, 3);
      const curR = ring.radius + (ring.maxRadius - ring.radius) * easeOut;
      const alpha = ring.alpha * (1 - t) * (1 - t);
      if (alpha <= 0.01) continue;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.lineWidth * (1 - t * 0.55);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, curR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing droplets & stardust
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const t = p.life / p.maxLife;
      const fade = 1 - t;
      const twinkle = p.twinkle ? (0.55 + 0.45 * Math.sin(p.phase)) : 1;
      const alpha = fade * fade * twinkle;
      if (alpha <= 0.01) continue;

      const curR = p.radius * (0.35 + 0.65 * fade);

      // Soft outer glow
      ctx.globalAlpha = alpha * 0.28;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Bright core droplet
      ctx.globalAlpha = alpha * 0.92;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * GLOO — LavaBlob character physics, fluid spring-mass body, trailing lava-lamp
 * droplets with metaball necks, internal convection bubbles, and expressive cute
 * face with two little teeth.
 */

import { BASE_SIZE, rgbString } from './scales.js';

const CONTOUR_POINTS = 28;
const DROPLET_COUNT = 3;
const BUBBLE_COUNT = 4;
const TWO_PI = Math.PI * 2;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function angleDiff(a, b) {
  let d = (a - b) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

function lerpAngle(current, target, t) {
  return current + angleDiff(target, current) * t;
}

function brightenRGB(rgb, amount) {
  return [
    Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * amount)),
    Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * amount)),
    Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * amount)),
  ];
}

function darkenRGB(rgb, amount) {
  const f = 1 - amount;
  return [
    Math.round(rgb[0] * f),
    Math.round(rgb[1] * f),
    Math.round(rgb[2] * f),
  ];
}

export class LavaBlob {
  constructor(x = 0, y = 0, size = BASE_SIZE) {
    this.dr = new Float32Array(CONTOUR_POINTS);
    this.vr = new Float32Array(CONTOUR_POINTS);
    this._drNext = new Float32Array(CONTOUR_POINTS);
    this._px = new Float32Array(CONTOUR_POINTS);
    this._py = new Float32Array(CONTOUR_POINTS);

    this.droplets = [];
    this.bubbles = [];
    this._initBubbles();

    this.reset(x, y, size);
  }

  _initBubbles() {
    this.bubbles = [];
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      this.bubbles.push({
        baseAngle: (i / BUBBLE_COUNT) * TWO_PI + 0.4,
        orbitRadius: 0.22 + (i % 3) * 0.12,
        relRadius: 0.095 + (i % 2) * 0.055 + (i === 0 ? 0.025 : 0),
        speed: 0.45 + i * 0.17,
        phase: i * 1.7 + 0.5,
      });
    }
  }

  _initDroplets(x, y) {
    // 3 distinct tethered lava-lamp droplets — Charlie's diegetic hit points!
    const relRadii = [0.31, 0.27, 0.23];
    const lateralBiases = [-0.46, 0.46, 0.0];
    const stiffnesses = [54, 48, 42];
    const dampings = [8.2, 7.6, 7.0];

    this.droplets = [];
    for (let i = 0; i < DROPLET_COUNT; i++) {
      this.droplets.push({
        x,
        y,
        vx: 0,
        vy: 0,
        relRadius: relRadii[i],
        lateralBias: lateralBiases[i],
        stiffness: stiffnesses[i],
        damping: dampings[i],
        phase: i * 2.094,
        scale: 1,
      });
    }
    this.activeDroplets = DROPLET_COUNT;
  }

  /**
   * Sync the number of active tethered lava droplets (0..3) with Charlie's health.
   * Newly regenerated droplets bloom smoothly outward from Charlie's body.
   */
  setHealthDroplets(count) {
    const clamped = clamp(Math.round(count), 0, DROPLET_COUNT);
    if (clamped > this.activeDroplets) {
      for (let i = this.activeDroplets; i < clamped; i++) {
        const drop = this.droplets[i];
        if (drop) {
          drop.x = this.x;
          drop.y = this.y;
          drop.vx = 0;
          drop.vy = 0;
          drop.scale = 0.06;
        }
      }
    }
    this.activeDroplets = clamped;
  }

  /**
   * Burst away the outermost tethered droplet when taking a hit and return its
   * world coordinates so the game can spawn a lava splash right at the pop site.
   */
  popHealthDroplet(remainingHealth) {
    const clamped = clamp(Math.round(remainingHealth), 0, DROPLET_COUNT);
    const popped = this.droplets[clamped];
    const pos = popped ? { x: popped.x, y: popped.y } : { x: this.x, y: this.y };
    if (popped) {
      popped.scale = 0;
    }
    this.activeDroplets = clamped;
    return pos;
  }

  reset(x = 0, y = 0, size = BASE_SIZE) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = Math.max(0.1, size);
    this.angle = 0;
    this.lookAngle = 0;

    this.invulnTimer = 0;
    this.chompTimer = 0;
    this.chompDuration = 0.26;
    this.happyTimer = 0;
    this.mouthOpen = 0;
    this.fear = 0;
    this.lowHealth = false;

    this._prevVx = 0;
    this._prevVy = 0;
    this._squash = 0;
    this._stretchAngle = 0;
    this._speedNorm = 0;
    this._time = 0;

    this._blinkTimer = 2.2 + Math.random() * 2.5;
    this._blinkProgress = 0;
    this._chompPeakOpen = 0;

    this.dr.fill(0);
    this.vr.fill(0);
    this._initDroplets(x, y);
  }

  /**
   * Trigger a snappy bite-close animation, directional gulp ripple wave around
   * the spring-mass perimeter, and a brief happy expression.
   */
  triggerChomp(preyAngle = this.angle, intensity = 1) {
    const k = clamp(intensity, 0.45, 1.8);
    this._chompPeakOpen = Math.max(this.mouthOpen, 0.88);
    this.chompTimer = this.chompDuration;
    this.happyTimer = Math.max(this.happyTimer, 0.42 + 0.14 * k);
    this.lookAngle = lerpAngle(this.lookAngle, preyAngle, 0.65);

    // Send a directional gulp ripple wave across the perimeter
    for (let i = 0; i < CONTOUR_POINTS; i++) {
      const theta = (i / CONTOUR_POINTS) * TWO_PI;
      const d = angleDiff(theta, preyAngle);
      const frontPull = Math.cos(d);
      const sideBulge = -Math.cos(d * 2);
      // Forward lunge + side squash that propagates around the contour
      this.vr[i] += (frontPull * 2.6 + sideBulge * 1.25) * k;
      this.dr[i] = clamp(this.dr[i] + frontPull * 0.08 * k, -0.36, 0.4);
    }

    // Subtle celebratory squash pulse
    this._squash = Math.min(0.32, this._squash + 0.09 * k);
  }

  /**
   * Squash the contour on the impact side, grant temporary invulnerability,
   * and scatter the trailing droplets outward momentarily.
   */
  triggerHurt(awayAngle = this.angle + Math.PI) {
    this.invulnTimer = 1.3;
    this.happyTimer = 0;
    this.chompTimer = 0;
    this.mouthOpen = 0;
    this.fear = Math.max(this.fear, 0.9);

    const impactAngle = awayAngle + Math.PI;
    for (let i = 0; i < CONTOUR_POINTS; i++) {
      const theta = (i / CONTOUR_POINTS) * TWO_PI;
      const d = angleDiff(theta, impactAngle);
      const cosD = Math.cos(d);
      if (cosD > 0) {
        // Dent inward on impact side
        this.dr[i] = clamp(this.dr[i] - cosD * 0.24, -0.36, 0.4);
        this.vr[i] -= cosD * 3.4;
      } else {
        // Bulge outward on opposite/perpendicular sides
        this.vr[i] += (-cosD * 1.4 + Math.sin(d * 2) * 0.5);
      }
    }

    // Scatter trailing droplets outward like molten wax splash
    for (let i = 0; i < this.droplets.length; i++) {
      const drop = this.droplets[i];
      const spread = (i - (this.droplets.length - 1) * 0.5) * 0.85;
      const splashAngle = awayAngle + spread + (Math.random() - 0.5) * 0.4;
      const impulse = this.size * (4.2 + Math.random() * 2.6);
      drop.vx += Math.cos(splashAngle) * impulse;
      drop.vy += Math.sin(splashAngle) * impulse;
    }
  }

  /**
   * Expressive spit recoil when firing Crachat de Lave.
   */
  triggerSpit(aimAngle = this.angle, level = 1) {
    this._chompPeakOpen = 0.82;
    this.chompTimer = 0.2;
    this.lookAngle = lerpAngle(this.lookAngle, aimAngle, 0.8);
    const power = 0.85 + level * 0.25;

    for (let i = 0; i < CONTOUR_POINTS; i++) {
      const theta = (i / CONTOUR_POINTS) * TWO_PI;
      const d = angleDiff(theta, aimAngle);
      const frontJet = Math.cos(d);
      this.vr[i] += frontJet * 2.4 * power;
      this.dr[i] = clamp(this.dr[i] + frontJet * 0.06 * power, -0.36, 0.4);
    }
  }

  /**
   * Dynamic forward stretch & propulsion ripple for Onde & Élan.
   */
  triggerDash(dashAngle = this.angle, level = 1) {
    this.angle = dashAngle;
    this._stretchAngle = dashAngle;
    this._squash = Math.min(0.36, 0.24 + level * 0.04);
    this.happyTimer = Math.max(this.happyTimer, 0.25);

    for (let i = 0; i < CONTOUR_POINTS; i++) {
      const theta = (i / CONTOUR_POINTS) * TWO_PI;
      const d = angleDiff(theta, dashAngle);
      this.vr[i] += Math.cos(d * 2) * (1.8 + level * 0.45);
    }

    const backAngle = dashAngle + Math.PI;
    for (let i = 0; i < this.droplets.length; i++) {
      const drop = this.droplets[i];
      const kick = this.size * (3.2 + level * 1.1);
      drop.vx += Math.cos(backAngle) * kick;
      drop.vy += Math.sin(backAngle) * kick;
    }
  }

  /**
   * Advance physics, spring-mass fluid contour, trailing lava droplets, and
   * facial expressions. Fully scale-invariant across all scales.
   */
  update(dt, targetX, targetY, hasTarget, nearestPrey, nearestPredator, cameraZoom) {
    const safeDt = clamp(dt, 0, 0.05);
    if (safeDt <= 0) return;

    this._time += safeDt;
    const size = Math.max(0.1, this.size);
    const maxSpeed = size * 6.8;

    // 1. Timers
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - safeDt);
    if (this.chompTimer > 0) this.chompTimer = Math.max(0, this.chompTimer - safeDt);
    if (this.happyTimer > 0) this.happyTimer = Math.max(0, this.happyTimer - safeDt);

    // 2. Smooth finger-following movement scaled proportionally to size
    this._prevVx = this.vx;
    this._prevVy = this.vy;

    if (hasTarget) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > size * 0.04) {
        // Smooth arrival ramp so tiny finger nudges feel precise & fluid
        const arrivalRadius = size * 2.1;
        const speedFactor = Math.pow(clamp(dist / arrivalRadius, 0, 1), 0.82);
        const desiredSpeed = maxSpeed * speedFactor;
        const dvx = (dx / dist) * desiredSpeed;
        const dvy = (dy / dist) * desiredSpeed;

        const accel = 1 - Math.exp(-11.5 * safeDt);
        this.vx += (dvx - this.vx) * accel;
        this.vy += (dvy - this.vy) * accel;
      } else {
        const damp = Math.exp(-8.0 * safeDt);
        this.vx *= damp;
        this.vy *= damp;
      }
    } else {
      const damp = Math.exp(-4.6 * safeDt);
      this.vx *= damp;
      this.vy *= damp;
    }

    this.x += this.vx * safeDt;
    this.y += this.vy * safeDt;

    const speed = Math.hypot(this.vx, this.vy);
    const speedNorm = clamp(speed / maxSpeed, 0, 1.25);
    this._speedNorm = speedNorm;

    // Facing angle & velocity-based squash/stretch
    if (speed > size * 0.22) {
      const moveAngle = Math.atan2(this.vy, this.vx);
      const turnT = 1 - Math.exp(-12 * safeDt);
      this.angle = lerpAngle(this.angle, moveAngle, turnT);
      this._stretchAngle = lerpAngle(this._stretchAngle, moveAngle, 1 - Math.exp(-14 * safeDt));
    }

    const targetSquash = clamp(speedNorm * 0.23, 0, 0.26);
    this._squash += (targetSquash - this._squash) * (1 - Math.exp(-10 * safeDt));

    // Inertia slosh from acceleration into the spring-mass contour
    const ax = (this.vx - this._prevVx) / (size * Math.max(safeDt, 0.008));
    const ay = (this.vy - this._prevVy) / (size * Math.max(safeDt, 0.008));
    const accMag = Math.min(18, Math.hypot(ax, ay));
    if (accMag > 0.6) {
      const accAngle = Math.atan2(ay, ax);
      const sloshImpulse = accMag * 0.025 * safeDt;
      for (let i = 0; i < CONTOUR_POINTS; i++) {
        const theta = (i / CONTOUR_POINTS) * TWO_PI;
        // Fluid lags opposite to acceleration
        this.vr[i] -= Math.cos(theta - accAngle) * sloshImpulse * 8;
      }
    }

    // 3. Emotions: fear, mouthOpen, lookAngle, blinking
    let targetFear = 0;
    let predAngle = this.angle;
    if (nearestPredator) {
      const pdx = nearestPredator.x - this.x;
      const pdy = nearestPredator.y - this.y;
      const pDist = Math.hypot(pdx, pdy);
      const predSize = nearestPredator.size || size * 1.5;
      const dangerRange = predSize * 2.6 + size * 2.0;
      if (pDist < dangerRange) {
        targetFear = clamp(1 - (pDist - size * 0.8) / Math.max(1, dangerRange - size * 0.8), 0, 1);
        predAngle = Math.atan2(pdy, pdx);
      }
    }
    const fearRate = targetFear > this.fear ? 9.5 : 4.2;
    this.fear += (targetFear - this.fear) * (1 - Math.exp(-fearRate * safeDt));

    let preyAngle = this.angle;
    let preyClose = false;
    let targetMouth = 0;
    if (nearestPrey) {
      const edx = nearestPrey.x - this.x;
      const edy = nearestPrey.y - this.y;
      const eDist = Math.hypot(edx, edy);
      const eatRange = size * 2.8;
      if (eDist < size * 3.6) {
        preyAngle = Math.atan2(edy, edx);
        preyClose = true;
      }
      if (eDist < eatRange && this.fear < 0.55) {
        targetMouth = clamp(1 - (eDist - size * 0.65) / (eatRange - size * 0.65), 0, 1);
      }
    }

    if (this.chompTimer > 0) {
      // Snappy bite-close curve
      const progress = 1 - this.chompTimer / this.chompDuration;
      if (progress < 0.32) {
        const snap = 1 - progress / 0.32;
        this.mouthOpen = this._chompPeakOpen * snap * snap;
      } else {
        this.mouthOpen = 0;
      }
    } else {
      const mouthRate = targetMouth > this.mouthOpen ? 12.0 : 8.0;
      this.mouthOpen += (targetMouth - this.mouthOpen) * (1 - Math.exp(-mouthRate * safeDt));
    }

    // Look angle priority: predator if scared -> nearby prey -> facing direction
    let targetLook = this.angle;
    if (nearestPredator && this.fear > 0.2) {
      targetLook = predAngle;
    } else if (preyClose) {
      targetLook = preyAngle;
    }
    this.lookAngle = lerpAngle(this.lookAngle, targetLook, 1 - Math.exp(-11 * safeDt));

    // Natural periodic blinking
    if (this.fear < 0.35 && this.happyTimer <= 0) {
      if (this._blinkProgress > 0) {
        this._blinkProgress += safeDt / 0.14;
        if (this._blinkProgress >= 1) {
          this._blinkProgress = 0;
          this._blinkTimer = 2.4 + Math.random() * 3.4;
        }
      } else {
        this._blinkTimer -= safeDt;
        if (this._blinkTimer <= 0) {
          this._blinkProgress = 0.001;
        }
      }
    } else {
      this._blinkProgress = 0;
    }

    // 4. Spring-mass radial contour (2 substeps for smooth wave propagation)
    this._updateContour(safeDt);

    // 5. Trailing lava-lamp droplets
    this._updateDroplets(safeDt, size, speedNorm);
  }

  _updateContour(dt) {
    const substeps = 2;
    const h = dt / substeps;
    const kRestore = 92;
    const kNeighbor = 148;
    const cDamp = 7.4;

    const dr = this.dr;
    const vr = this.vr;
    const drNext = this._drNext;
    const n = CONTOUR_POINTS;

    for (let s = 0; s < substeps; s++) {
      for (let i = 0; i < n; i++) {
        const prev = i === 0 ? n - 1 : i - 1;
        const next = i === n - 1 ? 0 : i + 1;
        const neighborAvg = (dr[prev] + dr[next]) * 0.5;
        const force = -kRestore * dr[i] + kNeighbor * (neighborAvg - dr[i]) - cDamp * vr[i];
        vr[i] += force * h;
        drNext[i] = clamp(dr[i] + vr[i] * h, -0.36, 0.42);
      }
      dr.set(drNext);
    }
  }

  _updateDroplets(dt, size, speedNorm) {
    const backAngle = this.angle + Math.PI;
    const cosB = Math.cos(backAngle);
    const sinB = Math.sin(backAngle);
    const perpX = -sinB;
    const perpY = cosB;

    // Active droplets stay visibly tethered behind/around Charlie even when hovering
    // so the player can always read Charlie's remaining life droplets at a glance.
    const trailActivity = clamp(speedNorm * 1.15, 0, 1);

    for (let i = 0; i < this.droplets.length; i++) {
      const drop = this.droplets[i];
      const isActive = i < this.activeDroplets;

      if (!isActive) {
        drop.scale = Math.max(0, drop.scale - dt * 6);
        drop.x = this.x;
        drop.y = this.y;
        drop.vx = 0;
        drop.vy = 0;
        continue;
      }

      if (drop.scale < 1) {
        drop.scale = Math.min(1, drop.scale + dt * 2.8);
      }

      const wobble = Math.sin(this._time * (2.2 + i * 0.45) + drop.phase);
      const slotDist = size * (1.08 + i * 0.22 + (0.28 + i * 0.14) * trailActivity);
      const lateral = size * (drop.lateralBias * (0.78 + 0.35 * trailActivity) + wobble * 0.12);

      const tx = this.x + cosB * slotDist + perpX * lateral;
      const ty = this.y + sinB * slotDist + perpY * lateral;

      const fx = (tx - drop.x) * drop.stiffness;
      const fy = (ty - drop.y) * drop.stiffness;

      drop.vx += (fx - drop.vx * drop.damping) * dt;
      drop.vy += (fy - drop.vy * drop.damping) * dt;

      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;

      // Keep droplets tethered within scale-proportional max distance
      const dx = drop.x - this.x;
      const dy = drop.y - this.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = size * 2.5;
      if (dist > maxDist && dist > 0.0001) {
        const scaleBack = maxDist / dist;
        drop.x = this.x + dx * scaleBack;
        drop.y = this.y + dy * scaleBack;
      }
    }
  }

  /**
   * Compute world-space contour polygon points combining spring-mass ripples,
   * gentle lava-lamp organic undulation, and velocity-based squash & stretch.
   */
  _computeContourPoints(time) {
    const size = this.size;
    const squash = this._squash;
    const stretchX = 1 + squash;
    const stretchY = 1 / (1 + squash * 0.62);
    const cosS = Math.cos(this._stretchAngle);
    const sinS = Math.sin(this._stretchAngle);

    const t1 = time * 1.9;
    const t2 = time * 2.7;
    const t3 = time * 1.3;

    for (let i = 0; i < CONTOUR_POINTS; i++) {
      const theta = (i / CONTOUR_POINTS) * TWO_PI;
      // Gentle ambient lava-lamp convection undulation
      const lavaWave =
        Math.sin(theta * 2 + t1) * 0.032 +
        Math.cos(theta * 3 - t2) * 0.024 +
        Math.sin(theta * 4 + t3) * 0.012;

      const r = size * Math.max(0.55, 1 + this.dr[i] + lavaWave);

      // Local point in stretch-aligned frame
      const relAngle = theta - this._stretchAngle;
      const lx = Math.cos(relAngle) * r * stretchX;
      const ly = Math.sin(relAngle) * r * stretchY;

      // Rotate back to world space
      this._px[i] = this.x + lx * cosS - ly * sinS;
      this._py[i] = this.y + lx * sinS + ly * cosS;
    }
  }

  _traceContourPath(ctx) {
    const px = this._px;
    const py = this._py;
    const n = CONTOUR_POINTS;

    const startX = (px[n - 1] + px[0]) * 0.5;
    const startY = (py[n - 1] + py[0]) * 0.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    for (let i = 0; i < n; i++) {
      const next = i === n - 1 ? 0 : i + 1;
      const midX = (px[i] + px[next]) * 0.5;
      const midY = (py[i] + py[next]) * 0.5;
      ctx.quadraticCurveTo(px[i], py[i], midX, midY);
    }
    ctx.closePath();
  }

  /**
   * Draw the LavaBlob in world coordinates (ctx is already camera-transformed).
   */
  draw(ctx, palette, time = this._time) {
    const size = this.size;
    const blobCore = palette?.blobCore || [255, 178, 118];
    const blobEdge = palette?.blobEdge || [244, 106, 102];
    const blobGlow = palette?.blobGlow || [255, 152, 108];

    const hotCore = brightenRGB(blobCore, 0.52);
    const deepEdge = darkenRGB(blobEdge, 0.16);

    ctx.save();

    // Subtle invulnerability shimmer
    if (this.invulnTimer > 0) {
      const shimmer = 0.68 + 0.32 * Math.sin(time * 28);
      ctx.globalAlpha = shimmer;
    }

    // 1. Outer bioluminescent aura (radial gradient — fast on mobile)
    const auraR = size * 2.35;
    const auraGrad = ctx.createRadialGradient(this.x, this.y, size * 0.35, this.x, this.y, auraR);
    auraGrad.addColorStop(0, rgbString(blobGlow, 0.38));
    auraGrad.addColorStop(0.45, rgbString(blobGlow, 0.14));
    auraGrad.addColorStop(1, rgbString(blobGlow, 0));
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, auraR, 0, TWO_PI);
    ctx.fill();

    // 1b. Pulsing crimson warning aura & ring when at 0 tethered droplets (1 hit from defeat)
    if (this.lowHealth) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 7.2);
      const dangerAuraR = size * (2.05 + 0.28 * pulse);
      const dangerGrad = ctx.createRadialGradient(this.x, this.y, size * 0.65, this.x, this.y, dangerAuraR);
      dangerGrad.addColorStop(0, `rgba(255, 56, 78, ${(0.28 + 0.18 * pulse).toFixed(3)})`);
      dangerGrad.addColorStop(0.55, `rgba(235, 38, 66, ${(0.14 + 0.12 * pulse).toFixed(3)})`);
      dangerGrad.addColorStop(1, 'rgba(220, 28, 56, 0)');

      ctx.save();
      ctx.fillStyle = dangerGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, dangerAuraR, 0, TWO_PI);
      ctx.fill();

      const ringR = size * (1.36 + 0.14 * pulse);
      const dangerAlpha = 0.36 + 0.4 * pulse;
      ctx.strokeStyle = `rgba(255, 76, 92, ${dangerAlpha.toFixed(3)})`;
      ctx.lineWidth = size * (0.075 + 0.03 * pulse);
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR, 0, TWO_PI);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 138, 128, ${(dangerAlpha * 0.55).toFixed(3)})`;
      ctx.lineWidth = size * 0.035;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR + size * 0.14, 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Trailing lava-lamp droplets + curved metaball-like necks
    this._drawDroplets(ctx, size, blobCore, blobEdge, hotCore);

    // 3. Main lava-lamp fluid body
    this._computeContourPoints(time);
    this._traceContourPath(ctx);

    const gradOffX = -size * 0.24;
    const gradOffY = -size * 0.26;
    const bodyGrad = ctx.createRadialGradient(
      this.x + gradOffX,
      this.y + gradOffY,
      size * 0.08,
      this.x,
      this.y,
      size * 1.25
    );
    bodyGrad.addColorStop(0, rgbString(hotCore, 1));
    bodyGrad.addColorStop(0.36, rgbString(blobCore, 0.99));
    bodyGrad.addColorStop(0.78, rgbString(blobEdge, 0.97));
    bodyGrad.addColorStop(1, rgbString(deepEdge, 0.98));

    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Clip interior for convection bubbles & glossy liquid highlights
    ctx.save();
    ctx.clip();

    // 4. Internal convection bubbles
    this._drawConvectionBubbles(ctx, size, hotCore, blobCore, time);

    // Subtle warm bottom-right internal bounce glow
    const bounceGrad = ctx.createRadialGradient(
      this.x + size * 0.36,
      this.y + size * 0.42,
      size * 0.05,
      this.x + size * 0.36,
      this.y + size * 0.42,
      size * 0.72
    );
    bounceGrad.addColorStop(0, rgbString(hotCore, 0.32));
    bounceGrad.addColorStop(1, rgbString(hotCore, 0));
    ctx.fillStyle = bounceGrad;
    ctx.beginPath();
    ctx.arc(this.x + size * 0.36, this.y + size * 0.42, size * 0.72, 0, TWO_PI);
    ctx.fill();

    // 5. Glossy liquid top-left highlight
    ctx.save();
    ctx.translate(this.x - size * 0.33, this.y - size * 0.36);
    ctx.rotate(-0.62);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.26, size * 0.13, 0, 0, TWO_PI);
    ctx.fill();

    // Crisp secondary sparkle dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.17, size * 0.14, size * 0.065, size * 0.045, 0.3, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    ctx.restore(); // end interior clip

    // Soft luminous rim stroke
    this._traceContourPath(ctx);
    ctx.strokeStyle = this.invulnTimer > 0
      ? 'rgba(255, 255, 255, 0.58)'
      : 'rgba(255, 242, 224, 0.28)';
    ctx.lineWidth = size * (this.invulnTimer > 0 ? 0.065 : 0.042);
    ctx.stroke();

    // 6. Cute expressive face with two little teeth
    this._drawFace(ctx, size, time);

    ctx.restore();
  }

  _drawDroplets(ctx, size, blobCore, blobEdge, hotCore) {
    const bridgeMax = size * 2.05;

    for (let i = 0; i < this.droplets.length; i++) {
      const drop = this.droplets[i];
      if (i >= this.activeDroplets || drop.scale <= 0.02) continue;

      const dropR = size * drop.relRadius * drop.scale;
      const dx = drop.x - this.x;
      const dy = drop.y - this.y;
      const dist = Math.hypot(dx, dy);

      // Completely merged inside main body
      if (dist + dropR < size * 0.72) continue;

      const angle = Math.atan2(dy, dx);
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);

      // Smooth curved metaball neck/bridge when close to main body
      if (dist > size * 0.42 && dist < bridgeMax) {
        const stretchT = clamp((dist - size * 0.55) / (bridgeMax - size * 0.55), 0, 1);
        const bodyAttachDist = size * 0.64;
        const ax = this.x + Math.cos(angle) * bodyAttachDist;
        const ay = this.y + Math.sin(angle) * bodyAttachDist;

        const baseHalfW = size * (0.28 + drop.relRadius * 0.5) * (1 - stretchT * 0.55);
        const dropHalfW = dropR * (0.92 - stretchT * 0.45);
        const midX = (ax + drop.x) * 0.5;
        const midY = (ay + drop.y) * 0.5;
        // Pinch waist tighter as droplet stretches farther
        const waistHalfW = Math.min(baseHalfW, dropHalfW) * (0.58 - stretchT * 0.48);

        ctx.fillStyle = rgbString(blobEdge, 0.89 * (1 - stretchT * 0.3));
        ctx.beginPath();
        ctx.moveTo(ax + perpX * baseHalfW, ay + perpY * baseHalfW);
        ctx.quadraticCurveTo(
          midX + perpX * waistHalfW,
          midY + perpY * waistHalfW,
          drop.x + perpX * dropHalfW,
          drop.y + perpY * dropHalfW
        );
        ctx.lineTo(drop.x - perpX * dropHalfW, drop.y - perpY * dropHalfW);
        ctx.quadraticCurveTo(
          midX - perpX * waistHalfW,
          midY - perpY * waistHalfW,
          ax - perpX * baseHalfW,
          ay - perpY * baseHalfW
        );
        ctx.closePath();
        ctx.fill();
      }

      // Draw satellite wax droplet with subtle elongation along tether
      const dropGrad = ctx.createRadialGradient(
        drop.x - dropR * 0.28,
        drop.y - dropR * 0.28,
        dropR * 0.1,
        drop.x,
        drop.y,
        dropR * 1.15
      );
      dropGrad.addColorStop(0, rgbString(hotCore, 0.96));
      dropGrad.addColorStop(0.45, rgbString(blobCore, 0.95));
      dropGrad.addColorStop(1, rgbString(blobEdge, 0.95));

      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.rotate(angle);
      const elong = 1 + clamp(this._speedNorm * 0.18, 0, 0.2);
      ctx.fillStyle = dropGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, dropR * elong, dropR / Math.sqrt(elong), 0, 0, TWO_PI);
      ctx.fill();

      // Tiny glossy wax highlight on droplet
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.arc(-dropR * 0.26, -dropR * 0.26, dropR * 0.24, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawConvectionBubbles(ctx, size, hotCore, blobCore, time) {
    const outerCol = rgbString(blobCore, 0.18);
    const innerCol = rgbString(hotCore, 0.34);

    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      const ang = b.baseAngle + time * b.speed * 0.55;
      const radialDrift = b.orbitRadius * (0.75 + 0.25 * Math.sin(time * b.speed + b.phase));
      const bx = this.x + Math.cos(ang) * size * radialDrift;
      const by = this.y + Math.sin(ang * 0.85 + b.phase) * size * radialDrift;
      const br = size * b.relRadius * (0.9 + 0.14 * Math.sin(time * 1.7 + b.phase));

      ctx.fillStyle = outerCol;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TWO_PI);
      ctx.fill();

      ctx.fillStyle = innerCol;
      ctx.beginPath();
      ctx.arc(bx - br * 0.2, by - br * 0.2, br * 0.54, 0, TWO_PI);
      ctx.fill();
    }
  }

  _drawFace(ctx, size, time) {
    const lookCos = Math.cos(this.lookAngle);
    const lookSin = Math.sin(this.lookAngle);

    // Shift face smoothly toward lookAngle so eyes & mouth face the front while staying upright & adorable
    const faceOffset = size * 0.22;
    const faceX = this.x + lookCos * faceOffset;
    const faceY = this.y + lookSin * faceOffset * 0.86;

    // Gentle playful tilt based on horizontal look direction (never upside down)
    const tilt = lookSin * lookCos * 0.14;

    ctx.save();
    ctx.translate(faceX, faceY);
    ctx.rotate(tilt);

    const darkBerry = '#2e1024';
    const mouthInterior = '#42132c';
    const tonguePink = '#ff7d9e';

    const eyeSpacing = size * 0.255;
    const eyeY = -size * 0.095;
    const isHappy = this.happyTimer > 0 && this.fear < 0.35;
    const isAlarmed = this.fear > 0.35;

    // Soft rosy cheeks
    const cheekAlpha = isHappy ? 0.36 : 0.22;
    ctx.fillStyle = `rgba(255, 108, 146, ${cheekAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing * 1.24, size * 0.075, size * 0.105, size * 0.062, 0, 0, TWO_PI);
    ctx.ellipse(eyeSpacing * 1.24, size * 0.075, size * 0.105, size * 0.062, 0, 0, TWO_PI);
    ctx.fill();

    // --- EYES ---
    const blinkScale = this._blinkProgress > 0
      ? Math.max(0.08, Math.abs(Math.cos(this._blinkProgress * Math.PI)))
      : 1;

    for (let side = -1; side <= 1; side += 2) {
      const ex = side * eyeSpacing;
      const ey = eyeY;

      if (isHappy) {
        // Cute happy crescent eyes (^ ^)
        ctx.strokeStyle = darkBerry;
        ctx.lineWidth = size * 0.062;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, ey + size * 0.045, size * 0.115, Math.PI * 1.16, Math.PI * 1.84);
        ctx.stroke();
      } else {
        const baseEyeR = size * 0.132;
        const eyeR = isAlarmed ? baseEyeR * (1 + (this.fear - 0.35) * 0.32) : baseEyeR;

        // Subtle alarmed jitter
        const jx = isAlarmed ? Math.sin(time * 42 + side) * size * 0.012 * this.fear : 0;
        const jy = isAlarmed ? Math.cos(time * 38 - side) * size * 0.012 * this.fear : 0;

        ctx.save();
        ctx.translate(ex + jx, ey + jy);
        ctx.scale(1, blinkScale);

        if (isAlarmed) {
          // Widened white sclera with contracted dark pupil
          ctx.fillStyle = '#fff9f5';
          ctx.beginPath();
          ctx.arc(0, 0, eyeR, 0, TWO_PI);
          ctx.fill();

          ctx.strokeStyle = darkBerry;
          ctx.lineWidth = size * 0.028;
          ctx.stroke();

          const pupilOffset = eyeR * 0.28;
          const px = lookCos * pupilOffset;
          const py = lookSin * pupilOffset;
          const pupilR = eyeR * (0.58 - (this.fear - 0.35) * 0.18);

          ctx.fillStyle = darkBerry;
          ctx.beginPath();
          ctx.arc(px, py, pupilR, 0, TWO_PI);
          ctx.fill();

          // Crisp catchlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px - pupilR * 0.32, py - pupilR * 0.35, pupilR * 0.34, 0, TWO_PI);
          ctx.fill();
        } else {
          // Glossy dark-berry expressive eyes
          const pupilOffset = eyeR * 0.16;
          const px = lookCos * pupilOffset;
          const py = lookSin * pupilOffset;

          ctx.fillStyle = darkBerry;
          ctx.beginPath();
          ctx.ellipse(px * 0.35, py * 0.35, eyeR * 0.96, eyeR * 1.06, 0, 0, TWO_PI);
          ctx.fill();

          // Primary crisp white catchlight (top-left)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(
            px * 0.55 - eyeR * 0.28,
            py * 0.55 - eyeR * 0.32,
            eyeR * 0.36,
            0,
            TWO_PI
          );
          ctx.fill();

          // Tiny secondary sparkle catchlight (bottom-right)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(
            px * 0.55 + eyeR * 0.26,
            py * 0.55 + eyeR * 0.28,
            eyeR * 0.15,
            0,
            TWO_PI
          );
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // --- MOUTH & TWO LITTLE TEETH ---
    const mouthY = size * 0.125;
    const open = clamp(this.mouthOpen, 0, 1);

    if (isAlarmed && open < 0.22) {
      // Worried little open 'o' mouth with the two tiny teeth still peeking down
      const mw = size * 0.15;
      const mh = size * (0.11 + this.fear * 0.05);

      ctx.fillStyle = mouthInterior;
      ctx.beginPath();
      ctx.ellipse(0, mouthY + mh * 0.25, mw, mh, 0, 0, TWO_PI);
      ctx.fill();

      this._drawTwoTeeth(ctx, 0, mouthY - mh * 0.52, mw * 0.92, size * 0.068, darkBerry);

      ctx.strokeStyle = darkBerry;
      ctx.lineWidth = size * 0.036;
      ctx.beginPath();
      ctx.ellipse(0, mouthY + mh * 0.25, mw, mh, 0, 0, TWO_PI);
      ctx.stroke();
    } else if (open > 0.14) {
      // Eager open mouth approaching prey — shows the two white teeth prominently!
      const mw = size * (0.21 + open * 0.14);
      const mh = size * (0.09 + open * 0.26);
      const topY = mouthY - size * 0.025;

      // Mouth interior path (slightly curved upper lip + deep rounded lower jaw)
      const traceOpenMouth = () => {
        ctx.beginPath();
        ctx.moveTo(-mw, topY);
        ctx.quadraticCurveTo(0, topY - size * 0.035, mw, topY);
        ctx.bezierCurveTo(
          mw * 1.04,
          topY + mh * 0.95,
          mw * 0.52,
          topY + mh * 1.25,
          0,
          topY + mh * 1.25
        );
        ctx.bezierCurveTo(
          -mw * 0.52,
          topY + mh * 1.25,
          -mw * 1.04,
          topY + mh * 0.95,
          -mw,
          topY
        );
        ctx.closePath();
      };

      traceOpenMouth();
      ctx.fillStyle = mouthInterior;
      ctx.fill();

      // Clip interior for cute pink tongue & prominent two little white teeth
      ctx.save();
      traceOpenMouth();
      ctx.clip();

      // Cute little pink tongue tucked at the bottom
      ctx.fillStyle = tonguePink;
      ctx.beginPath();
      ctx.ellipse(0, topY + mh * 1.18, mw * 0.58, mh * 0.45, 0, 0, TWO_PI);
      ctx.fill();

      // Two crisp little white teeth peeking down from upper lip
      const toothLen = size * (0.088 + open * 0.048);
      this._drawTwoTeeth(ctx, 0, topY - size * 0.012, mw * 0.88, toothLen, darkBerry);

      ctx.restore();

      // Crisp dark-berry lip outline
      traceOpenMouth();
      ctx.strokeStyle = darkBerry;
      ctx.lineWidth = size * 0.038;
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      // Resting cute dark-berry curved smile with two little white teeth ALWAYS peeking down!
      const mw = size * (isHappy ? 0.24 : 0.21);
      const smileDepth = size * (isHappy ? 0.115 : 0.088);
      const topY = mouthY - size * 0.01;

      // Two crisp little white teeth peeking down from the smile line
      this._drawTwoTeeth(ctx, 0, topY + smileDepth * 0.32, mw * 0.88, size * 0.078, darkBerry);

      // Cute dark-berry curved smile over the tooth roots
      ctx.strokeStyle = darkBerry;
      ctx.lineWidth = size * 0.044;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-mw, topY);
      ctx.quadraticCurveTo(0, topY + smileDepth, mw, topY);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw the signature pair of cute little white rounded-triangular teeth
   * peeking down from the upper lip.
   */
  _drawTwoTeeth(ctx, cx, lipY, spanHalfWidth, toothHeight, outlineColor) {
    const toothOffset = spanHalfWidth * 0.44;
    const toothHalfW = Math.max(toothHeight * 0.44, spanHalfWidth * 0.2);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = toothHeight * 0.16;
    ctx.lineJoin = 'round';

    for (let side = -1; side <= 1; side += 2) {
      const tx = cx + side * toothOffset;
      const tipX = tx - side * toothHalfW * 0.1; // very slight cute inward angle
      const tipY = lipY + toothHeight;

      ctx.beginPath();
      ctx.moveTo(tx - toothHalfW, lipY);
      ctx.quadraticCurveTo(
        tx - toothHalfW * 0.55,
        lipY + toothHeight * 0.72,
        tipX,
        tipY
      );
      ctx.quadraticCurveTo(
        tx + toothHalfW * 0.55,
        lipY + toothHeight * 0.72,
        tx + toothHalfW,
        lipY
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

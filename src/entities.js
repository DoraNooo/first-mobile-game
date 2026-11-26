/**
 * GLOO — Entity & EcosystemManager
 * Procedural bioluminescent Canvas 2D renderer for all 30 species across 6 scales,
 * plus wild ecosystem spawning, seamless scale blending, prey flee & predator pursuit AI.
 */

import { SCALES, NUM_SCALES, scaleIndexToStartSize, sizeToProgress } from './scales.js';
import { drawMicroSkin } from './skins/microSkins.js';
import { drawMacroSkin } from './skins/macroSkins.js';
import { drawCosmicSkin } from './skins/cosmicSkins.js';

const DESKTOP_TARGET_POPULATION = 42;
const MOBILE_TARGET_POPULATION = 26;

const DIFFICULTY_PRESETS = {
  toddler: { preyRatio: 0.86, speedScale: 0.58, preyFlee: false, predatorChase: false, chaseSpeedMult: 0, showDangerHalo: false },
  chill: { preyRatio: 0.66, speedScale: 1.0, preyFlee: true, predatorChase: true, chaseSpeedMult: 1.0, showDangerHalo: true },
  wild: { preyRatio: 0.56, speedScale: 1.18, preyFlee: true, predatorChase: true, chaseSpeedMult: 1.14, showDangerHalo: true },
};

const EDIBLE_RATIO = 0.94;
const PREDATOR_RATIO = 1.06;

const TWO_PI = Math.PI * 2;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function angleDiff(from, to) {
  let d = (to - from + Math.PI) % TWO_PI - Math.PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

function lerpAngle(from, to, t) {
  return from + angleDiff(from, to) * clamp(t, 0, 1);
}

/**
 * Single living creature or cosmic body in world space.
 */
export class Entity {
  constructor({
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    size = 10,
    angle = 0,
    spin = 0,
    phase = 0,
    species,
    scaleIndex = 0,
    alpha = 0,
  }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.angle = angle;
    this.spin = spin;
    this.phase = phase;
    this.species = species;
    this.scaleIndex = scaleIndex;
    this.alpha = alpha;
    this.alive = true;
    this.chaseTimer = 0;
    this.fleeTimer = 0;

    // Internal AI state
    this._despawning = false;
    this._wanderAngle = angle;
    this._wanderTimer = rand(0.6, 2.4);
    this._dartTimer = rand(0.3, 1.4);
    this._orbitDir = Math.random() < 0.5 ? 1 : -1;
  }
}

/**
 * Manages the living ecosystem around the player across all 6 scales.
 */
export class EcosystemManager {
  constructor() {
    this.entities = [];
    this._time = 0;
    this._lastViewW = 0;
    this._lastViewH = 0;
    this.difficulty = 'chill';
    this._diffCfg = DIFFICULTY_PRESETS.chill;
    this.targetPopulation = DESKTOP_TARGET_POPULATION;
    this.minPopulation = 36;
    this.maxPopulation = 46;
  }

  setMobileMode(isMobile) {
    this.setPopulationCap(isMobile ? MOBILE_TARGET_POPULATION : DESKTOP_TARGET_POPULATION);
  }

  setPopulationCap(target) {
    const t = Math.max(14, Math.min(50, Math.round(target)));
    this.targetPopulation = t;
    this.minPopulation = Math.max(10, t - 4);
    this.maxPopulation = t + 4;
  }

  setDifficulty(mode) {
    this.difficulty = DIFFICULTY_PRESETS[mode] ? mode : 'chill';
    this._diffCfg = DIFFICULTY_PRESETS[this.difficulty];
  }

  /**
   * Reset and seed an inviting, balanced ecosystem around the player.
   */
  reset(player) {
    this.entities.length = 0;
    this._time = 0;
    if (!player) return;

    const progress = sizeToProgress(player.size);
    const viewW = this._lastViewW > 0 ? this._lastViewW : player.size * 26;
    const viewH = this._lastViewH > 0 ? this._lastViewH : player.size * 26;
    const viewRadius = Math.hypot(viewW, viewH) * 0.5;

    for (let i = 0; i < this.targetPopulation; i++) {
      const wantPrey = i < Math.round(this.targetPopulation * this._diffCfg.preyRatio);
      const minDist = wantPrey ? player.size * 3.4 : player.size * 6.8;
      const maxDist = Math.max(minDist * 1.4, viewRadius * 1.15);
      const dist = rand(minDist, maxDist);
      const entity = this._createEntity(player, progress, wantPrey, dist, true);
      if (entity) {
        this.entities.push(entity);
      }
    }
  }

  /**
   * Smoothly dissolve entities belonging to older scales during a cinematic transition veil.
   */
  dissolveOldScale(targetScaleIdx) {
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.scaleIndex < targetScaleIdx) {
        e._despawning = true;
      }
    }
  }

  /**
   * Seed fresh, recognizable species of the newly entered scale at safe distances
   * so they emerge cleanly as the luminous transition veil parts.
   */
  seedScale(player, scaleIdx) {
    if (!player) return;
    // Remove any remaining old-scale entities immediately at the peak of the veil
    for (let i = this.entities.length - 1; i >= 0; i--) {
      if (this.entities[i].scaleIndex < scaleIdx) {
        this.entities.splice(i, 1);
      }
    }

    const viewW = this._lastViewW > 0 ? this._lastViewW : player.size * 26;
    const viewH = this._lastViewH > 0 ? this._lastViewH : player.size * 26;
    const viewRadius = Math.hypot(viewW, viewH) * 0.5;
    const needed = Math.max(0, this.targetPopulation - this.entities.length);

    for (let i = 0; i < needed; i++) {
      const wantPrey = i < Math.round(needed * this._diffCfg.preyRatio);
      const minDist = wantPrey ? player.size * 3.6 : player.size * 7.2;
      const maxDist = Math.max(minDist * 1.4, viewRadius * 1.15);
      const dist = rand(minDist, maxDist);
      const ent = this._createEntity(player, scaleIdx + 0.15, wantPrey, dist, false, true);
      if (ent) {
        this.entities.push(ent);
      }
    }
  }

  /**
   * Mark an entity as consumed/removed immediately.
   */
  removeEntity(entity) {
    if (!entity) return;
    entity.alive = false;
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
    }
  }

  /**
   * Update ecosystem population, despawning, edge spawning, and wild creature AI.
   * Returns { nearestPrey, nearestPredator, predatorChasing }.
   */
  update(dt, player, viewWidthWorld, viewHeightWorld, currentProgress) {
    const step = clamp(dt || 0, 0, 0.05);
    this._time += step;

    if (!player) {
      return { nearestPrey: null, nearestPredator: null, predatorChasing: false };
    }

    const viewW = Math.max(player.size * 12, viewWidthWorld || player.size * 24);
    const viewH = Math.max(player.size * 12, viewHeightWorld || player.size * 24);
    this._lastViewW = viewW;
    this._lastViewH = viewH;

    const progress = Number.isFinite(currentProgress)
      ? currentProgress
      : sizeToProgress(player.size);

    const viewRadius = Math.hypot(viewW, viewH) * 0.5;
    const fadeOutDist = viewRadius * 1.32;
    const hardDespawnDist = viewRadius * 1.5;

    // Calibrate speeds to player so predators are tense yet always dodgeable
    const playerMaxSpeed =
      player.maxSpeed && player.maxSpeed > 0 ? player.maxSpeed : player.size * 4.2;

    let nearestPrey = null;
    let nearestPreyDistSq = Infinity;
    let nearestPredator = null;
    let nearestPredatorDistSq = Infinity;
    let predatorChasing = false;

    let preyCount = 0;
    let predatorCount = 0;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.alive) {
        this.entities.splice(i, 1);
        continue;
      }

      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq) || 0.0001;

      const sizeRatio = e.size / player.size;

      // Mark tiny (< 4% of player), overly gigantic, or far-out entities for smooth despawn
      if (sizeRatio < 0.04 || sizeRatio > 5.4 || dist > fadeOutDist) {
        e._despawning = true;
      }

      if (e._despawning) {
        e.alpha = Math.max(0, e.alpha - step * 2.4);
        if (e.alpha <= 0.01 || dist > hardDespawnDist) {
          this.entities.splice(i, 1);
          continue;
        }
      } else {
        e.alpha = Math.min(1, e.alpha + step * 2.8);
      }

      const isEdible = sizeRatio < EDIBLE_RATIO;
      const isPredator = sizeRatio > PREDATOR_RATIO;
      if (isEdible) preyCount++;
      else if (isPredator) predatorCount++;

      // Track nearest prey / predator for player facial expressions & audio heartbeat
      if (!e._despawning) {
        if (isEdible && distSq < nearestPreyDistSq) {
          nearestPreyDistSq = distSq;
          nearestPrey = e;
        } else if (isPredator && distSq < nearestPredatorDistSq) {
          nearestPredatorDistSq = distSq;
          nearestPredator = e;
        }
      }

      // --- AI Steering ---
      const sp = e.species;
      const speedMult = sp.speed || 1;
      const isPassiveStatic =
        sp.kind === 'tree' || sp.kind === 'house' || sp.kind === 'dewdrop';

      const diff = this._diffCfg;
      const fleeSense = player.size * 4.8 + e.size * 1.4;
      const chaseSense = e.size * 2.6 + player.size * 4.6;
      const canChase =
        diff.predatorChase &&
        isPredator &&
        !isPassiveStatic &&
        (sp.behavior === 'predator' || sizeRatio > 1.32);

      let desiredVx = e.vx;
      let desiredVy = e.vy;
      let steerRate = 3.2;

      if (diff.preyFlee && isEdible && !isPassiveStatic && dist < fleeSense) {
        // Prey darts away gently with a playful organic weave
        e.fleeTimer = Math.min(2.0, e.fleeTimer + step * 2.2);
        e.chaseTimer = Math.max(0, e.chaseTimer - step * 2.5);

        const awayAngle = Math.atan2(dy, dx);
        const weave = Math.sin(this._time * 6.5 + e.phase) * 0.34;
        const fleeAngle = awayAngle + weave;
        const fleeSpeed = playerMaxSpeed * clamp(0.36 + speedMult * 0.22, 0.32, 0.68) * diff.speedScale;
        desiredVx = Math.cos(fleeAngle) * fleeSpeed;
        desiredVy = Math.sin(fleeAngle) * fleeSpeed;
        steerRate = 5.4;
      } else if (canChase && dist < chaseSense) {
        // Predator locks on and pursues — always slightly slower than player max speed
        e.chaseTimer = Math.min(2.5, e.chaseTimer + step * 2.0);
        e.fleeTimer = Math.max(0, e.fleeTimer - step * 2.5);
        predatorChasing = true;

        const toPlayerAngle = Math.atan2(-dy, -dx);
        const chaseSpeed = playerMaxSpeed * clamp((0.52 + speedMult * 0.22) * diff.chaseSpeedMult, 0.56, 0.92);
        desiredVx = Math.cos(toPlayerAngle) * chaseSpeed;
        desiredVy = Math.sin(toPlayerAngle) * chaseSpeed;
        // Turn inertia allows skilled player swerves to dodge cleanly
        steerRate = 2.65 * diff.chaseSpeedMult;
      } else {
        // Ambient species-specific locomotion
        e.chaseTimer = Math.max(0, e.chaseTimer - step * 1.6);
        e.fleeTimer = Math.max(0, e.fleeTimer - step * 1.8);

        const baseSpeed = playerMaxSpeed * (0.16 + speedMult * 0.16) * diff.speedScale;
        const beh = sp.behavior;

        if (beh === 'orbit') {
          e._wanderAngle += e._orbitDir * (0.55 + speedMult * 0.25) * step;
          desiredVx = Math.cos(e._wanderAngle) * baseSpeed;
          desiredVy = Math.sin(e._wanderAngle) * baseSpeed;
        } else if (beh === 'dart') {
          e._dartTimer -= step;
          if (e._dartTimer <= 0) {
            e._dartTimer = rand(0.9, 2.0);
            e._wanderAngle += rand(-1.35, 1.35);
          }
          const burst = e._dartTimer > 0.7 ? 1.55 : 0.45;
          desiredVx = Math.cos(e._wanderAngle) * baseSpeed * burst;
          desiredVy = Math.sin(e._wanderAngle) * baseSpeed * burst;
          steerRate = 4.6;
        } else if (beh === 'wiggle') {
          e._wanderTimer -= step;
          if (e._wanderTimer <= 0) {
            e._wanderTimer = rand(1.4, 3.0);
            e._wanderAngle += rand(-1.1, 1.1);
          }
          const slither = Math.sin(this._time * 7.5 + e.phase) * 0.55;
          const a = e._wanderAngle + slither;
          desiredVx = Math.cos(a) * baseSpeed * 1.05;
          desiredVy = Math.sin(a) * baseSpeed * 1.05;
        } else if (beh === 'glide') {
          e._wanderAngle += Math.sin(this._time * 0.9 + e.phase) * 0.65 * step;
          desiredVx = Math.cos(e._wanderAngle) * baseSpeed * 1.12;
          desiredVy = Math.sin(e._wanderAngle) * baseSpeed * 1.12;
        } else if (beh === 'drift') {
          e._wanderAngle += Math.sin(this._time * 0.5 + e.phase) * 0.35 * step;
          desiredVx = Math.cos(e._wanderAngle) * baseSpeed * 0.55;
          desiredVy = Math.sin(e._wanderAngle) * baseSpeed * 0.55;
          steerRate = 2.0;
        } else {
          // 'roam' and patrolling 'predator'
          e._wanderTimer -= step;
          if (e._wanderTimer <= 0) {
            e._wanderTimer = rand(1.5, 3.4);
            e._wanderAngle += rand(-1.25, 1.25);
          }
          desiredVx = Math.cos(e._wanderAngle) * baseSpeed * 0.92;
          desiredVy = Math.sin(e._wanderAngle) * baseSpeed * 0.92;
        }
      }

      const blend = 1 - Math.exp(-steerRate * step);
      e.vx += (desiredVx - e.vx) * blend;
      e.vy += (desiredVy - e.vy) * blend;
      e.x += e.vx * step;
      e.y += e.vy * step;

      // Update visual heading / spin
      const spdSq = e.vx * e.vx + e.vy * e.vy;
      if (isDirectionalSpecies(sp.kind) && spdSq > 0.001) {
        const moveAngle = Math.atan2(e.vy, e.vx);
        e.angle = lerpAngle(e.angle, moveAngle, 1 - Math.exp(-8 * step));
      } else {
        e.angle += e.spin * step;
      }
    }

    // --- Maintain balanced population around viewport edge ---
    const needed = this.targetPopulation - this.entities.length;
    if (needed > 0 && this.entities.length < this.maxPopulation) {
      const spawnsThisFrame = Math.min(needed, this.entities.length < this.minPopulation ? 4 : 2);
      for (let s = 0; s < spawnsThisFrame; s++) {
        const total = preyCount + predatorCount;
        const currentPreyRatio = total > 0 ? preyCount / total : 0;
        const wantPrey =
          progress >= NUM_SCALES - 0.08
            ? Math.random() < 0.85
            : currentPreyRatio < this._diffCfg.preyRatio;

        const spawnDist = rand(viewRadius * 1.04, viewRadius * 1.26);
        const ent = this._createEntity(player, progress, wantPrey, spawnDist, false);
        if (ent) {
          this.entities.push(ent);
          if (wantPrey) preyCount++;
          else predatorCount++;
        }
      }
    }

    return {
      nearestPrey,
      nearestPredator,
      predatorChasing,
    };
  }

  /**
   * Create a new entity seamlessly chosen from the current or adjacent scales.
   */
  _createEntity(player, progress, wantPrey, spawnDist, initialVisible, strictScale = false) {
    const scaleIdx = clamp(Math.floor(progress), 0, NUM_SCALES - 1);
    const minRatio = wantPrey ? 0.24 : 1.12;
    const maxRatio = wantPrey ? 0.89 : 2.28;

    // Collect candidate species from current scale (and adjacent scales unless strictScale)
    const candidateScales = [scaleIdx];
    if (!strictScale) {
      if (scaleIdx > 0) candidateScales.push(scaleIdx - 1);
      if (scaleIdx < NUM_SCALES - 1) candidateScales.push(scaleIdx + 1);
    }

    const naturalMatches = [];
    const fallbackMatches = [];

    for (let c = 0; c < candidateScales.length; c++) {
      const sIdx = candidateScales[c];
      const scaleDef = SCALES[sIdx];
      const startSize = scaleIndexToStartSize(sIdx);

      for (let k = 0; k < scaleDef.species.length; k++) {
        const sp = scaleDef.species[k];
        const canonicalSize = startSize * sp.relSize;
        const ratio = canonicalSize / player.size;

        if (ratio >= minRatio * 0.84 && ratio <= maxRatio * 1.16) {
          // Strong preference for native species of the current scale
          const weight =
            (sIdx === scaleIdx ? 3.2 : 0.75) *
            (!wantPrey && sp.behavior === 'predator' ? 1.8 : 1.0);
          naturalMatches.push({ sp, sIdx, canonicalSize, weight });
        } else {
          fallbackMatches.push({
            sp,
            sIdx,
            canonicalSize,
            dist: Math.abs(Math.log(Math.max(0.01, ratio) / ((minRatio + maxRatio) * 0.5))),
          });
        }
      }
    }

    let chosen;
    let finalSize;

    if (naturalMatches.length > 0) {
      let totalW = 0;
      for (let i = 0; i < naturalMatches.length; i++) totalW += naturalMatches[i].weight;
      let pick = Math.random() * totalW;
      chosen = naturalMatches[naturalMatches.length - 1];
      for (let i = 0; i < naturalMatches.length; i++) {
        pick -= naturalMatches[i].weight;
        if (pick <= 0) {
          chosen = naturalMatches[i];
          break;
        }
      }
      const jitter = rand(0.9, 1.1);
      finalSize = clamp(
        chosen.canonicalSize * jitter,
        player.size * minRatio,
        player.size * maxRatio
      );
    } else {
      fallbackMatches.sort((a, b) => a.dist - b.dist);
      chosen = fallbackMatches[0];
      finalSize = player.size * rand(minRatio, maxRatio);
    }

    // Bias spawn slightly ahead of player's velocity for a rich sense of exploration
    let spawnAngle = Math.random() * TWO_PI;
    const pvx = player.vx || 0;
    const pvy = player.vy || 0;
    if (!initialVisible && pvx * pvx + pvy * pvy > player.size * player.size * 0.25 && Math.random() < 0.62) {
      spawnAngle = Math.atan2(pvy, pvx) + rand(-1.35, 1.35);
    }

    const x = player.x + Math.cos(spawnAngle) * spawnDist;
    const y = player.y + Math.sin(spawnAngle) * spawnDist;

    // Initial gentle drift generally inward or tangential
    const inward = spawnAngle + Math.PI + rand(-1.1, 1.1);
    const initSpeed = player.size * (0.45 + (chosen.sp.speed || 1) * 0.45);
    const vx = Math.cos(inward) * initSpeed;
    const vy = Math.sin(inward) * initSpeed;

    return new Entity({
      x,
      y,
      vx,
      vy,
      size: finalSize,
      angle: isDirectionalSpecies(chosen.sp.kind) ? inward : rand(0, TWO_PI),
      spin: rand(-0.65, 0.65),
      phase: rand(0, TWO_PI),
      species: chosen.sp,
      scaleIndex: chosen.sIdx,
      alpha: initialVisible ? 1 : 0,
    });
  }

  /**
   * Render all visible living entities with gameplay readability halos,
   * viewport culling, and LOD fast-path for tiny distant specks.
   */
  draw(ctx, player, time = 0, viewBounds = null) {
    if (this.entities.length === 0) return;

    const px = player ? player.x : 0;
    const py = player ? player.y : 0;
    const pSize = player ? player.size : 10;

    const hasCull = viewBounds !== null;
    const minX = hasCull ? viewBounds.minX : -Infinity;
    const maxX = hasCull ? viewBounds.maxX : Infinity;
    const minY = hasCull ? viewBounds.minY : -Infinity;
    const maxY = hasCull ? viewBounds.maxY : Infinity;
    const zoom = hasCull && viewBounds.zoom > 0 ? viewBounds.zoom : 0;

    // Sort smaller first so imposing predators render crisply above tiny prey
    this.entities.sort((a, b) => a.size - b.size);

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.alive || e.alpha <= 0.01) continue;

      // Fast AABB viewport culling (skip completely offscreen entities)
      if (hasCull) {
        const pad = e.species.kind === 'comet' ? e.size * 4.5 : e.size * 2.2;
        if (e.x + pad < minX || e.x - pad > maxX || e.y + pad < minY || e.y - pad > maxY) {
          continue;
        }
      }

      const dx = e.x - px;
      const dy = e.y - py;
      const distSq = dx * dx + dy * dy;
      const sizeRatio = e.size / pSize;

      // LOD fast-path: skip 40+ canvas calls for tiny sub-5px specks
      if (zoom > 0 && e.size * zoom < 5) {
        ctx.save();
        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = e.species.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 0.92, 0, TWO_PI);
        ctx.fill();
        if (e.species.accent) {
          ctx.fillStyle = e.species.accent;
          ctx.beginPath();
          ctx.arc(e.x - e.size * 0.2, e.y - e.size * 0.2, e.size * 0.36, 0, TWO_PI);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.globalAlpha = e.alpha;
      ctx.translate(e.x, e.y);

      // --- Gameplay Readability Halos ---
      if (sizeRatio < EDIBLE_RATIO) {
        const edibleRange = pSize * 7.2 + e.size;
        if (distSq < edibleRange * edibleRange) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - dist / edibleRange;
          const pulse = 0.65 + 0.35 * Math.sin(time * 4.2 + e.phase);
          const rimAlpha = proximity * proximity * 0.34 * pulse;
          if (rimAlpha > 0.015) {
            ctx.save();
            ctx.strokeStyle = e.species.accent || '#a7f3d0';
            ctx.globalAlpha = e.alpha * rimAlpha;
            ctx.lineWidth = Math.max(0.8, e.size * 0.11);
            ctx.beginPath();
            ctx.arc(0, 0, e.size * (1.2 + 0.08 * pulse), 0, TWO_PI);
            ctx.stroke();
            ctx.restore();
          }
        }
      } else if (this._diffCfg.showDangerHalo && sizeRatio > PREDATOR_RATIO) {
        const warnRange = e.size * 3.4 + pSize * 6.5;
        if (distSq < warnRange * warnRange) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - dist / warnRange;
          const chaseBoost = e.chaseTimer > 0 ? 1.35 : 1.0;
          const pulseSpeed = e.chaseTimer > 0 ? 6.5 : 3.6;
          const pulse = 0.6 + 0.4 * Math.sin(time * pulseSpeed + e.phase);
          const warnAlpha = Math.min(0.45, proximity * 0.28 * pulse * chaseBoost);

          if (warnAlpha > 0.015) {
            ctx.save();
            // Soft warm coral-red outer aura
            ctx.fillStyle = `rgba(255, 102, 102, ${(warnAlpha * 0.38).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(0, 0, e.size * (1.42 + 0.1 * pulse), 0, TWO_PI);
            ctx.fill();

            // Tasteful thin coral warning ring
            ctx.strokeStyle = `rgba(255, 118, 118, ${(warnAlpha * 1.15).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, e.size * 0.075);
            ctx.beginPath();
            ctx.arc(0, 0, e.size * (1.22 + 0.07 * pulse), 0, TWO_PI);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // --- Handcrafted Species Renderer ---
      drawSpecies(ctx, e, time);

      ctx.restore();
    }
  }
}

/* ============================================================================
 * Directional lookup
 * ========================================================================== */

function isDirectionalSpecies(kind) {
  switch (kind) {
    case 'electron':
    case 'photon':
    case 'bacteria':
    case 'tardigrade':
    case 'ant':
    case 'firefly':
    case 'ladybug':
    case 'moth':
    case 'frog':
    case 'owl':
    case 'car':
    case 'helicopter':
    case 'blimp':
    case 'comet':
      return true;
    default:
      return false;
  }
}

/* ============================================================================
 * Handcrafted Procedural Canvas 2D Renderers for all 30 Species
 * ========================================================================== */

const _spriteCache = new Map();
const SPRITE_FRAMES = 4;

function _getSpeciesSprites(kind, col, acc) {
  if (typeof document === 'undefined') return null;
  const key = `${kind}|${col}|${acc}`;
  let entry = _spriteCache.get(key);
  if (entry) return entry;

  // Give long-tailed/wide species extra canvas margin so tails, rotors & wings never clip
  const wide =
    kind === 'comet' ||
    kind === 'photon' ||
    kind === 'bacteria' ||
    kind === 'ringed' ||
    kind === 'car' ||
    kind === 'owl' ||
    kind === 'helicopter' ||
    kind === 'blimp';
  const dim = wide ? 160 : 128;
  const spriteR = wide ? 30 : 34;
  const half = dim * 0.5;
  const scaleFactor = half / spriteR;
  const frames = [];

  for (let f = 0; f < SPRITE_FRAMES; f++) {
    const c = document.createElement('canvas');
    c.width = dim;
    c.height = dim;
    const sctx = c.getContext('2d');
    if (!sctx) return null;
    sctx.translate(half, half);
    const ph = (f / SPRITE_FRAMES) * TWO_PI;
    const t = f * 0.45;
    const drawn =
      drawMicroSkin(sctx, kind, spriteR, ph, t, col, acc) ||
      drawMacroSkin(sctx, kind, spriteR, ph, t, col, acc) ||
      drawCosmicSkin(sctx, kind, spriteR, ph, t, col, acc);
    if (!drawn) {
      sctx.fillStyle = col;
      sctx.beginPath();
      sctx.arc(0, 0, spriteR * 0.85, 0, TWO_PI);
      sctx.fill();
    }
    frames.push(c);
  }

  entry = { frames, scaleFactor };
  _spriteCache.set(key, entry);
  return entry;
}

function drawSpecies(ctx, e, time) {
  const r = e.size;
  const col = e.species.color;
  const acc = e.species.accent;
  const ph = e.phase;
  const kind = e.species.kind;

  if (isDirectionalSpecies(kind)) {
    ctx.rotate(e.angle);
  }

  // Fast 4-frame offscreen sprite blit (1 drawImage call, zero per-frame GPU gradients/clips!)
  const cached = _getSpeciesSprites(kind, col, acc);
  if (cached) {
    const idx = Math.floor((((time * 2.2 + ph) % TWO_PI) + TWO_PI) / TWO_PI * SPRITE_FRAMES) & 3;
    const drawHalf = r * cached.scaleFactor;
    ctx.drawImage(cached.frames[idx], -drawHalf, -drawHalf, drawHalf * 2, drawHalf * 2);
    return;
  }

  // Fallback for non-DOM environments (Node smoke tests)
  const drawn =
    drawMicroSkin(ctx, kind, r, ph, time, col, acc) ||
    drawMacroSkin(ctx, kind, r, ph, time, col, acc) ||
    drawCosmicSkin(ctx, kind, r, ph, time, col, acc);
  if (!drawn) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, TWO_PI);
    ctx.fill();
  }
}

/* ============================================================================
 * CHARLIE — Scale I (Quantum) & Scale II (Microscopic) Procedural Skins
 * ----------------------------------------------------------------------------
 * Storybook-bioluminescent Canvas 2D illustrations (Kurzgesagt / Ori / LocoRoco)
 * - Layered radial & linear gradients, 3D specular highlights, translucent
 *   membranes, rim lighting, subtle organic animations, clear silhouettes.
 * - Purely relative to `r` (scales cleanly from r = 3 to r = 50000).
 * - ZERO `ctx.shadowBlur` for rock-solid 60 FPS on mobile GPUs.
 * - Caller pre-translates ctx to (0, 0) and rotates by entity.angle (+X forward).
 * ========================================================================== */

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;

/* --------------------------------------------------------------------------
 * Color Utilities (cached hex parsing for zero GC pressure in render loop)
 * ------------------------------------------------------------------------ */

const rgbCache = new Map();

function parseHex(hex, fallback) {
  if (typeof hex !== 'string') return fallback;
  let cached = rgbCache.get(hex);
  if (cached) return cached;

  let clean = hex.trim();
  if (clean.charCodeAt(0) === 35) clean = clean.slice(1); // '#'
  if (clean.length === 3) {
    clean =
      clean[0] + clean[0] +
      clean[1] + clean[1] +
      clean[2] + clean[2];
  }
  if (clean.length !== 6) return fallback;

  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return fallback;

  cached = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  rgbCache.set(hex, cached);
  return cached;
}

function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function mixRgb(a, b, t) {
  const u = 1 - t;
  return [
    Math.round(a[0] * u + b[0] * t),
    Math.round(a[1] * u + b[1] * t),
    Math.round(a[2] * u + b[2] * t),
  ];
}

function shadeRgb(rgb, factor) {
  // factor < 1 darkens toward deep indigo-slate; factor > 1 brightens toward white
  if (factor < 1) {
    const deep = [14, 20, 42];
    return mixRgb(deep, rgb, Math.max(0, factor));
  }
  const white = [255, 255, 255];
  return mixRgb(rgb, white, Math.min(1, factor - 1));
}

/* --------------------------------------------------------------------------
 * Shared Storybook-Bioluminescent Primitives (No shadowBlur!)
 * ------------------------------------------------------------------------ */

/** Soft multi-stop radial bioluminescent halo. */
function drawHalo(ctx, x, y, rad, rgb, peakAlpha = 0.28) {
  if (rad <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, rgba(rgb, peakAlpha));
  g.addColorStop(0.45, rgba(rgb, peakAlpha * 0.42));
  g.addColorStop(0.78, rgba(rgb, peakAlpha * 0.1));
  g.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, TWO_PI);
  ctx.fill();
}

/** 3D-shaded glossy storybook orb with rim light and crisp specular gleam. */
function drawGlossyOrb(ctx, x, y, rad, baseRgb, accentRgb, options = null) {
  if (rad <= 0) return;
  const deep = options && options.deep ? options.deep : shadeRgb(baseRgb, 0.42);
  const translucent = options && options.translucent ? options.translucent : 1;
  const rimAlpha = options && options.rimAlpha !== undefined ? options.rimAlpha : 0.72;
  const specScale = options && options.specScale !== undefined ? options.specScale : 1;

  // Main 3D sphere shading (light from top-left)
  const gx = x - rad * 0.3;
  const gy = y - rad * 0.32;
  const grad = ctx.createRadialGradient(gx, gy, rad * 0.08, x, y, rad);
  grad.addColorStop(0, rgba(accentRgb, 0.96 * translucent));
  grad.addColorStop(0.48, rgba(baseRgb, 0.92 * translucent));
  grad.addColorStop(0.84, rgba(deep, 0.94 * translucent));
  grad.addColorStop(1, rgba(mixRgb(deep, accentRgb, 0.35), 0.9 * translucent));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, TWO_PI);
  ctx.fill();

  // Subtle bottom-right bounce rim glow
  const bounce = ctx.createRadialGradient(
    x + rad * 0.32,
    y + rad * 0.34,
    rad * 0.05,
    x + rad * 0.25,
    y + rad * 0.25,
    rad * 0.78
  );
  bounce.addColorStop(0, rgba(accentRgb, 0.32 * translucent));
  bounce.addColorStop(1, rgba(accentRgb, 0));
  ctx.fillStyle = bounce;
  ctx.beginPath();
  ctx.arc(x, y, rad * 0.96, 0, TWO_PI);
  ctx.fill();

  // Crisp luminous rim contour
  if (rimAlpha > 0) {
    ctx.strokeStyle = rgba(accentRgb, rimAlpha * translucent);
    ctx.lineWidth = Math.max(rad * 0.075, 0.001);
    ctx.beginPath();
    ctx.arc(x, y, rad * 0.96, 0, TWO_PI);
    ctx.stroke();
  }

  // Primary tilted elliptical specular highlight (top-left)
  if (specScale > 0) {
    ctx.save();
    ctx.translate(x - rad * 0.32, y - rad * 0.32);
    ctx.rotate(-0.68);
    ctx.fillStyle = `rgba(255,255,255,${0.86 * translucent})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.27 * specScale, rad * 0.14 * specScale, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Secondary crisp pinpoint glint
    ctx.fillStyle = `rgba(255,255,255,${0.65 * translucent})`;
    ctx.beginPath();
    ctx.arc(x - rad * 0.12, y - rad * 0.52, rad * 0.07 * specScale, 0, TWO_PI);
    ctx.fill();
  }
}

/** Crisp 4-point star sparkle glint. */
function drawStarGlint(ctx, x, y, rad, rgb, alpha = 0.92, rot = 0) {
  if (rad <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.fillStyle = rgba(rgb, alpha);
  ctx.beginPath();
  const inner = rad * 0.24;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d = i % 2 === 0 ? rad : inner;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Cute glossy storybook eye with white catchlight + secondary sparkle. */
function drawGlossyEye(ctx, x, y, rad) {
  // Subtle dark socket halo
  ctx.fillStyle = 'rgba(20,16,32,0.28)';
  ctx.beginPath();
  ctx.arc(x, y, rad * 1.18, 0, TWO_PI);
  ctx.fill();

  // Glossy deep obsidian-indigo pupil
  const g = ctx.createRadialGradient(
    x - rad * 0.22,
    y - rad * 0.22,
    rad * 0.05,
    x,
    y,
    rad
  );
  g.addColorStop(0, '#312e4a');
  g.addColorStop(0.55, '#131122');
  g.addColorStop(1, '#06050c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, TWO_PI);
  ctx.fill();

  // Primary white catchlight (top-left)
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.34, 0, TWO_PI);
  ctx.fill();

  // Tiny secondary catchlight (bottom-right)
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(x + rad * 0.26, y + rad * 0.26, rad * 0.14, 0, TWO_PI);
  ctx.fill();
}

/** Smooth closed quadratic spline passing through midpoints of pts array. */
function traceClosedSpline(ctx, pts) {
  const n = pts.length;
  if (n < 3) return;
  const last = pts[n - 1];
  const first = pts[0];
  ctx.beginPath();
  ctx.moveTo((last[0] + first[0]) * 0.5, (last[1] + first[1]) * 0.5);
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + next[0]) * 0.5, (cur[1] + next[1]) * 0.5);
  }
  ctx.closePath();
}

/** Pill / capsule path centered at (0, 0) along X axis. */
function traceCapsule(ctx, halfLen, rad) {
  ctx.beginPath();
  ctx.arc(halfLen, 0, rad, -HALF_PI, HALF_PI);
  ctx.arc(-halfLen, 0, rad, HALF_PI, -HALF_PI);
  ctx.closePath();
}

/* ============================================================================
 * SCALE I: QUANTUM (quark, electron, photon, atom, molecule)
 * ========================================================================== */

/**
 * 1. QUARK
 * Glowing faceted tri-crystal prism cluster orbiting a warm luminous core,
 * with shimmering energy ribbons connecting the 3 glowing shards and crisp
 * white specular facets.
 */
function drawQuark(ctx, r, ph, time, baseRgb, accRgb) {
  const warmCore = [255, 224, 150];
  const warmAmber = [251, 146, 60];
  const deepFacet = shadeRgb(baseRgb, 0.38);
  const brightFacet = shadeRgb(accRgb, 1.35);

  const pulse = 1 + Math.sin(time * 4.2 + ph) * 0.06;
  const spin = time * 1.35 + ph;

  // Outer bioluminescent aura
  drawHalo(ctx, 0, 0, r * 1.8, baseRgb, 0.24);
  drawHalo(ctx, 0, 0, r * 0.95 * pulse, warmCore, 0.36);

  // Compute 3 orbiting crystal centers
  const orbitR = r * (0.5 + Math.sin(time * 3.1 + ph) * 0.045);
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * TWO_PI) / 3;
    pts.push([Math.cos(a) * orbitR, Math.sin(a) * orbitR, a]);
  }

  // Shimmering gluon energy ribbons connecting the 3 shards
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % 3];
    const midA = p0[2] + Math.PI / 3;
    const bow = r * (0.36 + Math.sin(time * 5.2 + ph + i * 2.1) * 0.09);
    const cx = Math.cos(midA) * bow;
    const cy = Math.sin(midA) * bow;

    // Soft outer ribbon glow
    ctx.strokeStyle = rgba(baseRgb, 0.34);
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(cx, cy, p1[0], p1[1]);
    ctx.stroke();

    // Crisp luminous inner energy filament
    ctx.strokeStyle = rgba(accRgb, 0.85);
    ctx.lineWidth = r * 0.055;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(cx, cy, p1[0], p1[1]);
    ctx.stroke();

    // Tiny traveling energy bead along each ribbon
    const u = (time * 0.85 + ph * 0.3 + i * 0.33) % 1;
    const inv = 1 - u;
    const bx = inv * inv * p0[0] + 2 * inv * u * cx + u * u * p1[0];
    const by = inv * inv * p0[1] + 2 * inv * u * cy + u * u * p1[1];
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.065, 0, TWO_PI);
    ctx.fill();
  }

  // Warm luminous central core
  const coreR = r * 0.3 * pulse;
  const cg = ctx.createRadialGradient(-coreR * 0.2, -coreR * 0.2, 0, 0, 0, coreR);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(0.45, rgba(warmCore, 0.96));
  cg.addColorStop(0.85, rgba(warmAmber, 0.82));
  cg.addColorStop(1, rgba(warmAmber, 0));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.2, 0, TWO_PI);
  ctx.fill();

  // 3 Faceted crystal prism shards
  for (let i = 0; i < 3; i++) {
    const [sx, sy, a] = pts[i];
    const shardTint = i === 0 ? mixRgb(baseRgb, accRgb, 0.35) : i === 1 ? baseRgb : mixRgb(baseRgb, [165, 180, 252], 0.25);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);

    // Local crystal glow
    drawHalo(ctx, 0, 0, r * 0.56, shardTint, 0.32);

    const tip = r * 0.52;
    const back = -r * 0.28;
    const side = r * 0.3;

    // Upper sunlit facet
    ctx.fillStyle = rgba(brightFacet, 0.95);
    ctx.beginPath();
    ctx.moveTo(tip, 0);
    ctx.lineTo(0, -side);
    ctx.lineTo(back, 0);
    ctx.closePath();
    ctx.fill();

    // Main midtone inner-top facet
    const fg = ctx.createLinearGradient(back, -side, tip, side);
    fg.addColorStop(0, rgba(accRgb, 0.92));
    fg.addColorStop(0.55, rgba(shardTint, 0.95));
    fg.addColorStop(1, rgba(deepFacet, 0.94));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(tip, 0);
    ctx.lineTo(0, side);
    ctx.lineTo(back, 0);
    ctx.closePath();
    ctx.fill();

    // Central raised table facet for crisp 3D prism geometry
    ctx.fillStyle = rgba(shardTint, 0.88);
    ctx.beginPath();
    ctx.moveTo(tip * 0.72, 0);
    ctx.lineTo(0, -side * 0.52);
    ctx.lineTo(back * 0.58, 0);
    ctx.lineTo(0, side * 0.52);
    ctx.closePath();
    ctx.fill();

    // Deep lower bevel facet
    ctx.fillStyle = rgba(deepFacet, 0.55);
    ctx.beginPath();
    ctx.moveTo(tip, 0);
    ctx.lineTo(0, side);
    ctx.lineTo(0, side * 0.52);
    ctx.lineTo(tip * 0.72, 0);
    ctx.closePath();
    ctx.fill();

    // Crisp white specular edge highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = r * 0.04;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(back, 0);
    ctx.lineTo(0, -side);
    ctx.lineTo(tip, 0);
    ctx.stroke();

    // Inner bright crystal ridge
    ctx.strokeStyle = 'rgba(255,255,255,0.68)';
    ctx.lineWidth = r * 0.028;
    ctx.beginPath();
    ctx.moveTo(back * 0.58, 0);
    ctx.lineTo(tip * 0.72, 0);
    ctx.stroke();

    // Specular triangle gleam
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath();
    ctx.moveTo(tip * 0.45, -side * 0.1);
    ctx.lineTo(0, -side * 0.44);
    ctx.lineTo(-r * 0.08, -side * 0.14);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

/**
 * 2. ELECTRON
 * Pearlescent concentric wave-ring with an orbiting bright cyan-white comet
 * spark leaving a curved fading arc trail + soft iridescent core.
 */
function drawElectron(ctx, r, ph, time, baseRgb, accRgb) {
  const pearlPink = [245, 208, 254];
  const pearlCyan = [165, 243, 252];
  const deepTeal = shadeRgb(baseRgb, 0.45);

  const waveBreath = Math.sin(time * 3.8 + ph);
  const orbitR = r * 0.8;
  const cometA = time * 4.2 + ph;

  // Soft outer bioluminescent aura
  drawHalo(ctx, 0, 0, r * 1.72, baseRgb, 0.22);

  // Subtle pearlescent wave-disk fill inside the ring
  const diskG = ctx.createRadialGradient(0, 0, r * 0.18, 0, 0, orbitR * 1.15);
  diskG.addColorStop(0, rgba(pearlCyan, 0.22));
  diskG.addColorStop(0.55, rgba(pearlPink, 0.14));
  diskG.addColorStop(0.85, rgba(baseRgb, 0.18));
  diskG.addColorStop(1, rgba(baseRgb, 0));
  ctx.fillStyle = diskG;
  ctx.beginPath();
  ctx.arc(0, 0, orbitR * 1.15, 0, TWO_PI);
  ctx.fill();

  // Outer softly rippling harmonic wave-ring
  const outerR = r * (0.98 + waveBreath * 0.04);
  ctx.strokeStyle = rgba(pearlPink, 0.34);
  ctx.lineWidth = r * 0.065;
  ctx.beginPath();
  const segs = 36;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TWO_PI;
    const rip = Math.sin(a * 4 - time * 5 + ph) * r * 0.032;
    const rad = outerR + rip;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Primary pearlescent concentric orbit ring
  const ringGrad = ctx.createLinearGradient(-orbitR, -orbitR, orbitR, orbitR);
  ringGrad.addColorStop(0, rgba(accRgb, 0.85));
  ringGrad.addColorStop(0.45, rgba(pearlPink, 0.72));
  ringGrad.addColorStop(1, rgba(baseRgb, 0.82));

  // Soft wide ring halo
  ctx.strokeStyle = rgba(baseRgb, 0.22);
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.arc(0, 0, orbitR, 0, TWO_PI);
  ctx.stroke();

  // Crisp inner pearlescent ring
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = r * 0.062;
  ctx.beginPath();
  ctx.arc(0, 0, orbitR, 0, TWO_PI);
  ctx.stroke();

  // Secondary delicate inner harmonic ring
  ctx.strokeStyle = rgba(pearlCyan, 0.42);
  ctx.lineWidth = r * 0.032;
  ctx.beginPath();
  ctx.arc(0, 0, r * (0.56 - waveBreath * 0.025), 0, TWO_PI);
  ctx.stroke();

  // Soft iridescent central core
  const coreR = r * (0.37 + waveBreath * 0.02);
  const coreG = ctx.createRadialGradient(-coreR * 0.3, -coreR * 0.3, coreR * 0.05, 0, 0, coreR);
  coreG.addColorStop(0, '#ffffff');
  coreG.addColorStop(0.38, rgba(accRgb, 0.96));
  coreG.addColorStop(0.7, rgba(mixRgb(baseRgb, pearlPink, 0.45), 0.9));
  coreG.addColorStop(1, rgba(deepTeal, 0.88));
  ctx.fillStyle = coreG;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, TWO_PI);
  ctx.fill();

  // Iridescent core rim + crescent specular gleam
  ctx.strokeStyle = rgba(accRgb, 0.78);
  ctx.lineWidth = r * 0.036;
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 0.95, 0, TWO_PI);
  ctx.stroke();

  ctx.save();
  ctx.translate(-coreR * 0.32, -coreR * 0.32);
  ctx.rotate(-0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.ellipse(0, 0, coreR * 0.28, coreR * 0.14, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Curved fading comet arc trail behind the orbiting spark
  const trailArc = 2.25; // ~130 degrees
  const trailSteps = 14;
  ctx.lineCap = 'round';
  for (let i = 0; i < trailSteps; i++) {
    const f0 = i / trailSteps;
    const f1 = (i + 1) / trailSteps;
    const a0 = cometA - trailArc * (1 - f0);
    const a1 = cometA - trailArc * (1 - f1);
    const alpha = f1 * f1;

    // Outer cyan glow segment
    ctx.strokeStyle = rgba(pearlCyan, alpha * 0.55);
    ctx.lineWidth = r * (0.04 + f1 * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, orbitR, a0, a1);
    ctx.stroke();

    // Inner blazing white-cyan core segment
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
    ctx.lineWidth = r * (0.015 + f1 * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, orbitR, a0, a1);
    ctx.stroke();
  }

  // Orbiting bright cyan-white comet spark head
  const cx = Math.cos(cometA) * orbitR;
  const cy = Math.sin(cometA) * orbitR;
  drawHalo(ctx, cx, cy, r * 0.44, pearlCyan, 0.55);
  drawStarGlint(ctx, cx, cy, r * 0.26, [255, 255, 255], 0.96, cometA);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.115, 0, TWO_PI);
  ctx.fill();
}

/**
 * 3. PHOTON
 * Graceful flowing golden wave-packet — radiant crystalline teardrop head with
 * a trailing sinusoidal golden light ribbon and tiny sparkle nodes.
 */
function drawPhoton(ctx, r, ph, time, baseRgb, accRgb) {
  const goldDeep = [217, 119, 6];
  const goldWarm = mixRgb(baseRgb, [251, 191, 36], 0.45);
  const ivory = [255, 253, 240];

  // Warm golden outer aura shifted slightly toward the head
  drawHalo(ctx, r * 0.22, 0, r * 1.65, goldWarm, 0.26);

  // Sample trailing sinusoidal wave points from head (+0.22r) back to tail (-1.68r)
  const steps = 20;
  const xStart = r * 0.24;
  const xEnd = -r * 1.68;
  const wavePts = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps; // 0 at head, 1 at tail
    const x = xStart + (xEnd - xStart) * u;
    const amp = r * 0.34 * Math.sin(u * Math.PI * 0.88 + 0.18) * (1 - u * 0.22);
    const y = Math.sin(u * 7.8 - time * 9.5 + ph) * amp;
    wavePts.push([x, y, u]);
  }

  // Secondary counter-phase shimmer ribbon (ethereal interference wave)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(accRgb, 0.32);
  ctx.lineWidth = r * 0.085;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = xStart + (xEnd - xStart) * u;
    const amp = r * 0.24 * Math.sin(u * Math.PI * 0.9 + 0.1) * (1 - u * 0.3);
    const y = -Math.sin(u * 7.8 - time * 9.5 + ph + 0.9) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Multi-layered tapering golden light ribbon
  for (let i = 0; i < steps; i++) {
    const p0 = wavePts[i];
    const p1 = wavePts[i + 1];
    const fade = 1 - p1[2];
    const alpha = fade * fade;

    // Wide soft amber glow pass
    ctx.strokeStyle = rgba(goldWarm, alpha * 0.36);
    ctx.lineWidth = r * (0.06 + fade * 0.34);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();

    // Rich golden mid-ribbon
    ctx.strokeStyle = rgba(baseRgb, alpha * 0.82);
    ctx.lineWidth = r * (0.03 + fade * 0.16);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();

    // Crisp luminous white-gold inner core wave
    ctx.strokeStyle = rgba(ivory, alpha * 0.95);
    ctx.lineWidth = r * (0.014 + fade * 0.068);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();
  }

  // Tiny sparkle nodes floating along the trailing wave
  const sparkleIndices = [5, 10, 14, 18];
  for (let s = 0; s < sparkleIndices.length; s++) {
    const idx = sparkleIndices[s];
    const pt = wavePts[idx];
    const fade = 1 - pt[2];
    const twinkle = 0.65 + 0.35 * Math.sin(time * 7.5 + ph + s * 2.1);
    const oy = (s % 2 === 0 ? -1 : 1) * r * 0.14;
    drawHalo(ctx, pt[0], pt[1] + oy, r * 0.18 * fade, baseRgb, 0.4 * twinkle);
    drawStarGlint(
      ctx,
      pt[0],
      pt[1] + oy,
      r * (0.12 + 0.06 * fade) * twinkle,
      ivory,
      0.92 * fade,
      time * 1.5 + s
    );
  }

  // Radiant crystalline teardrop head at +X
  const headX = r * 0.34;
  const tipX = r * 1.04;
  const backX = -r * 0.2;
  const halfH = r * 0.44;

  // Inner head glow
  drawHalo(ctx, headX, 0, r * 0.78, ivory, 0.48);

  // Teardrop silhouette path helper
  const traceTeardrop = (scale) => {
    const tx = headX + (tipX - headX) * scale;
    const bx = headX + (backX - headX) * scale;
    const hh = halfH * scale;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.quadraticCurveTo(headX + r * 0.24 * scale, -hh * 1.08, headX - r * 0.08 * scale, -hh * 0.78);
    ctx.quadraticCurveTo(bx, -hh * 0.26, bx, 0);
    ctx.quadraticCurveTo(bx, hh * 0.26, headX - r * 0.08 * scale, hh * 0.78);
    ctx.quadraticCurveTo(headX + r * 0.24 * scale, hh * 1.08, tx, 0);
    ctx.closePath();
  };

  // Base golden crystalline fill
  const hg = ctx.createRadialGradient(headX + r * 0.06, -r * 0.12, r * 0.04, headX, 0, r * 0.72);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.35, rgba(accRgb, 0.98));
  hg.addColorStop(0.72, rgba(goldWarm, 0.96));
  hg.addColorStop(1, rgba(goldDeep, 0.92));
  ctx.fillStyle = hg;
  traceTeardrop(1);
  ctx.fill();

  // Upper crystalline sunlit facet
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.moveTo(tipX * 0.94, 0);
  ctx.quadraticCurveTo(headX + r * 0.18, -halfH * 0.88, headX - r * 0.08, -halfH * 0.62);
  ctx.lineTo(headX + r * 0.12, -halfH * 0.05);
  ctx.closePath();
  ctx.fill();

  // Lower warm amber shaded facet
  ctx.fillStyle = rgba(goldDeep, 0.28);
  ctx.beginPath();
  ctx.moveTo(tipX * 0.94, 0);
  ctx.quadraticCurveTo(headX + r * 0.18, halfH * 0.88, headX - r * 0.08, halfH * 0.62);
  ctx.lineTo(headX + r * 0.12, halfH * 0.05);
  ctx.closePath();
  ctx.fill();

  // Crisp luminous rim
  ctx.strokeStyle = rgba(ivory, 0.88);
  ctx.lineWidth = r * 0.042;
  traceTeardrop(0.98);
  ctx.stroke();

  // Blazing inner crystal heart & front nose glint
  drawStarGlint(ctx, headX + r * 0.12, -r * 0.02, r * 0.28, [255, 255, 255], 0.95, 0);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(headX + r * 0.12, -r * 0.02, r * 0.11, 0, TWO_PI);
  ctx.fill();
}

/**
 * 4. ATOM
 * Sculpted 3D-shaded cluster nucleus (5 overlapping protons/neutrons in coral
 * & cyan with tiny highlights) surrounded by 3 inclined glowing orbital
 * ellipses with 3 bright electrons actively orbiting along the ellipses.
 */
function drawAtom(ctx, r, ph, time, baseRgb, accRgb) {
  const protonBase = [251, 113, 133]; // coral-rose
  const protonAcc = [255, 228, 230];
  const neutronBase = mixRgb(baseRgb, [56, 189, 248], 0.45); // bright sky-cyan
  const neutronAcc = [224, 242, 254];
  const electronGlow = [186, 230, 253];

  const rx = r * 1.12;
  const ry = r * 0.4;
  const tiltBase = ph * 0.4;

  // Soft outer bioluminescent aura
  drawHalo(ctx, 0, 0, r * 1.72, baseRgb, 0.22);

  // Precompute the 3 orbitals and their orbiting electron angles
  const orbitals = [];
  for (let i = 0; i < 3; i++) {
    const tilt = tiltBase + (i * Math.PI) / 3;
    const speed = 2.5 + i * 0.45;
    const eAngle = time * speed + ph + i * 2.094;
    orbitals.push({ tilt, eAngle, inFront: Math.sin(eAngle) >= 0 });
  }

  // Helper to draw an electron & its curved fading arc along a tilted ellipse
  const drawOrbitElectron = (orb) => {
    ctx.save();
    ctx.rotate(orb.tilt);

    // Fading arc trail along the ellipse
    const trailSteps = 8;
    const trailSpan = 0.85;
    ctx.lineCap = 'round';
    for (let s = 0; s < trailSteps; s++) {
      const f0 = s / trailSteps;
      const f1 = (s + 1) / trailSteps;
      const a0 = orb.eAngle - trailSpan * (1 - f0);
      const a1 = orb.eAngle - trailSpan * (1 - f1);
      ctx.strokeStyle = rgba(electronGlow, f1 * f1 * 0.78);
      ctx.lineWidth = r * (0.02 + f1 * 0.075);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * rx, Math.sin(a0) * ry);
      ctx.lineTo(Math.cos(a1) * rx, Math.sin(a1) * ry);
      ctx.stroke();
    }

    const ex = Math.cos(orb.eAngle) * rx;
    const ey = Math.sin(orb.eAngle) * ry;
    const depthScale = 0.85 + 0.25 * Math.sin(orb.eAngle);

    drawHalo(ctx, ex, ey, r * 0.3 * depthScale, electronGlow, 0.62);
    ctx.fillStyle = rgba(accRgb, 0.95);
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.115 * depthScale, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - r * 0.025, ey - r * 0.025, r * 0.06 * depthScale, 0, TWO_PI);
    ctx.fill();

    ctx.restore();
  };

  // 1. Draw all 3 inclined glowing orbital ellipses (soft glow + crisp line)
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(orbitals[i].tilt);

    ctx.strokeStyle = rgba(baseRgb, 0.22);
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TWO_PI);
    ctx.stroke();

    ctx.strokeStyle = rgba(accRgb, 0.72);
    ctx.lineWidth = r * 0.036;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TWO_PI);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Back-half electrons (behind the nucleus for true 3D depth)
  for (let i = 0; i < 3; i++) {
    if (!orbitals[i].inFront) drawOrbitElectron(orbitals[i]);
  }

  // 3. Sculpted 3D cluster nucleus (5 overlapping protons & neutrons)
  drawHalo(ctx, 0, 0, r * 0.64, protonBase, 0.28);
  const jiggle = Math.sin(time * 3.4 + ph) * r * 0.025;
  const nucR = r * 0.21;
  // Ordered back-to-front so central front nucleon sits crisply on top
  const nucleons = [
    { x: -r * 0.17 + jiggle, y: -r * 0.14, isProton: false },
    { x: r * 0.18, y: -r * 0.12 - jiggle, isProton: true },
    { x: -r * 0.15, y: r * 0.16 - jiggle, isProton: true },
    { x: r * 0.16 - jiggle, y: r * 0.15, isProton: false },
    { x: 0, y: 0, isProton: true },
  ];

  for (let i = 0; i < nucleons.length; i++) {
    const n = nucleons[i];
    drawGlossyOrb(
      ctx,
      n.x,
      n.y,
      i === 4 ? nucR * 1.08 : nucR,
      n.isProton ? protonBase : neutronBase,
      n.isProton ? protonAcc : neutronAcc,
      { rimAlpha: 0.55, specScale: 1.05 }
    );
  }

  // 4. Front-half electrons (passing in front of the nucleus)
  for (let i = 0; i < 3; i++) {
    if (orbitals[i].inFront) drawOrbitElectron(orbitals[i]);
  }
}

/**
 * 5. MOLECULE
 * Glossy 3D-shaded molecular cluster — 1 larger central translucent orb +
 * 3 bonded satellite spheres arranged symmetrically with glowing glass-like
 * covalent bridge rods and crisp top-left specular highlights.
 */
function drawMolecule(ctx, r, ph, time, baseRgb, accRgb) {
  const rot = time * 0.52 + ph;
  const breath = 1 + Math.sin(time * 2.6 + ph) * 0.035;
  const bondDist = r * 0.72 * breath;
  const centerR = r * 0.48;
  const satR = r * 0.32;

  const satPalettes = [
    [mixRgb(baseRgb, [254, 205, 211], 0.35), accRgb],
    [mixRgb(baseRgb, [253, 186, 116], 0.42), [255, 237, 213]],
    [mixRgb(baseRgb, [196, 181, 253], 0.38), [245, 243, 255]],
  ];

  // Soft outer bioluminescent aura
  drawHalo(ctx, 0, 0, r * 1.72, baseRgb, 0.22);

  // Compute 3 symmetric satellite positions
  const sats = [];
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * TWO_PI) / 3;
    sats.push([Math.cos(a) * bondDist, Math.sin(a) * bondDist, a]);
  }

  // Draw glowing glass-like covalent bridge rods first
  const rodHalfW = r * 0.115;
  for (let i = 0; i < 3; i++) {
    const [, , a] = sats[i];
    ctx.save();
    ctx.rotate(a);

    const startX = centerR * 0.55;
    const endX = bondDist - satR * 0.45;
    const len = Math.max(0.01, endX - startX);

    // Soft glow around the covalent bridge
    const rodGrad = ctx.createLinearGradient(0, -rodHalfW, 0, rodHalfW);
    rodGrad.addColorStop(0, rgba(accRgb, 0.88));
    rodGrad.addColorStop(0.32, 'rgba(255,255,255,0.72)');
    rodGrad.addColorStop(0.68, rgba(baseRgb, 0.65));
    rodGrad.addColorStop(1, rgba(shadeRgb(baseRgb, 0.42), 0.75));

    ctx.fillStyle = rodGrad;
    ctx.beginPath();
    ctx.rect(startX, -rodHalfW, len, rodHalfW * 2);
    ctx.fill();

    // Subtle glass rim lines along top and bottom of rod
    ctx.strokeStyle = rgba(accRgb, 0.7);
    ctx.lineWidth = r * 0.025;
    ctx.beginPath();
    ctx.moveTo(startX, -rodHalfW * 0.92);
    ctx.lineTo(endX, -rodHalfW * 0.92);
    ctx.stroke();

    // Crisp specular glass streak along the rod
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = r * 0.036;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX + len * 0.15, -rodHalfW * 0.38);
    ctx.lineTo(endX - len * 0.15, -rodHalfW * 0.38);
    ctx.stroke();

    ctx.restore();
  }

  // 3 Glossy bonded satellite spheres
  for (let i = 0; i < 3; i++) {
    const [sx, sy] = sats[i];
    const [sBase, sAcc] = satPalettes[i];
    drawHalo(ctx, sx, sy, satR * 1.7, sBase, 0.24);
    drawGlossyOrb(ctx, sx, sy, satR, sBase, sAcc, {
      translucent: 0.96,
      rimAlpha: 0.72,
      specScale: 1.05,
    });
  }

  // Central larger translucent glossy orb
  drawHalo(ctx, 0, 0, centerR * 1.55, accRgb, 0.28);
  drawGlossyOrb(ctx, 0, 0, centerR, baseRgb, accRgb, {
    translucent: 0.92,
    rimAlpha: 0.85,
    specScale: 1.15,
  });

  // Soft translucent inner core glow inside central sphere
  const innerG = ctx.createRadialGradient(centerR * 0.08, centerR * 0.1, 0, 0, 0, centerR * 0.62);
  innerG.addColorStop(0, 'rgba(255,255,255,0.52)');
  innerG.addColorStop(0.6, rgba(accRgb, 0.2));
  innerG.addColorStop(1, rgba(accRgb, 0));
  ctx.fillStyle = innerG;
  ctx.beginPath();
  ctx.arc(0, 0, centerR * 0.62, 0, TWO_PI);
  ctx.fill();
}

/* ============================================================================
 * SCALE II: MICROSCOPIC (spore, bacteria, amoeba, diatom, tardigrade)
 * ========================================================================== */

/**
 * 6. SPORE
 * Floating bioluminescent dandelion-spore orb with delicate radiating curved
 * cilia hairs swaying gently, a translucent soft outer halo, and a warm
 * glowing seed kernel inside.
 */
function drawSpore(ctx, r, ph, time, baseRgb, accRgb) {
  const seedWarm = [254, 240, 138]; // warm sunlit gold
  const seedAmber = [245, 158, 11];
  const seedDeep = [180, 83, 9];

  const breath = 1 + Math.sin(time * 2.4 + ph) * 0.045;
  const shellR = r * 0.66 * breath;

  // Dreamy translucent outer bioluminescent halo
  drawHalo(ctx, 0, 0, r * 1.85, baseRgb, 0.25);
  drawHalo(ctx, 0, 0, r * 1.18, accRgb, 0.22);

  // Delicate radiating curved cilia hairs swaying gently around the orb
  const ciliaCount = 16;
  ctx.lineCap = 'round';
  for (let i = 0; i < ciliaCount; i++) {
    const baseA = (i / ciliaCount) * TWO_PI + Math.sin(time * 0.7 + ph) * 0.08;
    const sway = Math.sin(time * 2.9 + ph + i * 1.15) * 0.24;
    const len = r * (i % 2 === 0 ? 1.12 : 0.96);

    const sx = Math.cos(baseA) * shellR * 0.88;
    const sy = Math.sin(baseA) * shellR * 0.88;
    const ctrlA = baseA + sway * 0.55;
    const ctrlR = (shellR + len) * 0.52;
    const cx = Math.cos(ctrlA) * ctrlR;
    const cy = Math.sin(ctrlA) * ctrlR;
    const tipA = baseA + sway;
    const ex = Math.cos(tipA) * len;
    const ey = Math.sin(tipA) * len;

    // Soft cilia hair
    ctx.strokeStyle = rgba(accRgb, i % 2 === 0 ? 0.78 : 0.56);
    ctx.lineWidth = r * (i % 2 === 0 ? 0.036 : 0.026);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();

    // Tiny luminous dewdrop tip on alternating cilia
    if (i % 2 === 0) {
      ctx.fillStyle = rgba(accRgb, 0.92);
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.052, 0, TWO_PI);
      ctx.fill();
    }
  }

  // Translucent soft outer membrane bubble
  const shellG = ctx.createRadialGradient(-shellR * 0.25, -shellR * 0.25, shellR * 0.1, 0, 0, shellR);
  shellG.addColorStop(0, rgba(accRgb, 0.24));
  shellG.addColorStop(0.62, rgba(baseRgb, 0.34));
  shellG.addColorStop(0.88, rgba(baseRgb, 0.62));
  shellG.addColorStop(1, rgba(accRgb, 0.85));
  ctx.fillStyle = shellG;
  ctx.beginPath();
  ctx.arc(0, 0, shellR, 0, TWO_PI);
  ctx.fill();

  // Crisp translucent outer bubble rim
  ctx.strokeStyle = rgba(accRgb, 0.78);
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, shellR, 0, TWO_PI);
  ctx.stroke();

  // Warm glowing seed kernel gently floating inside
  const kx = Math.cos(time * 1.8 + ph) * r * 0.045;
  const ky = Math.sin(time * 2.1 + ph) * r * 0.045;
  const kR = r * 0.32 * breath;

  drawHalo(ctx, kx, ky, kR * 1.9, seedWarm, 0.45);

  const kg = ctx.createRadialGradient(kx - kR * 0.28, ky - kR * 0.28, kR * 0.06, kx, ky, kR);
  kg.addColorStop(0, '#ffffff');
  kg.addColorStop(0.35, rgba(seedWarm, 0.98));
  kg.addColorStop(0.75, rgba(seedAmber, 0.94));
  kg.addColorStop(1, rgba(seedDeep, 0.88));
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.ellipse(kx, ky, kR * 1.08, kR * 0.92, ph * 0.5, 0, TWO_PI);
  ctx.fill();

  // Seed specular dot
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(kx - kR * 0.28, ky - kR * 0.26, kR * 0.2, 0, TWO_PI);
  ctx.fill();

  // Curved glass crescent reflection on the outer translucent bubble
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = r * 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, shellR * 0.78, -Math.PI * 0.82, -Math.PI * 0.42);
  ctx.stroke();
}

/**
 * 7. BACTERIA
 * Glossy translucent pill-shaped bacterium with a soft double-membrane wall,
 * visible swirling internal organelles/nucleoid, tiny side pili hairs, and
 * 3 gracefully undulating sinusoidal flagella streaming behind (-X).
 */
function drawBacteria(ctx, r, ph, time, baseRgb, accRgb) {
  const deepTeal = shadeRgb(baseRgb, 0.38);
  const nucleoidCol = [254, 240, 138]; // soft warm lemon-mint contrast

  const halfLen = r * 0.54;
  const bodyR = r * 0.46;

  // Soft bioluminescent aura
  drawHalo(ctx, 0, 0, r * 1.55, baseRgb, 0.2);

  // 3 Gracefully undulating sinusoidal flagella streaming behind (-X)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const flagOffsets = [-0.21, 0, 0.21];
  const flagSteps = 14;
  for (let f = 0; f < 3; f++) {
    const yBase = flagOffsets[f] * r;
    const len = r * (f === 1 ? 1.32 : 1.12);
    const startX = -halfLen - bodyR * 0.82;
    const phaseOff = f * 1.45;

    // Soft outer flagellum glow
    ctx.strokeStyle = rgba(baseRgb, 0.36);
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    for (let i = 0; i <= flagSteps; i++) {
      const u = i / flagSteps;
      const x = startX - len * u;
      const amp = r * (0.06 + u * 0.22);
      const y = yBase + Math.sin(u * 6.8 - time * 8.2 + ph + phaseOff) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Crisp bright inner flagellum filament
    ctx.strokeStyle = rgba(accRgb, 0.88);
    ctx.lineWidth = r * 0.04;
    ctx.stroke();
  }

  // Tiny side pili hairs along the top & bottom flanks
  const piliCount = 6;
  ctx.strokeStyle = rgba(accRgb, 0.62);
  ctx.lineWidth = r * 0.028;
  for (let i = 0; i < piliCount; i++) {
    const px = -halfLen * 0.82 + (i / (piliCount - 1)) * halfLen * 1.64;
    const wiggle = Math.sin(time * 5.2 + ph + i * 1.3) * r * 0.06;
    for (let side = -1; side <= 1; side += 2) {
      const sy = side * bodyR * 0.96;
      const ey = side * (bodyR + r * 0.19);
      ctx.beginPath();
      ctx.moveTo(px, sy);
      ctx.quadraticCurveTo(px - r * 0.04, (sy + ey) * 0.5, px - r * 0.08 + wiggle, ey);
      ctx.stroke();
    }
  }

  // Outer translucent slime-capsule coat
  ctx.fillStyle = rgba(accRgb, 0.18);
  traceCapsule(ctx, halfLen, bodyR * 1.12);
  ctx.fill();

  // Main pill body (3D glossy gradient from top to bottom)
  const bodyG = ctx.createLinearGradient(0, -bodyR, 0, bodyR);
  bodyG.addColorStop(0, rgba(accRgb, 0.88));
  bodyG.addColorStop(0.32, rgba(baseRgb, 0.82));
  bodyG.addColorStop(0.78, rgba(deepTeal, 0.86));
  bodyG.addColorStop(1, rgba(mixRgb(deepTeal, accRgb, 0.38), 0.84));
  ctx.fillStyle = bodyG;
  traceCapsule(ctx, halfLen, bodyR);
  ctx.fill();

  // Soft double-membrane cell wall (outer bright rim + inner wall)
  ctx.strokeStyle = rgba(accRgb, 0.86);
  ctx.lineWidth = r * 0.058;
  traceCapsule(ctx, halfLen, bodyR);
  ctx.stroke();

  ctx.strokeStyle = rgba(deepTeal, 0.55);
  ctx.lineWidth = r * 0.036;
  traceCapsule(ctx, halfLen * 0.96, bodyR * 0.84);
  ctx.stroke();

  // Translucent glowing cytoplasm interior
  const innerG = ctx.createRadialGradient(r * 0.08, -r * 0.06, r * 0.05, 0, 0, halfLen + bodyR * 0.6);
  innerG.addColorStop(0, rgba(accRgb, 0.45));
  innerG.addColorStop(0.7, rgba(baseRgb, 0.2));
  innerG.addColorStop(1, rgba(deepTeal, 0.12));
  ctx.fillStyle = innerG;
  traceCapsule(ctx, halfLen * 0.94, bodyR * 0.8);
  ctx.fill();

  // Swirling internal nucleoid DNA ribbon
  ctx.strokeStyle = rgba(nucleoidCol, 0.72);
  ctx.lineWidth = r * 0.085;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const nx = -halfLen * 0.62 + u * halfLen * 1.24;
    const ny = Math.sin(u * TWO_PI * 1.35 + time * 2.4 + ph) * bodyR * 0.34;
    if (i === 0) ctx.moveTo(nx, ny);
    else ctx.lineTo(nx, ny);
  }
  ctx.stroke();

  // Tiny floating internal organelle / ribosome beads
  const beads = [
    [-0.36, -0.14, 0.075],
    [0.08, 0.18, 0.065],
    [0.42, -0.08, 0.085],
    [-0.08, -0.19, 0.055],
  ];
  for (let i = 0; i < beads.length; i++) {
    const [bx, by, br] = beads[i];
    const drift = Math.sin(time * 2.8 + ph + i * 1.7) * r * 0.03;
    ctx.fillStyle = rgba(accRgb, 0.82);
    ctx.beginPath();
    ctx.arc(bx * r, by * r + drift, br * r, 0, TWO_PI);
    ctx.fill();
  }

  // Long glossy top-left specular highlight strip along the pill
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-halfLen * 0.65, -bodyR * 0.56);
  ctx.lineTo(halfLen * 0.55, -bodyR * 0.56);
  ctx.stroke();

  // Small crisp nose highlight dot
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.beginPath();
  ctx.arc(halfLen * 0.88, -bodyR * 0.44, r * 0.055, 0, TWO_PI);
  ctx.fill();
}

/**
 * 8. AMOEBA
 * Soft-gelatinous organic cell with 7 smoothly pulsing rounded pseudopods
 * (quadratic spline), translucent layered inner membrane, a richly shaded
 * glowing nucleus, and 3 tiny floating contractile vacuoles.
 */
function drawAmoeba(ctx, r, ph, time, baseRgb, accRgb) {
  const deepEmerald = shadeRgb(baseRgb, 0.4);
  const nucleusBase = [251, 191, 36]; // warm golden-amber nucleus
  const nucleusAcc = [254, 249, 195];

  // Soft bioluminescent outer halo
  drawHalo(ctx, 0, 0, r * 1.75, baseRgb, 0.22);

  // Build 14 alternating outer-pseudopod & inner-valley control points (7 lobes)
  const lobes = 7;
  const outerPts = [];
  const innerPts = [];
  const slowRot = time * 0.28 + ph * 0.5;

  for (let i = 0; i < lobes * 2; i++) {
    const a = slowRot + (i * TWO_PI) / (lobes * 2);
    const isLobe = i % 2 === 0;
    const wave1 = Math.sin(time * 2.1 + ph + i * 1.35);
    const wave2 = Math.cos(time * 1.5 - ph * 0.7 + i * 0.9);
    const rad = isLobe
      ? r * (1.02 + wave1 * 0.14 + wave2 * 0.05)
      : r * (0.72 + wave2 * 0.07);
    outerPts.push([Math.cos(a) * rad, Math.sin(a) * rad]);

    // Phase-lagged smaller endoplasm inner membrane
    const inRad = rad * (isLobe ? 0.72 : 0.76);
    const inA = a - 0.08;
    innerPts.push([Math.cos(inA) * inRad, Math.sin(inA) * inRad]);
  }

  // Outer gelatinous ectoplasm body
  const ectoG = ctx.createRadialGradient(-r * 0.22, -r * 0.22, r * 0.1, 0, 0, r * 1.15);
  ectoG.addColorStop(0, rgba(accRgb, 0.62));
  ectoG.addColorStop(0.55, rgba(baseRgb, 0.56));
  ectoG.addColorStop(0.88, rgba(deepEmerald, 0.68));
  ectoG.addColorStop(1, rgba(accRgb, 0.82));
  ctx.fillStyle = ectoG;
  traceClosedSpline(ctx, outerPts);
  ctx.fill();

  // Luminous translucent outer cell membrane rim
  ctx.strokeStyle = rgba(accRgb, 0.85);
  ctx.lineWidth = r * 0.052;
  traceClosedSpline(ctx, outerPts);
  ctx.stroke();

  // Layered translucent inner membrane (endoplasm)
  const endoG = ctx.createRadialGradient(-r * 0.12, -r * 0.12, r * 0.05, 0, 0, r * 0.82);
  endoG.addColorStop(0, rgba(accRgb, 0.58));
  endoG.addColorStop(0.7, rgba(baseRgb, 0.42));
  endoG.addColorStop(1, rgba(deepEmerald, 0.28));
  ctx.fillStyle = endoG;
  traceClosedSpline(ctx, innerPts);
  ctx.fill();

  ctx.strokeStyle = rgba(accRgb, 0.42);
  ctx.lineWidth = r * 0.028;
  traceClosedSpline(ctx, innerPts);
  ctx.stroke();

  // 3 Tiny floating contractile vacuoles (pulsing glassy micro-bubbles)
  const vacSpecs = [
    { a: ph + 0.6, dist: 0.44, baseR: 0.125, spd: 2.8 },
    { a: ph + 2.7, dist: 0.48, baseR: 0.105, spd: 3.3 },
    { a: ph + 4.8, dist: 0.42, baseR: 0.095, spd: 2.3 },
  ];
  for (let i = 0; i < vacSpecs.length; i++) {
    const v = vacSpecs[i];
    const va = v.a + slowRot * 0.6;
    const vx = Math.cos(va) * r * v.dist;
    const vy = Math.sin(va) * r * v.dist;
    const vr = r * v.baseR * (0.85 + 0.22 * Math.sin(time * v.spd + ph + i * 2));

    const vg = ctx.createRadialGradient(vx - vr * 0.25, vy - vr * 0.25, 0, vx, vy, vr);
    vg.addColorStop(0, 'rgba(255,255,255,0.68)');
    vg.addColorStop(0.6, rgba(accRgb, 0.34));
    vg.addColorStop(1, rgba(accRgb, 0.78));
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.arc(vx, vy, vr, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = r * 0.022;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(vx - vr * 0.32, vy - vr * 0.32, vr * 0.26, 0, TWO_PI);
    ctx.fill();
  }

  // Richly shaded glowing nucleus (gently bobbing slightly off-center)
  const nx = Math.cos(time * 1.4 + ph) * r * 0.11 - r * 0.05;
  const ny = Math.sin(time * 1.7 + ph) * r * 0.11 - r * 0.04;
  const nucR = r * 0.27;
  drawHalo(ctx, nx, ny, nucR * 1.9, nucleusBase, 0.42);
  drawGlossyOrb(ctx, nx, ny, nucR, nucleusBase, nucleusAcc, {
    rimAlpha: 0.78,
    specScale: 1.05,
  });

  // Inner darker-warm nucleolus dot
  ctx.fillStyle = 'rgba(180,83,9,0.42)';
  ctx.beginPath();
  ctx.arc(nx + nucR * 0.14, ny + nucR * 0.12, nucR * 0.34, 0, TWO_PI);
  ctx.fill();

  // Soft jelly specular sheen on upper-left body
  ctx.save();
  ctx.translate(-r * 0.32, -r * 0.36);
  ctx.rotate(-0.62);
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.24, r * 0.1, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

/**
 * 9. DIATOM
 * Ornate golden-amber microscopic glass jewel — symmetric scalloped/faceted
 * frustule silhouette, delicate etched radial ribs, iridescent inner sheen,
 * and a luminous crystal core.
 */
function drawDiatom(ctx, r, ph, time, baseRgb, accRgb) {
  const amberDeep = [180, 83, 9];
  const opalCyan = [165, 243, 252];
  const opalRose = [253, 164, 175];
  const cream = [255, 251, 235];

  const rot = time * 0.35 + ph;
  const shimmer = Math.sin(time * 2.8 + ph);

  // Warm golden-amber outer glow
  drawHalo(ctx, 0, 0, r * 1.72, baseRgb, 0.24);

  ctx.save();
  ctx.rotate(rot);

  // Symmetric 8-fold scalloped/faceted frustule silhouette
  const petals = 8;
  const traceFrustule = (scale) => {
    ctx.beginPath();
    for (let i = 0; i < petals; i++) {
      const a0 = (i / petals) * TWO_PI;
      const aMid = ((i + 0.5) / petals) * TWO_PI;
      const a1 = ((i + 1) / petals) * TWO_PI;
      const rNotch = r * 0.84 * scale;
      const rCrest = r * 1.08 * scale;

      const x0 = Math.cos(a0) * rNotch;
      const y0 = Math.sin(a0) * rNotch;
      const cx = Math.cos(aMid) * rCrest;
      const cy = Math.sin(aMid) * rCrest;
      const x1 = Math.cos(a1) * rNotch;
      const y1 = Math.sin(a1) * rNotch;

      if (i === 0) ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
    }
    ctx.closePath();
  };

  // Base golden glass frustule fill
  const glassG = ctx.createRadialGradient(-r * 0.24, -r * 0.24, r * 0.08, 0, 0, r * 1.06);
  glassG.addColorStop(0, rgba(cream, 0.94));
  glassG.addColorStop(0.42, rgba(baseRgb, 0.88));
  glassG.addColorStop(0.78, rgba(amberDeep, 0.86));
  glassG.addColorStop(1, rgba(accRgb, 0.92));
  ctx.fillStyle = glassG;
  traceFrustule(1);
  ctx.fill();

  // Iridescent opalescent glass sheen across the frustule
  const iridG = ctx.createLinearGradient(-r, -r * 0.7, r, r * 0.7);
  iridG.addColorStop(0, rgba(opalCyan, 0.28 + shimmer * 0.08));
  iridG.addColorStop(0.48, rgba(cream, 0.14));
  iridG.addColorStop(0.76, rgba(opalRose, 0.26 - shimmer * 0.06));
  iridG.addColorStop(1, rgba(opalCyan, 0.22));
  ctx.fillStyle = iridG;
  traceFrustule(0.96);
  ctx.fill();

  // Outer sculpted silica rim
  ctx.strokeStyle = rgba(cream, 0.92);
  ctx.lineWidth = r * 0.052;
  traceFrustule(1);
  ctx.stroke();

  // Inner concentric filigree ring
  ctx.strokeStyle = rgba(amberDeep, 0.55);
  ctx.lineWidth = r * 0.032;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, TWO_PI);
  ctx.stroke();

  ctx.strokeStyle = rgba(cream, 0.72);
  ctx.lineWidth = r * 0.024;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.46, 0, TWO_PI);
  ctx.stroke();

  // Delicate etched radial ribs (16 primary + secondary striae)
  const ribCount = 16;
  ctx.lineCap = 'round';
  for (let i = 0; i < ribCount; i++) {
    const a = (i / ribCount) * TWO_PI;
    const isPrimary = i % 2 === 1; // aligns with scallop crests
    const innerR = r * 0.34;
    const outerR = r * (isPrimary ? 0.94 : 0.79);

    ctx.strokeStyle = isPrimary ? rgba(cream, 0.78) : rgba(amberDeep, 0.48);
    ctx.lineWidth = r * (isPrimary ? 0.032 : 0.02);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    ctx.stroke();

    // Tiny glowing silica jewel bead at each scallop crest & filigree ring
    if (isPrimary) {
      ctx.fillStyle = rgba(cream, 0.92);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.044, 0, TWO_PI);
      ctx.fill();
    }
  }

  // Luminous faceted 8-point crystal core
  const coreOuter = r * 0.36;
  const coreInner = r * 0.2;
  drawHalo(ctx, 0, 0, coreOuter * 1.5, cream, 0.48);

  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * TWO_PI;
    const aMid = ((i + 0.5) / 8) * TWO_PI;
    const a1 = ((i + 1) / 8) * TWO_PI;

    ctx.fillStyle = i % 2 === 0 ? rgba(cream, 0.95) : rgba(baseRgb, 0.92);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * coreOuter, Math.sin(a0) * coreOuter);
    ctx.lineTo(Math.cos(aMid) * coreInner, Math.sin(aMid) * coreInner);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = i % 2 === 0 ? rgba(baseRgb, 0.85) : rgba(amberDeep, 0.65);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(aMid) * coreInner, Math.sin(aMid) * coreInner);
    ctx.lineTo(Math.cos(a1) * coreOuter, Math.sin(a1) * coreOuter);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp white crystal heart glint
  drawStarGlint(ctx, 0, 0, r * 0.22, [255, 255, 255], 0.96, 0);

  ctx.restore();

  // Fixed top-left glass dome specular reflection (does not rotate with frustule)
  ctx.save();
  ctx.translate(-r * 0.28, -r * 0.32);
  ctx.rotate(-0.65);
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.26, r * 0.1, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

/**
 * 10. TARDIGRADE
 * Super adorable, unmistakable chubby water-bear!
 * 4 overlapping plump translucent segmented body lobes with glossy 3D shading,
 * 4 pairs of stubby little legs with tiny claws wiggling out of phase as it
 * swims, cute little circular snout at +X, and two tiny glossy black eyes
 * with white catchlights!
 */
function drawTardigrade(ctx, r, ph, time, baseRgb, accRgb) {
  const deepAmber = shadeRgb(baseRgb, 0.44);
  const rosyCheek = [251, 113, 133];
  const clawCol = [255, 247, 237];

  const swimT = time * 5.2 + ph;
  const sway = Math.sin(swimT * 0.5) * r * 0.035;

  // Warm soft bioluminescent aura
  drawHalo(ctx, 0, 0, r * 1.62, baseRgb, 0.2);

  // Helper to draw a stubby little water-bear leg with 3 tiny claws
  const drawStubbyLeg = (lx, ly, angle, legLen, legW) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);

    // Chubby rounded leg stub
    const lg = ctx.createLinearGradient(0, -legW, 0, legW);
    lg.addColorStop(0, rgba(accRgb, 0.92));
    lg.addColorStop(0.5, rgba(baseRgb, 0.94));
    lg.addColorStop(1, rgba(deepAmber, 0.92));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(legLen * 0.46, 0, legLen * 0.58, legW, 0, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = rgba(deepAmber, 0.5);
    ctx.lineWidth = r * 0.024;
    ctx.stroke();

    // 3 tiny cute curved claws at the tip
    ctx.strokeStyle = rgba(clawCol, 0.95);
    ctx.lineWidth = r * 0.028;
    ctx.lineCap = 'round';
    const tipX = legLen * 0.96;
    for (let c = -1; c <= 1; c++) {
      const cy = c * legW * 0.46;
      ctx.beginPath();
      ctx.moveTo(tipX - r * 0.02, cy);
      ctx.quadraticCurveTo(tipX + r * 0.06, cy + c * r * 0.025, tipX + r * 0.095, cy + c * r * 0.055);
      ctx.stroke();
    }

    ctx.restore();
  };

  // 4 pairs of stubby little legs wiggling out of phase
  // 3 lateral pairs along the torso + 1 rear pair at the rump
  const legPairs = [
    { x: -0.68, y: 0.28, baseA: Math.PI * 0.82, len: 0.28, w: 0.115, pOff: 0.0 },
    { x: -0.34, y: 0.44, baseA: Math.PI * 0.58, len: 0.3, w: 0.125, pOff: 1.55 },
    { x: 0.04, y: 0.46, baseA: Math.PI * 0.5, len: 0.3, w: 0.125, pOff: 3.1 },
    { x: 0.38, y: 0.4, baseA: Math.PI * 0.4, len: 0.28, w: 0.115, pOff: 4.65 },
  ];

  for (let i = 0; i < legPairs.length; i++) {
    const lp = legPairs[i];
    const kickTop = Math.sin(swimT + lp.pOff) * 0.32;
    const kickBot = Math.sin(swimT + lp.pOff + Math.PI) * 0.32;
    // Top side (-Y)
    drawStubbyLeg(lp.x * r, -lp.y * r + sway * 0.3, -lp.baseA + kickTop, lp.len * r, lp.w * r);
    // Bottom side (+Y)
    drawStubbyLeg(lp.x * r, lp.y * r + sway * 0.3, lp.baseA + kickBot, lp.len * r, lp.w * r);
  }

  // Cute little circular snout (buccal tube) protruding at +X
  const snoutX = r * 0.88;
  const snoutY = sway * 0.45;
  const snoutR = r * 0.16;

  const snoutG = ctx.createRadialGradient(
    snoutX - snoutR * 0.25,
    snoutY - snoutR * 0.3,
    snoutR * 0.08,
    snoutX,
    snoutY,
    snoutR
  );
  snoutG.addColorStop(0, rgba(accRgb, 0.96));
  snoutG.addColorStop(0.6, rgba(baseRgb, 0.95));
  snoutG.addColorStop(1, rgba(deepAmber, 0.92));
  ctx.fillStyle = snoutG;
  ctx.beginPath();
  ctx.ellipse(snoutX, snoutY, snoutR * 1.05, snoutR * 0.92, 0, 0, TWO_PI);
  ctx.fill();

  ctx.strokeStyle = rgba(accRgb, 0.82);
  ctx.lineWidth = r * 0.028;
  ctx.stroke();

  // Cute tiny O-shaped mouth opening at the tip of the snout
  ctx.fillStyle = rgba(deepAmber, 0.82);
  ctx.beginPath();
  ctx.ellipse(snoutX + snoutR * 0.48, snoutY, snoutR * 0.28, snoutR * 0.42, 0, 0, TWO_PI);
  ctx.fill();

  // 4 overlapping plump translucent segmented body lobes (rump → torso → torso → head)
  const segments = [
    { x: -0.56, y: -sway * 0.4, rx: 0.36, ry: 0.41 }, // plump rump
    { x: -0.2, y: -sway * 0.15, rx: 0.4, ry: 0.5 }, // rear-mid belly
    { x: 0.18, y: sway * 0.15, rx: 0.4, ry: 0.5 }, // front-mid belly
    { x: 0.54, y: sway * 0.4, rx: 0.35, ry: 0.42 }, // cute head lobe
  ];

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const sx = s.x * r;
    const sy = s.y;
    const srx = s.rx * r;
    const sry = s.ry * r;

    // Soft translucent 3D shading per plump lobe
    const sg = ctx.createRadialGradient(
      sx - srx * 0.28,
      sy - sry * 0.34,
      sry * 0.08,
      sx,
      sy,
      Math.max(srx, sry) * 1.08
    );
    sg.addColorStop(0, rgba(accRgb, 0.96));
    sg.addColorStop(0.42, rgba(baseRgb, 0.92));
    sg.addColorStop(0.82, rgba(deepAmber, 0.9));
    sg.addColorStop(1, rgba(mixRgb(deepAmber, accRgb, 0.35), 0.88));

    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(sx, sy, srx, sry, 0, 0, TWO_PI);
    ctx.fill();

    // Soft translucent belly glow inside middle segments
    if (i === 1 || i === 2) {
      const bellyG = ctx.createRadialGradient(sx, sy, 0, sx, sy, sry * 0.65);
      bellyG.addColorStop(0, 'rgba(255,251,235,0.34)');
      bellyG.addColorStop(1, 'rgba(255,251,235,0)');
      ctx.fillStyle = bellyG;
      ctx.beginPath();
      ctx.ellipse(sx, sy, srx * 0.72, sry * 0.65, 0, 0, TWO_PI);
      ctx.fill();
    }

    // Subtle plump segment crease / rim contour
    ctx.strokeStyle = rgba(deepAmber, 0.42);
    ctx.lineWidth = r * 0.032;
    ctx.beginPath();
    ctx.ellipse(sx, sy, srx, sry, 0, 0, TWO_PI);
    ctx.stroke();

    // Rim highlight along upper curve
    ctx.strokeStyle = rgba(accRgb, 0.62);
    ctx.lineWidth = r * 0.026;
    ctx.beginPath();
    ctx.ellipse(sx, sy, srx * 0.94, sry * 0.94, 0, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();

    // Glossy top-left specular cushion on each chubby lobe
    ctx.save();
    ctx.translate(sx - srx * 0.18, sy - sry * 0.46);
    ctx.rotate(-0.22);
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.beginPath();
    ctx.ellipse(0, 0, srx * 0.36, sry * 0.14, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  // Adorable rosy cheeks on the head lobe
  const headX = segments[3].x * r;
  const headY = segments[3].y;
  for (let side = -1; side <= 1; side += 2) {
    drawHalo(ctx, headX + r * 0.02, headY + side * r * 0.27, r * 0.13, rosyCheek, 0.46);
  }

  // Two tiny glossy black eyes with white catchlights!
  const eyeX = headX + r * 0.14;
  const eyeOffY = r * 0.185;
  const eyeR = r * 0.085;
  drawGlossyEye(ctx, eyeX, headY - eyeOffY, eyeR);
  drawGlossyEye(ctx, eyeX, headY + eyeOffY, eyeR);
}

/* ============================================================================
 * Public Entry Point
 * ========================================================================== */

const DEFAULT_PALETTES = {
  quark: ['#67e8f9', '#cffafe'],
  electron: ['#5eead4', '#f0fdfa'],
  photon: ['#fde68a', '#fffbeb'],
  atom: ['#7dd3fc', '#bae6fd'],
  molecule: ['#fda4af', '#ffe4e6'],
  spore: ['#86efac', '#dcfce7'],
  bacteria: ['#5eead4', '#ccfbf1'],
  amoeba: ['#a7f3d0', '#ecfdf5'],
  diatom: ['#fcd34d', '#fef3c7'],
  tardigrade: ['#fb923c', '#ffedd5'],
};

/**
 * Render a Scale I (Quantum) or Scale II (Microscopic) species onto `ctx`.
 * Assumes `ctx` is already translated to (0, 0) and rotated by entity.angle (+X).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} kind
 * @param {number} r       Entity radius (scales cleanly from 3 to 50000)
 * @param {number} ph      Per-entity animation phase
 * @param {number} time    Global elapsed time in seconds
 * @param {string} [color] Primary hex color
 * @param {string} [accent] Accent/highlight hex color
 * @returns {boolean} True if `kind` was handled by this module
 */
export function drawMicroSkin(ctx, kind, r, ph, time, color, accent) {
  if (!(r > 0)) return false;

  const fallback = DEFAULT_PALETTES[kind];
  if (!fallback) return false;

  const baseRgb = parseHex(color, parseHex(fallback[0], [125, 211, 252]));
  const accRgb = parseHex(accent, parseHex(fallback[1], [224, 242, 254]));
  const phase = ph || 0;
  const t = time || 0;

  ctx.save();
  try {
    switch (kind) {
      case 'quark':
        drawQuark(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'electron':
        drawElectron(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'photon':
        drawPhoton(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'atom':
        drawAtom(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'molecule':
        drawMolecule(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'spore':
        drawSpore(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'bacteria':
        drawBacteria(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'amoeba':
        drawAmoeba(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'diatom':
        drawDiatom(ctx, r, phase, t, baseRgb, accRgb);
        break;
      case 'tardigrade':
        drawTardigrade(ctx, r, phase, t, baseRgb, accRgb);
        break;
      default:
        return false;
    }
  } finally {
    ctx.restore();
  }
  return true;
}

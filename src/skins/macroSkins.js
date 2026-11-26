/**
 * CHARLIE — High-Detail Storybook-Bioluminescent Canvas 2D Skins
 * Scales III (Sous-Bois / Insects) & IV (Nocturnal City).
 *
 * Design principles:
 * - Immediately recognizable, warm, and charming (even for a 3-year-old).
 * - Layered 3D radial/linear shading, glossy specular highlights, animated details.
 * - Purely relative to radius `r` for seamless infinite-zoom scaling.
 * - ZERO `ctx.shadowBlur` for rock-solid 60 FPS on mobile GPUs.
 * - `ctx` is assumed translated to (0, 0) and rotated by `entity.angle` (+X forward).
 */

const TWO_PI = Math.PI * 2;

/* ============================================================================
 * Shared Drawing Primitives (No shadowBlur, 100% r-relative)
 * ========================================================================== */

function drawRadialGlow(ctx, x, y, innerR, outerR, innerColor, outerColor) {
  const safeOuter = Math.max(outerR, 0.001);
  const safeInner = Math.max(0, Math.min(innerR, safeOuter * 0.95));
  const grad = ctx.createRadialGradient(x, y, safeInner, x, y, safeOuter);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, safeOuter, 0, TWO_PI);
  ctx.fill();
}

function traceRoundedRect(ctx, x, y, w, h, rad) {
  const rr = Math.min(rad, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawGlossOval(ctx, x, y, rx, ry, rot = 0, alpha = 0.42) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

function drawExpressiveEye(ctx, x, y, eyeR, irisColor, pupilColor = '#111827', lookX = 0.18, lookY = 0) {
  // Subtle dark socket rim
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.arc(x, y, eyeR * 1.12, 0, TWO_PI);
  ctx.fill();

  // Warm iris gradient
  const grad = ctx.createRadialGradient(
    x - eyeR * 0.2,
    y - eyeR * 0.2,
    eyeR * 0.1,
    x,
    y,
    eyeR
  );
  grad.addColorStop(0, '#fffbeb');
  grad.addColorStop(0.35, irisColor);
  grad.addColorStop(1, '#78350f');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, eyeR, 0, TWO_PI);
  ctx.fill();

  // Glossy dark pupil
  const px = x + eyeR * lookX;
  const py = y + eyeR * lookY;
  ctx.fillStyle = pupilColor;
  ctx.beginPath();
  ctx.arc(px, py, eyeR * 0.56, 0, TWO_PI);
  ctx.fill();

  // Primary bright catchlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px - eyeR * 0.22, py - eyeR * 0.24, eyeR * 0.26, 0, TWO_PI);
  ctx.fill();

  // Secondary tiny sparkle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(px + eyeR * 0.2, py + eyeR * 0.22, eyeR * 0.11, 0, TWO_PI);
  ctx.fill();
}

/* ============================================================================
 * SCALE III: SOUS-BOIS (Insects & Pond)
 * ========================================================================== */

function drawAnt(ctx, r, ph, time) {
  // Warm ambient forest-floor rim glow
  drawRadialGlow(ctx, 0, 0, r * 0.1, r * 1.32, 'rgba(245, 158, 11, 0.22)', 'rgba(245, 158, 11, 0)');

  const stepFreq = time * 8.5 + ph;

  // --- 6 Jointed Animated Legs (tripod gait) ---
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const legAnchors = [
    { x: 0.22, kneeX: 0.42, kneeY: 0.40, footX: 0.64, footY: 0.60, phase: 0 },
    { x: 0.04, kneeX: 0.02, kneeY: 0.46, footX: -0.06, footY: 0.72, phase: Math.PI },
    { x: -0.14, kneeX: -0.38, kneeY: 0.44, footX: -0.66, footY: 0.68, phase: 0 },
  ];

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const cfg = legAnchors[i];
      const gait = Math.sin(stepFreq + cfg.phase + (side === 1 ? Math.PI : 0));
      const swingX = gait * 0.11;
      const liftY = Math.cos(stepFreq + cfg.phase + (side === 1 ? Math.PI : 0)) * 0.05;

      const ax = cfg.x * r;
      const ay = side * 0.10 * r;
      const kx = (cfg.kneeX + swingX * 0.55) * r;
      const ky = side * (cfg.kneeY + liftY) * r;
      const fx = (cfg.footX + swingX) * r;
      const fy = side * (cfg.footY + liftY * 0.6) * r;

      // Dark chestnut leg shadow/base
      ctx.strokeStyle = '#5c2309';
      ctx.lineWidth = r * 0.068;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      // Warm amber-copper top sheen on femur
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = r * 0.028;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(kx, ky);
      ctx.stroke();

      // Tiny rounded foot pad
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.036, 0, TWO_PI);
      ctx.fill();
    }
  }
  ctx.restore();

  // --- Striped Glossy Abdomen (Gaster) at -X ---
  const gasterX = -0.54 * r;
  const gasterRx = 0.44 * r;
  const gasterRy = 0.32 * r;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gasterX, 0, gasterRx, gasterRy, 0, 0, TWO_PI);
  const gGrad = ctx.createRadialGradient(
    gasterX + gasterRx * 0.18,
    -gasterRy * 0.34,
    r * 0.04,
    gasterX,
    0,
    gasterRx * 1.15
  );
  gGrad.addColorStop(0, '#fbbf24');
  gGrad.addColorStop(0.32, '#d97706');
  gGrad.addColorStop(0.75, '#92400e');
  gGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = gGrad;
  ctx.fill();

  // Clipped chestnut tergite stripes across the abdomen
  ctx.clip();
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
  ctx.lineWidth = r * 0.075;
  for (let s = -1; s <= 1; s++) {
    const sx = gasterX + s * r * 0.17;
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.06, 0, r * 0.12, gasterRy * 1.05, 0, -Math.PI * 0.52, Math.PI * 0.52);
    ctx.stroke();
  }
  // Subtle honey rim glow on stripe edges
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.28)';
  ctx.lineWidth = r * 0.025;
  for (let s = -1; s <= 1; s++) {
    const sx = gasterX + s * r * 0.17 + r * 0.045;
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.06, 0, r * 0.12, gasterRy * 0.96, 0, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }
  ctx.restore();

  // Specular shine on gaster
  drawGlossOval(ctx, gasterX + r * 0.06, -r * 0.13, r * 0.22, r * 0.08, -0.18, 0.45);

  // --- Tiny Petiole Node ---
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(-0.15 * r, 0, r * 0.08, 0, TWO_PI);
  ctx.fill();

  // --- Narrow Sculpted Thorax ---
  const thoraxX = 0.06 * r;
  const tGrad = ctx.createRadialGradient(
    thoraxX + r * 0.05,
    -r * 0.07,
    r * 0.02,
    thoraxX,
    0,
    r * 0.28
  );
  tGrad.addColorStop(0, '#fbbf24');
  tGrad.addColorStop(0.45, '#b45309');
  tGrad.addColorStop(1, '#5c2309');
  ctx.fillStyle = tGrad;
  ctx.beginPath();
  ctx.ellipse(thoraxX, 0, r * 0.25, r * 0.16, 0, 0, TWO_PI);
  ctx.fill();
  drawGlossOval(ctx, thoraxX + r * 0.03, -r * 0.06, r * 0.11, r * 0.042, -0.1, 0.42);

  // --- Tiny Animated Mandibles ---
  const pinch = 0.04 * Math.sin(time * 3.4 + ph);
  ctx.save();
  ctx.strokeStyle = '#78350f';
  ctx.fillStyle = '#92400e';
  ctx.lineWidth = r * 0.045;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.moveTo(0.68 * r, side * 0.08 * r);
    ctx.quadraticCurveTo(0.84 * r, side * (0.14 + pinch) * r, 0.87 * r, side * (0.03 + pinch * 0.5) * r);
    ctx.stroke();
  }
  ctx.restore();

  // --- Rounded Glossy Head at +X ---
  const headX = 0.49 * r;
  const hGrad = ctx.createRadialGradient(
    headX + r * 0.06,
    -r * 0.09,
    r * 0.03,
    headX,
    0,
    r * 0.30
  );
  hGrad.addColorStop(0, '#fcd34d');
  hGrad.addColorStop(0.38, '#d97706');
  hGrad.addColorStop(0.82, '#92400e');
  hGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.ellipse(headX, 0, r * 0.27, r * 0.24, 0, 0, TWO_PI);
  ctx.fill();
  drawGlossOval(ctx, headX + r * 0.04, -r * 0.10, r * 0.11, r * 0.05, -0.25, 0.44);

  // --- Cute Glossy Eyes ---
  for (let side = -1; side <= 1; side += 2) {
    const ex = 0.55 * r;
    const ey = side * 0.14 * r;
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.075, r * 0.062, side * 0.25, 0, TWO_PI);
    ctx.fill();
    // Bright white catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + r * 0.02, ey - r * 0.02, r * 0.026, 0, TWO_PI);
    ctx.fill();
  }

  // --- Two Bent/Jointed Swaying Antennae ---
  ctx.save();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = r * 0.042;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let side = -1; side <= 1; side += 2) {
    const sway = Math.sin(time * 4.4 + ph + side * 0.9) * 0.09;
    const sx = 0.69 * r;
    const sy = side * 0.08 * r;
    const elbowX = 0.87 * r;
    const elbowY = side * (0.24 + sway * 0.5) * r;
    const tipX = 1.08 * r;
    const tipY = side * (0.15 + sway) * r;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(elbowX, elbowY);
    ctx.quadraticCurveTo(0.98 * r, side * (0.24 + sway * 0.8) * r, tipX, tipY);
    ctx.stroke();

    // Cute amber tip bead
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(tipX, tipY, r * 0.032, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawFirefly(ctx, r, ph, time) {
  const pulse = 0.68 + 0.32 * Math.sin(time * 4.6 + ph);
  const flap = Math.sin(time * 24 + ph);

  // --- Warm Pulsing Golden-Yellow Lantern Radial Glow ---
  drawRadialGlow(
    ctx,
    -0.44 * r,
    0,
    r * 0.08,
    r * (1.28 + 0.28 * pulse),
    `rgba(254, 240, 138, ${0.42 * pulse})`,
    'rgba(250, 204, 21, 0)'
  );
  drawRadialGlow(
    ctx,
    -0.46 * r,
    0,
    r * 0.04,
    r * (0.72 + 0.14 * pulse),
    `rgba(255, 251, 235, ${0.58 * pulse})`,
    'rgba(253, 224, 71, 0)'
  );

  // --- Tiny Tucked Legs ---
  ctx.save();
  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = r * 0.045;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const lx = (0.22 - i * 0.18) * r;
      const wig = Math.sin(time * 9 + ph + i + side) * 0.04 * r;
      ctx.beginPath();
      ctx.moveTo(lx, side * 0.16 * r);
      ctx.lineTo(lx - 0.08 * r, side * 0.34 * r + wig);
      ctx.stroke();
    }
  }
  ctx.restore();

  // --- Translucent Veined Wings Fluttering Rapidly ---
  ctx.save();
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.translate(0.14 * r, side * 0.08 * r);
    const wingAngle = side * (0.58 + flap * 0.34);
    ctx.rotate(wingAngle);

    // Pearlescent wing membrane
    const wGrad = ctx.createLinearGradient(0, 0, -0.78 * r, side * 0.22 * r);
    wGrad.addColorStop(0, 'rgba(224, 242, 254, 0.58)');
    wGrad.addColorStop(0.55, 'rgba(186, 230, 253, 0.34)');
    wGrad.addColorStop(1, 'rgba(254, 249, 195, 0.18)');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.ellipse(-0.42 * r, side * 0.08 * r, r * 0.46, r * 0.17, side * 0.12, 0, TWO_PI);
    ctx.fill();

    // Delicate iridescent wing rim
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.lineWidth = r * 0.022;
    ctx.stroke();

    // Fine wing veins
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = r * 0.016;
    ctx.beginPath();
    ctx.moveTo(-0.04 * r, side * 0.02 * r);
    ctx.lineTo(-0.76 * r, side * 0.10 * r);
    ctx.moveTo(-0.24 * r, side * 0.05 * r);
    ctx.lineTo(-0.56 * r, side * 0.20 * r);
    ctx.moveTo(-0.36 * r, side * 0.06 * r);
    ctx.lineTo(-0.68 * r, side * -0.02 * r);
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();

  // --- Glowing Golden Lantern Abdomen ---
  const abdX = -0.34 * r;
  const abdRx = 0.44 * r;
  const abdRy = 0.27 * r;
  const lGrad = ctx.createRadialGradient(
    -0.50 * r,
    -0.04 * r,
    r * 0.04,
    abdX,
    0,
    abdRx * 1.15
  );
  lGrad.addColorStop(0, '#ffffff');
  lGrad.addColorStop(0.28, '#fef08a');
  lGrad.addColorStop(0.65, '#facc15');
  lGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = lGrad;
  ctx.beginPath();
  ctx.ellipse(abdX, 0, abdRx, abdRy, 0, 0, TWO_PI);
  ctx.fill();

  // Subtle glowing lantern segments
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.28)';
  ctx.lineWidth = r * 0.025;
  for (let i = 0; i < 3; i++) {
    const sx = (-0.22 - i * 0.16) * r;
    const h = Math.sqrt(Math.max(0.05, 1 - Math.pow((sx - abdX) / abdRx, 2))) * abdRy;
    ctx.beginPath();
    ctx.moveTo(sx, -h * 0.88);
    ctx.quadraticCurveTo(sx - r * 0.06, 0, sx, h * 0.88);
    ctx.stroke();
  }
  ctx.restore();

  // --- Sculpted Dark-Indigo Wing-Covers (Elytra) Slightly Parted ---
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.translate(0.18 * r, side * 0.04 * r);
    ctx.rotate(side * (0.28 + flap * 0.07));

    const eGrad = ctx.createRadialGradient(
      -0.18 * r,
      -side * 0.04 * r,
      r * 0.03,
      -0.28 * r,
      side * 0.06 * r,
      r * 0.46
    );
    eGrad.addColorStop(0, '#4f46e5');
    eGrad.addColorStop(0.42, '#312e81');
    eGrad.addColorStop(0.85, '#1e1b4b');
    eGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = eGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-0.24 * r, side * 0.28 * r, -0.60 * r, side * 0.15 * r);
    ctx.quadraticCurveTo(-0.40 * r, -side * 0.04 * r, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Soft periwinkle sculpted rim & gloss
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.45)';
    ctx.lineWidth = r * 0.022;
    ctx.stroke();

    drawGlossOval(ctx, -0.22 * r, side * 0.10 * r, r * 0.14, r * 0.038, side * 0.2, 0.35);
    ctx.restore();
  }

  // --- Warm Golden-Amber Pronotum Collar ---
  const pGrad = ctx.createRadialGradient(0.30 * r, -0.06 * r, r * 0.02, 0.28 * r, 0, r * 0.25);
  pGrad.addColorStop(0, '#fde68a');
  pGrad.addColorStop(0.55, '#f59e0b');
  pGrad.addColorStop(1, '#9a3412');
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.ellipse(0.28 * r, 0, r * 0.20, r * 0.24, 0, 0, TWO_PI);
  ctx.fill();

  // --- Cute Rounded Head ---
  const headX = 0.50 * r;
  const hGrad = ctx.createRadialGradient(headX + r * 0.04, -r * 0.06, r * 0.02, headX, 0, r * 0.23);
  hGrad.addColorStop(0, '#4338ca');
  hGrad.addColorStop(0.6, '#1e1b4b');
  hGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.arc(headX, 0, r * 0.20, 0, TWO_PI);
  ctx.fill();

  // Glowing Cute Eyes
  for (let side = -1; side <= 1; side += 2) {
    drawExpressiveEye(ctx, 0.57 * r, side * 0.12 * r, r * 0.072, '#fde047', '#0f172a', 0.2, 0);
  }

  // Swaying Antennae with Tiny Glowing Tips
  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = r * 0.032;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    const sw = Math.sin(time * 5.2 + ph + side) * 0.08 * r;
    const tx = 0.90 * r;
    const ty = side * 0.26 * r + sw;
    ctx.beginPath();
    ctx.moveTo(0.65 * r, side * 0.07 * r);
    ctx.quadraticCurveTo(0.80 * r, side * 0.10 * r + sw * 0.4, tx, ty);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.034, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawLadybug(ctx, r, ph, time) {
  // Subtle rosy ambient halo
  drawRadialGlow(ctx, -0.05 * r, 0, r * 0.15, r * 1.25, 'rgba(239, 68, 68, 0.20)', 'rgba(239, 68, 68, 0)');

  // --- Tiny Peeking Animated Legs ---
  ctx.save();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = r * 0.068;
  ctx.lineCap = 'round';
  const legXs = [0.28, -0.08, -0.44];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const wig = Math.sin(time * 7.5 + ph + i * 2.1 + (side === 1 ? Math.PI : 0)) * 0.07 * r;
      const bx = legXs[i] * r;
      const by = side * 0.56 * r;
      const fx = (legXs[i] + (i === 0 ? 0.12 : i === 2 ? -0.14 : 0)) * r + wig;
      const fy = side * 0.80 * r;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + fx) * 0.5, side * 0.74 * r, fx, fy);
      ctx.stroke();
    }
  }
  ctx.restore();

  // --- Plump Crimson 3D Dome Shell ---
  const shellX = -0.08 * r;
  const shellRx = 0.76 * r;
  const shellRy = 0.68 * r;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(shellX, 0, shellRx, shellRy, 0, 0, TWO_PI);
  const sGrad = ctx.createRadialGradient(
    shellX + r * 0.14,
    -r * 0.24,
    r * 0.06,
    shellX,
    0,
    shellRx * 1.12
  );
  sGrad.addColorStop(0, '#ff6b6b');
  sGrad.addColorStop(0.32, '#ef4444');
  sGrad.addColorStop(0.75, '#dc2626');
  sGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = sGrad;
  ctx.fill();

  // Crisp dark-ruby rim outline
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = r * 0.036;
  ctx.stroke();

  // Clip interior shell details
  ctx.clip();

  // Dark center wing seam
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = r * 0.048;
  ctx.beginPath();
  ctx.moveTo(0.46 * r, 0);
  ctx.lineTo(-0.86 * r, 0);
  ctx.stroke();

  // Subtle light bevel right beside the wing seam
  ctx.strokeStyle = 'rgba(255, 228, 230, 0.28)';
  ctx.lineWidth = r * 0.018;
  ctx.beginPath();
  ctx.moveTo(0.42 * r, -r * 0.035);
  ctx.lineTo(-0.78 * r, -r * 0.035);
  ctx.stroke();

  // 7 Neatly Arranged Glossy Black Spots
  const spots = [
    { x: 0.26, y: 0.0, rx: 0.10, ry: 0.11 },     // 1. Center scutellum spot
    { x: 0.08, y: -0.34, rx: 0.125, ry: 0.115 }, // 2. Front-left
    { x: 0.08, y: 0.34, rx: 0.125, ry: 0.115 },  // 3. Front-right
    { x: -0.26, y: -0.42, rx: 0.135, ry: 0.115 },// 4. Mid-left
    { x: -0.26, y: 0.42, rx: 0.135, ry: 0.115 }, // 5. Mid-right
    { x: -0.54, y: -0.20, rx: 0.115, ry: 0.105 },// 6. Rear-left
    { x: -0.54, y: 0.20, rx: 0.115, ry: 0.105 }, // 7. Rear-right
  ];

  for (let i = 0; i < spots.length; i++) {
    const sp = spots[i];
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(sp.x * r, sp.y * r, sp.rx * r, sp.ry * r, 0, 0, TWO_PI);
    ctx.fill();

    // Tiny glossy dot on each black spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc((sp.x + 0.025) * r, (sp.y - 0.03) * r, sp.rx * r * 0.32, 0, TWO_PI);
    ctx.fill();
  }

  // 3D Curved Specular Highlight along upper-left dome
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.44)';
  ctx.lineWidth = r * 0.095;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(shellX, 0, r * 0.54, -Math.PI * 0.72, -Math.PI * 0.24);
  ctx.stroke();

  drawGlossOval(ctx, 0.12 * r, -0.44 * r, r * 0.11, r * 0.048, 0.45, 0.55);
  ctx.restore();

  // --- Black Pronotum Collar with Two Cute White Cheek Spots ---
  const collarX = 0.45 * r;
  const cGrad = ctx.createRadialGradient(collarX + r * 0.04, -r * 0.12, r * 0.02, collarX, 0, r * 0.42);
  cGrad.addColorStop(0, '#3f3f46');
  cGrad.addColorStop(0.5, '#18181b');
  cGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = cGrad;
  ctx.beginPath();
  ctx.ellipse(collarX, 0, r * 0.26, r * 0.45, 0, 0, TWO_PI);
  ctx.fill();

  // Two cute cream-white cheek/collar patches
  ctx.fillStyle = '#fffbeb';
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.ellipse(0.46 * r, side * 0.25 * r, r * 0.085, r * 0.11, side * 0.25, 0, TWO_PI);
    ctx.fill();
  }

  // --- Crisp Black Rounded Head ---
  const headX = 0.68 * r;
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(headX, 0, r * 0.19, r * 0.26, 0, 0, TWO_PI);
  ctx.fill();
  drawGlossOval(ctx, headX + r * 0.02, -r * 0.09, r * 0.075, r * 0.038, 0.2, 0.35);

  // Cute bright eyes on head
  for (let side = -1; side <= 1; side += 2) {
    const ex = 0.74 * r;
    const ey = side * 0.13 * r;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.058, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(ex + r * 0.015, ey, r * 0.036, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + r * 0.005, ey - r * 0.018, r * 0.016, 0, TWO_PI);
    ctx.fill();
  }

  // --- Tiny Curved Clubbed Antennae ---
  ctx.save();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = r * 0.036;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    const bob = Math.sin(time * 5 + ph + side) * 0.05 * r;
    const tx = 0.96 * r;
    const ty = side * 0.20 * r + bob;
    ctx.beginPath();
    ctx.moveTo(0.82 * r, side * 0.09 * r);
    ctx.quadraticCurveTo(0.92 * r, side * 0.10 * r + bob * 0.5, tx, ty);
    ctx.stroke();

    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.038, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawMoth(ctx, r, ph, time) {
  const flap = 0.62 + 0.38 * Math.cos(time * 6.4 + ph);
  const hindFlap = 0.66 + 0.34 * Math.cos(time * 6.4 + ph - 0.35);

  // Bioluminescent nocturnal amber aura
  drawRadialGlow(ctx, 0, 0, r * 0.1, r * 1.38, 'rgba(251, 191, 36, 0.24)', 'rgba(245, 158, 11, 0)');

  // --- Trailing Scalloped Hindwings with Luna/Emperor Tails ---
  ctx.save();
  ctx.scale(1, hindFlap);
  for (let side = -1; side <= 1; side += 2) {
    const hwGrad = ctx.createRadialGradient(-0.15 * r, side * 0.20 * r, r * 0.05, -0.35 * r, side * 0.45 * r, r * 0.95);
    hwGrad.addColorStop(0, '#fef3c7');
    hwGrad.addColorStop(0.42, '#fbbf24');
    hwGrad.addColorStop(0.78, '#d97706');
    hwGrad.addColorStop(1, '#78350f');

    ctx.fillStyle = hwGrad;
    ctx.beginPath();
    ctx.moveTo(0.05 * r, side * 0.08 * r);
    ctx.bezierCurveTo(-0.08 * r, side * 0.78 * r, -0.58 * r, side * 0.86 * r, -0.78 * r, side * 0.52 * r);
    // Graceful trailing swallowtail
    ctx.quadraticCurveTo(-0.98 * r, side * 0.44 * r, -1.16 * r, side * 0.36 * r);
    ctx.quadraticCurveTo(-0.92 * r, side * 0.24 * r, -0.64 * r, side * 0.24 * r);
    ctx.quadraticCurveTo(-0.42 * r, side * 0.12 * r, -0.20 * r, side * 0.06 * r);
    ctx.closePath();
    ctx.fill();

    // Glowing gold wing rim
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
    ctx.lineWidth = r * 0.024;
    ctx.stroke();

    // Hindwing mini eyespot
    const hx = -0.36 * r;
    const hy = side * 0.45 * r;
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.11, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.072, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.042, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();

  // --- Graceful Scalloped Forewings ---
  ctx.save();
  ctx.scale(1, flap);
  for (let side = -1; side <= 1; side += 2) {
    const fwGrad = ctx.createRadialGradient(0.18 * r, side * 0.32 * r, r * 0.06, 0.10 * r, side * 0.62 * r, r * 1.02);
    fwGrad.addColorStop(0, '#fffbeb');
    fwGrad.addColorStop(0.28, '#fde68a');
    fwGrad.addColorStop(0.62, '#f59e0b');
    fwGrad.addColorStop(0.90, '#b45309');
    fwGrad.addColorStop(1, '#5c2309');

    ctx.fillStyle = fwGrad;
    ctx.beginPath();
    ctx.moveTo(0.28 * r, side * 0.08 * r);
    // Sweeping leading edge
    ctx.bezierCurveTo(0.64 * r, side * 0.36 * r, 0.64 * r, side * 0.96 * r, 0.26 * r, side * 1.14 * r);
    // Scalloped outer margin
    ctx.quadraticCurveTo(0.06 * r, side * 1.06 * r, -0.02 * r, side * 0.96 * r);
    ctx.quadraticCurveTo(-0.18 * r, side * 0.92 * r, -0.22 * r, side * 0.72 * r);
    ctx.quadraticCurveTo(-0.34 * r, side * 0.50 * r, -0.14 * r, side * 0.12 * r);
    ctx.closePath();
    ctx.fill();

    // Rich dark-mahogany leading edge trim
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.75)';
    ctx.lineWidth = r * 0.042;
    ctx.stroke();

    // Delicate radial wing veins
    ctx.strokeStyle = 'rgba(255, 251, 235, 0.34)';
    ctx.lineWidth = r * 0.018;
    ctx.beginPath();
    ctx.moveTo(0.18 * r, side * 0.14 * r);
    ctx.lineTo(0.36 * r, side * 0.94 * r);
    ctx.moveTo(0.10 * r, side * 0.16 * r);
    ctx.lineTo(0.06 * r, side * 0.88 * r);
    ctx.moveTo(0.02 * r, side * 0.18 * r);
    ctx.lineTo(-0.16 * r, side * 0.66 * r);
    ctx.stroke();

    // Concentric Decorative Forewing Eyespot
    const ex = 0.16 * r;
    const ey = side * 0.64 * r;
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.17, r * 0.15, side * 0.2, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.125, r * 0.11, side * 0.2, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = '#0d9488';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.082, r * 0.072, side * 0.2, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.044, 0, TWO_PI);
    ctx.fill();

    // Crescent highlight inside eyespot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + r * 0.025, ey - side * 0.025 * r, r * 0.024, 0, TWO_PI);
    ctx.fill();

    // Decorative cream margin dots
    ctx.fillStyle = 'rgba(255, 251, 235, 0.72)';
    ctx.beginPath();
    ctx.arc(0.38 * r, side * 0.96 * r, r * 0.032, 0, TWO_PI);
    ctx.arc(0.14 * r, side * 0.96 * r, r * 0.028, 0, TWO_PI);
    ctx.arc(-0.08 * r, side * 0.80 * r, r * 0.026, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();

  // --- Fuzzy Cream Segmented Body ---
  const bGrad = ctx.createLinearGradient(0.45 * r, 0, -0.58 * r, 0);
  bGrad.addColorStop(0, '#fffbeb');
  bGrad.addColorStop(0.45, '#fde68a');
  bGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.ellipse(-0.06 * r, 0, r * 0.50, r * 0.15, 0, 0, TWO_PI);
  ctx.fill();

  // Soft fuzzy thoracic collar
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.ellipse(0.24 * r, 0, r * 0.19, r * 0.18, 0, 0, TWO_PI);
  ctx.fill();

  // Abdomen segments
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
  ctx.lineWidth = r * 0.024;
  for (let i = 0; i < 4; i++) {
    const sx = (-0.06 - i * 0.11) * r;
    const sh = r * (0.13 - i * 0.018);
    ctx.beginPath();
    ctx.moveTo(sx, -sh);
    ctx.lineTo(sx, sh);
    ctx.stroke();
  }

  // --- Cute Head & Glossy Eyes ---
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(0.46 * r, 0, r * 0.13, 0, TWO_PI);
  ctx.fill();
  for (let side = -1; side <= 1; side += 2) {
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0.51 * r, side * 0.085 * r, r * 0.044, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0.525 * r, side * 0.075 * r, r * 0.017, 0, TWO_PI);
    ctx.fill();
  }

  // --- Feathery Plumed Moth Antennae ---
  ctx.save();
  ctx.strokeStyle = '#fde68a';
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    const sw = Math.sin(time * 4 + ph + side) * 0.05 * r;
    ctx.lineWidth = r * 0.032;
    ctx.beginPath();
    ctx.moveTo(0.55 * r, side * 0.05 * r);
    ctx.quadraticCurveTo(0.74 * r, side * 0.14 * r + sw * 0.5, 0.88 * r, side * 0.32 * r + sw);
    ctx.stroke();

    // Delicate feather barbs along each antenna
    ctx.lineWidth = r * 0.018;
    for (let b = 1; b <= 5; b++) {
      const u = b / 6;
      const bx = (0.55 + u * 0.33) * r;
      const by = side * (0.05 + u * u * 0.27) * r + sw * u;
      const barbLen = r * (0.085 * Math.sin(u * Math.PI));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + barbLen * 0.5, by + side * barbLen);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - barbLen * 0.3, by - side * barbLen * 0.75);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFrog(ctx, r, ph, time) {
  const breath = 1 + 0.035 * Math.sin(time * 3.6 + ph);
  const kick = Math.pow(Math.max(0, Math.sin(time * 3.6 + ph)), 2);

  // Dewy emerald pond aura
  drawRadialGlow(ctx, 0, 0, r * 0.15, r * 1.32, 'rgba(34, 197, 94, 0.22)', 'rgba(34, 197, 94, 0)');

  // --- Tucked Muscular Webbed Hind Legs (with gentle kick/pulse) ---
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    const kickOffX = -kick * 0.18 * r;
    const kickOffY = side * kick * 0.10 * r;

    // Translucent lime-amber webbed hind foot
    const footX = -0.68 * r + kickOffX;
    const footY = side * 0.56 * r + kickOffY;
    ctx.fillStyle = 'rgba(190, 242, 100, 0.72)';
    ctx.beginPath();
    ctx.moveTo(footX + 0.10 * r, footY - side * 0.06 * r);
    ctx.lineTo(footX - 0.18 * r, footY + side * 0.08 * r);
    ctx.quadraticCurveTo(footX - 0.22 * r, footY + side * 0.24 * r, footX - 0.04 * r, footY + side * 0.26 * r);
    ctx.quadraticCurveTo(footX + 0.10 * r, footY + side * 0.26 * r, footX + 0.16 * r, footY + side * 0.12 * r);
    ctx.closePath();
    ctx.fill();

    // Hind toes
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = r * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(footX + 0.06 * r, footY);
    ctx.lineTo(footX - 0.16 * r, footY + side * 0.10 * r);
    ctx.moveTo(footX + 0.06 * r, footY);
    ctx.lineTo(footX - 0.04 * r, footY + side * 0.24 * r);
    ctx.moveTo(footX + 0.06 * r, footY);
    ctx.lineTo(footX + 0.12 * r, footY + side * 0.18 * r);
    ctx.stroke();

    // Muscular folded emerald thigh
    const thighGrad = ctx.createRadialGradient(
      -0.36 * r,
      side * 0.44 * r,
      r * 0.04,
      -0.40 * r,
      side * 0.48 * r,
      r * 0.36
    );
    thighGrad.addColorStop(0, '#4ade80');
    thighGrad.addColorStop(0.55, '#16a34a');
    thighGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = thighGrad;
    ctx.beginPath();
    ctx.ellipse(
      -0.38 * r + kickOffX * 0.35,
      side * 0.48 * r + kickOffY * 0.4,
      r * 0.34,
      r * 0.20,
      side * (-0.42 + kick * 0.18),
      0,
      TWO_PI
    );
    ctx.fill();

    // Wet gloss on thigh
    drawGlossOval(
      ctx,
      -0.36 * r + kickOffX * 0.35,
      side * 0.44 * r + kickOffY * 0.4,
      r * 0.14,
      r * 0.055,
      side * -0.4,
      0.34
    );
    ctx.restore();
  }

  // --- Cute Splayed Front Webbed Toes ---
  for (let side = -1; side <= 1; side += 2) {
    const armX = 0.42 * r;
    const armY = side * 0.56 * r;
    // Soft pale-mint webbing
    ctx.fillStyle = 'rgba(187, 247, 208, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0.28 * r, side * 0.44 * r);
    ctx.lineTo(armX + 0.22 * r, armY - side * 0.04 * r);
    ctx.lineTo(armX + 0.18 * r, armY + side * 0.18 * r);
    ctx.lineTo(armX - 0.02 * r, armY + side * 0.22 * r);
    ctx.closePath();
    ctx.fill();

    // Plump little green forearm
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = r * 0.13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.24 * r, side * 0.36 * r);
    ctx.lineTo(armX, armY);
    ctx.stroke();

    // 3 cute splayed round-tipped toes
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = r * 0.048;
    const toeAngles = [-0.28, 0.25, 0.78];
    for (let t = 0; t < 3; t++) {
      const a = side * toeAngles[t];
      const tx = armX + Math.cos(a) * r * 0.20;
      const ty = armY + Math.sin(a) * r * 0.20;
      ctx.beginPath();
      ctx.moveTo(armX, armY);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // Cute sticky tree-frog toe pad!
      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.038, 0, TWO_PI);
      ctx.fill();
    }
  }

  // --- Plump Emerald Body with Lighter Belly Rim ---
  ctx.save();
  ctx.scale(1, breath);

  // Soft pale-mint belly rim peeking underneath
  ctx.fillStyle = '#bbf7d0';
  ctx.beginPath();
  ctx.ellipse(-0.02 * r, 0, r * 0.74, r * 0.58, 0, 0, TWO_PI);
  ctx.fill();

  // Main emerald body gradient
  const bodyGrad = ctx.createRadialGradient(0.14 * r, -0.18 * r, r * 0.06, -0.02 * r, 0, r * 0.78);
  bodyGrad.addColorStop(0, '#86efac');
  bodyGrad.addColorStop(0.28, '#22c55e');
  bodyGrad.addColorStop(0.72, '#15803d');
  bodyGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0.74 * r, 0);
  ctx.bezierCurveTo(0.72 * r, -0.44 * r, 0.22 * r, -0.58 * r, -0.16 * r, -0.54 * r);
  ctx.bezierCurveTo(-0.56 * r, -0.50 * r, -0.74 * r, -0.28 * r, -0.72 * r, 0);
  ctx.bezierCurveTo(-0.74 * r, 0.28 * r, -0.56 * r, 0.50 * r, -0.16 * r, 0.54 * r);
  ctx.bezierCurveTo(0.22 * r, 0.58 * r, 0.72 * r, 0.44 * r, 0.74 * r, 0);
  ctx.closePath();
  ctx.fill();

  // Glossy mottled green skin spots
  ctx.fillStyle = 'rgba(20, 83, 45, 0.36)';
  const mottles = [
    [-0.12, -0.26, 0.13, 0.09, 0.3],
    [-0.12, 0.26, 0.13, 0.09, -0.3],
    [-0.42, -0.16, 0.11, 0.08, -0.2],
    [-0.42, 0.16, 0.11, 0.08, 0.2],
    [0.14, 0.0, 0.11, 0.07, 0],
    [-0.28, 0.0, 0.12, 0.08, 0],
  ];
  for (let i = 0; i < mottles.length; i++) {
    const m = mottles[i];
    ctx.beginPath();
    ctx.ellipse(m[0] * r, m[1] * r, m[2] * r, m[3] * r, m[4], 0, TWO_PI);
    ctx.fill();
  }

  // Pale-lime dorsal ridge highlight
  ctx.strokeStyle = 'rgba(187, 247, 208, 0.38)';
  ctx.lineWidth = r * 0.042;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.26 * r, 0);
  ctx.lineTo(-0.52 * r, 0);
  ctx.stroke();

  // Dewy wet-skin specular highlight
  drawGlossOval(ctx, 0.02 * r, -0.22 * r, r * 0.26, r * 0.09, -0.12, 0.36);

  // Cute tiny nostril dots near snout
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(0.60 * r, -0.09 * r, r * 0.026, 0, TWO_PI);
  ctx.arc(0.60 * r, 0.09 * r, r * 0.026, 0, TWO_PI);
  ctx.fill();

  ctx.restore();

  // --- Two Big Expressive Golden-Amber Eyes ---
  for (let side = -1; side <= 1; side += 2) {
    const ex = 0.38 * r;
    const ey = side * 0.30 * r;

    // Plump emerald eyelid bulge
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(ex - 0.02 * r, ey, r * 0.20, 0, TWO_PI);
    ctx.fill();

    // Big expressive golden-amber eye with dark pupil & bright catchlights
    drawExpressiveEye(ctx, ex + 0.02 * r, ey, r * 0.155, '#f59e0b', '#1c1917', 0.22, -side * 0.06);
  }
}

/* ============================================================================
 * SCALE IV: NOCTURNAL CITY (La Ville Endormie)
 * ========================================================================== */

function drawLantern(ctx, r, ph, time) {
  const flicker = 0.88 + 0.12 * Math.sin(time * 9.2 + ph * 2.1);
  const sway = Math.sin(time * 2.1 + ph) * 0.12;

  ctx.save();
  ctx.rotate(sway);

  // Warm floating festival paper lantern radial aura
  drawRadialGlow(
    ctx,
    0,
    0,
    r * 0.15,
    r * (1.42 * flicker),
    `rgba(253, 186, 116, ${0.42 * flicker})`,
    'rgba(249, 115, 22, 0)'
  );

  // --- Gently Swaying Golden Silk Tassel (bottom, +Y) ---
  const tasselTipX = Math.sin(time * 3.1 + ph - 0.5) * r * 0.16;
  ctx.save();
  ctx.lineCap = 'round';
  // Silk tassel strands fanning softly
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = i % 2 === 0 ? '#fbbf24' : '#f59e0b';
    ctx.lineWidth = r * 0.028;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.78);
    ctx.quadraticCurveTo(
      tasselTipX * 0.5 + i * r * 0.03,
      r * 1.02,
      tasselTipX + i * r * 0.048,
      r * (1.22 - Math.abs(i) * 0.02)
    );
    ctx.stroke();
  }
  // Lacquered golden tassel knot bead
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(0, r * 0.79, r * 0.075, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(-r * 0.02, r * 0.77, r * 0.024, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // --- Top Hanging Wire Loop (-Y) ---
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = r * 0.036;
  ctx.beginPath();
  ctx.arc(0, -r * 0.85, r * 0.12, Math.PI, TWO_PI);
  ctx.stroke();

  // --- Plump Glowing Amber-Peach Silk Body ---
  const bodyRx = r * 0.66;
  const bodyRy = r * 0.70;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyRx, bodyRy, 0, 0, TWO_PI);
  const silkGrad = ctx.createRadialGradient(0, r * 0.06, r * 0.06, 0, 0, r * 0.80);
  silkGrad.addColorStop(0, '#fffbeb');
  silkGrad.addColorStop(0.32, '#fed7aa');
  silkGrad.addColorStop(0.68, '#fb923c');
  silkGrad.addColorStop(1, '#c2410c');
  ctx.fillStyle = silkGrad;
  ctx.fill();

  // Clip ribs & inner flame to lantern body
  ctx.clip();

  // Warm flickering inner candle flame glow
  drawRadialGlow(
    ctx,
    0,
    r * 0.08,
    r * 0.02,
    r * 0.46 * flicker,
    'rgba(255, 255, 255, 0.78)',
    'rgba(253, 224, 71, 0)'
  );
  // Subtle teardrop inner flame silhouette
  ctx.fillStyle = 'rgba(255, 251, 235, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.18 * flicker);
  ctx.quadraticCurveTo(r * 0.14, r * 0.08, 0, r * 0.22);
  ctx.quadraticCurveTo(-r * 0.14, r * 0.08, 0, -r * 0.18 * flicker);
  ctx.fill();

  // Subtle vertical curved bamboo ribs
  ctx.strokeStyle = 'rgba(124, 45, 18, 0.26)';
  ctx.lineWidth = r * 0.024;
  const ribWidths = [0.22, 0.46];
  for (let i = 0; i < ribWidths.length; i++) {
    const rw = ribWidths[i] * r;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, bodyRy * 1.04, 0, 0, TWO_PI);
    ctx.stroke();
  }
  // Center vertical rib
  ctx.beginPath();
  ctx.moveTo(0, -bodyRy);
  ctx.lineTo(0, bodyRy);
  ctx.stroke();

  // Soft silk gloss highlight
  drawGlossOval(ctx, -r * 0.28, -r * 0.22, r * 0.12, r * 0.28, 0.22, 0.26);
  ctx.restore();

  // Outer warm silk rim
  ctx.strokeStyle = 'rgba(154, 52, 18, 0.45)';
  ctx.lineWidth = r * 0.025;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyRx, bodyRy, 0, 0, TWO_PI);
  ctx.stroke();

  // --- Dark Lacquered Top & Bottom Caps with Gold Trim ---
  const drawCap = (y, w, h) => {
    const capGrad = ctx.createLinearGradient(-w * 0.5, y, w * 0.5, y);
    capGrad.addColorStop(0, '#0f172a');
    capGrad.addColorStop(0.4, '#334155');
    capGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = capGrad;
    traceRoundedRect(ctx, -w * 0.5, y, w, h, h * 0.35);
    ctx.fill();

    // Gold lacquer trim line
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-w * 0.44, y + h * 0.38, w * 0.88, h * 0.22);
  };

  drawCap(-r * 0.78, r * 0.72, r * 0.16);
  drawCap(r * 0.62, r * 0.64, r * 0.15);

  ctx.restore();
}

function drawCar(ctx, r, ph, time, color) {
  // --- Two Warm Volumetric Cone Headlight Beams Shining Forward (+X) ---
  ctx.save();
  for (let side = -1; side <= 1; side += 2) {
    const beamGrad = ctx.createLinearGradient(0.88 * r, side * 0.32 * r, 2.38 * r, side * 0.46 * r);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
    beamGrad.addColorStop(0.45, 'rgba(254, 240, 138, 0.20)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0.88 * r, side * 0.26 * r);
    ctx.lineTo(2.38 * r, side * 0.04 * r);
    ctx.lineTo(2.38 * r, side * 0.86 * r);
    ctx.lineTo(0.88 * r, side * 0.40 * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Soft ruby taillight ambient glow (-X)
  drawRadialGlow(ctx, -0.96 * r, -0.32 * r, r * 0.02, r * 0.34, 'rgba(251, 113, 133, 0.45)', 'rgba(251, 113, 133, 0)');
  drawRadialGlow(ctx, -0.96 * r, 0.32 * r, r * 0.02, r * 0.34, 'rgba(251, 113, 133, 0.45)', 'rgba(251, 113, 133, 0)');

  // --- Tiny Wheels Peeking Under Rounded Fenders ---
  ctx.fillStyle = '#0f172a';
  const wheelXs = [0.54, -0.56];
  for (let i = 0; i < 2; i++) {
    for (let side = -1; side <= 1; side += 2) {
      traceRoundedRect(ctx, wheelXs[i] * r - 0.16 * r, side * 0.48 * r - 0.08 * r, 0.32 * r, 0.16 * r, 0.05 * r);
      ctx.fill();
    }
  }

  // --- Tiny Side Mirrors ---
  ctx.fillStyle = color || '#93c5fd';
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.ellipse(0.32 * r, side * 0.58 * r, r * 0.065, r * 0.10, side * 0.25, 0, TWO_PI);
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = r * 0.02;
    ctx.stroke();
  }

  // --- Metallic Gradient Painted Chassis with Rounded Fenders ---
  const chassisGrad = ctx.createLinearGradient(0, -0.56 * r, 0, 0.56 * r);
  chassisGrad.addColorStop(0, '#dbeafe');
  chassisGrad.addColorStop(0.22, color || '#93c5fd');
  chassisGrad.addColorStop(0.62, '#3b82f6');
  chassisGrad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = chassisGrad;
  traceRoundedRect(ctx, -0.98 * r, -0.54 * r, 1.96 * r, 1.08 * r, 0.34 * r);
  ctx.fill();

  // Crisp metallic fender contour outline
  ctx.strokeStyle = 'rgba(23, 37, 84, 0.65)';
  ctx.lineWidth = r * 0.032;
  ctx.stroke();

  // Subtle retro hood crease lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = r * 0.022;
  ctx.beginPath();
  ctx.moveTo(0.46 * r, -0.26 * r);
  ctx.lineTo(0.82 * r, -0.22 * r);
  ctx.moveTo(0.46 * r, 0.26 * r);
  ctx.lineTo(0.82 * r, 0.22 * r);
  ctx.stroke();

  // --- Dark Tinted Curved Windshield (+X) & Rear Window (-X) ---
  ctx.fillStyle = '#0f172a';
  // Front windshield
  ctx.beginPath();
  ctx.moveTo(0.22 * r, -0.37 * r);
  ctx.quadraticCurveTo(0.54 * r, -0.34 * r, 0.56 * r, 0);
  ctx.quadraticCurveTo(0.54 * r, 0.34 * r, 0.22 * r, 0.37 * r);
  ctx.closePath();
  ctx.fill();

  // Rear window
  ctx.beginPath();
  ctx.moveTo(-0.34 * r, -0.35 * r);
  ctx.quadraticCurveTo(-0.62 * r, -0.30 * r, -0.64 * r, 0);
  ctx.quadraticCurveTo(-0.62 * r, 0.30 * r, -0.34 * r, 0.35 * r);
  ctx.closePath();
  ctx.fill();

  // Side windows
  traceRoundedRect(ctx, -0.38 * r, -0.42 * r, 0.66 * r, 0.84 * r, 0.16 * r);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  // Diagonal glass reflection streak on windshield
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.36)';
  ctx.lineWidth = r * 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.32 * r, -0.24 * r);
  ctx.lineTo(0.44 * r, -0.02 * r);
  ctx.stroke();

  // --- Sculpted Roof with Top Specular Sheen ---
  const roofGrad = ctx.createLinearGradient(-0.32 * r, -0.34 * r, 0.24 * r, 0.34 * r);
  roofGrad.addColorStop(0, '#eff6ff');
  roofGrad.addColorStop(0.35, color || '#93c5fd');
  roofGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = roofGrad;
  traceRoundedRect(ctx, -0.34 * r, -0.33 * r, 0.58 * r, 0.66 * r, 0.16 * r);
  ctx.fill();

  // Glossy specular sheen on roof
  drawGlossOval(ctx, -0.04 * r, -0.14 * r, r * 0.20, r * 0.08, 0, 0.44);

  // --- Bright Headlights (+X) & Glowing Ruby Taillights (-X) ---
  for (let side = -1; side <= 1; side += 2) {
    // Headlight lens
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(0.91 * r, side * 0.32 * r, r * 0.075, r * 0.105, side * -0.2, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0.92 * r, side * 0.32 * r, r * 0.045, 0, TWO_PI);
    ctx.fill();

    // Ruby taillight lens
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(-0.92 * r, side * 0.31 * r, r * 0.068, r * 0.10, side * 0.2, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#fecdd3';
    ctx.beginPath();
    ctx.arc(-0.92 * r, side * 0.31 * r, r * 0.032, 0, TWO_PI);
    ctx.fill();
  }
}

function drawTree(ctx, r, ph, time) {
  ctx.save();
  ctx.rotate(Math.sin(time * 1.2 + ph) * 0.05);

  // Soft moonlit forest canopy halo
  drawRadialGlow(ctx, 0, 0, r * 0.2, r * 1.30, 'rgba(52, 211, 153, 0.22)', 'rgba(16, 185, 129, 0)');

  // --- Layer 1: Deep Forest Emerald Base Clusters ---
  const baseGrad = ctx.createRadialGradient(-0.15 * r, -0.15 * r, r * 0.1, 0, 0, r * 0.98);
  baseGrad.addColorStop(0, '#047857');
  baseGrad.addColorStop(0.65, '#065f46');
  baseGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = baseGrad;
  for (let i = 0; i < 7; i++) {
    const a = (i * TWO_PI) / 7 + 0.15;
    const cx = Math.cos(a) * r * 0.44;
    const cy = Math.sin(a) * r * 0.44;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.50, 0, TWO_PI);
    ctx.fill();
  }

  // --- Layer 2: Lush Sage-Emerald Mid Clusters ---
  for (let i = 0; i < 6; i++) {
    const a = (i * TWO_PI) / 6 + 0.52;
    const cx = Math.cos(a) * r * 0.36;
    const cy = Math.sin(a) * r * 0.36;
    const cGrad = ctx.createRadialGradient(cx - 0.10 * r, cy - 0.10 * r, r * 0.04, cx, cy, r * 0.44);
    cGrad.addColorStop(0, '#34d399');
    cGrad.addColorStop(0.55, '#10b981');
    cGrad.addColorStop(1, '#065f46');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, TWO_PI);
    ctx.fill();
  }

  // --- Layer 3: Moonlit Teal & Soft Sage Crown Highlights ---
  const crownClusters = [
    { x: -0.18, y: -0.18, cr: 0.36 },
    { x: 0.16, y: -0.14, cr: 0.30 },
    { x: -0.10, y: 0.16, cr: 0.28 },
    { x: 0.02, y: -0.02, cr: 0.32 },
  ];
  for (let i = 0; i < crownClusters.length; i++) {
    const cc = crownClusters[i];
    const mGrad = ctx.createRadialGradient(
      (cc.x - 0.08) * r,
      (cc.y - 0.08) * r,
      r * 0.03,
      cc.x * r,
      cc.y * r,
      cc.cr * r
    );
    mGrad.addColorStop(0, '#a7f3d0');
    mGrad.addColorStop(0.52, '#34d399');
    mGrad.addColorStop(1, '#059669');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(cc.x * r, cc.y * r, cc.cr * r, 0, TWO_PI);
    ctx.fill();
  }

  // Moonlit teal rim accent arc on upper-left canopy edge
  ctx.strokeStyle = 'rgba(153, 246, 228, 0.45)';
  ctx.lineWidth = r * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-0.08 * r, -0.08 * r, r * 0.72, -Math.PI * 0.85, -Math.PI * 0.25);
  ctx.stroke();

  // --- Tiny Warm Twinkling Firefly Dots Among the Leaves ---
  for (let i = 0; i < 6; i++) {
    const a = i * 1.08 + ph * 0.5;
    const dist = r * (0.28 + 0.34 * ((i * 37) % 10) / 10);
    const fx = Math.cos(a + Math.sin(time * 0.8 + i) * 0.12) * dist;
    const fy = Math.sin(a + Math.cos(time * 0.9 + i) * 0.12) * dist;
    const tw = 0.32 + 0.68 * Math.pow(0.5 + 0.5 * Math.sin(time * 3.4 + i * 1.7 + ph), 2);

    drawRadialGlow(
      ctx,
      fx,
      fy,
      0,
      r * 0.16 * tw,
      `rgba(254, 240, 138, ${0.72 * tw})`,
      'rgba(253, 224, 71, 0)'
    );
    ctx.fillStyle = `rgba(255, 251, 235, ${0.9 * tw})`;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.042 * (0.6 + 0.4 * tw), 0, TWO_PI);
    ctx.fill();
  }

  ctx.restore();
}

function drawHouse(ctx, r, ph, time) {
  ctx.save();
  ctx.rotate(Math.sin(time * 0.9 + ph) * 0.04);

  // --- Warm Golden Light Spilling Softly from Porch Edge (+Y) ---
  drawRadialGlow(
    ctx,
    0.22 * r,
    0.72 * r,
    r * 0.06,
    r * 0.78,
    'rgba(254, 240, 138, 0.52)',
    'rgba(251, 191, 36, 0)'
  );
  // Soft cozy cottage ambient glow
  drawRadialGlow(ctx, 0, 0, r * 0.2, r * 1.25, 'rgba(251, 191, 36, 0.16)', 'rgba(251, 191, 36, 0)');

  // --- Cottage Shadow Foundation & Porch Step ---
  ctx.fillStyle = '#1e293b';
  traceRoundedRect(ctx, -0.84 * r, -0.66 * r, 1.68 * r, 1.32 * r, 0.12 * r);
  ctx.fill();

  // Warm lit wooden porch deck peeking out at bottom-right
  ctx.fillStyle = '#fde68a';
  traceRoundedRect(ctx, 0.02 * r, 0.56 * r, 0.44 * r, 0.24 * r, 0.06 * r);
  ctx.fill();

  // --- Warm Terracotta-Amber Pitched Roof (Top-Down) ---
  const rx = -0.80 * r;
  const rw = 1.60 * r;
  const ry = -0.62 * r;
  const rh = 1.24 * r;

  // Upper roof slope (catching moonlight)
  const topSlope = ctx.createLinearGradient(0, ry, 0, 0);
  topSlope.addColorStop(0, '#b45309');
  topSlope.addColorStop(0.55, '#d97706');
  topSlope.addColorStop(1, '#f59e0b');
  ctx.fillStyle = topSlope;
  traceRoundedRect(ctx, rx, ry, rw, rh * 0.52, 0.10 * r);
  ctx.fill();

  // Lower roof slope (richer shaded terracotta)
  const botSlope = ctx.createLinearGradient(0, 0, 0, ry + rh);
  botSlope.addColorStop(0, '#c2410c');
  botSlope.addColorStop(0.55, '#9a3412');
  botSlope.addColorStop(1, '#7c2d12');
  ctx.fillStyle = botSlope;
  traceRoundedRect(ctx, rx, 0, rw, rh * 0.50, 0.10 * r);
  ctx.fill();

  // Shingled roof texture lines
  ctx.save();
  traceRoundedRect(ctx, rx, ry, rw, rh, 0.10 * r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(67, 20, 7, 0.28)';
  ctx.lineWidth = r * 0.022;
  for (let row = -3; row <= 3; row++) {
    if (row === 0) continue;
    const ly = row * r * 0.18;
    ctx.beginPath();
    ctx.moveTo(rx, ly);
    ctx.lineTo(rx + rw, ly);
    ctx.stroke();

    // Subtle staggered shingle notches
    for (let col = -3; col <= 3; col++) {
      const sx = (col * 0.24 + (row % 2 === 0 ? 0.12 : 0)) * r;
      ctx.beginPath();
      ctx.moveTo(sx, ly);
      ctx.lineTo(sx, ly + (row < 0 ? 0.14 : -0.14) * r);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Roof eaves border
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = r * 0.032;
  traceRoundedRect(ctx, rx, ry, rw, rh, 0.10 * r);
  ctx.stroke();

  // --- Raised Ridge Beam across Center Peak ---
  ctx.fillStyle = '#fde68a';
  traceRoundedRect(ctx, -0.84 * r, -0.055 * r, 1.68 * r, 0.11 * r, 0.04 * r);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = r * 0.022;
  ctx.stroke();

  // --- Warm Glowing Skylight on Lower-Left Roof Slope ---
  const skyX = -0.52 * r;
  const skyY = 0.16 * r;
  const skyW = 0.36 * r;
  const skyH = 0.28 * r;
  drawRadialGlow(
    ctx,
    skyX + skyW * 0.5,
    skyY + skyH * 0.5,
    r * 0.04,
    r * 0.42,
    'rgba(254, 249, 195, 0.65)',
    'rgba(251, 191, 36, 0)'
  );
  ctx.fillStyle = '#fef08a';
  traceRoundedRect(ctx, skyX, skyY, skyW, skyH, 0.04 * r);
  ctx.fill();
  // Skylight frame & mullion crossbars
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = r * 0.032;
  ctx.stroke();
  ctx.lineWidth = r * 0.022;
  ctx.beginPath();
  ctx.moveTo(skyX + skyW * 0.5, skyY);
  ctx.lineTo(skyX + skyW * 0.5, skyY + skyH);
  ctx.moveTo(skyX, skyY + skyH * 0.5);
  ctx.lineTo(skyX + skyW, skyY + skyH * 0.5);
  ctx.stroke();

  // --- Tiny Brick Chimney with Gentle Drifting Smoke Wisp ---
  const chX = 0.40 * r;
  const chY = -0.36 * r;
  ctx.fillStyle = '#991b1b';
  traceRoundedRect(ctx, chX - 0.15 * r, chY - 0.15 * r, 0.30 * r, 0.30 * r, 0.05 * r);
  ctx.fill();
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = r * 0.024;
  ctx.stroke();
  // Dark flue interior
  ctx.fillStyle = '#1c1917';
  traceRoundedRect(ctx, chX - 0.08 * r, chY - 0.08 * r, 0.16 * r, 0.16 * r, 0.03 * r);
  ctx.fill();

  // 3 gentle animated drifting wisps of smoke
  for (let i = 0; i < 3; i++) {
    const life = (time * 0.42 + ph * 0.25 + i / 3) % 1;
    const sx = chX + life * 0.36 * r + Math.sin(life * 5 + i) * 0.06 * r;
    const sy = chY - life * 0.42 * r;
    const sr = r * (0.06 + life * 0.13);
    const alpha = Math.sin(life * Math.PI) * 0.42;
    ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, TWO_PI);
    ctx.fill();
  }

  ctx.restore();
}

function drawTower(ctx, r, ph, time) {
  ctx.save();
  ctx.rotate(Math.sin(time * 0.7 + ph) * 0.03);

  // Sleek nocturnal architectural aura
  drawRadialGlow(ctx, 0, 0, r * 0.2, r * 1.32, 'rgba(96, 165, 250, 0.18)', 'rgba(30, 58, 138, 0)');

  // --- Tier 1: Outer Art-Deco Base Deck ---
  const t1 = r * 0.82;
  const t1Grad = ctx.createLinearGradient(-t1, -t1, t1, t1);
  t1Grad.addColorStop(0, '#334155');
  t1Grad.addColorStop(0.5, '#1e293b');
  t1Grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = t1Grad;
  traceRoundedRect(ctx, -t1, -t1, t1 * 2, t1 * 2, r * 0.14);
  ctx.fill();

  // Glowing warm-gold architectural edge light strips along Tier 1 perimeter
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
  ctx.lineWidth = r * 0.036;
  ctx.stroke();

  // Art-deco glowing cyan-gold corner skylights on Tier 1
  ctx.fillStyle = '#fde68a';
  const cornerOff = r * 0.64;
  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sy = -1; sy <= 1; sy += 2) {
      traceRoundedRect(ctx, sx * cornerOff - 0.07 * r, sy * cornerOff - 0.07 * r, 0.14 * r, 0.14 * r, 0.03 * r);
      ctx.fill();
    }
  }

  // --- Tier 2: Mid Stepped Geometric Terrace ---
  const t2 = r * 0.58;
  const t2Grad = ctx.createLinearGradient(-t2, -t2, t2, t2);
  t2Grad.addColorStop(0, '#475569');
  t2Grad.addColorStop(0.55, '#334155');
  t2Grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = t2Grad;
  traceRoundedRect(ctx, -t2, -t2, t2 * 2, t2 * 2, r * 0.11);
  ctx.fill();

  // Glowing architectural cyan-ice accent strips along mid-tier sides
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -t2);
  ctx.lineTo(r * 0.34, -t2);
  ctx.moveTo(-r * 0.34, t2);
  ctx.lineTo(r * 0.34, t2);
  ctx.moveTo(-t2, -r * 0.34);
  ctx.lineTo(-t2, r * 0.34);
  ctx.moveTo(t2, -r * 0.34);
  ctx.lineTo(t2, r * 0.34);
  ctx.stroke();

  // --- Tier 3: Crown Penthouse Rooftop ---
  const t3 = r * 0.38;
  const t3Grad = ctx.createRadialGradient(-0.10 * r, -0.10 * r, r * 0.04, 0, 0, r * 0.54);
  t3Grad.addColorStop(0, '#64748b');
  t3Grad.addColorStop(0.65, '#334155');
  t3Grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = t3Grad;
  traceRoundedRect(ctx, -t3, -t3, t3 * 2, t3 * 2, r * 0.09);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = r * 0.026;
  ctx.stroke();

  // --- Rooftop Helipad Detail ---
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.27, 0, TWO_PI);
  ctx.fill();

  // Illuminated warm-gold helipad ring
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = r * 0.034;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.23, 0, TWO_PI);
  ctx.stroke();

  // Crisp 'H' helipad marking
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = r * 0.042;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.085 * r, -0.11 * r);
  ctx.lineTo(-0.085 * r, 0.11 * r);
  ctx.moveTo(0.085 * r, -0.11 * r);
  ctx.lineTo(0.085 * r, 0.11 * r);
  ctx.moveTo(-0.085 * r, 0);
  ctx.lineTo(0.085 * r, 0);
  ctx.stroke();

  // --- Softly Blinking Warm Red Aviation Beacon ---
  const beacon = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(time * 4.4 + ph), 2);
  const bx = 0.36 * r;
  const by = -0.36 * r;

  // Spire mount ring
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(bx, by, r * 0.075, 0, TWO_PI);
  ctx.fill();

  // Soft pulsing red radial glow (no shadowBlur!)
  drawRadialGlow(
    ctx,
    bx,
    by,
    r * 0.02,
    r * (0.28 + 0.20 * beacon),
    `rgba(248, 113, 113, ${0.78 * beacon})`,
    'rgba(239, 68, 68, 0)'
  );
  // Crimson beacon bulb
  ctx.fillStyle = `rgba(239, 68, 68, ${0.55 + 0.45 * beacon})`;
  ctx.beginPath();
  ctx.arc(bx, by, r * 0.062, 0, TWO_PI);
  ctx.fill();
  // Bright white-pink core glint
  ctx.fillStyle = `rgba(255, 241, 242, ${0.65 + 0.35 * beacon})`;
  ctx.beginPath();
  ctx.arc(bx, by, r * 0.028, 0, TWO_PI);
  ctx.fill();

  ctx.restore();
}

function drawOwl(ctx, r, ph, time, color, accent) {
  const flap = Math.sin(time * 4.6 + ph);
  const wingSpan = 0.85 + 0.15 * flap;
  const wingSweep = flap * 0.13;
  const baseChestnut = color || '#c08457';
  const eyeAmber = accent || '#fbbf24';

  // Soft warm golden-amber nocturnal aura
  drawRadialGlow(
    ctx,
    0.06 * r,
    0,
    r * 0.12,
    r * 1.36,
    'rgba(254, 240, 138, 0.22)',
    'rgba(245, 158, 11, 0)'
  );

  // --- Fanned Tail Feathers at -X ---
  ctx.save();
  const tailAngles = [-0.42, -0.21, 0, 0.21, 0.42];
  for (let i = 0; i < tailAngles.length; i++) {
    ctx.save();
    ctx.translate(-0.42 * r, 0);
    ctx.rotate(tailAngles[i]);

    const tLen = (i === 2 ? 0.62 : i === 1 || i === 3 ? 0.56 : 0.48) * r;
    const tGrad = ctx.createLinearGradient(0, 0, -tLen, 0);
    tGrad.addColorStop(0, baseChestnut);
    tGrad.addColorStop(0.58, '#854d0e');
    tGrad.addColorStop(1, '#451a03');

    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.ellipse(-tLen * 0.52, 0, tLen * 0.52, r * 0.115, 0, 0, TWO_PI);
    ctx.fill();

    // Soft cream barred tail band near tip
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.52)';
    ctx.lineWidth = r * 0.036;
    ctx.beginPath();
    ctx.moveTo(-tLen * 0.74, -r * 0.075);
    ctx.lineTo(-tLen * 0.74, r * 0.075);
    ctx.stroke();

    // Subtle dark feather shaft
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
    ctx.lineWidth = r * 0.016;
    ctx.beginPath();
    ctx.moveTo(-r * 0.04, 0);
    ctx.lineTo(-tLen * 0.92, 0);
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();

  // --- Gracefully Flapping Scalloped Feathered Wings ---
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.translate(0.06 * r, side * 0.16 * r);
    ctx.scale(1, wingSpan);
    ctx.rotate(side * (-0.05 + wingSweep));

    // Primary feathered wing silhouette with scalloped trailing tips
    const wGrad = ctx.createRadialGradient(
      0.06 * r,
      side * 0.24 * r,
      r * 0.06,
      -0.08 * r,
      side * 0.56 * r,
      r * 1.12
    );
    wGrad.addColorStop(0, '#e6b88a');
    wGrad.addColorStop(0.32, baseChestnut);
    wGrad.addColorStop(0.72, '#8b4513');
    wGrad.addColorStop(1, '#451a03');

    ctx.beginPath();
    ctx.moveTo(0.24 * r, 0);
    // Curved leading wing edge
    ctx.bezierCurveTo(0.42 * r, side * 0.36 * r, 0.30 * r, side * 0.96 * r, -0.04 * r, side * 1.16 * r);
    // Scalloped primary feather tips along trailing edge
    ctx.quadraticCurveTo(-0.16 * r, side * 1.14 * r, -0.18 * r, side * 1.00 * r);
    ctx.quadraticCurveTo(-0.30 * r, side * 1.02 * r, -0.32 * r, side * 0.84 * r);
    ctx.quadraticCurveTo(-0.44 * r, side * 0.82 * r, -0.44 * r, side * 0.64 * r);
    ctx.quadraticCurveTo(-0.52 * r, side * 0.58 * r, -0.48 * r, side * 0.40 * r);
    ctx.quadraticCurveTo(-0.46 * r, side * 0.18 * r, -0.26 * r, side * 0.04 * r);
    ctx.closePath();

    ctx.fillStyle = wGrad;
    ctx.fill();

    // Clipped scalloped cream feather bars & dark primary vane lines
    ctx.save();
    ctx.clip();

    // Soft cream-buff covert spots & barred flight-feather pattern
    ctx.fillStyle = 'rgba(254, 243, 199, 0.34)';
    for (let f = 0; f < 4; f++) {
      const fx = (-0.06 - f * 0.10) * r;
      const fy = side * (0.86 - f * 0.16) * r;
      ctx.beginPath();
      ctx.ellipse(fx, fy, r * 0.075, r * 0.042, side * -0.45, 0, TWO_PI);
      ctx.fill();
    }

    // Subtle dark feather rachis lines
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.36)';
    ctx.lineWidth = r * 0.02;
    ctx.beginPath();
    ctx.moveTo(0.12 * r, side * 0.18 * r);
    ctx.lineTo(-0.06 * r, side * 1.08 * r);
    ctx.moveTo(0.02 * r, side * 0.18 * r);
    ctx.lineTo(-0.22 * r, side * 0.92 * r);
    ctx.moveTo(-0.08 * r, side * 0.16 * r);
    ctx.lineTo(-0.36 * r, side * 0.72 * r);
    ctx.moveTo(-0.16 * r, side * 0.12 * r);
    ctx.lineTo(-0.44 * r, side * 0.48 * r);
    ctx.stroke();

    // Overlapping warm cream-chestnut upper covert feather band
    const covGrad = ctx.createLinearGradient(0.24 * r, 0, -0.18 * r, side * 0.56 * r);
    covGrad.addColorStop(0, '#fef3c7');
    covGrad.addColorStop(0.45, '#d69e6c');
    covGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = covGrad;
    ctx.beginPath();
    ctx.moveTo(0.26 * r, 0);
    ctx.quadraticCurveTo(0.32 * r, side * 0.42 * r, 0.06 * r, side * 0.68 * r);
    ctx.quadraticCurveTo(-0.06 * r, side * 0.62 * r, -0.06 * r, side * 0.48 * r);
    ctx.quadraticCurveTo(-0.18 * r, side * 0.44 * r, -0.16 * r, side * 0.28 * r);
    ctx.quadraticCurveTo(-0.26 * r, side * 0.22 * r, -0.20 * r, side * 0.04 * r);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Rich umber wing edge outline
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
    ctx.lineWidth = r * 0.024;
    ctx.stroke();

    ctx.restore();
  }

  // --- Plump Warm Chestnut-and-Cream Feathered Body ---
  const bodyX = -0.06 * r;
  const bodyRx = 0.58 * r;
  const bodyRy = 0.42 * r;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bodyX, 0, bodyRx, bodyRy, 0, 0, TWO_PI);
  const bGrad = ctx.createRadialGradient(
    bodyX + 0.12 * r,
    -0.14 * r,
    r * 0.05,
    bodyX,
    0,
    bodyRx * 1.15
  );
  bGrad.addColorStop(0, '#f7dcc0');
  bGrad.addColorStop(0.32, baseChestnut);
  bGrad.addColorStop(0.75, '#8b4513');
  bGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = bGrad;
  ctx.fill();

  // Clipped scalloped cream plumage chevrons along back
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 251, 235, 0.44)';
  ctx.lineWidth = r * 0.032;
  ctx.lineCap = 'round';
  for (let row = 0; row < 3; row++) {
    const rx = (0.10 - row * 0.20) * r;
    const count = row === 2 ? 2 : 3;
    for (let c = 0; c < count; c++) {
      const cy = (c - (count - 1) * 0.5) * 0.22 * r;
      ctx.beginPath();
      ctx.arc(rx + 0.06 * r, cy, r * 0.095, Math.PI * 0.65, Math.PI * 1.35);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Soft back specular highlight
  drawGlossOval(ctx, 0.02 * r, -0.15 * r, r * 0.22, r * 0.09, -0.15, 0.24);

  // --- Subtle Feathered Ear Tufts ---
  for (let side = -1; side <= 1; side += 2) {
    ctx.fillStyle = '#6b2f0e';
    ctx.beginPath();
    ctx.moveTo(0.46 * r, side * 0.22 * r);
    ctx.quadraticCurveTo(0.28 * r, side * 0.46 * r, 0.14 * r, side * 0.43 * r);
    ctx.quadraticCurveTo(0.24 * r, side * 0.28 * r, 0.34 * r, side * 0.16 * r);
    ctx.closePath();
    ctx.fill();

    // Warm cream inner ear-tuft highlight
    ctx.fillStyle = 'rgba(254, 243, 199, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0.42 * r, side * 0.24 * r);
    ctx.quadraticCurveTo(0.30 * r, side * 0.38 * r, 0.20 * r, side * 0.38 * r);
    ctx.quadraticCurveTo(0.28 * r, side * 0.29 * r, 0.36 * r, side * 0.20 * r);
    ctx.closePath();
    ctx.fill();
  }

  // --- Cute Rounded Head at +X ---
  const headX = 0.44 * r;
  const hGrad = ctx.createRadialGradient(
    headX + 0.05 * r,
    -0.10 * r,
    r * 0.04,
    headX,
    0,
    r * 0.40
  );
  hGrad.addColorStop(0, '#f3d1ad');
  hGrad.addColorStop(0.40, baseChestnut);
  hGrad.addColorStop(0.84, '#7c2d12');
  hGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.ellipse(headX, 0, r * 0.34, r * 0.37, 0, 0, TWO_PI);
  ctx.fill();

  // Soft cream heart-shaped facial disc framing the eyes
  for (let side = -1; side <= 1; side += 2) {
    const discGrad = ctx.createRadialGradient(
      0.56 * r,
      side * 0.15 * r,
      r * 0.02,
      0.54 * r,
      side * 0.15 * r,
      r * 0.20
    );
    discGrad.addColorStop(0, '#fffbeb');
    discGrad.addColorStop(0.68, '#fef3c7');
    discGrad.addColorStop(1, '#e7c296');
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.ellipse(0.55 * r, side * 0.15 * r, r * 0.175, r * 0.185, side * 0.15, 0, TWO_PI);
    ctx.fill();

    // Subtle chestnut facial disc rim
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.42)';
    ctx.lineWidth = r * 0.02;
    ctx.stroke();
  }

  // Cute crown gloss
  drawGlossOval(ctx, 0.36 * r, -0.14 * r, r * 0.13, r * 0.06, -0.3, 0.28);

  // --- Tiny Golden Beak Pointing +X ---
  const beakGrad = ctx.createLinearGradient(0.68 * r, -0.08 * r, 0.92 * r, 0.08 * r);
  beakGrad.addColorStop(0, '#fef08a');
  beakGrad.addColorStop(0.5, '#f59e0b');
  beakGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = beakGrad;
  ctx.beginPath();
  ctx.moveTo(0.68 * r, -0.075 * r);
  ctx.quadraticCurveTo(0.84 * r, -0.055 * r, 0.92 * r, 0);
  ctx.quadraticCurveTo(0.84 * r, 0.055 * r, 0.68 * r, 0.075 * r);
  ctx.quadraticCurveTo(0.64 * r, 0, 0.68 * r, -0.075 * r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = r * 0.02;
  ctx.stroke();
  // Tiny beak highlight
  drawGlossOval(ctx, 0.77 * r, -0.02 * r, r * 0.045, r * 0.018, 0.1, 0.65);

  // --- Two Big Expressive Glowing Amber Eyes ---
  for (let side = -1; side <= 1; side += 2) {
    const ex = 0.57 * r;
    const ey = side * 0.165 * r;
    // Soft glowing amber eye halo (no shadowBlur!)
    drawRadialGlow(
      ctx,
      ex,
      ey,
      r * 0.04,
      r * 0.24,
      'rgba(254, 240, 138, 0.45)',
      'rgba(245, 158, 11, 0)'
    );
    drawExpressiveEye(ctx, ex, ey, r * 0.125, eyeAmber, '#0f172a', 0.20, 0);
  }
}

function drawHelicopter(ctx, r, ph, time, color, accent) {
  const rotorAngle = time * 15.5 + ph * 3.0;
  const tailBlink = 0.22 + 0.78 * Math.pow(0.5 + 0.5 * Math.sin(time * 5.2 + ph), 2);
  const searchSweep = Math.sin(time * 1.5 + ph) * 0.06;
  const hullColor = color || '#14b8a6';
  const stripeColor = accent || '#fb7185';

  // --- Warm Volumetric Searchlight Cone Shining Forward (+X) ---
  ctx.save();
  ctx.rotate(searchSweep);
  const beamGrad = ctx.createLinearGradient(0.80 * r, 0, 2.48 * r, 0);
  beamGrad.addColorStop(0, 'rgba(254, 249, 195, 0.58)');
  beamGrad.addColorStop(0.40, 'rgba(254, 240, 138, 0.24)');
  beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(0.82 * r, -0.10 * r);
  ctx.lineTo(2.48 * r, -0.74 * r);
  ctx.lineTo(2.48 * r, 0.74 * r);
  ctx.lineTo(0.82 * r, 0.10 * r);
  ctx.closePath();
  ctx.fill();

  // Brighter inner volumetric core
  const coreGrad = ctx.createLinearGradient(0.82 * r, 0, 1.95 * r, 0);
  coreGrad.addColorStop(0, 'rgba(255, 251, 235, 0.48)');
  coreGrad.addColorStop(0.55, 'rgba(254, 240, 138, 0.16)');
  coreGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(0.82 * r, -0.06 * r);
  ctx.lineTo(1.95 * r, -0.34 * r);
  ctx.lineTo(1.95 * r, 0.34 * r);
  ctx.lineTo(0.82 * r, 0.06 * r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Subtle nocturnal aircraft rim aura
  drawRadialGlow(
    ctx,
    0.08 * r,
    0,
    r * 0.15,
    r * 1.24,
    'rgba(56, 189, 248, 0.16)',
    'rgba(14, 165, 233, 0)'
  );

  // --- Landing Skids Peeking Out on Both Sides ---
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    // Two cross-struts connecting fuselage to skid
    ctx.lineWidth = r * 0.044;
    ctx.beginPath();
    ctx.moveTo(0.32 * r, side * 0.28 * r);
    ctx.lineTo(0.32 * r, side * 0.51 * r);
    ctx.moveTo(-0.14 * r, side * 0.24 * r);
    ctx.lineTo(-0.14 * r, side * 0.51 * r);
    ctx.stroke();

    // Main tubular landing skid
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = r * 0.064;
    ctx.beginPath();
    ctx.moveTo(-0.34 * r, side * 0.51 * r);
    ctx.lineTo(0.48 * r, side * 0.51 * r);
    ctx.quadraticCurveTo(0.58 * r, side * 0.51 * r, 0.62 * r, side * 0.44 * r);
    ctx.stroke();

    // Metallic top glint on skid
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.lineWidth = r * 0.022;
    ctx.beginPath();
    ctx.moveTo(-0.30 * r, side * 0.495 * r);
    ctx.lineTo(0.48 * r, side * 0.495 * r);
    ctx.stroke();
    ctx.strokeStyle = '#334155';
  }
  ctx.restore();

  // --- Horizontal Tail Stabilizers & Tiny Spinning Tail Rotor (-X) ---
  for (let side = -1; side <= 1; side += 2) {
    const stabGrad = ctx.createLinearGradient(-0.98 * r, 0, -0.98 * r, side * 0.36 * r);
    stabGrad.addColorStop(0, hullColor);
    stabGrad.addColorStop(0.75, '#0f766e');
    stabGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = stabGrad;
    ctx.beginPath();
    ctx.moveTo(-0.84 * r, side * 0.05 * r);
    ctx.lineTo(-0.92 * r, side * 0.34 * r);
    ctx.lineTo(-1.05 * r, side * 0.32 * r);
    ctx.lineTo(-1.02 * r, side * 0.05 * r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = r * 0.02;
    ctx.stroke();

    // Accent tip stripe on stabilizer
    ctx.fillStyle = stripeColor;
    ctx.fillRect(-1.02 * r, side > 0 ? 0.25 * r : -0.32 * r, 0.10 * r, 0.07 * r);
  }

  // Tiny translucent tail rotor blur spinning on port side
  const tailSpin = 0.65 + 0.35 * Math.sin(time * 28 + ph);
  ctx.fillStyle = `rgba(224, 242, 254, ${0.42 * tailSpin})`;
  ctx.beginPath();
  ctx.ellipse(-1.17 * r, -0.10 * r, r * 0.14, r * 0.032, 0, 0, TWO_PI);
  ctx.fill();

  // --- Slender Tail Boom Stretching to -X ---
  const boomGrad = ctx.createLinearGradient(0, -0.14 * r, 0, 0.14 * r);
  boomGrad.addColorStop(0, '#e0f2fe');
  boomGrad.addColorStop(0.32, hullColor);
  boomGrad.addColorStop(0.85, '#0369a1');
  boomGrad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = boomGrad;
  ctx.beginPath();
  ctx.moveTo(-0.28 * r, -0.15 * r);
  ctx.lineTo(-1.20 * r, -0.055 * r);
  ctx.quadraticCurveTo(-1.26 * r, 0, -1.20 * r, 0.055 * r);
  ctx.lineTo(-0.28 * r, 0.15 * r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.62)';
  ctx.lineWidth = r * 0.024;
  ctx.stroke();

  // Vertical tail fin spine ridge
  ctx.fillStyle = '#f8fafc';
  traceRoundedRect(ctx, -1.24 * r, -0.028 * r, 0.22 * r, 0.056 * r, 0.024 * r);
  ctx.fill();

  // --- Tiny Blinking Red Tail Aviation Light ---
  const tx = -1.24 * r;
  drawRadialGlow(
    ctx,
    tx,
    0,
    r * 0.015,
    r * (0.20 + 0.16 * tailBlink),
    `rgba(248, 113, 113, ${0.82 * tailBlink})`,
    'rgba(239, 68, 68, 0)'
  );
  ctx.fillStyle = `rgba(239, 68, 68, ${0.55 + 0.45 * tailBlink})`;
  ctx.beginPath();
  ctx.arc(tx, 0, r * 0.048, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 241, 242, ${0.65 + 0.35 * tailBlink})`;
  ctx.beginPath();
  ctx.arc(tx, 0, r * 0.022, 0, TWO_PI);
  ctx.fill();

  // --- Teardrop Glossy Painted Fuselage ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0.88 * r, 0);
  ctx.bezierCurveTo(0.88 * r, -0.34 * r, 0.44 * r, -0.44 * r, 0.04 * r, -0.40 * r);
  ctx.bezierCurveTo(-0.26 * r, -0.37 * r, -0.44 * r, -0.22 * r, -0.48 * r, 0);
  ctx.bezierCurveTo(-0.44 * r, 0.22 * r, -0.26 * r, 0.37 * r, 0.04 * r, 0.40 * r);
  ctx.bezierCurveTo(0.44 * r, 0.44 * r, 0.88 * r, 0.34 * r, 0.88 * r, 0);
  ctx.closePath();

  const fuseGrad = ctx.createRadialGradient(
    0.22 * r,
    -0.16 * r,
    r * 0.06,
    0.16 * r,
    0,
    r * 0.86
  );
  fuseGrad.addColorStop(0, '#e0f2fe');
  fuseGrad.addColorStop(0.28, hullColor);
  fuseGrad.addColorStop(0.76, '#0284c7');
  fuseGrad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = fuseGrad;
  ctx.fill();

  // Clipped decorative flank accent stripe & engine vents
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = r * 0.055;
  ctx.beginPath();
  ctx.moveTo(-0.46 * r, -0.22 * r);
  ctx.quadraticCurveTo(0.08 * r, -0.34 * r, 0.72 * r, -0.22 * r);
  ctx.moveTo(-0.46 * r, 0.22 * r);
  ctx.quadraticCurveTo(0.08 * r, 0.34 * r, 0.72 * r, 0.22 * r);
  ctx.stroke();

  // Twin dark engine cowling exhaust vents behind the rotor mast
  ctx.fillStyle = '#0f172a';
  for (let side = -1; side <= 1; side += 2) {
    traceRoundedRect(ctx, -0.34 * r, side * 0.12 * r - 0.045 * r, 0.18 * r, 0.09 * r, 0.03 * r);
    ctx.fill();
  }
  ctx.restore();

  // Crisp metallic fuselage contour
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.68)';
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  ctx.restore();

  // --- Curved Dark-Tinted Panoramic Glass Cockpit Canopy at +X ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0.81 * r, 0);
  ctx.bezierCurveTo(0.81 * r, -0.26 * r, 0.56 * r, -0.34 * r, 0.26 * r, -0.31 * r);
  ctx.quadraticCurveTo(0.32 * r, 0, 0.26 * r, 0.31 * r);
  ctx.bezierCurveTo(0.56 * r, 0.34 * r, 0.81 * r, 0.26 * r, 0.81 * r, 0);
  ctx.closePath();

  const glassGrad = ctx.createRadialGradient(
    0.58 * r,
    -0.12 * r,
    r * 0.03,
    0.54 * r,
    0,
    r * 0.42
  );
  glassGrad.addColorStop(0, '#38bdf8');
  glassGrad.addColorStop(0.28, '#1e293b');
  glassGrad.addColorStop(0.72, '#0f172a');
  glassGrad.addColorStop(1, '#020617');
  ctx.fillStyle = glassGrad;
  ctx.fill();

  // Subtle warm instrument-panel glow inside canopy
  ctx.save();
  ctx.clip();
  drawRadialGlow(
    ctx,
    0.52 * r,
    0,
    r * 0.02,
    r * 0.22,
    'rgba(254, 240, 138, 0.26)',
    'rgba(251, 191, 36, 0)'
  );

  // Panoramic curved specular glass reflection streak
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.44)';
  ctx.lineWidth = r * 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.42 * r, -0.22 * r);
  ctx.quadraticCurveTo(0.60 * r, -0.18 * r, 0.68 * r, -0.04 * r);
  ctx.stroke();

  // Center canopy divider mullion
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.85)';
  ctx.lineWidth = r * 0.026;
  ctx.beginPath();
  ctx.moveTo(0.28 * r, 0);
  ctx.lineTo(0.81 * r, 0);
  ctx.stroke();
  ctx.restore();

  // Canopy metallic rim
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
  ctx.lineWidth = r * 0.022;
  ctx.stroke();
  ctx.restore();

  // Glossy roof highlight behind cockpit
  drawGlossOval(ctx, -0.06 * r, -0.14 * r, r * 0.18, r * 0.07, -0.08, 0.34);

  // Nose searchlight lens
  drawRadialGlow(
    ctx,
    0.86 * r,
    0,
    r * 0.015,
    r * 0.18,
    'rgba(255, 251, 235, 0.88)',
    'rgba(254, 240, 138, 0)'
  );
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0.85 * r, 0, r * 0.045, 0, TWO_PI);
  ctx.fill();

  // --- 4 Sweeping Semi-Translucent Main Rotor Blades Spinning Smoothly ---
  const hubX = 0.04 * r;
  // Subtle circular rotor-wash motion disc
  drawRadialGlow(
    ctx,
    hubX,
    0,
    r * 0.88,
    r * 1.18,
    'rgba(224, 242, 254, 0.10)',
    'rgba(224, 242, 254, 0)'
  );
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.16)';
  ctx.lineWidth = r * 0.025;
  ctx.beginPath();
  ctx.arc(hubX, 0, r * 1.12, 0, TWO_PI);
  ctx.stroke();

  ctx.save();
  ctx.translate(hubX, 0);
  ctx.rotate(rotorAngle);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);

    // Soft trailing motion-blur wedge behind blade
    const blurGrad = ctx.createLinearGradient(0, 0, 0, -0.24 * r);
    blurGrad.addColorStop(0, 'rgba(224, 242, 254, 0.22)');
    blurGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');
    ctx.fillStyle = blurGrad;
    ctx.beginPath();
    ctx.moveTo(0.10 * r, 0);
    ctx.lineTo(1.14 * r, 0);
    ctx.lineTo(1.10 * r, -0.22 * r);
    ctx.lineTo(0.10 * r, -0.04 * r);
    ctx.closePath();
    ctx.fill();

    // Sleek semi-translucent main rotor blade
    ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
    traceRoundedRect(ctx, 0.06 * r, -0.046 * r, 1.10 * r, 0.092 * r, 0.036 * r);
    ctx.fill();

    // Bright safety tip band
    ctx.fillStyle = 'rgba(254, 240, 138, 0.78)';
    traceRoundedRect(ctx, 1.00 * r, -0.042 * r, 0.11 * r, 0.084 * r, 0.02 * r);
    ctx.fill();

    // Thin metallic leading-edge sheen
    ctx.fillStyle = 'rgba(248, 250, 252, 0.48)';
    ctx.fillRect(0.10 * r, 0.018 * r, 0.96 * r, 0.018 * r);

    ctx.restore();
  }
  ctx.restore();

  // --- Glossy Central Rotor Hub Cap ---
  const hubGrad = ctx.createRadialGradient(
    hubX - 0.03 * r,
    -0.04 * r,
    r * 0.01,
    hubX,
    0,
    r * 0.14
  );
  hubGrad.addColorStop(0, '#f8fafc');
  hubGrad.addColorStop(0.5, '#64748b');
  hubGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = hubGrad;
  ctx.beginPath();
  ctx.arc(hubX, 0, r * 0.125, 0, TWO_PI);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = r * 0.018;
  ctx.stroke();
}

function drawBlimp(ctx, r, ph, time, color, accent) {
  const navPulse = 0.45 + 0.55 * Math.sin(time * 3.6 + ph);
  const tailNavPulse = 0.45 + 0.55 * Math.sin(time * 3.6 + ph + Math.PI);
  const warmHum = 0.80 + 0.20 * Math.sin(time * 2.2 + ph);
  const stripeColor = color || '#f87171';
  const goldTrim = accent || '#fde68a';

  // --- Subtle Warm Illuminated Glow Along Underside / Gondola Rim ---
  drawRadialGlow(
    ctx,
    0.04 * r,
    0,
    r * 0.16,
    r * 1.44,
    `rgba(253, 224, 71, ${0.24 * warmHum})`,
    'rgba(245, 158, 11, 0)'
  );
  drawRadialGlow(
    ctx,
    0.10 * r,
    0,
    r * 0.10,
    r * 0.92,
    `rgba(254, 240, 138, ${0.32 * warmHum})`,
    'rgba(251, 191, 36, 0)'
  );

  // Warm illuminated gondola rim peeking subtly along mid-belly sides
  ctx.save();
  for (let side = -1; side <= 1; side += 2) {
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.58 * warmHum})`;
    ctx.lineWidth = r * 0.055;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.18 * r, side * 0.55 * r);
    ctx.quadraticCurveTo(0.14 * r, side * 0.61 * r, 0.42 * r, side * 0.52 * r);
    ctx.stroke();
  }
  ctx.restore();

  // --- 4 Tail Fins at -X (Side Horizontal Fins + Ventral Hint; Dorsal Fin on Top Later) ---
  for (let side = -1; side <= 1; side += 2) {
    const finGrad = ctx.createLinearGradient(-0.70 * r, 0, -1.06 * r, side * 0.66 * r);
    finGrad.addColorStop(0, '#e2e8f0');
    finGrad.addColorStop(0.32, stripeColor);
    finGrad.addColorStop(0.85, '#b91c1c');
    finGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = finGrad;
    ctx.beginPath();
    ctx.moveTo(-0.56 * r, side * 0.24 * r);
    ctx.quadraticCurveTo(-0.78 * r, side * 0.58 * r, -1.04 * r, side * 0.64 * r);
    ctx.lineTo(-1.12 * r, side * 0.52 * r);
    ctx.quadraticCurveTo(-1.08 * r, side * 0.26 * r, -0.96 * r, side * 0.12 * r);
    ctx.closePath();
    ctx.fill();

    // Decorative gold trim stripe on side fin
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = r * 0.032;
    ctx.beginPath();
    ctx.moveTo(-0.70 * r, side * 0.34 * r);
    ctx.lineTo(-1.04 * r, side * 0.54 * r);
    ctx.stroke();

    // Crisp fin contour
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.60)';
    ctx.lineWidth = r * 0.022;
    ctx.stroke();
  }

  // Subtle ventral (4th) tail fin tip peeking behind tail cone
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.ellipse(-1.10 * r, 0, r * 0.08, r * 0.045, 0, 0, TWO_PI);
  ctx.fill();

  // --- Plump Elongated Silver-and-Amber/Coral Ribbed Envelope ---
  const traceEnvelope = () => {
    ctx.beginPath();
    ctx.moveTo(1.04 * r, 0);
    ctx.bezierCurveTo(1.04 * r, -0.36 * r, 0.58 * r, -0.58 * r, 0.04 * r, -0.56 * r);
    ctx.bezierCurveTo(-0.48 * r, -0.54 * r, -0.96 * r, -0.26 * r, -1.04 * r, 0);
    ctx.bezierCurveTo(-0.96 * r, 0.26 * r, -0.48 * r, 0.54 * r, 0.04 * r, 0.56 * r);
    ctx.bezierCurveTo(0.58 * r, 0.58 * r, 1.04 * r, 0.36 * r, 1.04 * r, 0);
    ctx.closePath();
  };

  ctx.save();
  traceEnvelope();

  // 3D metallic silver-pearl hull shading
  const envGrad = ctx.createRadialGradient(
    0.22 * r,
    -0.22 * r,
    r * 0.08,
    0.04 * r,
    0,
    r * 1.12
  );
  envGrad.addColorStop(0, '#ffffff');
  envGrad.addColorStop(0.24, '#e2e8f0');
  envGrad.addColorStop(0.58, '#94a3b8');
  envGrad.addColorStop(0.86, '#475569');
  envGrad.addColorStop(1, '#334155');
  ctx.fillStyle = envGrad;
  ctx.fill();

  // Clip envelope interior details (ribs, racing stripe, specular sheen)
  ctx.save();
  ctx.clip();

  // Warm illuminated under-hull bounce glow along the outer edge
  ctx.strokeStyle = `rgba(254, 240, 138, ${0.34 * warmHum})`;
  ctx.lineWidth = r * 0.09;
  traceEnvelope();
  ctx.stroke();

  // Decorative Coral/Amber Nose Cap
  const noseGrad = ctx.createLinearGradient(0.76 * r, -0.36 * r, 1.04 * r, 0.36 * r);
  noseGrad.addColorStop(0, '#fca5a5');
  noseGrad.addColorStop(0.45, stripeColor);
  noseGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = noseGrad;
  ctx.fillRect(0.78 * r, -0.60 * r, 0.32 * r, 1.20 * r);

  // Decorative Girth Band around Mid-Section
  ctx.fillStyle = stripeColor;
  ctx.fillRect(0.10 * r, -0.60 * r, 0.16 * r, 1.20 * r);
  ctx.fillStyle = goldTrim;
  ctx.fillRect(0.07 * r, -0.60 * r, 0.035 * r, 1.20 * r);
  ctx.fillRect(0.255 * r, -0.60 * r, 0.035 * r, 1.20 * r);

  // Sleek Longitudinal Racing Stripe along Flanks
  for (let side = -1; side <= 1; side += 2) {
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = r * 0.085;
    ctx.beginPath();
    ctx.moveTo(1.04 * r, 0);
    ctx.bezierCurveTo(0.66 * r, side * 0.38 * r, -0.36 * r, side * 0.36 * r, -1.04 * r, 0);
    ctx.stroke();

    // Fine warm-gold accent pinstripe
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = r * 0.022;
    ctx.beginPath();
    ctx.moveTo(1.04 * r, 0);
    ctx.bezierCurveTo(0.66 * r, side * 0.31 * r, -0.36 * r, side * 0.29 * r, -1.04 * r, 0);
    ctx.stroke();
  }

  // Longitudinal Structural Envelope Ribs (Gore Seams)
  const ribOffsets = [-0.42, -0.22, 0, 0.22, 0.42];
  for (let i = 0; i < ribOffsets.length; i++) {
    const k = ribOffsets[i];
    // Dark recessed seam
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.28)';
    ctx.lineWidth = r * 0.018;
    ctx.beginPath();
    ctx.moveTo(1.04 * r, 0);
    ctx.bezierCurveTo(0.56 * r, k * 1.15 * r, -0.44 * r, k * 1.05 * r, -1.04 * r, 0);
    ctx.stroke();

    // Soft silver highlight beside seam
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = r * 0.014;
    ctx.beginPath();
    ctx.moveTo(1.04 * r, -0.01 * r);
    ctx.bezierCurveTo(0.56 * r, (k * 1.15 - 0.02) * r, -0.44 * r, (k * 1.05 - 0.02) * r, -1.04 * r, -0.01 * r);
    ctx.stroke();
  }

  // 3D Curved Top Specular Sheen Ribbon
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.68 * r, -0.20 * r);
  ctx.quadraticCurveTo(0.06 * r, -0.34 * r, -0.58 * r, -0.16 * r);
  ctx.stroke();

  drawGlossOval(ctx, 0.34 * r, -0.22 * r, r * 0.26, r * 0.085, -0.08, 0.52);

  ctx.restore();

  // Crisp outer envelope contour
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.65)';
  ctx.lineWidth = r * 0.028;
  traceEnvelope();
  ctx.stroke();
  ctx.restore();

  // --- Dorsal Top Fin (4th Fin Centered Proudly on Top of Tail) ---
  const topFinGrad = ctx.createLinearGradient(-0.62 * r, -0.06 * r, -1.14 * r, 0.06 * r);
  topFinGrad.addColorStop(0, '#f8fafc');
  topFinGrad.addColorStop(0.45, stripeColor);
  topFinGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = topFinGrad;
  ctx.beginPath();
  ctx.moveTo(-0.58 * r, 0);
  ctx.quadraticCurveTo(-0.84 * r, -0.065 * r, -1.14 * r, -0.042 * r);
  ctx.lineTo(-1.14 * r, 0.042 * r);
  ctx.quadraticCurveTo(-0.84 * r, 0.065 * r, -0.58 * r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = r * 0.018;
  ctx.stroke();

  // Bright metallic dorsal fin spine highlight
  ctx.strokeStyle = 'rgba(255, 251, 235, 0.72)';
  ctx.lineWidth = r * 0.02;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.62 * r, 0);
  ctx.lineTo(-1.12 * r, 0);
  ctx.stroke();

  // Metallic nose mooring tip
  ctx.fillStyle = goldTrim;
  ctx.beginPath();
  ctx.arc(1.04 * r, 0, r * 0.052, 0, TWO_PI);
  ctx.fill();

  // --- Two Tiny Warm Navigation Lights Pulsing at Nose (+X) and Tail (-X) ---
  // Nose pulsing warm-gold beacon
  const nx = 1.07 * r;
  drawRadialGlow(
    ctx,
    nx,
    0,
    r * 0.015,
    r * (0.22 + 0.16 * navPulse),
    `rgba(254, 240, 138, ${0.84 * navPulse})`,
    'rgba(251, 191, 36, 0)'
  );
  ctx.fillStyle = `rgba(253, 224, 71, ${0.65 + 0.35 * navPulse})`;
  ctx.beginPath();
  ctx.arc(nx, 0, r * 0.046, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(nx, 0, r * 0.022, 0, TWO_PI);
  ctx.fill();

  // Tail pulsing warm-coral/amber beacon
  const tx = -1.15 * r;
  drawRadialGlow(
    ctx,
    tx,
    0,
    r * 0.015,
    r * (0.20 + 0.16 * tailNavPulse),
    `rgba(251, 146, 60, ${0.84 * tailNavPulse})`,
    'rgba(239, 68, 68, 0)'
  );
  ctx.fillStyle = `rgba(251, 113, 133, ${0.65 + 0.35 * tailNavPulse})`;
  ctx.beginPath();
  ctx.arc(tx, 0, r * 0.044, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(tx, 0, r * 0.020, 0, TWO_PI);
  ctx.fill();
}

/* ============================================================================
 * Public Dispatcher
 * ========================================================================== */

/**
 * Draw a handcrafted storybook-bioluminescent Canvas 2D skin for Scale III or IV.
 *
 * @param {CanvasRenderingContext2D} ctx - Already translated to (0,0) and rotated by entity.angle.
 * @param {string} kind - Species kind key.
 * @param {number} r - Entity radius in world/screen pixels.
 * @param {number} ph - Entity animation phase offset.
 * @param {number} time - Global elapsed seconds.
 * @param {string} [color] - Primary species hex color.
 * @param {string} [accent] - Accent species hex color.
 * @returns {boolean} True if `kind` was rendered by this module.
 */
export function drawMacroSkin(ctx, kind, r, ph, time, color, accent) {
  if (!ctx || !(r > 0)) return false;

  switch (kind) {
    // Scale III: Sous-Bois
    case 'ant':
      drawAnt(ctx, r, ph, time, color, accent);
      return true;
    case 'firefly':
      drawFirefly(ctx, r, ph, time, color, accent);
      return true;
    case 'ladybug':
      drawLadybug(ctx, r, ph, time, color, accent);
      return true;
    case 'moth':
      drawMoth(ctx, r, ph, time, color, accent);
      return true;
    case 'frog':
      drawFrog(ctx, r, ph, time, color, accent);
      return true;

    // Scale IV: Nocturnal City
    case 'lantern':
      drawLantern(ctx, r, ph, time, color, accent);
      return true;
    case 'owl':
      drawOwl(ctx, r, ph, time, color, accent);
      return true;
    case 'car':
      drawCar(ctx, r, ph, time, color, accent);
      return true;
    case 'helicopter':
      drawHelicopter(ctx, r, ph, time, color, accent);
      return true;
    case 'blimp':
      drawBlimp(ctx, r, ph, time, color, accent);
      return true;
    case 'tree':
      drawTree(ctx, r, ph, time, color, accent);
      return true;
    case 'house':
      drawHouse(ctx, r, ph, time, color, accent);
      return true;
    case 'tower':
      drawTower(ctx, r, ph, time, color, accent);
      return true;

    default:
      return false;
  }
}

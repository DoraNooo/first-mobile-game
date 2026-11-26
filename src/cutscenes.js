/**
 * LA PETITE CHARLIE — Storybook Animated Cutscene System
 * Heartwarming, Miyazaki-inspired Canvas 2D cinematic cutscenes at 60 FPS.
 * Uses radial gradients exclusively (zero ctx.shadowBlur) for crisp mobile
 * performance and warm bioluminescent lighting.
 */

const TWO_PI = Math.PI * 2;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  const u = clamp(t, 0, 1);
  return 1 - (1 - u) * (1 - u) * (1 - u);
}

function easeInOutSine(t) {
  const u = clamp(t, 0, 1);
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

/** Deterministic pseudo-random in [0, 1) for flicker-free starfields & particles. */
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Soft bioluminescent radial glow (replaces ctx.shadowBlur at 60 FPS). */
function drawGlow(ctx, x, y, r, innerColor, midColor, outerColor = 'rgba(0, 0, 0, 0)') {
  const radius = Math.max(0.5, r);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, innerColor);
  if (midColor) {
    grad.addColorStop(0.45, midColor);
  }
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fill();
}

/** Seeded twinkling starfield. */
function drawStarfield(ctx, w, h, time, count = 60, seed = 1, alpha = 1, maxYRatio = 1) {
  const maxY = h * maxYRatio;
  for (let i = 0; i < count; i++) {
    const sx = hash(seed * 97 + i * 1.31) * w;
    const sy = hash(seed * 53 + i * 2.17) * maxY;
    const baseR = 0.7 + hash(seed * 29 + i * 3.73) * 1.7;
    const phase = hash(seed * 19 + i * 5.11) * TWO_PI;
    const speed = 1.1 + hash(seed * 11 + i * 4.37) * 1.9;
    const twinkle = 0.45 + 0.55 * Math.sin(time * speed + phase);
    const a = alpha * twinkle;

    // Subtle warm/cool star tinting
    const tint = hash(seed * 7 + i * 6.13);
    ctx.fillStyle =
      tint > 0.72
        ? `rgba(255, 236, 185, ${a.toFixed(3)})`
        : tint < 0.25
          ? `rgba(186, 224, 255, ${a.toFixed(3)})`
          : `rgba(255, 250, 245, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, baseR * (0.82 + 0.28 * twinkle), 0, TWO_PI);
    ctx.fill();
  }
}

/** The recurring Golden Star motif (with optional gentle wink for the Finale). */
function drawGoldenStar(
  ctx,
  x,
  y,
  r,
  time,
  { pulse = 1, rays = true, wink = false, warmCoral = false } = {}
) {
  const size = Math.max(2, r);
  const beat = 1 + 0.1 * Math.sin(time * 2.4) * pulse;
  const winkWave = wink ? Math.sin(time * 1.55) : 0;
  const winkSquash = wink && winkWave > 0.82 ? 1 - ((winkWave - 0.82) / 0.18) * 0.78 : 1;

  ctx.save();
  ctx.translate(x, y);

  // Outer warm golden halo
  drawGlow(
    ctx,
    0,
    0,
    size * 4.4 * beat,
    warmCoral ? 'rgba(255, 195, 130, 0.52)' : 'rgba(255, 234, 150, 0.55)',
    warmCoral ? 'rgba(255, 118, 86, 0.18)' : 'rgba(255, 188, 72, 0.16)'
  );

  ctx.scale(1, Math.max(0.18, winkSquash));

  if (rays) {
    // 4 primary diamond starlight rays
    const rayLen = size * 2.35 * beat;
    const rayW = size * 0.26;
    ctx.fillStyle = 'rgba(255, 248, 212, 0.88)';
    for (let k = 0; k < 2; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, -rayLen);
      ctx.quadraticCurveTo(rayW * 0.35, -rayW * 0.35, rayLen * 0.16, 0);
      ctx.quadraticCurveTo(rayW * 0.35, rayW * 0.35, 0, rayLen);
      ctx.quadraticCurveTo(-rayW * 0.35, rayW * 0.35, -rayLen * 0.16, 0);
      ctx.quadraticCurveTo(-rayW * 0.35, -rayW * 0.35, 0, -rayLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4 softer diagonal rays
    const diagLen = size * 1.35 * beat;
    ctx.fillStyle = 'rgba(255, 232, 165, 0.55)';
    for (let k = 0; k < 2; k++) {
      ctx.save();
      ctx.rotate(Math.PI / 4 + (k * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, -diagLen);
      ctx.lineTo(size * 0.1, 0);
      ctx.lineTo(0, diagLen);
      ctx.lineTo(-size * 0.1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Bright creamy star core
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.72 * beat);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.5, '#fff4be');
  coreGrad.addColorStop(1, 'rgba(255, 205, 92, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.72 * beat, 0, TWO_PI);
  ctx.fill();

  ctx.restore();
}

/** Draw Charlie's signature two crisp little white teeth. */
function drawCharlieTeeth(ctx, cx, lipY, spanHalfWidth, toothHeight, outlineColor) {
  const toothOffset = spanHalfWidth * 0.44;
  const toothHalfW = Math.max(toothHeight * 0.44, spanHalfWidth * 0.2);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = Math.max(0.8, toothHeight * 0.18);
  ctx.lineJoin = 'round';

  for (let side = -1; side <= 1; side += 2) {
    const tx = cx + side * toothOffset;
    const tipX = tx - side * toothHalfW * 0.1;
    const tipY = lipY + toothHeight;

    ctx.beginPath();
    ctx.moveTo(tx - toothHalfW, lipY);
    ctx.quadraticCurveTo(tx - toothHalfW * 0.55, lipY + toothHeight * 0.72, tipX, tipY);
    ctx.quadraticCurveTo(tx + toothHalfW * 0.55, lipY + toothHeight * 0.72, tx + toothHalfW, lipY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Draw our beloved glossy coral-amber lava-lamp petite Charlie with her
 * 2 glossy eyes + white catchlights, cute smile with two crisp little white
 * teeth, and 3 tiny trailing lava droplets.
 */
export function drawCuteCharlie(
  ctx,
  x,
  y,
  r,
  time,
  {
    lookX = 0,
    lookY = 0,
    happy = false,
    wonder = false,
    droplets = true,
    glow = 1,
    alpha = 1,
  } = {}
) {
  const radius = Math.max(4, r);
  const lookLen = Math.hypot(lookX, lookY);
  const lx = lookLen > 0.001 ? clamp(lookX / Math.max(1, lookLen), -1, 1) : 0;
  const ly = lookLen > 0.001 ? clamp(lookY / Math.max(1, lookLen), -1, 1) : 0;

  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.translate(x, y);

  // Outer warm coral-amber bioluminescent halo
  if (glow > 0) {
    drawGlow(
      ctx,
      0,
      0,
      radius * (2.35 + 0.12 * Math.sin(time * 2.2)),
      `rgba(255, 190, 110, ${(0.38 * glow).toFixed(3)})`,
      `rgba(255, 96, 68, ${(0.17 * glow).toFixed(3)})`
    );
  }

  // 3 tiny trailing lava droplets gently bobbing around/behind Charlie
  if (droplets) {
    const trailAngle = lookLen > 0.1 ? Math.atan2(-ly, -lx) : Math.PI * 0.62;
    const dropSpecs = [
      { dist: 1.42, spread: -0.45, relR: 0.25, phase: 0.0 },
      { dist: 1.62, spread: 0.42, relR: 0.21, phase: 2.1 },
      { dist: 1.92, spread: 0.02, relR: 0.16, phase: 4.2 },
    ];

    for (let i = 0; i < dropSpecs.length; i++) {
      const d = dropSpecs[i];
      const ang = trailAngle + d.spread + Math.sin(time * 2.1 + d.phase) * 0.16;
      const dist = radius * (d.dist + Math.sin(time * 2.7 + d.phase) * 0.08);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const dr = radius * d.relR;

      drawGlow(
        ctx,
        dx,
        dy,
        dr * 2.2,
        'rgba(255, 172, 95, 0.32)',
        'rgba(255, 90, 62, 0.1)'
      );

      const dGrad = ctx.createRadialGradient(
        dx - dr * 0.28,
        dy - dr * 0.3,
        dr * 0.1,
        dx,
        dy,
        dr
      );
      dGrad.addColorStop(0, '#ffe394');
      dGrad.addColorStop(0.55, '#ff8048');
      dGrad.addColorStop(1, '#d13649');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, TWO_PI);
      ctx.fill();

      // Tiny glossy specular dot on droplet
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(dx - dr * 0.3, dy - dr * 0.32, dr * 0.28, 0, TWO_PI);
      ctx.fill();
    }
  }

  // Organic lava-lamp squishy body contour (smooth closed quadratic loop)
  const pts = 18;
  const vx = [];
  const vy = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * TWO_PI;
    const wobble =
      1 +
      0.045 * Math.sin(a * 2 + time * 2.4) +
      0.03 * Math.cos(a * 3 - time * 1.9) +
      0.018 * Math.sin(a * 4 + time * 3.1);
    const pr = radius * wobble;
    vx.push(Math.cos(a) * pr);
    vy.push(Math.sin(a) * pr * 0.96);
  }

  const traceBody = () => {
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const next = (i + 1) % pts;
      const mx = (vx[i] + vx[next]) * 0.5;
      const my = (vy[i] + vy[next]) * 0.5;
      if (i === 0) {
        const prev = pts - 1;
        ctx.moveTo((vx[prev] + vx[0]) * 0.5, (vy[prev] + vy[0]) * 0.5);
      }
      ctx.quadraticCurveTo(vx[i], vy[i], mx, my);
    }
    ctx.closePath();
  };

  // Warm coral-amber lava gradient fill
  traceBody();
  const bodyGrad = ctx.createRadialGradient(
    -radius * 0.22,
    -radius * 0.24,
    radius * 0.08,
    0,
    radius * 0.08,
    radius * 1.12
  );
  bodyGrad.addColorStop(0, '#fff0ad');
  bodyGrad.addColorStop(0.32, '#ffae4e');
  bodyGrad.addColorStop(0.72, '#ff6442');
  bodyGrad.addColorStop(1, '#c92e46');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Soft internal convection bubbles clipped inside body
  ctx.save();
  traceBody();
  ctx.clip();

  for (let b = 0; b < 3; b++) {
    const ba = time * (0.55 + b * 0.18) + b * 2.2;
    const bx = Math.cos(ba) * radius * (0.3 + b * 0.12);
    const by = Math.sin(ba * 0.85) * radius * (0.28 + b * 0.08);
    const br = radius * (0.17 - b * 0.03);
    drawGlow(ctx, bx, by, br * 1.6, 'rgba(255, 240, 175, 0.36)', 'rgba(255, 175, 92, 0.12)');
  }

  // Soft warm bottom rim bounce light
  drawGlow(
    ctx,
    0,
    radius * 0.72,
    radius * 0.75,
    'rgba(255, 200, 130, 0.28)',
    'rgba(255, 120, 82, 0.06)'
  );
  ctx.restore();

  // Crisp glossy top-left specular crescent highlight
  ctx.save();
  ctx.translate(-radius * 0.34, -radius * 0.38);
  ctx.rotate(-0.62);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.26, radius * 0.11, 0, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.beginPath();
  ctx.arc(radius * 0.26, radius * 0.1, radius * 0.055, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Subtle warm dark-berry outline for storybook readability
  traceBody();
  ctx.strokeStyle = 'rgba(72, 18, 42, 0.42)';
  ctx.lineWidth = Math.max(1.2, radius * 0.045);
  ctx.stroke();

  // --- EXPRESSIVE FACE ---
  const darkBerry = '#321226';
  const faceX = lx * radius * 0.14;
  const faceY = ly * radius * 0.11;

  ctx.save();
  ctx.translate(faceX, faceY);

  // Rosy cheeks
  const cheekY = radius * 0.08;
  const cheekX = radius * 0.42;
  for (let side = -1; side <= 1; side += 2) {
    drawGlow(
      ctx,
      side * cheekX,
      cheekY,
      radius * 0.22,
      'rgba(255, 118, 148, 0.45)',
      'rgba(255, 118, 148, 0.12)'
    );
  }

  // Natural gentle blink every ~4.2 seconds (when not happy)
  const blinkCycle = (time * 0.24 + 0.3) % 1;
  const blinkScale =
    !happy && blinkCycle > 0.94 ? Math.max(0.12, Math.abs((blinkCycle - 0.97) / 0.03)) : 1;

  // Eyes
  const eyeSpacing = radius * 0.27;
  const eyeY = -radius * 0.06;
  const eyeR = radius * (wonder ? 0.175 : 0.155);

  for (let side = -1; side <= 1; side += 2) {
    const ex = side * eyeSpacing;
    ctx.save();
    ctx.translate(ex, eyeY);

    if (happy) {
      // Joyful crescent ^ ^ eyes
      ctx.strokeStyle = darkBerry;
      ctx.lineWidth = Math.max(1.8, radius * 0.075);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, eyeR * 0.35, eyeR * 0.95, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.scale(1, blinkScale);
      const px = lx * eyeR * 0.22;
      const py = ly * eyeR * 0.22;

      // Glossy dark-berry iris
      ctx.fillStyle = darkBerry;
      ctx.beginPath();
      ctx.ellipse(px * 0.4, py * 0.4, eyeR * 0.94, eyeR * 1.06, 0, 0, TWO_PI);
      ctx.fill();

      // Primary crisp white catchlight (top-left)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        px * 0.55 - eyeR * 0.28,
        py * 0.55 - eyeR * 0.32,
        eyeR * (wonder ? 0.4 : 0.35),
        0,
        TWO_PI
      );
      ctx.fill();

      // Secondary sparkle catchlight (bottom-right)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.beginPath();
      ctx.arc(
        px * 0.55 + eyeR * 0.26,
        py * 0.55 + eyeR * 0.28,
        eyeR * (wonder ? 0.2 : 0.15),
        0,
        TWO_PI
      );
      ctx.fill();
    }

    ctx.restore();
  }

  // Cute smile + signature two crisp little white teeth
  const mouthY = radius * 0.14;
  if (wonder) {
    // Delighted little wondering smile with two tiny teeth peeking down
    const mw = radius * 0.19;
    const mh = radius * 0.12;
    ctx.fillStyle = '#731838';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mh * 0.35, mw, mh, 0, 0, TWO_PI);
    ctx.fill();

    drawCharlieTeeth(ctx, 0, mouthY - mh * 0.48, mw * 0.9, radius * 0.08, darkBerry);

    ctx.strokeStyle = darkBerry;
    ctx.lineWidth = Math.max(1.2, radius * 0.048);
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mh * 0.35, mw, mh, 0, 0, TWO_PI);
    ctx.stroke();
  } else {
    const mw = radius * (happy ? 0.26 : 0.22);
    const smileDepth = radius * (happy ? 0.14 : 0.1);
    const topY = mouthY - radius * 0.01;

    drawCharlieTeeth(ctx, 0, topY + smileDepth * 0.3, mw * 0.88, radius * 0.085, darkBerry);

    ctx.strokeStyle = darkBerry;
    ctx.lineWidth = Math.max(1.3, radius * 0.052);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mw, topY);
    ctx.quadraticCurveTo(0, topY + smileDepth, mw, topY);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

/** Shared cozy moonlit bedroom window scene (used in Intro Shot 1 & Finale Shot 3). */
function drawBedroomWindow(ctx, w, h, time, shotTime, { twinStar = false } = {}) {
  const minDim = Math.min(w, h);

  // Cozy dark indigo bedroom wall backdrop
  const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
  wallGrad.addColorStop(0, '#12152b');
  wallGrad.addColorStop(0.65, '#191d38');
  wallGrad.addColorStop(1, '#101224');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, h);

  // Window frame geometry (centered in upper 66% for storybook subtitle clearance)
  const winW = Math.min(w * 0.72, minDim * 0.76);
  const winH = Math.min(h * 0.56, winW * 1.18);
  const winX = (w - winW) * 0.5;
  const winY = h * 0.09;

  // Night sky visible through the window
  ctx.save();
  ctx.beginPath();
  ctx.rect(winX, winY, winW, winH);
  ctx.clip();

  const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
  skyGrad.addColorStop(0, '#070b1e');
  skyGrad.addColorStop(0.6, '#142048');
  skyGrad.addColorStop(1, '#263362');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(winX, winY, winW, winH);

  // Twinkling stars outside the window
  ctx.save();
  ctx.translate(winX, winY);
  drawStarfield(ctx, winW, winH, time, 46, twinStar ? 91 : 12, 0.92, 0.85);
  ctx.restore();

  // Soft distant moonlit hills silhouette
  ctx.fillStyle = '#0e1630';
  ctx.beginPath();
  ctx.moveTo(winX, winY + winH);
  ctx.quadraticCurveTo(
    winX + winW * 0.28,
    winY + winH * 0.76,
    winX + winW * 0.56,
    winY + winH * 0.86
  );
  ctx.quadraticCurveTo(
    winX + winW * 0.82,
    winY + winH * 0.72,
    winX + winW,
    winY + winH * 0.84
  );
  ctx.lineTo(winX + winW, winY + winH);
  ctx.closePath();
  ctx.fill();

  // Soft moonlight crescent in upper left of window
  const moonX = winX + winW * 0.22;
  const moonY = winY + winH * 0.22;
  const moonR = winW * 0.085;
  drawGlow(ctx, moonX, moonY, moonR * 3.2, 'rgba(205, 224, 255, 0.24)', 'rgba(130, 168, 240, 0.08)');
  ctx.fillStyle = '#edf3ff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#0d1532';
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.36, moonY - moonR * 0.14, moonR * 0.88, 0, TWO_PI);
  ctx.fill();

  // The Golden Star (solitary in Intro, bright warm twin star winking in Finale!)
  const starX = winX + winW * 0.74;
  const starY = winY + winH * 0.26;
  const starR = winW * (twinStar ? 0.055 : 0.042);

  if (twinStar) {
    // Companion coral-amber Charlie star orbiting closely and winking with the Golden Star
    drawGoldenStar(ctx, starX - starR * 1.15, starY + starR * 0.45, starR * 0.92, time + 0.4, {
      pulse: 1.2,
      rays: true,
      wink: true,
      warmCoral: true,
    });
    drawGoldenStar(ctx, starX + starR * 0.65, starY - starR * 0.25, starR * 1.08, time, {
      pulse: 1.0,
      rays: true,
      wink: true,
    });
  } else {
    drawGoldenStar(ctx, starX, starY, starR, time, { pulse: 1.15, rays: true });
  }

  ctx.restore();

  // Soft diagonal moonlight beam spilling into the room
  ctx.save();
  const beamGrad = ctx.createLinearGradient(winX + winW * 0.2, winY, winX + winW * 0.7, h);
  beamGrad.addColorStop(0, 'rgba(180, 210, 255, 0.08)');
  beamGrad.addColorStop(0.6, 'rgba(180, 210, 255, 0.03)');
  beamGrad.addColorStop(1, 'rgba(180, 210, 255, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(winX, winY + winH);
  ctx.lineTo(winX + winW, winY + winH);
  ctx.lineTo(winX + winW * 1.28, h);
  ctx.lineTo(winX - winW * 0.15, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Wooden window frame & crossbars (mullions)
  const frameT = Math.max(6, winW * 0.042);
  ctx.strokeStyle = '#3b2b36';
  ctx.lineWidth = frameT;
  ctx.strokeRect(winX, winY, winW, winH);

  ctx.strokeStyle = '#4e3945';
  ctx.lineWidth = frameT * 0.48;
  ctx.beginPath();
  ctx.moveTo(winX + winW * 0.5, winY);
  ctx.lineTo(winX + winW * 0.5, winY + winH);
  ctx.moveTo(winX, winY + winH * 0.52);
  ctx.lineTo(winX + winW, winY + winH * 0.52);
  ctx.stroke();

  // Gently swaying curtains on left and right edges
  for (let side = -1; side <= 1; side += 2) {
    const sway = Math.sin(time * 1.15 + (side > 0 ? 1.1 : 0)) * winW * 0.035;
    const edgeX = side < 0 ? winX - frameT * 0.6 : winX + winW + frameT * 0.6;
    const innerTop = edgeX - side * winW * 0.14;
    const innerMid = edgeX - side * (winW * 0.19 + sway);
    const innerBot = edgeX - side * (winW * 0.11 - sway * 0.7);
    const outerX = side < 0 ? Math.max(0, winX - winW * 0.24) : Math.min(w, winX + winW * 1.24);

    const curtGrad = ctx.createLinearGradient(outerX, winY, innerMid, winY);
    curtGrad.addColorStop(0, 'rgba(30, 34, 66, 0.94)');
    curtGrad.addColorStop(1, 'rgba(72, 78, 122, 0.72)');
    ctx.fillStyle = curtGrad;
    ctx.beginPath();
    ctx.moveTo(outerX, winY - frameT);
    ctx.lineTo(innerTop, winY - frameT);
    ctx.bezierCurveTo(
      innerMid,
      winY + winH * 0.36,
      innerMid + side * winW * 0.04,
      winY + winH * 0.72,
      innerBot,
      winY + winH + frameT * 2.2
    );
    ctx.lineTo(outerX, winY + winH + frameT * 2.2);
    ctx.closePath();
    ctx.fill();
  }

  // Wooden windowsill ledge
  const sillY = winY + winH + frameT * 0.35;
  const sillH = Math.max(12, minDim * 0.032);
  const sillGrad = ctx.createLinearGradient(0, sillY, 0, sillY + sillH);
  sillGrad.addColorStop(0, '#624852');
  sillGrad.addColorStop(1, '#362630');
  ctx.fillStyle = sillGrad;
  ctx.fillRect(winX - winW * 0.09, sillY, winW * 1.18, sillH);

  // Warm glowing Lava Lamp silhouette on the left-center of the windowsill
  const lampX = winX + winW * 0.27;
  const lampBaseY = sillY + 2;
  const lampH = winH * 0.42;
  const lampW = lampH * 0.36;

  // Warm ambient glow spilled onto the windowsill and wall
  drawGlow(
    ctx,
    lampX,
    lampBaseY - lampH * 0.52,
    lampH * 1.25,
    'rgba(255, 165, 92, 0.34)',
    'rgba(255, 88, 66, 0.12)'
  );

  // Metallic tapered base
  ctx.fillStyle = '#2d2336';
  ctx.beginPath();
  ctx.moveTo(lampX - lampW * 0.52, lampBaseY);
  ctx.lineTo(lampX - lampW * 0.32, lampBaseY - lampH * 0.24);
  ctx.lineTo(lampX + lampW * 0.32, lampBaseY - lampH * 0.24);
  ctx.lineTo(lampX + lampW * 0.52, lampBaseY);
  ctx.closePath();
  ctx.fill();

  // Glass bottle silhouette
  const glassTopY = lampBaseY - lampH * 0.86;
  const glassBotY = lampBaseY - lampH * 0.23;
  const traceBottle = () => {
    ctx.beginPath();
    ctx.moveTo(lampX - lampW * 0.33, glassBotY);
    ctx.lineTo(lampX - lampW * 0.48, lampBaseY - lampH * 0.46);
    ctx.lineTo(lampX - lampW * 0.24, glassTopY);
    ctx.lineTo(lampX + lampW * 0.24, glassTopY);
    ctx.lineTo(lampX + lampW * 0.48, lampBaseY - lampH * 0.46);
    ctx.lineTo(lampX + lampW * 0.33, glassBotY);
    ctx.closePath();
  };

  const liqGrad = ctx.createLinearGradient(lampX, glassTopY, lampX, glassBotY);
  liqGrad.addColorStop(0, '#5a1e48');
  liqGrad.addColorStop(0.55, '#c8424c');
  liqGrad.addColorStop(1, '#ffb34d');
  traceBottle();
  ctx.fillStyle = liqGrad;
  ctx.fill();

  // Rising glowing wax blobs inside the lamp
  ctx.save();
  traceBottle();
  ctx.clip();
  for (let b = 0; b < 4; b++) {
    const prog = (time * (0.14 + b * 0.04) + b * 0.27) % 1;
    const by = lerp(glassBotY + 4, glassTopY - 4, prog);
    const bx = lampX + Math.sin(time * 1.4 + b * 1.9) * lampW * 0.16;
    const br = lampW * (0.14 + (b % 2) * 0.05);
    ctx.fillStyle = b === 0 ? '#ffe594' : '#ff8c4c';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();

  // Specular highlight streak on glass
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = Math.max(1.5, lampW * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lampX - lampW * 0.28, lampBaseY - lampH * 0.48);
  ctx.lineTo(lampX - lampW * 0.15, glassTopY + lampH * 0.06);
  ctx.stroke();

  // Metallic top cap
  ctx.fillStyle = '#2d2336';
  ctx.beginPath();
  ctx.moveTo(lampX - lampW * 0.25, glassTopY + 1);
  ctx.lineTo(lampX - lampW * 0.18, lampBaseY - lampH);
  ctx.lineTo(lampX + lampW * 0.18, lampBaseY - lampH);
  ctx.lineTo(lampX + lampW * 0.25, glassTopY + 1);
  ctx.closePath();
  ctx.fill();

  // Subtle warm dust motes drifting in the bedroom air
  const fade = easeOutCubic(shotTime * 1.2);
  for (let i = 0; i < 12; i++) {
    const mx = hash(301 + i) * w;
    const my = ((hash(401 + i) * h - time * (6 + (i % 3) * 3)) % h + h) % h;
    const ma = 0.22 * fade * (0.5 + 0.5 * Math.sin(time * 1.7 + i));
    ctx.fillStyle = `rgba(255, 224, 175, ${ma.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.3 + (i % 2) * 0.8, 0, TWO_PI);
    ctx.fill();
  }
}

// ============================================================================
// SHOT RENDERERS FOR ALL 7 CUTSCENES (16 HANDCRAFTED ANIMATED SHOTS)
// ============================================================================

/** INTRO — Shot 1: La Fenêtre */
function drawIntroShot1(ctx, w, h, time, shotTime) {
  drawBedroomWindow(ctx, w, h, time, shotTime, { twinStar: false });
}

/** INTRO — Shot 2: La Petite Charlie inside the glowing lava lamp */
function drawIntroShot2(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);

  // Rich warm liquid gradient inside the lava lamp
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2a1036');
  bg.addColorStop(0.45, '#7a2244');
  bg.addColorStop(0.82, '#d8553e');
  bg.addColorStop(1, '#ffa84c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Soft distant Golden Star glimpsed through the curved glass upper-right
  const starX = w * 0.78;
  const starY = h * 0.17;
  drawGoldenStar(ctx, starX, starY, minDim * 0.048, time, { pulse: 1.2, rays: true });

  // Slow-rising soft background wax blobs
  for (let i = 0; i < 7; i++) {
    const prog = (time * (0.06 + (i % 3) * 0.025) + hash(71 + i)) % 1;
    const bx = w * (0.12 + hash(89 + i) * 0.76) + Math.sin(time * 0.9 + i * 1.7) * 18;
    const by = lerp(h * 1.08, -h * 0.12, prog);
    const br = minDim * (0.055 + hash(97 + i) * 0.075);
    const bGrad = ctx.createRadialGradient(bx - br * 0.25, by - br * 0.25, br * 0.1, bx, by, br);
    bGrad.addColorStop(0, 'rgba(255, 224, 138, 0.55)');
    bGrad.addColorStop(0.65, 'rgba(255, 118, 72, 0.35)');
    bGrad.addColorStop(1, 'rgba(180, 38, 62, 0.05)');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.ellipse(bx, by, br * 1.08, br * 0.92, Math.sin(time + i) * 0.25, 0, TWO_PI);
    ctx.fill();
  }

  // Warm wax mound at the bottom from which Charlie detaches
  const moundY = h * 0.78;
  const moundGrad = ctx.createRadialGradient(w * 0.44, moundY, minDim * 0.04, w * 0.44, moundY, minDim * 0.44);
  moundGrad.addColorStop(0, '#ffe18c');
  moundGrad.addColorStop(0.55, '#ff7744');
  moundGrad.addColorStop(1, 'rgba(190, 42, 62, 0)');
  ctx.fillStyle = moundGrad;
  ctx.beginPath();
  ctx.ellipse(w * 0.44, moundY, w * 0.42, h * 0.18, 0, 0, TWO_PI);
  ctx.fill();

  // Petite Charlie gently rising & detaching, looking up-right toward the Golden Star!
  const rise = easeOutCubic(Math.min(1, shotTime * 0.55));
  const cx = w * 0.44 + Math.sin(time * 1.3) * minDim * 0.02;
  const cy = lerp(h * 0.58, h * 0.4, rise) + Math.sin(time * 2.0) * minDim * 0.018;
  const cr = minDim * 0.125;

  drawCuteCharlie(ctx, cx, cy, cr, time, {
    lookX: starX - cx,
    lookY: starY - cy,
    wonder: true,
    droplets: true,
    glow: 1.25,
  });

  // Curved glass bottle reflections on left & right sides
  ctx.strokeStyle = 'rgba(255, 240, 225, 0.22)';
  ctx.lineWidth = Math.max(4, minDim * 0.022);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.07, h * 0.14);
  ctx.quadraticCurveTo(w * 0.03, h * 0.46, w * 0.09, h * 0.8);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 220, 200, 0.14)';
  ctx.lineWidth = Math.max(3, minDim * 0.014);
  ctx.beginPath();
  ctx.moveTo(w * 0.93, h * 0.18);
  ctx.quadraticCurveTo(w * 0.97, h * 0.48, w * 0.91, h * 0.78);
  ctx.stroke();
}

/** INTRO — Shot 3: Le Grand Plongeon (moonbeam -> dewdrop -> quantum sparkles) */
function drawIntroShot3(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);

  // Deep midnight-to-quantum-indigo backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#070c22');
  bg.addColorStop(0.5, '#0c1c3d');
  bg.addColorStop(1, '#08182e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 50, 33, 0.7, 0.75);

  // Sparkling diagonal moonbeam from upper-left to the giant dewdrop
  const dropX = w * 0.52;
  const dropY = h * 0.44;
  const dropR = minDim * 0.31;

  const beamGrad = ctx.createLinearGradient(0, 0, dropX, dropY);
  beamGrad.addColorStop(0, 'rgba(205, 232, 255, 0.24)');
  beamGrad.addColorStop(0.7, 'rgba(130, 220, 255, 0.12)');
  beamGrad.addColorStop(1, 'rgba(130, 220, 255, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.3, 0);
  ctx.lineTo(dropX + dropR * 0.7, dropY);
  ctx.lineTo(dropX - dropR * 0.75, dropY + dropR * 0.3);
  ctx.closePath();
  ctx.fill();

  // Giant glistening dewdrop containing swirling cyan-and-gold quantum rings
  drawGlow(ctx, dropX, dropY, dropR * 1.55, 'rgba(72, 224, 255, 0.24)', 'rgba(255, 206, 98, 0.08)');

  const dewGrad = ctx.createRadialGradient(
    dropX - dropR * 0.25,
    dropY - dropR * 0.25,
    dropR * 0.08,
    dropX,
    dropY,
    dropR
  );
  dewGrad.addColorStop(0, 'rgba(140, 240, 255, 0.28)');
  dewGrad.addColorStop(0.65, 'rgba(30, 128, 180, 0.35)');
  dewGrad.addColorStop(1, 'rgba(160, 245, 255, 0.58)');
  ctx.fillStyle = dewGrad;
  ctx.beginPath();
  ctx.arc(dropX, dropY, dropR, 0, TWO_PI);
  ctx.fill();

  // Swirling cyan & gold quantum orbits inside the dewdrop
  ctx.save();
  ctx.translate(dropX, dropY);
  for (let ring = 0; ring < 3; ring++) {
    ctx.save();
    ctx.rotate(time * (0.45 + ring * 0.2) * (ring % 2 === 0 ? 1 : -1) + ring * 1.05);
    ctx.strokeStyle =
      ring % 2 === 0 ? 'rgba(92, 244, 255, 0.55)' : 'rgba(255, 214, 110, 0.55)';
    ctx.lineWidth = Math.max(1.4, minDim * 0.0045);
    ctx.beginPath();
    ctx.ellipse(0, 0, dropR * (0.44 + ring * 0.17), dropR * (0.2 + ring * 0.09), 0, 0, TWO_PI);
    ctx.stroke();

    // Orbiting quantum sparkle
    const qa = time * (2.1 + ring * 0.55) + ring * 2.1;
    const qx = Math.cos(qa) * dropR * (0.44 + ring * 0.17);
    const qy = Math.sin(qa) * dropR * (0.2 + ring * 0.09);
    drawGlow(
      ctx,
      qx,
      qy,
      minDim * 0.028,
      ring % 2 === 0 ? 'rgba(160, 255, 255, 0.9)' : 'rgba(255, 232, 145, 0.9)',
      'rgba(80, 220, 255, 0.15)'
    );
    ctx.restore();
  }
  ctx.restore();

  // Glossy specular crescent on the dewdrop
  ctx.save();
  ctx.translate(dropX - dropR * 0.42, dropY - dropR * 0.42);
  ctx.rotate(-0.7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.beginPath();
  ctx.ellipse(0, 0, dropR * 0.24, dropR * 0.085, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Charlie drifting gracefully down the moonbeam into the quantum dewdrop
  const dive = easeInOutSine(Math.min(1, shotTime * 0.5));
  const cx = lerp(w * 0.22, dropX, dive);
  const cy = lerp(h * 0.17, dropY, dive) + Math.sin(time * 2.6) * 5;
  const cr = lerp(minDim * 0.068, minDim * 0.095, dive);

  drawCuteCharlie(ctx, cx, cy, cr, time, {
    lookX: dropX - cx + 20,
    lookY: dropY - cy + 12,
    wonder: true,
    droplets: true,
    glow: 1.15,
  });
}

/** SCALE 1 — Shot 1: L'Éveil (quantum ring burst into emerald water) */
function drawScale1Shot1(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);
  const cx = w * 0.5;
  const cy = h * 0.4;

  // Transitioning quantum-indigo to shimmering emerald water backdrop
  const bg = ctx.createRadialGradient(cx, cy, minDim * 0.05, cx, cy, Math.max(w, h) * 0.85);
  bg.addColorStop(0, '#125c6b');
  bg.addColorStop(0.45, '#0b384d');
  bg.addColorStop(1, '#07142b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Expanding iridescent quantum rings
  for (let i = 0; i < 4; i++) {
    const p = (time * 0.42 + i * 0.25) % 1;
    const rr = minDim * (0.12 + p * 0.55);
    const a = (1 - p) * 0.65;
    ctx.strokeStyle =
      i % 2 === 0
        ? `rgba(110, 255, 224, ${a.toFixed(3)})`
        : `rgba(255, 214, 128, ${a.toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, (1 - p) * minDim * 0.014);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, TWO_PI);
    ctx.stroke();
  }

  // Dissolving atom sparkles drifting outward
  for (let i = 0; i < 28; i++) {
    const ang = hash(111 + i) * TWO_PI + time * 0.2;
    const dist = minDim * (0.14 + ((hash(131 + i) + time * 0.14) % 0.55));
    const sx = cx + Math.cos(ang) * dist;
    const sy = cy + Math.sin(ang) * dist;
    const a = 0.35 + 0.5 * Math.sin(time * 3 + i);
    ctx.fillStyle = i % 3 === 0 ? `rgba(255, 226, 138, ${a.toFixed(3)})` : `rgba(128, 255, 232, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.8 + (i % 3) * 0.9, 0, TWO_PI);
    ctx.fill();
  }

  // Charlie glowing brightly and swelling gently
  const grow = easeOutCubic(Math.min(1, shotTime * 0.7));
  const cr = minDim * lerp(0.085, 0.135, grow);
  drawGlow(ctx, cx, cy, cr * 2.8, 'rgba(135, 255, 225, 0.32)', 'rgba(255, 185, 102, 0.14)');
  drawCuteCharlie(ctx, cx, cy + Math.sin(time * 2.4) * 6, cr, time, {
    lookX: 0,
    lookY: -0.3,
    happy: true,
    droplets: true,
    glow: 1.4,
  });
}

/** SCALE 1 — Shot 2: La Goutte d'Eau (sunbeams, tardigrade & spores) */
function drawScale1Shot2(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);

  // Shimmering emerald-teal underwater gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#136b70');
  bg.addColorStop(0.5, '#0b4454');
  bg.addColorStop(1, '#062030');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Animated underwater sunbeams / caustics
  for (let i = 0; i < 5; i++) {
    const bx = w * (0.12 + i * 0.2) + Math.sin(time * 0.7 + i * 1.4) * w * 0.04;
    const topW = w * (0.06 + (i % 2) * 0.04);
    const botW = topW * 2.4;
    const beamGrad = ctx.createLinearGradient(bx, 0, bx + w * 0.08, h * 0.82);
    beamGrad.addColorStop(0, 'rgba(155, 255, 232, 0.16)');
    beamGrad.addColorStop(0.6, 'rgba(92, 225, 212, 0.06)');
    beamGrad.addColorStop(1, 'rgba(92, 225, 212, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(bx - topW * 0.5, 0);
    ctx.lineTo(bx + topW * 0.5, 0);
    ctx.lineTo(bx + w * 0.12 + botW * 0.5, h * 0.85);
    ctx.lineTo(bx + w * 0.12 - botW * 0.5, h * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  // Glowing spores and tiny rising water bubbles
  for (let i = 0; i < 24; i++) {
    const px = hash(211 + i) * w + Math.sin(time * 1.2 + i) * 10;
    const py = ((hash(233 + i) * h - time * (14 + (i % 4) * 6)) % h + h) % h;
    const pr = 2 + (i % 3) * 1.6;
    if (i % 2 === 0) {
      drawGlow(ctx, px, py, pr * 3.2, 'rgba(145, 255, 200, 0.55)', 'rgba(65, 210, 175, 0.12)');
    } else {
      ctx.strokeStyle = 'rgba(195, 255, 248, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // Cute chubby little tardigrade silhouette paddling gently in the upper-right
  const tx = w * 0.72 + Math.sin(time * 0.9) * minDim * 0.04;
  const ty = h * 0.34 + Math.cos(time * 1.1) * minDim * 0.025;
  const tr = minDim * 0.075;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(-0.18 + Math.sin(time * 1.1) * 0.08);
  drawGlow(ctx, 0, 0, tr * 1.9, 'rgba(140, 255, 224, 0.22)', 'rgba(42, 180, 170, 0.06)');

  // 4 visible pairs of chubby little paddling legs along the underside
  ctx.fillStyle = 'rgba(122, 234, 214, 0.72)';
  for (let leg = 0; leg < 4; leg++) {
    const lx = lerp(-tr * 0.65, tr * 0.55, leg / 3);
    const kick = Math.sin(time * 5 + leg * 1.4) * tr * 0.12;
    ctx.beginPath();
    ctx.ellipse(lx, tr * 0.52 + kick * 0.4, tr * 0.16, tr * 0.24, 0.2, 0, TWO_PI);
    ctx.fill();
  }

  // Segmented chubby body + cute snout
  ctx.fillStyle = 'rgba(154, 244, 226, 0.78)';
  ctx.beginPath();
  ctx.ellipse(0, 0, tr * 1.05, tr * 0.62, 0, 0, TWO_PI);
  ctx.fill();
  // Cute round snout on left facing Charlie
  ctx.beginPath();
  ctx.arc(-tr * 1.02, 0, tr * 0.24, 0, TWO_PI);
  ctx.fill();
  // Tiny dark eye dot
  ctx.fillStyle = '#0a3340';
  ctx.beginPath();
  ctx.arc(-tr * 0.72, -tr * 0.14, tr * 0.08, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Charlie swimming happily toward center-left
  const cx = w * 0.38 + Math.sin(time * 1.3) * minDim * 0.03;
  const cy = h * 0.45 + Math.cos(time * 1.7) * minDim * 0.025;
  drawCuteCharlie(ctx, cx, cy, minDim * 0.115, time, {
    lookX: tx - cx,
    lookY: ty - cy,
    happy: true,
    droplets: true,
    glow: 1.2,
  });
}

/** SCALE 2 — Shot 1: Plouf ! (Charlie bursts out of the dewdrop into starry night) */
function drawScale2Shot1(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);

  // Starry forest night sky above
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#070f24');
  bg.addColorStop(0.55, '#122845');
  bg.addColorStop(1, '#0d3d4a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 55, 42, 0.88, 0.65);

  // Curved luminous dewdrop water surface at bottom half
  const surfY = h * 0.58;
  const waterGrad = ctx.createLinearGradient(0, surfY - minDim * 0.08, 0, h);
  waterGrad.addColorStop(0, 'rgba(92, 232, 218, 0.72)');
  waterGrad.addColorStop(0.22, 'rgba(20, 118, 134, 0.88)');
  waterGrad.addColorStop(1, '#072230');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.moveTo(0, surfY + minDim * 0.06);
  ctx.quadraticCurveTo(w * 0.5, surfY - minDim * 0.1, w, surfY + minDim * 0.06);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Luminous rim on the water surface
  ctx.strokeStyle = 'rgba(195, 255, 248, 0.72)';
  ctx.lineWidth = Math.max(2, minDim * 0.006);
  ctx.beginPath();
  ctx.moveTo(0, surfY + minDim * 0.06);
  ctx.quadraticCurveTo(w * 0.5, surfY - minDim * 0.1, w, surfY + minDim * 0.06);
  ctx.stroke();

  // Concentric surface ripples
  const cx = w * 0.5;
  for (let r = 0; r < 3; r++) {
    const p = (time * 0.55 + r * 0.33) % 1;
    const rx = minDim * (0.08 + p * 0.38);
    const ry = rx * 0.24;
    ctx.strokeStyle = `rgba(180, 255, 246, ${((1 - p) * 0.62).toFixed(3)})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(cx, surfY + minDim * 0.015, rx, ry, 0, 0, TWO_PI);
    ctx.stroke();
  }

  // Slow-motion arcing water droplets splashing outward
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const p = (shotTime * 0.55 + i * 0.08) % 1;
    const spread = 0.16 + (i % 5) * 0.09;
    const dx = cx + side * spread * minDim * (0.3 + p * 1.15);
    const dy = surfY - Math.sin(p * Math.PI) * minDim * (0.2 + (i % 3) * 0.07);
    const dr = minDim * (0.012 + (i % 3) * 0.005) * (1 - p * 0.45);
    ctx.fillStyle = `rgba(196, 252, 255, ${(0.88 - p * 0.55).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, Math.max(1.2, dr), 0, TWO_PI);
    ctx.fill();
  }

  // Charlie bursting gracefully upward out of the dewdrop!
  const leap = easeOutCubic(Math.min(1, shotTime * 0.72));
  const cy = lerp(surfY + minDim * 0.02, h * 0.35, leap) + Math.sin(time * 2.5) * 5;
  drawCuteCharlie(ctx, cx, cy, minDim * 0.115, time, {
    lookX: 0.2,
    lookY: -0.7,
    happy: true,
    droplets: true,
    glow: 1.25,
  });
}

/** SCALE 2 — Shot 2: Le Sous-Bois (ferns, fireflies, ladybug & brighter Golden Star) */
function drawScale2Shot2(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);

  // Deep forest-indigo twilight sky
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#070e24');
  bg.addColorStop(0.52, '#10253a');
  bg.addColorStop(1, '#081b21');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 48, 57, 0.8, 0.55);

  // Golden Star shining brighter high above the trees!
  const starX = w * 0.7;
  const starY = h * 0.15;
  drawGoldenStar(ctx, starX, starY, minDim * 0.055, time, { pulse: 1.25, rays: true });

  // Silhouetted fern fronds framing the bottom & sides
  const drawFern = (bx, by, len, angle, flip) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.sin(time * 0.9 + bx * 0.01) * 0.04);
    ctx.strokeStyle = '#091f1e';
    ctx.fillStyle = '#0c2a26';
    ctx.lineWidth = Math.max(2, len * 0.025);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(flip * len * 0.2, -len * 0.5, flip * len * 0.35, -len);
    ctx.stroke();

    for (let f = 1; f <= 8; f++) {
      const t = f / 9;
      const fx = flip * len * (0.2 * 2 * (1 - t) * t + 0.35 * t * t);
      const fy = -len * t;
      const lw = len * 0.18 * (1 - t * 0.65);
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.ellipse(fx + s * lw * 0.55, fy, lw * 0.65, lw * 0.22, s * 0.35, 0, TWO_PI);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  drawFern(w * 0.08, h * 0.95, minDim * 0.56, 0.22, 1);
  drawFern(w * 0.92, h * 0.95, minDim * 0.58, -0.25, -1);
  drawFern(w * 0.24, h * 1.0, minDim * 0.42, 0.12, 1);
  drawFern(w * 0.78, h * 1.0, minDim * 0.44, -0.14, -1);

  // Cute spotted ladybug silhouette perched on a left fern frond
  const lbX = w * 0.2 + Math.sin(time * 0.9) * 3;
  const lbY = h * 0.61;
  const lbR = minDim * 0.042;
  ctx.save();
  ctx.translate(lbX, lbY);
  ctx.rotate(-0.35);
  // Red dome shell
  ctx.fillStyle = '#d93644';
  ctx.beginPath();
  ctx.arc(0, 0, lbR, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // Head & spots
  ctx.fillStyle = '#1d1221';
  ctx.beginPath();
  ctx.arc(lbR * 0.92, -lbR * 0.18, lbR * 0.38, 0, TWO_PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-lbR * 0.35, -lbR * 0.42, lbR * 0.16, 0, TWO_PI);
  ctx.arc(lbR * 0.18, -lbR * 0.54, lbR * 0.15, 0, TWO_PI);
  ctx.arc(lbR * 0.42, -lbR * 0.22, lbR * 0.13, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Golden fireflies dancing upward
  for (let i = 0; i < 18; i++) {
    const fx = hash(311 + i) * w + Math.sin(time * (1.2 + (i % 3) * 0.4) + i) * 24;
    const fy = ((hash(331 + i) * h * 0.85 - time * (16 + (i % 4) * 5)) % (h * 0.85) + h * 0.85) % (h * 0.85);
    const pulse = 0.55 + 0.45 * Math.sin(time * 3.5 + i * 1.7);
    drawGlow(
      ctx,
      fx,
      fy,
      minDim * (0.026 + (i % 2) * 0.012) * pulse,
      'rgba(255, 245, 165, 0.92)',
      'rgba(255, 195, 72, 0.24)'
    );
  }

  // Petite Charlie floating upward gazing toward the Golden Star
  const cx = w * 0.46 + Math.sin(time * 1.4) * minDim * 0.025;
  const cy = h * 0.43 + Math.cos(time * 1.8) * minDim * 0.02;
  drawCuteCharlie(ctx, cx, cy, minDim * 0.11, time, {
    lookX: starX - cx,
    lookY: starY - cy,
    wonder: true,
    droplets: true,
    glow: 1.25,
  });
}

/** SCALE 3 — Shot 1: Au-Dessus des Arbres (receding pines & floating paper lanterns) */
function drawScale3Shot1(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);

  // Warm midnight-violet to deep indigo sky
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#090e26');
  bg.addColorStop(0.6, '#1a1f45');
  bg.addColorStop(1, '#261e3d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 55, 64, 0.82, 0.72);

  // Dark pine tree silhouettes receding gently downward
  const treeOffset = Math.min(minDim * 0.08, shotTime * minDim * 0.025);
  ctx.fillStyle = '#091120';
  const pineCount = 11;
  for (let i = 0; i < pineCount; i++) {
    const px = (i / (pineCount - 1)) * w;
    const ph = h * (0.22 + hash(419 + i) * 0.14);
    const pw = (w / pineCount) * 1.45;
    const baseY = h + treeOffset;
    ctx.beginPath();
    ctx.moveTo(px, baseY - ph);
    ctx.lineTo(px + pw * 0.55, baseY);
    ctx.lineTo(px - pw * 0.55, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // Warm glowing floating paper lanterns rising around Charlie
  for (let i = 0; i < 9; i++) {
    const depth = 0.45 + hash(521 + i) * 0.75;
    const lx = w * (0.1 + hash(541 + i) * 0.8) + Math.sin(time * 0.9 + i * 1.7) * 14 * depth;
    const ly = ((hash(563 + i) * h - time * 18 * depth) % (h + 60) + (h + 60)) % (h + 60) - 30;
    const lw = minDim * 0.036 * depth;
    const lh = lw * 1.35;

    drawGlow(ctx, lx, ly, lh * 2.1, 'rgba(255, 198, 112, 0.42)', 'rgba(255, 115, 64, 0.12)');

    const lanGrad = ctx.createRadialGradient(lx, ly + lh * 0.15, lw * 0.1, lx, ly, lh * 0.85);
    lanGrad.addColorStop(0, '#fff5c8');
    lanGrad.addColorStop(0.55, '#ffa24c');
    lanGrad.addColorStop(1, '#c9493b');
    ctx.fillStyle = lanGrad;
    const rx = lx - lw * 0.5;
    const ry = ly - lh * 0.5;
    const rr = Math.min(lw * 0.25, lh * 0.25);
    ctx.beginPath();
    ctx.moveTo(rx + rr, ry);
    ctx.lineTo(rx + lw - rr, ry);
    ctx.quadraticCurveTo(rx + lw, ry, rx + lw, ry + rr);
    ctx.lineTo(rx + lw, ry + lh - rr);
    ctx.quadraticCurveTo(rx + lw, ry + lh, rx + lw - rr, ry + lh);
    ctx.lineTo(rx + rr, ry + lh);
    ctx.quadraticCurveTo(rx, ry + lh, rx, ry + lh - rr);
    ctx.lineTo(rx, ry + rr);
    ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    ctx.closePath();
    ctx.fill();
  }

  // Charlie floating serenely upward with the lanterns
  const cx = w * 0.5 + Math.sin(time * 1.2) * minDim * 0.025;
  const cy = h * 0.4 + Math.cos(time * 1.6) * minDim * 0.02;
  drawCuteCharlie(ctx, cx, cy, minDim * 0.11, time, {
    lookX: 0.35,
    lookY: -0.5,
    happy: true,
    droplets: true,
    glow: 1.3,
  });
}

/** SCALE 3 — Shot 2: La Ville Endormie (skyline, owl, airship & crescent moon) */
function drawScale3Shot2(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);

  // Silky midnight sky
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#070b20');
  bg.addColorStop(0.58, '#142048');
  bg.addColorStop(1, '#1c2444');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 60, 72, 0.88, 0.72);

  // Luminous crescent moon upper-right
  const moonX = w * 0.78;
  const moonY = h * 0.2;
  const moonR = minDim * 0.085;
  drawGlow(ctx, moonX, moonY, moonR * 3.0, 'rgba(220, 236, 255, 0.26)', 'rgba(130, 175, 245, 0.07)');
  ctx.fillStyle = '#f4f8ff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#0e1736';
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.36, moonY - moonR * 0.14, moonR * 0.88, 0, TWO_PI);
  ctx.fill();

  // Glowing airship drifting serenely across the moon
  const shipX = ((w * 0.85 - time * w * 0.035) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15;
  const shipY = h * 0.23 + Math.sin(time * 0.9) * 5;
  const shipW = minDim * 0.16;
  const shipH = shipW * 0.42;
  ctx.save();
  ctx.translate(shipX, shipY);
  drawGlow(ctx, 0, shipH * 0.3, shipW * 0.8, 'rgba(255, 212, 132, 0.24)', 'rgba(255, 160, 88, 0.06)');
  // Hull
  ctx.fillStyle = '#333d68';
  ctx.beginPath();
  ctx.ellipse(0, 0, shipW * 0.5, shipH * 0.5, 0, 0, TWO_PI);
  ctx.fill();
  // Tail fin
  ctx.beginPath();
  ctx.moveTo(shipW * 0.35, 0);
  ctx.lineTo(shipW * 0.62, -shipH * 0.45);
  ctx.lineTo(shipW * 0.62, shipH * 0.45);
  ctx.closePath();
  ctx.fill();
  // Warm lit cabin underneath
  ctx.fillStyle = '#ffcf76';
  ctx.fillRect(-shipW * 0.16, shipH * 0.46, shipW * 0.32, shipH * 0.24);
  ctx.restore();

  // Gentle owl gliding past Charlie
  const owlX = ((w * 0.15 + time * w * 0.055) % (w * 1.25)) - w * 0.12;
  const owlY = h * 0.34 + Math.sin(time * 2.4) * 10;
  const owlS = minDim * 0.055;
  const flap = Math.sin(time * 5.2) * owlS * 0.55;
  ctx.save();
  ctx.translate(owlX, owlY);
  ctx.strokeStyle = '#c8d4f0';
  ctx.fillStyle = '#242c4d';
  ctx.lineWidth = Math.max(2, owlS * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-owlS * 1.1, -flap);
  ctx.quadraticCurveTo(-owlS * 0.45, -owlS * 0.45 - flap * 0.4, 0, 0);
  ctx.quadraticCurveTo(owlS * 0.45, -owlS * 0.45 - flap * 0.4, owlS * 1.1, -flap);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, owlS * 0.08, owlS * 0.3, owlS * 0.38, 0, 0, TWO_PI);
  ctx.fill();
  // Tiny golden owl eyes
  ctx.fillStyle = '#ffe082';
  ctx.beginPath();
  ctx.arc(-owlS * 0.1, -owlS * 0.02, owlS * 0.07, 0, TWO_PI);
  ctx.arc(owlS * 0.1, -owlS * 0.02, owlS * 0.07, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Sleeping city skyline silhouette far below with warm tiny windows
  const baseY = h;
  const bldgCount = 14;
  const bw = w / bldgCount;
  for (let i = 0; i < bldgCount; i++) {
    const bh = h * (0.14 + hash(601 + i) * 0.17);
    const bx = i * bw;
    ctx.fillStyle = i % 2 === 0 ? '#0b1024' : '#101733';
    ctx.fillRect(bx - 1, baseY - bh, bw + 2, bh);

    // Sparse cozy warm lit windows
    ctx.fillStyle = 'rgba(255, 214, 128, 0.7)';
    for (let wy = baseY - bh + 10; wy < baseY - 12; wy += 14) {
      for (let wx = bx + 6; wx < bx + bw - 8; wx += 10) {
        if (hash(wx * 3.1 + wy * 7.3) > 0.68) {
          ctx.fillRect(wx, wy, 4, 6);
        }
      }
    }
  }

  // Charlie floating joyfully above the sleeping city
  const cx = w * 0.46 + Math.sin(time * 1.1) * minDim * 0.025;
  const cy = h * 0.44 + Math.cos(time * 1.5) * minDim * 0.02;
  drawCuteCharlie(ctx, cx, cy, minDim * 0.11, time, {
    lookX: shipX - cx,
    lookY: shipY - cy,
    wonder: true,
    droplets: true,
    glow: 1.25,
  });
}

/** SCALE 4 — Shot 1: Les Nuages (moonlit clouds & glowing blue curve of Earth) */
function drawScale4Shot1(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);

  // Stratosphere-to-space deep navy gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#040717');
  bg.addColorStop(0.55, '#0b193d');
  bg.addColorStop(1, '#163d72');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 75, 81, 0.92, 0.65);

  // Glowing sapphire curve of Earth below
  const earthR = Math.max(w, h) * 1.15;
  const earthX = w * 0.5;
  const earthY = h * 0.68 + earthR;

  // Atmosphere halo
  drawGlow(
    ctx,
    earthX,
    h * 0.72,
    w * 0.85,
    'rgba(92, 198, 255, 0.42)',
    'rgba(48, 128, 235, 0.14)'
  );

  const earthGrad = ctx.createRadialGradient(
    earthX,
    earthY - earthR * 0.96,
    earthR * 0.04,
    earthX,
    earthY,
    earthR
  );
  earthGrad.addColorStop(0, '#72d4ff');
  earthGrad.addColorStop(0.18, '#2678d4');
  earthGrad.addColorStop(0.55, '#10316e');
  earthGrad.addColorStop(1, '#071432');
  ctx.fillStyle = earthGrad;
  ctx.beginPath();
  ctx.arc(earthX, earthY, earthR, 0, TWO_PI);
  ctx.fill();

  // Layered silver-blue moonlit clouds drifting past
  for (let c = 0; c < 7; c++) {
    const speed = 10 + (c % 3) * 8;
    const cx = ((hash(701 + c) * (w + 260) + time * speed) % (w + 260)) - 130;
    const cy = h * (0.48 + (c % 3) * 0.085);
    const cw = minDim * (0.22 + (c % 3) * 0.07);
    const ch = cw * 0.32;
    drawGlow(
      ctx,
      cx,
      cy,
      cw * 0.85,
      'rgba(215, 236, 255, 0.34)',
      'rgba(145, 190, 240, 0.1)'
    );
    ctx.fillStyle = 'rgba(205, 228, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw * 0.55, ch * 0.55, 0, 0, TWO_PI);
    ctx.ellipse(cx - cw * 0.28, cy + ch * 0.12, cw * 0.36, ch * 0.42, 0, 0, TWO_PI);
    ctx.ellipse(cx + cw * 0.28, cy + ch * 0.1, cw * 0.38, ch * 0.44, 0, 0, TWO_PI);
    ctx.fill();
  }

  // Charlie gliding upward into silent starlight
  const px = w * 0.5 + Math.sin(time * 1.1) * minDim * 0.025;
  const py = h * 0.36 + Math.cos(time * 1.5) * minDim * 0.02;
  drawCuteCharlie(ctx, px, py, minDim * 0.115, time, {
    lookX: 0.1,
    lookY: -0.65,
    wonder: true,
    droplets: true,
    glow: 1.35,
  });
}

/** SCALE 4 — Shot 2: Le Ballet Orbital (ringed Saturn planet, cyan comet & radiant Charlie) */
function drawScale4Shot2(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);

  // Deep velvety space backdrop
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.9);
  bg.addColorStop(0, '#13183d');
  bg.addColorStop(0.55, '#090c24');
  bg.addColorStop(1, '#040512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 90, 88, 0.95, 1.0);

  // Ringed Saturn-like planet on upper-right
  const satX = w * 0.74;
  const satY = h * 0.27;
  const satR = minDim * 0.105;

  ctx.save();
  ctx.translate(satX, satY);
  ctx.rotate(-0.34);

  // Back half of rings
  ctx.strokeStyle = 'rgba(255, 224, 170, 0.52)';
  ctx.lineWidth = Math.max(3, satR * 0.16);
  ctx.beginPath();
  ctx.ellipse(0, 0, satR * 1.95, satR * 0.48, 0, Math.PI, TWO_PI);
  ctx.stroke();

  // Planet body
  const satGrad = ctx.createRadialGradient(-satR * 0.3, -satR * 0.3, satR * 0.1, 0, 0, satR);
  satGrad.addColorStop(0, '#ffe6b5');
  satGrad.addColorStop(0.55, '#e0a268');
  satGrad.addColorStop(1, '#613c54');
  ctx.fillStyle = satGrad;
  ctx.beginPath();
  ctx.arc(0, 0, satR, 0, TWO_PI);
  ctx.fill();

  // Front half of rings
  ctx.strokeStyle = 'rgba(255, 232, 185, 0.74)';
  ctx.lineWidth = Math.max(3, satR * 0.16);
  ctx.beginPath();
  ctx.ellipse(0, 0, satR * 1.95, satR * 0.48, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Streaming cyan comet sweeping gracefully across the sky
  const cp = (time * 0.22 + 0.15) % 1;
  const cometX = lerp(-w * 0.1, w * 1.12, cp);
  const cometY = lerp(h * 0.14, h * 0.34, cp) + Math.sin(cp * Math.PI) * -minDim * 0.06;
  const tailGrad = ctx.createLinearGradient(cometX, cometY, cometX - minDim * 0.36, cometY - minDim * 0.09);
  tailGrad.addColorStop(0, 'rgba(155, 252, 255, 0.88)');
  tailGrad.addColorStop(0.45, 'rgba(72, 200, 255, 0.35)');
  tailGrad.addColorStop(1, 'rgba(72, 200, 255, 0)');
  ctx.strokeStyle = tailGrad;
  ctx.lineWidth = Math.max(3, minDim * 0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cometX, cometY);
  ctx.lineTo(cometX - minDim * 0.36, cometY - minDim * 0.09);
  ctx.stroke();
  drawGlow(ctx, cometX, cometY, minDim * 0.045, 'rgba(225, 255, 255, 0.95)', 'rgba(88, 224, 255, 0.35)');

  // Charlie with radiant pulsing lava heart
  const cx = w * 0.42 + Math.sin(time * 1.1) * minDim * 0.025;
  const cy = h * 0.45 + Math.cos(time * 1.5) * minDim * 0.02;
  drawGlow(
    ctx,
    cx,
    cy,
    minDim * (0.28 + 0.03 * Math.sin(time * 2.5)),
    'rgba(255, 198, 118, 0.38)',
    'rgba(255, 92, 72, 0.14)'
  );
  drawCuteCharlie(ctx, cx, cy, minDim * 0.12, time, {
    lookX: satX - cx,
    lookY: satY - cy,
    happy: true,
    droplets: true,
    glow: 1.45,
  });
}

/** SCALE 5 — Shot 1: Les Nébuleuses (rose & turquoise nebula parting around radiant Charlie) */
function drawScale5Shot1(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);
  const cx = w * 0.5;
  const cy = h * 0.41;

  // Deep cosmic violet backdrop
  ctx.fillStyle = '#070516';
  ctx.fillRect(0, 0, w, h);

  // Swirling rose-magenta & turquoise cosmic nebula clouds
  const clouds = [
    { x: 0.22, y: 0.28, r: 0.48, c1: 'rgba(255, 98, 168, 0.36)', c2: 'rgba(155, 42, 138, 0.12)' },
    { x: 0.78, y: 0.32, r: 0.5, c1: 'rgba(64, 232, 224, 0.34)', c2: 'rgba(28, 118, 172, 0.12)' },
    { x: 0.32, y: 0.64, r: 0.45, c1: 'rgba(130, 88, 255, 0.3)', c2: 'rgba(68, 32, 152, 0.08)' },
    { x: 0.72, y: 0.62, r: 0.44, c1: 'rgba(255, 128, 148, 0.28)', c2: 'rgba(180, 48, 118, 0.08)' },
  ];
  for (let i = 0; i < clouds.length; i++) {
    const cl = clouds[i];
    const ox = Math.cos(time * 0.35 + i * 1.8) * minDim * 0.05;
    const oy = Math.sin(time * 0.3 + i * 1.3) * minDim * 0.04;
    drawGlow(ctx, w * cl.x + ox, h * cl.y + oy, minDim * cl.r, cl.c1, cl.c2);
  }

  drawStarfield(ctx, w, h, time, 95, 95, 0.95, 1.0);

  // Radiant giant Charlie glowing like a warm little sun
  drawGlow(
    ctx,
    cx,
    cy,
    minDim * (0.4 + 0.04 * Math.sin(time * 2.2)),
    'rgba(255, 228, 148, 0.5)',
    'rgba(255, 118, 86, 0.18)'
  );
  drawCuteCharlie(ctx, cx, cy + Math.sin(time * 1.5) * 6, minDim * 0.145, time, {
    lookX: 0,
    lookY: -0.25,
    happy: true,
    droplets: true,
    glow: 1.5,
  });
}

/** Helper to draw a soft rotating spiral galaxy. */
function drawSpiralGalaxy(ctx, x, y, r, time, tintInner, tintOuter) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.18);
  ctx.scale(1, 0.56);

  drawGlow(ctx, 0, 0, r * 1.25, tintInner, tintOuter);

  for (let arm = 0; arm < 2; arm++) {
    ctx.save();
    ctx.rotate(arm * Math.PI);
    ctx.strokeStyle = tintInner;
    ctx.lineWidth = Math.max(1.5, r * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let s = 0; s <= 18; s++) {
      const t = s / 18;
      const ang = t * Math.PI * 1.7;
      const dist = t * r * 0.95;
      const px = Math.cos(ang) * dist;
      const py = Math.sin(ang) * dist;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** SCALE 5 — Shot 2: L'Appel de l'Étoile (spiral galaxies & the welcoming Golden Star) */
function drawScale5Shot2(ctx, w, h, time, _shotTime) {
  const minDim = Math.min(w, h);

  // Deep cosmic vista
  const bg = ctx.createRadialGradient(w * 0.68, h * 0.28, 0, w * 0.5, h * 0.45, Math.max(w, h));
  bg.addColorStop(0, '#24183e');
  bg.addColorStop(0.45, '#0c0b24');
  bg.addColorStop(1, '#040410');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 100, 102, 0.95, 1.0);

  // Two distant rotating spiral galaxies
  drawSpiralGalaxy(
    ctx,
    w * 0.22,
    h * 0.24,
    minDim * 0.14,
    time,
    'rgba(170, 218, 255, 0.42)',
    'rgba(96, 110, 230, 0.12)'
  );
  drawSpiralGalaxy(
    ctx,
    w * 0.78,
    h * 0.58,
    minDim * 0.11,
    -time * 0.85,
    'rgba(255, 178, 224, 0.38)',
    'rgba(165, 68, 170, 0.1)'
  );

  // The welcoming Golden Star shining warmly ahead
  const starX = w * 0.68;
  const starY = h * 0.28;
  drawGoldenStar(ctx, starX, starY, minDim * 0.085, time, { pulse: 1.3, rays: true });

  // Charlie floating eagerly toward her Golden Star
  const cx = w * 0.34 + Math.sin(time * 1.1) * minDim * 0.02;
  const cy = h * 0.48 + Math.cos(time * 1.4) * minDim * 0.02;
  drawCuteCharlie(ctx, cx, cy, minDim * 0.125, time, {
    lookX: starX - cx,
    lookY: starY - cy,
    wonder: true,
    droplets: true,
    glow: 1.4,
  });
}

/** VICTORY — Shot 1: Les Retrouvailles (Charlie & Golden Star embrace in swirling light) */
function drawVictoryShot1(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);
  const midX = w * 0.5;
  const midY = h * 0.4;

  // Warm celestial violet-to-rose backdrop
  const bg = ctx.createRadialGradient(midX, midY, 0, midX, midY, Math.max(w, h) * 0.9);
  bg.addColorStop(0, '#3a1c3f');
  bg.addColorStop(0.45, '#171033');
  bg.addColorStop(1, '#060616');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 85, 111, 0.9, 1.0);

  // Tender approach easing
  const approach = easeInOutSine(Math.min(1, shotTime * 0.65));
  const sep = lerp(minDim * 0.22, minDim * 0.115, approach);
  const cx = midX - sep;
  const cy = midY + Math.sin(time * 1.6) * 5;
  const sx = midX + sep;
  const sy = midY - Math.sin(time * 1.6) * 5;

  // Swirling coral-and-gold light ribbons uniting them
  drawGlow(
    ctx,
    midX,
    midY,
    minDim * 0.45,
    'rgba(255, 224, 150, 0.36)',
    'rgba(255, 116, 108, 0.14)'
  );

  for (let i = 0; i < 16; i++) {
    const ang = time * 1.3 + (i / 16) * TWO_PI;
    const rr = minDim * (0.14 + 0.12 * Math.sin(time * 1.8 + i));
    const px = midX + Math.cos(ang) * rr * 1.25;
    const py = midY + Math.sin(ang) * rr * 0.68;
    drawGlow(
      ctx,
      px,
      py,
      minDim * 0.025,
      i % 2 === 0 ? 'rgba(255, 240, 175, 0.85)' : 'rgba(255, 148, 118, 0.85)',
      'rgba(255, 160, 100, 0.1)'
    );
  }

  // The Golden Star glowing warmly beside Charlie
  drawGoldenStar(ctx, sx, sy, minDim * 0.085, time, { pulse: 1.25, rays: true });

  // Giant happy Charlie with joyful crescent eyes (^ ^)
  drawCuteCharlie(ctx, cx, cy, minDim * 0.135, time, {
    lookX: 1,
    lookY: 0,
    happy: true,
    droplets: true,
    glow: 1.5,
  });
}

/** VICTORY — Shot 2: Une Lumière dans la Nuit (blooming cosmic lava-and-starlight galaxy) */
function drawVictoryShot2(ctx, w, h, time, shotTime) {
  const minDim = Math.min(w, h);
  const cx = w * 0.5;
  const cy = h * 0.4;
  const bloom = easeOutCubic(Math.min(1, shotTime * 0.75));

  // Deep cosmic sky illuminated from the center
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
  bg.addColorStop(0, '#4d1f3e');
  bg.addColorStop(0.42, '#1a1238');
  bg.addColorStop(1, '#050614');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, time, 110, 121, 0.95, 1.0);

  // Blooming warm lava-and-starlight galaxy arms
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.16);

  drawGlow(
    ctx,
    0,
    0,
    minDim * (0.48 * (0.65 + 0.35 * bloom)),
    'rgba(255, 240, 180, 0.58)',
    'rgba(255, 115, 86, 0.24)'
  );

  const armCount = 4;
  for (let arm = 0; arm < armCount; arm++) {
    ctx.save();
    ctx.rotate((arm / armCount) * TWO_PI);
    for (let s = 1; s <= 16; s++) {
      const t = s / 16;
      const ang = t * Math.PI * 1.45;
      const dist = t * minDim * 0.46 * (0.5 + 0.5 * bloom);
      const px = Math.cos(ang) * dist;
      const py = Math.sin(ang) * dist * 0.72;
      const pr = minDim * (0.045 * (1 - t * 0.65));
      drawGlow(
        ctx,
        px,
        py,
        pr * 2.1,
        arm % 2 === 0 ? 'rgba(255, 230, 145, 0.52)' : 'rgba(255, 134, 108, 0.48)',
        'rgba(255, 92, 132, 0.08)'
      );
    }
    ctx.restore();
  }
  ctx.restore();

  // Gentle sparkles radiating outward across the whole sky
  for (let i = 0; i < 24; i++) {
    const ang = hash(809 + i) * TWO_PI + time * 0.12;
    const dist = minDim * ((0.12 + (hash(823 + i) + time * 0.08) % 0.52));
    const sx = cx + Math.cos(ang) * dist * 1.25;
    const sy = cy + Math.sin(ang) * dist * 0.9;
    drawGoldenStar(ctx, sx, sy, minDim * (0.012 + (i % 3) * 0.005), time + i, {
      pulse: 1.1,
      rays: i % 2 === 0,
    });
  }

  // Radiant Charlie smiling serenely at the heart of the cosmic lava galaxy
  drawCuteCharlie(ctx, cx, cy, minDim * 0.115, time, {
    lookX: 0,
    lookY: 0,
    happy: true,
    droplets: true,
    glow: 1.6,
  });
}

/** VICTORY — Shot 3: Bonne Nuit, Charlie (callback to bedroom window + winking twin star) */
function drawVictoryShot3(ctx, w, h, time, shotTime) {
  drawBedroomWindow(ctx, w, h, time, shotTime, { twinStar: true });
}

// ============================================================================
// CUTSCENE DEFINITIONS (7 HANDCRAFTED STORIES, TENDER FRENCH STORYBOOK TONE)
// ============================================================================

const CUTSCENES = {
  intro: [
    {
      chapter: 'PROLOGUE · LA FENÊTRE',
      text: "Une nuit calme, une vieille lampe à lave brillait doucement près de la fenêtre… Dehors, une étoile solitaire scintillait très haut.",
      cue: 'chime',
      draw: drawIntroShot1,
    },
    {
      chapter: 'PROLOGUE · LA PETITE CHARLIE',
      text: "Tout au fond de la lampe, une minuscule goutte curieuse s'éveilla. C'était la petite Charlie. Elle voulut aller saluer l'étoile.",
      cue: 'chime',
      draw: drawIntroShot2,
    },
    {
      chapter: 'PROLOGUE · LE GRAND PLONGEON',
      text: "Mais Charlie était encore si petite… Pour grandir jusqu'au ciel, son voyage devait commencer dans l'infiniment petit.",
      cue: 'chime',
      draw: drawIntroShot3,
    },
  ],
  scale_1: [
    {
      chapter: "CHAPITRE II · L'ÉVEIL",
      text: "Les atomes s'effacent dans un frisson lumineux. La petite Charlie vient de grandir d'un coup !",
      cue: 'scale',
      draw: drawScale1Shot1,
    },
    {
      chapter: "CHAPITRE II · LA GOUTTE D'EAU",
      text: "Autour d'elle s'ouvre tout un océan caché dans une goutte d'eau… Encore un peu, Charlie !",
      cue: 'chime',
      draw: drawScale1Shot2,
    },
  ],
  scale_2: [
    {
      chapter: 'CHAPITRE III · PLOUF !',
      text: "Plouf ! Charlie perce enfin la surface de la goutte de rosée et sent la brise fraîche de la nuit.",
      cue: 'scale',
      draw: drawScale2Shot1,
    },
    {
      chapter: 'CHAPITRE III · LE SOUS-BOIS',
      text: "Les lucioles et les coccinelles l'accompagnent. Tout là-haut, son étoile brille déjà plus fort !",
      cue: 'chime',
      draw: drawScale2Shot2,
    },
  ],
  scale_3: [
    {
      chapter: 'CHAPITRE IV · AU-DESSUS DES ARBRES',
      text: "Charlie s'élève au-dessus de la forêt. Des lanternes tièdes montent dans la nuit comme de petits amis.",
      cue: 'scale',
      draw: drawScale3Shot1,
    },
    {
      chapter: 'CHAPITRE IV · LA VILLE ENDORMIE',
      text: "Chouettes, voitures et grands dirigeables croisent sa route… Le ciel devient immense !",
      cue: 'chime',
      draw: drawScale3Shot2,
    },
  ],
  scale_4: [
    {
      chapter: 'CHAPITRE V · LES NUAGES',
      text: "Charlie traverse les nuages et quitte doucement la Terre bleue. Tout devient silencieux et scintillant.",
      cue: 'scale',
      draw: drawScale4Shot1,
    },
    {
      chapter: 'CHAPITRE V · LE BALLET ORBITAL',
      text: "Les lunes et les planètes dansent autour d'elle. Charlie n'a jamais été aussi proche de son étoile.",
      cue: 'chime',
      draw: drawScale4Shot2,
    },
  ],
  scale_5: [
    {
      chapter: 'CHAPITRE VI · LES NÉBULEUSES',
      text: "Charlie glisse au cœur des nébuleuses colorées, aussi lumineuse qu'un petit soleil.",
      cue: 'scale',
      draw: drawScale5Shot1,
    },
    {
      chapter: "CHAPITRE VI · L'APPEL DE L'ÉTOILE",
      text: "Tout au bout du ciel, l'étoile qui l'appelait depuis sa chambre l'attend enfin…",
      cue: 'chime',
      draw: drawScale5Shot2,
    },
  ],
  victory: [
    {
      chapter: 'FINALE · LES RETROUVAILLES',
      text: "La petite Charlie rejoint enfin l'étoile solitaire. Leurs deux lumières s'enlacent dans un tourbillon tout doux.",
      cue: 'victory',
      draw: drawVictoryShot1,
    },
    {
      chapter: 'FINALE · UNE LUMIÈRE DANS LA NUIT',
      text: "Devenue immense et lumineuse, Charlie éclaire désormais toute la nuit comme une grande lampe à lave céleste.",
      cue: 'chime',
      draw: drawVictoryShot2,
    },
    {
      chapter: 'FINALE · BONNE NUIT, CHARLIE',
      text: "Et depuis la fenêtre de la chambre endormie, on peut toujours voir la petite Charlie cligner de l'œil parmi les étoiles.",
      cue: 'chime',
      draw: drawVictoryShot3,
    },
  ],
};

export class CutsceneManager {
  constructor({ onCue } = {}) {
    this.active = false;
    this.id = null;
    this.shotIndex = 0;
    this.shotTime = 0;
    this.fadeAlpha = 0;
    this.guardTimer = 0;
    this.onComplete = null;
    this.onCue = typeof onCue === 'function' ? onCue : null;
  }

  play(cutsceneId, onComplete) {
    const shots = CUTSCENES[cutsceneId];
    if (!shots || shots.length === 0) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }

    this.active = true;
    this.id = cutsceneId;
    this.shotIndex = 0;
    this.shotTime = 0;
    this.fadeAlpha = 1;
    this.guardTimer = 0.45;
    this.onComplete = typeof onComplete === 'function' ? onComplete : null;

    this.onCue?.(shots[0].cue || 'chime');
  }

  advance() {
    if (!this.active || this.guardTimer > 0) {
      return false;
    }

    const shots = CUTSCENES[this.id];
    if (!shots) {
      this.skip();
      return true;
    }

    this.shotIndex += 1;
    if (this.shotIndex >= shots.length) {
      this.skip();
      return true;
    }

    this.shotTime = 0;
    this.fadeAlpha = 1;
    this.guardTimer = 0.4;
    this.onCue?.(shots[this.shotIndex].cue || 'chime');
    return true;
  }

  skip() {
    this.active = false;
    this.id = null;
    this.shotIndex = 0;
    this.shotTime = 0;
    this.fadeAlpha = 0;
    this.guardTimer = 0;

    const cb = this.onComplete;
    this.onComplete = null;
    cb?.();
  }

  getCurrentShot() {
    if (!this.active || !this.id) {
      return null;
    }
    const shots = CUTSCENES[this.id];
    if (!shots || this.shotIndex < 0 || this.shotIndex >= shots.length) {
      return null;
    }
    const shot = shots[this.shotIndex];
    return {
      chapter: shot.chapter,
      text: shot.text,
      shotNumber: this.shotIndex + 1,
      totalShots: shots.length,
    };
  }

  update(dt) {
    if (!this.active) return;
    const step = Math.min(0.1, Math.max(0, Number.isFinite(dt) ? dt : 0));
    this.shotTime += step;
    if (this.guardTimer > 0) {
      this.guardTimer = Math.max(0, this.guardTimer - step);
    }
    if (this.fadeAlpha > 0) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - step * 2.4);
    }
  }

  draw(ctx, width, height, time = 0) {
    if (!this.active || !this.id || !ctx || width <= 0 || height <= 0) {
      return;
    }
    const shots = CUTSCENES[this.id];
    const shot = shots && shots[this.shotIndex];
    if (!shot) {
      return;
    }

    const t = Number.isFinite(time) ? time : this.shotTime;

    ctx.save();
    const drewArt = this._drawIllustratedShot(ctx, width, height, t);
    if (!drewArt) {
      shot.draw(ctx, width, height, t, this.shotTime);
    }

    // Soft storybook vignette framing the animated scene
    const maxR = Math.hypot(width, height) * 0.62;
    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      Math.min(width, height) * 0.24,
      width * 0.5,
      height * 0.45,
      maxR
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(0.75, 'rgba(6, 7, 20, 0.24)');
    vig.addColorStop(1, 'rgba(4, 5, 16, 0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    // Smooth shot transition fade
    if (this.fadeAlpha > 0.005) {
      ctx.fillStyle = `rgba(6, 8, 22, ${clamp(this.fadeAlpha, 0, 1).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  _getArtImage(key, src) {
    if (typeof Image === 'undefined') return null;
    if (!this._artCache) this._artCache = Object.create(null);
    if (!this._artCache[key]) {
      const img = new Image();
      img.src = src;
      this._artCache[key] = img;
    }
    const img = this._artCache[key];
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  _drawIllustratedShot(ctx, width, height, time) {
    // Use the handcrafted storybook illustrations with smooth Ken Burns motion on hero Intro & Finale shots
    let spec = null;
    const isPortrait = height > width;
    if (this.id === 'intro' && this.shotIndex === 0) {
      spec = {
        key: isPortrait ? 'portrait' : 'landscape',
        src: isPortrait ? './assets/art/keyart-portrait.jpg' : './assets/art/keyart-landscape.jpg',
        zoomStart: 1.04,
        zoomEnd: 1.15,
        panY: isPortrait ? 0.04 : 0,
        panX: isPortrait ? 0 : -0.04,
      };
    } else if (this.id === 'intro' && this.shotIndex === 1) {
      spec = {
        key: 'charlie',
        src: './assets/art/charlie-portrait.jpg',
        zoomStart: 1.0,
        zoomEnd: 1.14,
        panY: 0,
        panX: 0,
      };
    } else if (this.id === 'victory' && this.shotIndex === 1) {
      spec = {
        key: 'landscape',
        src: './assets/art/keyart-landscape.jpg',
        zoomStart: 1.05,
        zoomEnd: 1.16,
        panY: 0,
        panX: 0.05,
      };
    } else if (this.id === 'victory' && this.shotIndex === 2) {
      spec = {
        key: isPortrait ? 'portrait' : 'landscape',
        src: isPortrait ? './assets/art/keyart-portrait.jpg' : './assets/art/keyart-landscape.jpg',
        zoomStart: 1.14,
        zoomEnd: 1.02,
        panY: isPortrait ? -0.04 : 0,
        panX: 0,
      };
    }
    if (!spec) return false;

    const img = this._getArtImage(spec.key, spec.src);
    if (!img) return false;

    const p = clamp(this.shotTime / 7.5, 0, 1);
    const zoom = spec.zoomStart + (spec.zoomEnd - spec.zoomStart) * p;
    const coverScale = Math.max(width / img.naturalWidth, height / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * coverScale;
    const dh = img.naturalHeight * coverScale;
    const dx = (width - dw) * 0.5 + width * spec.panX * p;
    const dy = (height - dh) * 0.5 + height * spec.panY * p;

    ctx.drawImage(img, dx, dy, dw, dh);

    // Overlay living bioluminescent fireflies / stardust so the illustration breathes!
    for (let i = 0; i < 18; i++) {
      const fx = ((i * 0.173 + time * (0.012 + (i % 3) * 0.005)) % 1) * width;
      const fy = ((i * 0.291 - time * (0.018 + (i % 4) * 0.004) + 10) % 1) * height;
      const twinkle = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * 2.6 + i * 1.7));
      const r = 1.6 + (i % 3) * 1.1;
      ctx.fillStyle = i % 2 === 0
        ? `rgba(255, 232, 165, ${(0.35 + twinkle * 0.45).toFixed(3)})`
        : `rgba(125, 240, 224, ${(0.25 + twinkle * 0.35).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, TWO_PI);
      ctx.fill();
    }

    return true;
  }
}

/**
 * CHARLIE — Handcrafted Storybook-Cosmic Canvas 2D Skins
 * Scales V (Planetary) & VI (Cosmic)
 *
 * Purely relative to entity radius `r`, zero `shadowBlur` for silky 60 FPS on mobile.
 * Expects `ctx` already translated to (0, 0) and rotated by `entity.angle`.
 */

const TWO_PI = Math.PI * 2;

/* --------------------------------------------------------------------------
 * Shared Luminous Illustration Helpers
 * -------------------------------------------------------------------------- */

function drawRadialGlow(ctx, x, y, innerR, outerR, stops) {
  const g = ctx.createRadialGradient(x, y, innerR, x, y, outerR);
  for (let i = 0; i < stops.length; i++) {
    g.addColorStop(stops[i][0], stops[i][1]);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, TWO_PI);
  ctx.fill();
}

function drawSparkle(ctx, x, y, size, alpha, color, rotation = 0) {
  if (alpha <= 0.01 || size <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  const waist = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(waist * 0.5, -waist * 0.5, size, 0);
  ctx.quadraticCurveTo(waist * 0.5, waist * 0.5, 0, size);
  ctx.quadraticCurveTo(-waist * 0.5, waist * 0.5, -size, 0);
  ctx.quadraticCurveTo(-waist * 0.5, -waist * 0.5, 0, -size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawShadowTerminator(ctx, r, darkRgba, midRgba) {
  // Offset radial shadow simulating directional sunlight from upper-left (-0.42r, -0.42r)
  const g = ctx.createRadialGradient(
    -r * 0.42, -r * 0.42, r * 0.25,
    -r * 0.14, -r * 0.14, r * 1.24
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(0.56, 'rgba(0, 0, 0, 0)');
  g.addColorStop(0.76, midRgba || 'rgba(10, 18, 36, 0.34)');
  g.addColorStop(0.94, darkRgba || 'rgba(6, 10, 24, 0.72)');
  g.addColorStop(1, darkRgba || 'rgba(6, 10, 24, 0.78)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.02, 0, TWO_PI);
  ctx.fill();
}

function drawCrater(ctx, cx, cy, cr, basinColor, shadowColor, rimColor) {
  // Soft recessed basin
  ctx.fillStyle = basinColor;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, TWO_PI);
  ctx.fill();

  // Inner cast shadow on the sunlit side of the bowl (upper-left)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, TWO_PI);
  ctx.clip();
  ctx.fillStyle = shadowColor;
  ctx.beginPath();
  ctx.arc(cx + cr * 0.28, cy + cr * 0.28, cr * 0.96, 0, TWO_PI);
  ctx.fill();
  // Re-open the lit floor offset toward lower-right
  ctx.fillStyle = basinColor;
  ctx.beginPath();
  ctx.arc(cx + cr * 0.34, cy + cr * 0.34, cr * 0.82, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Lit rim arc on the lower-right lip catching sunlight
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = Math.max(cr * 0.16, 0.001);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, cr * 0.96, -0.25, Math.PI * 0.78);
  ctx.stroke();
}

/* --------------------------------------------------------------------------
 * 1. ASTEROID — Sculpted Faceted Space-Boulder with Craters
 * -------------------------------------------------------------------------- */

function drawAsteroid(ctx, r, ph) {
  // Subtle cool space-dust rim halo
  drawRadialGlow(ctx, 0, 0, r * 0.4, r * 1.32, [
    [0, 'rgba(148, 163, 184, 0.16)'],
    [0.7, 'rgba(100, 116, 139, 0.06)'],
    [1, 'rgba(100, 116, 139, 0)'],
  ]);

  // Deterministic 9-vertex irregular faceted silhouette seeded from `ph`
  const sides = 9;
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TWO_PI;
    const jitter =
      Math.sin(i * 2.3 + ph * 3.1) * 0.11 +
      Math.cos(i * 4.1 - ph * 1.7) * 0.06;
    const rad = r * (0.88 + jitter);
    verts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }

  const traceBody = () => {
    ctx.beginPath();
    ctx.moveTo(verts[0][0], verts[0][1]);
    for (let i = 1; i < sides; i++) {
      ctx.lineTo(verts[i][0], verts[i][1]);
    }
    ctx.closePath();
  };

  ctx.save();
  traceBody();
  ctx.clip();

  // Directional sunlit warm-grey to deep cool slate shadow
  const bodyGrad = ctx.createLinearGradient(-r * 0.9, -r * 0.85, r * 0.95, r * 0.9);
  bodyGrad.addColorStop(0, '#ece6dc');
  bodyGrad.addColorStop(0.28, '#c9c2b8');
  bodyGrad.addColorStop(0.58, '#7b8494');
  bodyGrad.addColorStop(0.84, '#3e485c');
  bodyGrad.addColorStop(1, '#1e2638');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);

  // Chiseled sunlit facet plane (upper-left)
  ctx.fillStyle = 'rgba(255, 250, 240, 0.24)';
  ctx.beginPath();
  ctx.moveTo(verts[4][0], verts[4][1]);
  ctx.lineTo(verts[5][0], verts[5][1]);
  ctx.lineTo(verts[6][0], verts[6][1]);
  ctx.lineTo(-r * 0.08, -r * 0.14);
  ctx.closePath();
  ctx.fill();

  // Deep cool shadow facet plane (lower-right)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.beginPath();
  ctx.moveTo(verts[0][0], verts[0][1]);
  ctx.lineTo(verts[1][0], verts[1][1]);
  ctx.lineTo(verts[2][0], verts[2][1]);
  ctx.lineTo(r * 0.12, r * 0.08);
  ctx.closePath();
  ctx.fill();

  // 4 shaded pockmarked craters
  drawCrater(ctx, -r * 0.28, -r * 0.22, r * 0.21, 'rgba(115, 118, 128, 0.55)', 'rgba(30, 38, 56, 0.55)', 'rgba(255, 250, 240, 0.55)');
  drawCrater(ctx, r * 0.26, -r * 0.16, r * 0.15, 'rgba(84, 92, 108, 0.55)', 'rgba(22, 30, 46, 0.6)', 'rgba(226, 232, 240, 0.42)');
  drawCrater(ctx, -r * 0.14, r * 0.30, r * 0.17, 'rgba(72, 80, 96, 0.58)', 'rgba(18, 25, 40, 0.62)', 'rgba(203, 213, 225, 0.36)');
  drawCrater(ctx, r * 0.32, r * 0.26, r * 0.11, 'rgba(51, 60, 78, 0.62)', 'rgba(12, 18, 32, 0.68)', 'rgba(148, 163, 184, 0.28)');

  ctx.restore();

  // Subtle dark outer silhouette contour
  traceBody();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.lineWidth = r * 0.045;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Crisp sunlit rim highlight along upper-left edges
  ctx.strokeStyle = 'rgba(255, 251, 242, 0.65)';
  ctx.lineWidth = r * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(verts[4][0], verts[4][1]);
  ctx.lineTo(verts[5][0], verts[5][1]);
  ctx.lineTo(verts[6][0], verts[6][1]);
  ctx.lineTo(verts[7][0], verts[7][1]);
  ctx.stroke();
}

/* --------------------------------------------------------------------------
 * 2. COMET — Twin-Tailed Luminous Icy-Cyan Comet
 * -------------------------------------------------------------------------- */

function drawComet(ctx, r, ph, time) {
  const flutter = Math.sin(time * 3.1 + ph) * r * 0.12;
  const flutter2 = Math.cos(time * 2.4 + ph * 1.3) * r * 0.09;

  // 1) Wider warm golden-dust curved tail streaming toward -X
  ctx.save();
  const dustGrad = ctx.createLinearGradient(r * 0.2, 0, -r * 3.85, -r * 0.65);
  dustGrad.addColorStop(0, 'rgba(254, 243, 199, 0.62)');
  dustGrad.addColorStop(0.28, 'rgba(253, 211, 114, 0.42)');
  dustGrad.addColorStop(0.65, 'rgba(251, 146, 60, 0.16)');
  dustGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = dustGrad;
  ctx.beginPath();
  ctx.moveTo(r * 0.15, -r * 0.56);
  ctx.quadraticCurveTo(-r * 1.65, -r * 1.05 + flutter, -r * 3.9, -r * 0.85 + flutter * 1.4);
  ctx.quadraticCurveTo(-r * 2.1, -r * 0.08 + flutter2, r * 0.1, r * 0.46);
  ctx.closePath();
  ctx.fill();

  // 2) Crisp bright cyan ion tail streaming straighter toward -X
  const ionGrad = ctx.createLinearGradient(r * 0.3, 0, -r * 4.35, r * 0.18);
  ionGrad.addColorStop(0, 'rgba(240, 253, 255, 0.88)');
  ionGrad.addColorStop(0.25, 'rgba(125, 211, 252, 0.62)');
  ionGrad.addColorStop(0.62, 'rgba(56, 189, 248, 0.24)');
  ionGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
  ctx.fillStyle = ionGrad;
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -r * 0.34);
  ctx.quadraticCurveTo(-r * 1.85, -r * 0.26 - flutter2 * 0.6, -r * 4.35, r * 0.14 - flutter * 0.5);
  ctx.quadraticCurveTo(-r * 1.85, r * 0.34 + flutter2 * 0.5, r * 0.2, r * 0.34);
  ctx.closePath();
  ctx.fill();

  // Razor-bright inner cyan ion spine
  const spineGrad = ctx.createLinearGradient(r * 0.1, 0, -r * 3.0, 0);
  spineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  spineGrad.addColorStop(0.45, 'rgba(186, 230, 253, 0.45)');
  spineGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.strokeStyle = spineGrad;
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-r * 1.35, -flutter2 * 0.35, -r * 3.0, r * 0.08 - flutter * 0.3);
  ctx.stroke();

  // 3) Trailing ice sparkles drifting down the tails
  for (let i = 0; i < 8; i++) {
    const cycle = (time * 0.65 + ph * 0.3 + i * 0.125) % 1;
    const sx = -r * (0.55 + cycle * 2.95);
    const lane = i % 2 === 0 ? -1 : 1;
    const sy =
      lane * r * (0.14 + cycle * 0.42) * Math.sin(i * 1.9 + ph) -
      (i % 3 === 0 ? cycle * r * 0.38 : 0);
    const fade = Math.sin(cycle * Math.PI);
    const spSize = r * (0.09 + (i % 3) * 0.045) * fade;
    const col = i % 3 === 0 ? '#fef3c7' : '#e0f2fe';
    drawSparkle(ctx, sx, sy, spSize, fade * 0.85, col, time * 1.5 + i);
  }
  ctx.restore();

  // 4) Glowing frosty crystalline coma
  drawRadialGlow(ctx, 0, 0, r * 0.1, r * 1.48, [
    [0, 'rgba(255, 255, 255, 0.96)'],
    [0.32, 'rgba(224, 249, 255, 0.72)'],
    [0.62, 'rgba(56, 189, 248, 0.28)'],
    [1, 'rgba(14, 165, 233, 0)'],
  ]);

  // Crystalline faceted icy nucleus
  ctx.save();
  ctx.rotate(Math.sin(time * 1.4 + ph) * 0.12);
  const nucGrad = ctx.createRadialGradient(-r * 0.14, -r * 0.14, r * 0.04, 0, 0, r * 0.68);
  nucGrad.addColorStop(0, '#ffffff');
  nucGrad.addColorStop(0.5, '#cffafe');
  nucGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = nucGrad;
  ctx.beginPath();
  ctx.moveTo(r * 0.68, 0);
  ctx.lineTo(r * 0.24, -r * 0.54);
  ctx.lineTo(-r * 0.48, -r * 0.40);
  ctx.lineTo(-r * 0.64, 0.04 * r);
  ctx.lineTo(-r * 0.38, r * 0.48);
  ctx.lineTo(r * 0.32, r * 0.50);
  ctx.closePath();
  ctx.fill();

  // Crisp frost glint on the leading edge
  drawSparkle(ctx, r * 0.22, -r * 0.16, r * 0.44, 0.9, '#ffffff', 0.25);
  ctx.restore();
}

/* --------------------------------------------------------------------------
 * 3. MOON — Pearl-Silver Lunar Sphere with Maria & Craters
 * -------------------------------------------------------------------------- */

function drawMoon(ctx, r) {
  // Serene silver-blue lunar halo
  drawRadialGlow(ctx, -r * 0.1, -r * 0.1, r * 0.65, r * 1.42, [
    [0, 'rgba(226, 232, 240, 0.28)'],
    [0.65, 'rgba(186, 230, 253, 0.10)'],
    [1, 'rgba(186, 230, 253, 0)'],
  ]);

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TWO_PI);
  ctx.clip();

  // Pearl-silver sunlit sphere gradient
  const baseGrad = ctx.createRadialGradient(-r * 0.36, -r * 0.36, r * 0.08, 0, 0, r * 1.15);
  baseGrad.addColorStop(0, '#ffffff');
  baseGrad.addColorStop(0.32, '#eef2f7');
  baseGrad.addColorStop(0.68, '#cbd5e1');
  baseGrad.addColorStop(1, '#8494a8');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Subtle darker lunar maria patches
  ctx.fillStyle = 'rgba(100, 116, 139, 0.24)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.18, r * 0.36, r * 0.25, -0.45, 0, TWO_PI);
  ctx.fill();

  ctx.fillStyle = 'rgba(71, 85, 105, 0.22)';
  ctx.beginPath();
  ctx.ellipse(r * 0.22, -r * 0.26, r * 0.28, r * 0.21, 0.35, 0, TWO_PI);
  ctx.fill();

  ctx.fillStyle = 'rgba(100, 116, 139, 0.20)';
  ctx.beginPath();
  ctx.ellipse(r * 0.08, r * 0.26, r * 0.34, r * 0.22, -0.2, 0, TWO_PI);
  ctx.fill();

  ctx.fillStyle = 'rgba(71, 85, 105, 0.18)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.44, r * 0.32, r * 0.22, r * 0.16, 0.5, 0, TWO_PI);
  ctx.fill();

  // 5 crisp multi-sized craters with lit rims & shadowed interiors
  drawCrater(ctx, -r * 0.34, -r * 0.28, r * 0.19, 'rgba(198, 208, 220, 0.72)', 'rgba(71, 85, 105, 0.52)', 'rgba(255, 255, 255, 0.85)');
  drawCrater(ctx, r * 0.18, -r * 0.38, r * 0.13, 'rgba(186, 198, 212, 0.68)', 'rgba(71, 85, 105, 0.50)', 'rgba(255, 255, 255, 0.75)');
  drawCrater(ctx, -r * 0.08, r * 0.16, r * 0.22, 'rgba(182, 194, 208, 0.65)', 'rgba(51, 65, 85, 0.55)', 'rgba(248, 250, 252, 0.72)');
  drawCrater(ctx, r * 0.38, r * 0.08, r * 0.12, 'rgba(154, 168, 186, 0.60)', 'rgba(30, 41, 59, 0.58)', 'rgba(226, 232, 240, 0.52)');
  drawCrater(ctx, -r * 0.46, r * 0.24, r * 0.10, 'rgba(190, 200, 214, 0.65)', 'rgba(71, 85, 105, 0.50)', 'rgba(255, 255, 255, 0.72)');

  // Realistic soft crescent terminator shading
  drawShadowTerminator(ctx, r, 'rgba(12, 19, 36, 0.76)', 'rgba(30, 41, 68, 0.36)');

  // Delicate blue earthshine on the far night rim
  ctx.strokeStyle = 'rgba(148, 197, 255, 0.22)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0.15, Math.PI * 0.55);
  ctx.stroke();

  ctx.restore();

  // Crisp sunlit pearl limb arc
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.lineWidth = r * 0.032;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.99, Math.PI * 0.92, Math.PI * 1.62);
  ctx.stroke();
}

/* --------------------------------------------------------------------------
 * 4. PLANET — Lush Living Ocean-and-Forest World
 * -------------------------------------------------------------------------- */

function drawPlanet(ctx, r, ph, time) {
  // Soft atmospheric sky-blue outer rim glow
  drawRadialGlow(ctx, 0, 0, r * 0.78, r * 1.44, [
    [0, 'rgba(56, 189, 248, 0.42)'],
    [0.52, 'rgba(14, 165, 233, 0.18)'],
    [1, 'rgba(14, 165, 233, 0)'],
  ]);

  const drift = Math.sin(time * 0.22 + ph) * r * 0.08;

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TWO_PI);
  ctx.clip();

  // Deep cerulean ocean gradient
  const oceanGrad = ctx.createRadialGradient(-r * 0.38, -r * 0.36, r * 0.06, 0, 0, r * 1.18);
  oceanGrad.addColorStop(0, '#67e8f9');
  oceanGrad.addColorStop(0.28, '#22b8e8');
  oceanGrad.addColorStop(0.62, '#0369a1');
  oceanGrad.addColorStop(1, '#082f49');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Sculpted emerald-and-ochre continents
  ctx.save();
  ctx.translate(drift, 0);

  // Continent 1 (upper-left emerald landmass with warm ochre highlands)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(-r * 0.68, -r * 0.42);
  ctx.bezierCurveTo(-r * 0.48, -r * 0.72, -r * 0.02, -r * 0.62, r * 0.06, -r * 0.34);
  ctx.bezierCurveTo(r * 0.14, -r * 0.12, -r * 0.12, r * 0.08, -r * 0.32, r * 0.04);
  ctx.bezierCurveTo(-r * 0.54, 0, -r * 0.82, -r * 0.16, -r * 0.68, -r * 0.42);
  ctx.closePath();
  ctx.fill();

  // Warm ochre highland heart inside Continent 1
  ctx.fillStyle = 'rgba(234, 179, 8, 0.62)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.30, -r * 0.34, r * 0.18, r * 0.11, -0.35, 0, TWO_PI);
  ctx.fill();

  // Continent 2 (mid-right lush forest archipelago)
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(r * 0.18, -r * 0.18);
  ctx.bezierCurveTo(r * 0.48, -r * 0.36, r * 0.84, -r * 0.12, r * 0.76, r * 0.24);
  ctx.bezierCurveTo(r * 0.68, r * 0.52, r * 0.34, r * 0.48, r * 0.24, r * 0.22);
  ctx.bezierCurveTo(r * 0.14, r * 0.04, r * 0.04, -r * 0.08, r * 0.18, -r * 0.18);
  ctx.closePath();
  ctx.fill();

  // Ochre desert patch on Continent 2
  ctx.fillStyle = 'rgba(217, 119, 6, 0.52)';
  ctx.beginPath();
  ctx.ellipse(r * 0.48, r * 0.06, r * 0.15, r * 0.10, 0.4, 0, TWO_PI);
  ctx.fill();

  // Continent 3 (southern emerald isle)
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.moveTo(-r * 0.44, r * 0.36);
  ctx.bezierCurveTo(-r * 0.22, r * 0.24, r * 0.08, r * 0.38, -r * 0.02, r * 0.64);
  ctx.bezierCurveTo(-r * 0.14, r * 0.84, -r * 0.56, r * 0.76, -r * 0.54, r * 0.52);
  ctx.closePath();
  ctx.fill();

  // Subtle polar ice cap shimmer
  ctx.fillStyle = 'rgba(240, 249, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.92, r * 0.46, r * 0.16, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Delicate swirling translucent white cloud wisps (drifting slightly faster)
  ctx.save();
  ctx.translate(drift * 1.45, 0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.56)';
  ctx.lineCap = 'round';

  ctx.lineWidth = r * 0.10;
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, -r * 0.14);
  ctx.bezierCurveTo(-r * 0.44, -r * 0.28, r * 0.08, -r * 0.04, r * 0.46, -r * 0.18);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.44)';
  ctx.lineWidth = r * 0.085;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, r * 0.26);
  ctx.bezierCurveTo(-r * 0.04, r * 0.14, r * 0.36, r * 0.38, r * 0.82, r * 0.20);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.lineWidth = r * 0.065;
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, -r * 0.56);
  ctx.quadraticCurveTo(r * 0.24, -r * 0.64, r * 0.64, -r * 0.46);
  ctx.stroke();

  // Tiny swirling cloud eddy
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.lineWidth = r * 0.045;
  ctx.beginPath();
  ctx.arc(-r * 0.52, r * 0.12, r * 0.13, 0.2, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();

  // Inner atmospheric Fresnel sky-blue limb glow
  const limbGrad = ctx.createRadialGradient(0, 0, r * 0.66, 0, 0, r);
  limbGrad.addColorStop(0, 'rgba(125, 211, 252, 0)');
  limbGrad.addColorStop(0.75, 'rgba(125, 211, 252, 0.16)');
  limbGrad.addColorStop(1, 'rgba(186, 230, 253, 0.62)');
  ctx.fillStyle = limbGrad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Smooth night-side shadow terminator
  drawShadowTerminator(ctx, r, 'rgba(4, 12, 30, 0.78)', 'rgba(8, 28, 58, 0.38)');

  ctx.restore();
}

/* --------------------------------------------------------------------------
 * 5. RINGED — Majestic Saturn-Like Golden-Ochre Gas Giant
 * -------------------------------------------------------------------------- */

function drawRingBandHalf(ctx, r, isFront) {
  const startA = isFront ? 0 : Math.PI;
  const endA = isFront ? Math.PI : TWO_PI;

  ctx.save();
  ctx.scale(1, 0.33);

  // Outer icy-cream A-ring
  ctx.strokeStyle = isFront ? 'rgba(254, 243, 199, 0.52)' : 'rgba(254, 243, 199, 0.34)';
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.98, startA, endA);
  ctx.stroke();

  // Subtle dark Cassini division separator
  ctx.strokeStyle = 'rgba(24, 16, 10, 0.28)';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.84, startA, endA);
  ctx.stroke();

  // Broad luminous golden-ochre B-ring
  ctx.strokeStyle = isFront ? 'rgba(251, 191, 36, 0.72)' : 'rgba(245, 158, 11, 0.48)';
  ctx.lineWidth = r * 0.30;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.62, startA, endA);
  ctx.stroke();

  // Bright creamy inner sheen along the B-ring
  ctx.strokeStyle = isFront ? 'rgba(255, 251, 235, 0.62)' : 'rgba(255, 251, 235, 0.32)';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.54, startA, endA);
  ctx.stroke();

  // Delicate gossamer inner C-ring
  ctx.strokeStyle = isFront ? 'rgba(217, 119, 6, 0.30)' : 'rgba(180, 83, 9, 0.22)';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.32, startA, endA);
  ctx.stroke();

  // Shadow of the planet falling on the back-right ring arc
  if (!isFront) {
    ctx.strokeStyle = 'rgba(12, 8, 6, 0.56)';
    ctx.lineWidth = r * 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.66, Math.PI * 1.62, Math.PI * 1.96);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRinged(ctx, r, ph, time) {
  const tilt = -0.34 + Math.sin(time * 0.6 + ph) * 0.03;

  // Warm amber atmospheric halo
  drawRadialGlow(ctx, 0, 0, r * 0.5, r * 1.55, [
    [0, 'rgba(251, 191, 36, 0.26)'],
    [0.65, 'rgba(217, 119, 6, 0.10)'],
    [1, 'rgba(217, 119, 6, 0)'],
  ]);

  ctx.save();
  ctx.rotate(tilt);

  // 1) Back half of the rings (behind the planet)
  drawRingBandHalf(ctx, r, false);

  // 2) Banded atmospheric gas-giant sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TWO_PI);
  ctx.clip();

  const gasGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.38, r * 0.08, 0, 0, r * 1.15);
  gasGrad.addColorStop(0, '#fffbeb');
  gasGrad.addColorStop(0.32, '#fde68a');
  gasGrad.addColorStop(0.68, '#d97706');
  gasGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = gasGrad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Layered cream, ochre, and terracotta cloud stripes
  const bands = [
    { y: -0.68, h: 0.16, col: 'rgba(194, 65, 12, 0.34)' },
    { y: -0.44, h: 0.14, col: 'rgba(255, 251, 235, 0.44)' },
    { y: -0.22, h: 0.18, col: 'rgba(217, 119, 6, 0.40)' },
    { y: 0.02, h: 0.16, col: 'rgba(254, 243, 199, 0.50)' },
    { y: 0.24, h: 0.18, col: 'rgba(180, 83, 9, 0.44)' },
    { y: 0.48, h: 0.15, col: 'rgba(253, 230, 138, 0.34)' },
    { y: 0.68, h: 0.18, col: 'rgba(154, 52, 18, 0.42)' },
  ];
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    ctx.fillStyle = b.col;
    ctx.fillRect(-r * 1.1, b.y * r, r * 2.2, b.h * r);
  }

  // Subtle swirling storm oval in the southern ochre belt
  ctx.fillStyle = 'rgba(254, 215, 170, 0.52)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.26, r * 0.31, r * 0.17, r * 0.08, -0.06, 0, TWO_PI);
  ctx.fill();

  // Subtle ring shadow cast across the planet's face
  ctx.strokeStyle = 'rgba(28, 14, 6, 0.26)';
  ctx.lineWidth = r * 0.10;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.10, r * 1.25, r * 0.26, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Smooth night-side shadow terminator
  drawShadowTerminator(ctx, r, 'rgba(20, 10, 6, 0.72)', 'rgba(69, 26, 3, 0.34)');

  ctx.restore();

  // 3) Front half of the rings overlapping cleanly across the planet's face
  drawRingBandHalf(ctx, r, true);

  ctx.restore();
}

/* --------------------------------------------------------------------------
 * 6. STAR — Radiant Golden-White Miniature Sun
 * -------------------------------------------------------------------------- */

function drawStar(ctx, r, ph, time) {
  const pulse = 1 + Math.sin(time * 3.0 + ph) * 0.06;
  const diagPulse = 1 + Math.cos(time * 3.8 + ph * 1.4) * 0.08;

  // Wide soft warm corona glow
  drawRadialGlow(ctx, 0, 0, r * 0.2, r * 2.25 * pulse, [
    [0, 'rgba(255, 255, 255, 0.90)'],
    [0.24, 'rgba(254, 240, 138, 0.56)'],
    [0.52, 'rgba(251, 146, 60, 0.22)'],
    [0.78, 'rgba(251, 113, 133, 0.09)'],
    [1, 'rgba(251, 113, 133, 0)'],
  ]);

  // 4-point diagonal diffraction light spikes (warm gold-coral)
  ctx.save();
  ctx.rotate(Math.PI * 0.25);
  const diagLen = r * 1.52 * diagPulse;
  const diagGrad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, diagLen);
  diagGrad.addColorStop(0, 'rgba(255, 251, 235, 0.85)');
  diagGrad.addColorStop(0.45, 'rgba(253, 224, 71, 0.45)');
  diagGrad.addColorStop(1, 'rgba(251, 113, 133, 0)');
  drawSparkle(ctx, 0, 0, diagLen, 0.85, diagGrad, 0);
  ctx.restore();

  // 4-point primary diffraction light spikes (incandescent white-gold)
  const priLen = r * 2.15 * pulse;
  const priGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, priLen);
  priGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  priGrad.addColorStop(0.38, 'rgba(254, 240, 138, 0.64)');
  priGrad.addColorStop(0.76, 'rgba(251, 191, 36, 0.18)');
  priGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  drawSparkle(ctx, 0, 0, priLen, 0.95, priGrad, 0);

  // Boiling bright plasma core (white-hot center -> sunlit gold -> coral rim)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, TWO_PI);
  ctx.clip();

  const coreGrad = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r * 0.98);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.36, '#fef9c3');
  coreGrad.addColorStop(0.68, '#facc15');
  coreGrad.addColorStop(0.88, '#fb923c');
  coreGrad.addColorStop(1, '#fb7185');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Subtle boiling solar granulation eddies
  for (let i = 0; i < 4; i++) {
    const a = time * 0.65 + ph + (i * TWO_PI) / 4;
    const gx = Math.cos(a) * r * 0.36;
    const gy = Math.sin(a) * r * 0.36;
    drawRadialGlow(ctx, gx, gy, 0, r * 0.34, [
      [0, 'rgba(255, 255, 255, 0.42)'],
      [1, 'rgba(254, 240, 138, 0)'],
    ]);
  }
  ctx.restore();
}

/* --------------------------------------------------------------------------
 * 7. NEBULA — Dreamy Multi-Layered Cosmic Gas Cloud + Newborn Stars
 * -------------------------------------------------------------------------- */

function drawNebula(ctx, r, ph, time) {
  const drift1 = Math.sin(time * 0.55 + ph) * r * 0.10;
  const drift2 = Math.cos(time * 0.48 + ph * 1.3) * r * 0.10;
  const breathe = 1 + Math.sin(time * 0.9 + ph) * 0.05;

  // Deep outer rose-violet cosmic veil
  drawRadialGlow(ctx, drift1 * 0.4, drift2 * 0.4, r * 0.1, r * 1.58 * breathe, [
    [0, 'rgba(244, 114, 182, 0.34)'],
    [0.52, 'rgba(192, 132, 252, 0.18)'],
    [1, 'rgba(139, 92, 246, 0)'],
  ]);

  // Billowing turquoise-cyan upper-left cloud lobe
  drawRadialGlow(ctx, -r * 0.44 + drift1, -r * 0.28 - drift2 * 0.6, r * 0.06, r * 1.05, [
    [0, 'rgba(94, 234, 212, 0.52)'],
    [0.48, 'rgba(56, 189, 248, 0.26)'],
    [1, 'rgba(56, 189, 248, 0)'],
  ]);

  // Luminous rose-pink right cloud lobe
  drawRadialGlow(ctx, r * 0.42 - drift2 * 0.7, r * 0.24 + drift1 * 0.8, r * 0.06, r * 1.08, [
    [0, 'rgba(249, 168, 212, 0.56)'],
    [0.46, 'rgba(236, 72, 153, 0.28)'],
    [1, 'rgba(236, 72, 153, 0)'],
  ]);

  // Lower-left turquoise wisp
  drawRadialGlow(ctx, -r * 0.26 - drift2 * 0.5, r * 0.46 + drift1 * 0.4, r * 0.04, r * 0.82, [
    [0, 'rgba(45, 212, 191, 0.42)'],
    [0.55, 'rgba(14, 165, 233, 0.16)'],
    [1, 'rgba(14, 165, 233, 0)'],
  ]);

  // Warm stardust-gold luminous core filament
  drawRadialGlow(ctx, drift1 * 0.35, -drift2 * 0.35, r * 0.04, r * 0.86 * breathe, [
    [0, 'rgba(255, 251, 235, 0.68)'],
    [0.36, 'rgba(253, 224, 71, 0.42)'],
    [0.72, 'rgba(251, 146, 60, 0.16)'],
    [1, 'rgba(251, 146, 60, 0)'],
  ]);

  // Ethereal sweeping translucent gas ribbons
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.22)';
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, r * 0.22 + drift1 * 0.5);
  ctx.bezierCurveTo(-r * 0.32, -r * 0.48, r * 0.28, r * 0.44, r * 0.94, -r * 0.18 + drift2 * 0.5);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(153, 246, 228, 0.20)';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(-r * 0.76, -r * 0.42 + drift2 * 0.4);
  ctx.bezierCurveTo(-r * 0.10, r * 0.28, r * 0.36, -r * 0.44, r * 0.82, r * 0.36);
  ctx.stroke();
  ctx.restore();

  // 7 tiny twinkling newborn diamond stars nestled inside
  const stars = [
    { x: -0.46, y: -0.26, s: 0.17, col: '#ffffff', spd: 2.9 },
    { x: 0.38, y: -0.34, s: 0.14, col: '#fef08a', spd: 3.4 },
    { x: 0.04, y: -0.04, s: 0.22, col: '#ffffff', spd: 2.5 },
    { x: -0.24, y: 0.36, s: 0.15, col: '#cffafe', spd: 3.8 },
    { x: 0.48, y: 0.24, s: 0.16, col: '#fbcfe8', spd: 3.1 },
    { x: -0.64, y: 0.14, s: 0.12, col: '#fef3c7', spd: 4.2 },
    { x: 0.18, y: 0.54, s: 0.13, col: '#e0f2fe', spd: 3.6 },
  ];

  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    const tw = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(time * st.spd + ph + i * 1.7));
    const sx = st.x * r + drift1 * 0.25;
    const sy = st.y * r + drift2 * 0.25;
    drawRadialGlow(ctx, sx, sy, 0, r * st.s * 1.25, [
      [0, 'rgba(255, 255, 255, 0.55)'],
      [1, 'rgba(255, 255, 255, 0)'],
    ]);
    drawSparkle(ctx, sx, sy, r * st.s * (0.8 + 0.3 * tw), tw, st.col, 0);
  }
}

/* --------------------------------------------------------------------------
 * 8. SOLAR — Miniature Living Solar System
 * -------------------------------------------------------------------------- */

function drawSolar(ctx, r, ph, time) {
  // Subtle ambient stellar aura
  drawRadialGlow(ctx, 0, 0, r * 0.1, r * 1.38, [
    [0, 'rgba(254, 240, 138, 0.28)'],
    [0.45, 'rgba(147, 197, 253, 0.10)'],
    [1, 'rgba(147, 197, 253, 0)'],
  ]);

  const orbits = [
    { rad: r * 0.50, speed: 1.85, offset: ph * 1.1, kind: 'coral' },
    { rad: r * 0.80, speed: 1.08, offset: ph * 2.3 + 2.1, kind: 'blue' },
    { rad: r * 1.12, speed: 0.62, offset: ph * 0.7 + 4.2, kind: 'ringed' },
  ];

  // 3 delicate translucent orbital rings
  ctx.save();
  for (let i = 0; i < orbits.length; i++) {
    const o = orbits[i];
    ctx.strokeStyle = i === 1 ? 'rgba(186, 230, 253, 0.30)' : 'rgba(254, 243, 199, 0.24)';
    ctx.lineWidth = r * 0.022;
    ctx.beginPath();
    ctx.arc(0, 0, o.rad, 0, TWO_PI);
    ctx.stroke();

    // Subtle trailing orbital wake arc behind each planet
    const a = time * o.speed + o.offset;
    ctx.strokeStyle = i === 0
      ? 'rgba(251, 113, 133, 0.42)'
      : i === 1
        ? 'rgba(56, 189, 248, 0.44)'
        : 'rgba(251, 191, 36, 0.38)';
    ctx.lineWidth = r * 0.032;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, o.rad, a - 0.55, a);
    ctx.stroke();
  }
  ctx.restore();

  // Radiant golden sun at the center
  const sunPulse = 1 + Math.sin(time * 3.4 + ph) * 0.05;
  drawRadialGlow(ctx, 0, 0, r * 0.04, r * 0.52 * sunPulse, [
    [0, 'rgba(255, 255, 255, 0.96)'],
    [0.36, 'rgba(254, 240, 138, 0.68)'],
    [0.72, 'rgba(251, 146, 60, 0.22)'],
    [1, 'rgba(251, 146, 60, 0)'],
  ]);
  drawSparkle(ctx, 0, 0, r * 0.42 * sunPulse, 0.82, '#fffbeb', 0);

  const sunGrad = ctx.createRadialGradient(-r * 0.05, -r * 0.05, r * 0.02, 0, 0, r * 0.24);
  sunGrad.addColorStop(0, '#ffffff');
  sunGrad.addColorStop(0.55, '#fde047');
  sunGrad.addColorStop(1, '#f97316');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, TWO_PI);
  ctx.fill();

  // 3 tiny distinct orbiting planets
  for (let i = 0; i < orbits.length; i++) {
    const o = orbits[i];
    const a = time * o.speed + o.offset;
    const px = Math.cos(a) * o.rad;
    const py = Math.sin(a) * o.rad;

    ctx.save();
    ctx.translate(px, py);

    if (o.kind === 'coral') {
      const pr = r * 0.095;
      drawRadialGlow(ctx, 0, 0, 0, pr * 1.9, [
        [0, 'rgba(251, 113, 133, 0.45)'],
        [1, 'rgba(251, 113, 133, 0)'],
      ]);
      const g = ctx.createRadialGradient(-pr * 0.3, -pr * 0.3, pr * 0.1, 0, 0, pr);
      g.addColorStop(0, '#fecdd3');
      g.addColorStop(0.5, '#fb7185');
      g.addColorStop(1, '#9f1239');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TWO_PI);
      ctx.fill();
    } else if (o.kind === 'blue') {
      const pr = r * 0.125;
      drawRadialGlow(ctx, 0, 0, 0, pr * 2.0, [
        [0, 'rgba(56, 189, 248, 0.50)'],
        [1, 'rgba(56, 189, 248, 0)'],
      ]);
      const g = ctx.createRadialGradient(-pr * 0.3, -pr * 0.3, pr * 0.1, 0, 0, pr);
      g.addColorStop(0, '#e0f2fe');
      g.addColorStop(0.45, '#38bdf8');
      g.addColorStop(1, '#075985');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TWO_PI);
      ctx.fill();

      // Tiny bright cloud speck
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(-pr * 0.15, -pr * 0.18, pr * 0.42, pr * 0.18, -0.3, 0, TWO_PI);
      ctx.fill();
    } else {
      // Tiny ringed ochre dot
      const pr = r * 0.135;
      ctx.rotate(-0.42);
      // Back mini ring
      ctx.save();
      ctx.scale(1, 0.36);
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.65)';
      ctx.lineWidth = pr * 0.42;
      ctx.beginPath();
      ctx.arc(0, 0, pr * 1.85, Math.PI, TWO_PI);
      ctx.stroke();
      ctx.restore();

      // Mini ochre planet body
      const g = ctx.createRadialGradient(-pr * 0.3, -pr * 0.3, pr * 0.1, 0, 0, pr);
      g.addColorStop(0, '#fef3c7');
      g.addColorStop(0.55, '#f59e0b');
      g.addColorStop(1, '#92400e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TWO_PI);
      ctx.fill();

      // Front mini ring
      ctx.save();
      ctx.scale(1, 0.36);
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.85)';
      ctx.lineWidth = pr * 0.42;
      ctx.beginPath();
      ctx.arc(0, 0, pr * 1.85, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
 * 9. BLACKHOLE — Gargantua-Style Relativistic Accretion Disk & Photon Ring
 * -------------------------------------------------------------------------- */

function drawBlackHole(ctx, r, ph, time) {
  const ehR = r * 0.56; // Event horizon radius
  const tilt = -0.26;
  const swirl = time * 1.9 + ph;

  // Wide moody amber-crimson gravitational aura
  drawRadialGlow(ctx, 0, 0, ehR * 0.9, r * 2.25, [
    [0, 'rgba(251, 146, 60, 0.38)'],
    [0.42, 'rgba(234, 88, 12, 0.16)'],
    [0.74, 'rgba(154, 52, 18, 0.06)'],
    [1, 'rgba(154, 52, 18, 0)'],
  ]);

  ctx.save();
  ctx.rotate(tilt);

  // 1) Relativistic Einstein lensing arches (upper & lower bent disk image)
  ctx.save();
  ctx.scale(1, 0.94);
  const archGrad = ctx.createRadialGradient(0, 0, ehR * 0.96, 0, 0, ehR * 1.56);
  archGrad.addColorStop(0, 'rgba(255, 251, 235, 0.90)');
  archGrad.addColorStop(0.28, 'rgba(251, 191, 36, 0.65)');
  archGrad.addColorStop(0.68, 'rgba(234, 88, 12, 0.28)');
  archGrad.addColorStop(1, 'rgba(154, 52, 18, 0)');
  ctx.fillStyle = archGrad;
  ctx.beginPath();
  ctx.arc(0, -ehR * 0.06, ehR * 1.54, Math.PI, TWO_PI);
  ctx.fill();

  // Softer lower gravitational lensing arc
  ctx.globalAlpha *= 0.62;
  ctx.beginPath();
  ctx.arc(0, ehR * 0.06, ehR * 1.38, 0, Math.PI);
  ctx.fill();
  ctx.restore();

  // 2) Back half of the wide swirling amber-orange accretion disk
  ctx.save();
  ctx.scale(1, 0.28);

  // Outer fiery amber disk
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.44)';
  ctx.lineWidth = r * 0.72;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.64, Math.PI, TWO_PI);
  ctx.stroke();

  // Mid bright orange-gold plasma stream
  ctx.strokeStyle = 'rgba(251, 146, 60, 0.62)';
  ctx.lineWidth = r * 0.36;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.38, Math.PI, TWO_PI);
  ctx.stroke();

  // Inner hot golden filament
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.12, Math.PI, TWO_PI);
  ctx.stroke();
  ctx.restore();

  // 3) Pure pitch-black circular event horizon
  ctx.fillStyle = '#020205';
  ctx.beginPath();
  ctx.arc(0, 0, ehR, 0, TWO_PI);
  ctx.fill();

  // 4) Razor-thin blazing white-gold photon ring hugging the event horizon
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.62)';
  ctx.lineWidth = r * 0.085;
  ctx.beginPath();
  ctx.arc(0, 0, ehR * 1.04, 0, TWO_PI);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 253, 240, 0.96)';
  ctx.lineWidth = r * 0.032;
  ctx.beginPath();
  ctx.arc(0, 0, ehR * 1.02, 0, TWO_PI);
  ctx.stroke();

  // 5) Front luminous lensing arc & swirling accretion disk sweeping across the front
  ctx.save();
  ctx.scale(1, 0.28);

  // Outer deep fiery orange front sweep
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.56)';
  ctx.lineWidth = r * 0.68;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.62, 0.04, Math.PI - 0.04);
  ctx.stroke();

  // Mid glowing amber-gold plasma band
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.80)';
  ctx.lineWidth = r * 0.34;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.36, 0.06, Math.PI - 0.06);
  ctx.stroke();

  // Blazing white-gold inner lensing filament
  ctx.strokeStyle = 'rgba(255, 251, 235, 0.95)';
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.12, 0.08, Math.PI - 0.08);
  ctx.stroke();

  // Animated swirling plasma streaks moving along the front disk
  for (let i = 0; i < 3; i++) {
    const tArc = ((swirl * 0.35 + i * 0.33) % 1);
    const a0 = 0.12 + tArc * (Math.PI - 0.68);
    const a1 = a0 + 0.44;
    const bandR = r * (1.18 + i * 0.22);
    const fade = Math.sin(tArc * Math.PI);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.55 * fade).toFixed(3)})`;
    ctx.lineWidth = r * (0.055 - i * 0.01);
    ctx.beginPath();
    ctx.arc(0, 0, bandR, a0, a1);
    ctx.stroke();
  }
  ctx.restore();

  // Subtle Doppler-beaming bright flare on the approaching (-X) limb
  drawRadialGlow(ctx, -ehR * 1.35, 0, 0, r * 0.58, [
    [0, 'rgba(255, 253, 240, 0.58)'],
    [0.45, 'rgba(251, 191, 36, 0.22)'],
    [1, 'rgba(251, 146, 60, 0)'],
  ]);

  ctx.restore();
}

/* --------------------------------------------------------------------------
 * 10. GALAXY — Breathtaking 4-Arm Rotating Spiral Galaxy
 * -------------------------------------------------------------------------- */

function drawGalaxy(ctx, r, ph, time) {
  ctx.save();
  // Slight cosmic inclination for 3D majesty + gentle rotation with time
  ctx.scale(1, 0.84);
  ctx.rotate(time * 0.22 + ph);

  // Expansive translucent sapphire-indigo galactic halo
  drawRadialGlow(ctx, 0, 0, r * 0.1, r * 1.62, [
    [0, 'rgba(254, 240, 138, 0.30)'],
    [0.36, 'rgba(56, 189, 248, 0.18)'],
    [0.70, 'rgba(99, 102, 241, 0.08)'],
    [1, 'rgba(56, 189, 248, 0)'],
  ]);

  // 4 sweeping logarithmic spiral arms made of layered sapphire / cyan / rose dust bands
  const numArms = 4;
  const steps = 16;
  const maxSweep = Math.PI * 1.38;

  for (let arm = 0; arm < numArms; arm++) {
    const baseA = (arm / numArms) * TWO_PI;
    const isPrimary = arm % 2 === 0;

    // Precompute spine points along the logarithmic spiral
    const pts = [];
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const rad = r * (0.14 + 1.28 * Math.pow(u, 1.12));
      const ang = baseA + u * maxSweep;
      pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad, u]);
    }

    // Draw layered dust bands (wide sapphire -> mid cyan -> rose nebula knots -> warm inner spine)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Layer A: wide outer sapphire dust veil
    for (let s = 0; s < steps; s++) {
      const p0 = pts[s];
      const p1 = pts[s + 1];
      const u = (p0[2] + p1[2]) * 0.5;
      const alpha = (isPrimary ? 0.22 : 0.16) * (1 - u * 0.72);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
      ctx.lineWidth = r * (0.34 - u * 0.18);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
    }

    // Layer B: luminous cyan-ice mid ribbon
    for (let s = 0; s < steps; s++) {
      const p0 = pts[s];
      const p1 = pts[s + 1];
      const u = (p0[2] + p1[2]) * 0.5;
      const alpha = (isPrimary ? 0.34 : 0.24) * (1 - u * 0.65);
      ctx.strokeStyle = `rgba(186, 230, 253, ${alpha.toFixed(3)})`;
      ctx.lineWidth = r * (0.16 - u * 0.09);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
    }

    // Layer C: rose-pink star-forming dust pockets along mid-arm
    for (let k = 0; k < 2; k++) {
      const idx = k === 0 ? 6 : 11;
      const pt = pts[idx];
      drawRadialGlow(ctx, pt[0], pt[1], 0, r * (0.24 - k * 0.06), [
        [0, 'rgba(244, 114, 182, 0.34)'],
        [1, 'rgba(244, 114, 182, 0)'],
      ]);
    }

    // Layer D: warm golden-cream inner arm bridge feeding into the bulge
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.38)';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let s = 1; s <= 5; s++) {
      ctx.lineTo(pts[s][0], pts[s][1]);
    }
    ctx.stroke();
  }

  // Warm luminous golden-white galactic bulge
  drawRadialGlow(ctx, 0, 0, r * 0.02, r * 0.64, [
    [0, '#ffffff'],
    [0.24, 'rgba(255, 251, 235, 0.94)'],
    [0.48, 'rgba(254, 240, 138, 0.66)'],
    [0.74, 'rgba(251, 191, 36, 0.24)'],
    [1, 'rgba(251, 191, 36, 0)'],
  ]);

  // Subtle elongated golden core bar
  ctx.save();
  ctx.scale(1.45, 0.72);
  drawRadialGlow(ctx, 0, 0, 0, r * 0.30, [
    [0, 'rgba(255, 255, 255, 0.85)'],
    [0.55, 'rgba(254, 243, 199, 0.35)'],
    [1, 'rgba(254, 243, 199, 0)'],
  ]);
  ctx.restore();

  // 24 twinkling pinpoint stars dotted along the 4 spiral arms (6 per arm)
  const starColors = ['#ffffff', '#e0f2fe', '#fef08a', '#fbcfe8'];
  for (let i = 0; i < 24; i++) {
    const arm = i % numArms;
    const slot = Math.floor(i / numArms); // 0..5
    const u = 0.18 + slot * 0.145 + ((i * 19) % 7) * 0.008;
    const spread = (Math.sin(i * 4.7 + ph) * 0.09) * r;
    const ang = (arm / numArms) * TWO_PI + u * maxSweep;
    const rad = r * (0.14 + 1.28 * Math.pow(u, 1.12)) + spread;
    const sx = Math.cos(ang) * rad;
    const sy = Math.sin(ang) * rad;

    const tw = 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(time * (2.6 + (i % 5) * 0.65) + ph + i * 1.4));
    const col = starColors[i % starColors.length];

    if (i % 4 === 0) {
      // Brighter jewel star with crisp 4-point diamond twinkle
      drawSparkle(ctx, sx, sy, r * (0.09 + 0.03 * tw), tw, col, 0);
    } else {
      ctx.save();
      ctx.globalAlpha *= tw;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(sx, sy, r * (0.026 + (i % 3) * 0.011), 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

/* --------------------------------------------------------------------------
 * Public Entry Point
 * -------------------------------------------------------------------------- */

export function drawCosmicSkin(ctx, kind, r, ph, time, color, accent) {
  switch (kind) {
    case 'asteroid':
      drawAsteroid(ctx, r, ph, color, accent);
      return true;
    case 'comet':
      drawComet(ctx, r, ph, time, color, accent);
      return true;
    case 'moon':
      drawMoon(ctx, r, ph, color, accent);
      return true;
    case 'planet':
      drawPlanet(ctx, r, ph, time, color, accent);
      return true;
    case 'ringed':
      drawRinged(ctx, r, ph, time, color, accent);
      return true;
    case 'star':
      drawStar(ctx, r, ph, time, color, accent);
      return true;
    case 'nebula':
      drawNebula(ctx, r, ph, time, color, accent);
      return true;
    case 'solar':
      drawSolar(ctx, r, ph, time, color, accent);
      return true;
    case 'blackhole':
      drawBlackHole(ctx, r, ph, time, color, accent);
      return true;
    case 'galaxy':
      drawGalaxy(ctx, r, ph, time, color, accent);
      return true;
    default:
      return false;
  }
}

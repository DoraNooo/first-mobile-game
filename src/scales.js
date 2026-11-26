/**
 * GLOO — Scale definitions, bioluminescent palettes, and species catalog.
 *
 * Logarithmic progression:
 *   BASE_SIZE = 10
 *   Each scale spans a 4x radius factor (progress 0..6 => size 10 .. 10 * 4^6 = 40960).
 */

export const BASE_SIZE = 10;
export const SCALE_FACTOR = 4;
export const NUM_SCALES = 6;
export const MAX_SIZE = BASE_SIZE * Math.pow(SCALE_FACTOR, NUM_SCALES); // 40960

export const SCALES = [
  {
    id: 'quantum',
    index: 0,
    roman: 'I',
    name: 'Quantique',
    poeticTitle: "L'Infiniment Petit",
    unitSubtitle: '10⁻¹⁰ m · Monde Quantique',
    bgInner: [14, 39, 51],
    bgOuter: [6, 17, 25],
    moteColor: [110, 231, 218],
    blobCore: [255, 168, 112],
    blobEdge: [255, 102, 102],
    blobGlow: [255, 148, 102],
    musicRoot: 261.63, // C4
    species: [
      { kind: 'quark', name: 'Quark', relSize: 0.36, speed: 1.15, color: '#67e8f9', accent: '#cffafe', behavior: 'orbit' },
      { kind: 'electron', name: 'Électron', relSize: 0.55, speed: 1.35, color: '#5eead4', accent: '#f0fdfa', behavior: 'dart' },
      { kind: 'photon', name: 'Photon', relSize: 0.78, speed: 1.45, color: '#fde68a', accent: '#fffbeb', behavior: 'glide' },
      { kind: 'atom', name: 'Atome', relSize: 1.15, speed: 0.85, color: '#7dd3fc', accent: '#bae6fd', behavior: 'roam' },
      { kind: 'molecule', name: 'Molécule', relSize: 1.65, speed: 0.72, color: '#fda4af', accent: '#ffe4e6', behavior: 'predator' },
    ],
  },
  {
    id: 'micro',
    index: 1,
    roman: 'II',
    name: 'Microscopique',
    poeticTitle: "La Goutte d'Eau",
    unitSubtitle: '10⁻⁶ m · Monde Microscopique',
    bgInner: [13, 52, 56],
    bgOuter: [5, 24, 30],
    moteColor: [134, 239, 172],
    blobCore: [255, 186, 118],
    blobEdge: [244, 114, 104],
    blobGlow: [255, 160, 110],
    musicRoot: 293.66, // D4
    species: [
      { kind: 'spore', name: 'Spore', relSize: 0.38, speed: 0.8, color: '#86efac', accent: '#dcfce7', behavior: 'drift' },
      { kind: 'bacteria', name: 'Bactérie', relSize: 0.58, speed: 1.25, color: '#5eead4', accent: '#ccfbf1', behavior: 'wiggle' },
      { kind: 'amoeba', name: 'Amibe', relSize: 0.84, speed: 0.9, color: '#a7f3d0', accent: '#ecfdf5', behavior: 'roam' },
      { kind: 'diatom', name: 'Diatomée', relSize: 1.18, speed: 0.75, color: '#fcd34d', accent: '#fef3c7', behavior: 'glide' },
      { kind: 'tardigrade', name: 'Tardigrade', relSize: 1.7, speed: 0.82, color: '#fb923c', accent: '#ffedd5', behavior: 'predator' },
    ],
  },
  {
    id: 'forest',
    index: 2,
    roman: 'III',
    name: 'Sous-Bois',
    poeticTitle: 'La Rosée Nocturne',
    unitSubtitle: '10⁻² m · Monde du Sous-Bois',
    bgInner: [21, 52, 39],
    bgOuter: [8, 25, 20],
    moteColor: [253, 224, 130],
    blobCore: [255, 198, 122],
    blobEdge: [239, 108, 87],
    blobGlow: [255, 174, 108],
    musicRoot: 220.0, // A3
    species: [
      { kind: 'ant', name: 'Fourmi', relSize: 0.36, speed: 1.05, color: '#d97706', accent: '#fde68a', behavior: 'roam' },
      { kind: 'firefly', name: 'Luciole', relSize: 0.56, speed: 1.35, color: '#fde047', accent: '#fef9c3', behavior: 'dart' },
      { kind: 'ladybug', name: 'Coccinelle', relSize: 0.82, speed: 1.0, color: '#ef4444', accent: '#fee2e2', behavior: 'roam' },
      { kind: 'moth', name: 'Papillon de nuit', relSize: 1.2, speed: 1.1, color: '#f59e0b', accent: '#fef3c7', behavior: 'glide' },
      { kind: 'frog', name: 'Grenouille', relSize: 1.72, speed: 0.95, color: '#22c55e', accent: '#bbf7d0', behavior: 'predator' },
    ],
  },
  {
    id: 'city',
    index: 3,
    roman: 'IV',
    name: 'Nocturne',
    poeticTitle: 'La Ville Endormie',
    unitSubtitle: '10¹ m · Monde Terrestre',
    bgInner: [24, 41, 63],
    bgOuter: [10, 19, 34],
    moteColor: [251, 191, 120],
    blobCore: [255, 180, 125],
    blobEdge: [242, 97, 107],
    blobGlow: [255, 152, 118],
    musicRoot: 196.0, // G3
    species: [
      { kind: 'lantern', name: 'Lanterne céleste', relSize: 0.38, speed: 0.65, color: '#fdba74', accent: '#ffedd5', behavior: 'drift' },
      { kind: 'owl', name: 'Chouette nocturne', relSize: 0.6, speed: 1.15, color: '#c08457', accent: '#fef08a', behavior: 'glide' },
      { kind: 'car', name: 'Voiture', relSize: 0.88, speed: 1.3, color: '#60a5fa', accent: '#fef08a', behavior: 'glide' },
      { kind: 'helicopter', name: 'Hélicoptère', relSize: 1.24, speed: 1.05, color: '#38bdf8', accent: '#fef3c7', behavior: 'roam' },
      { kind: 'blimp', name: 'Dirigeable', relSize: 1.75, speed: 0.72, color: '#f87171', accent: '#fde68a', behavior: 'predator' },
    ],
  },
  {
    id: 'planetary',
    index: 4,
    roman: 'V',
    name: 'Planétaire',
    poeticTitle: 'Le Ballet Orbital',
    unitSubtitle: '10⁷ m · Monde Planétaire',
    bgInner: [16, 30, 52],
    bgOuter: [5, 10, 20],
    moteColor: [186, 230, 253],
    blobCore: [255, 194, 138],
    blobEdge: [236, 98, 118],
    blobGlow: [255, 162, 128],
    musicRoot: 174.61, // F3
    species: [
      { kind: 'asteroid', name: 'Astéroïde', relSize: 0.38, speed: 0.9, color: '#cbd5e1', accent: '#f1f5f9', behavior: 'orbit' },
      { kind: 'comet', name: 'Comète', relSize: 0.6, speed: 1.5, color: '#7dd3fc', accent: '#e0f2fe', behavior: 'dart' },
      { kind: 'moon', name: 'Lune', relSize: 0.86, speed: 0.75, color: '#e2e8f0', accent: '#ffffff', behavior: 'orbit' },
      { kind: 'planet', name: 'Planète', relSize: 1.25, speed: 0.65, color: '#38bdf8', accent: '#bae6fd', behavior: 'roam' },
      { kind: 'ringed', name: 'Géante à anneaux', relSize: 1.78, speed: 0.62, color: '#fbbf24', accent: '#fef3c7', behavior: 'predator' },
    ],
  },
  {
    id: 'cosmic',
    index: 5,
    roman: 'VI',
    name: 'Cosmique',
    poeticTitle: "L'Infiniment Grand",
    unitSubtitle: '10²¹ m · Monde Cosmique',
    bgInner: [15, 29, 44],
    bgOuter: [4, 7, 15],
    moteColor: [254, 240, 199],
    blobCore: [255, 224, 156],
    blobEdge: [244, 114, 126],
    blobGlow: [255, 200, 144],
    musicRoot: 130.81, // C3
    species: [
      { kind: 'star', name: 'Étoile naine', relSize: 0.38, speed: 0.85, color: '#fef08a', accent: '#ffffff', behavior: 'orbit' },
      { kind: 'nebula', name: 'Nébuleuse', relSize: 0.62, speed: 0.7, color: '#f9a8d4', accent: '#fbcfe8', behavior: 'drift' },
      { kind: 'solar', name: 'Système solaire', relSize: 0.9, speed: 0.78, color: '#fcd34d', accent: '#93c5fd', behavior: 'roam' },
      { kind: 'blackhole', name: 'Trou noir', relSize: 1.28, speed: 0.72, color: '#fb923c', accent: '#fed7aa', behavior: 'predator' },
      { kind: 'galaxy', name: 'Galaxie spirale', relSize: 1.8, speed: 0.58, color: '#7dd3fc', accent: '#fde68a', behavior: 'predator' },
    ],
  },
];

/**
 * Convert world size (10 .. 40960) to continuous scale progress (0 .. 6).
 */
export function sizeToProgress(size) {
  const ratio = Math.max(1, size / BASE_SIZE);
  return Math.log(ratio) / Math.log(SCALE_FACTOR);
}

/**
 * Convert scale index (0..5) to its starting world size.
 */
export function scaleIndexToStartSize(index) {
  return BASE_SIZE * Math.pow(SCALE_FACTOR, Math.max(0, Math.min(NUM_SCALES - 1, index)));
}

/**
 * Linearly interpolate between two RGB arrays.
 */
export function lerpRGB(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function rgbString(rgb, alpha = 1) {
  return alpha < 1
    ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
    : `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Get smoothly blended visual palette for a continuous progress value (0..6).
 */
export function getBlendedPalette(progress) {
  const clamped = Math.max(0, Math.min(NUM_SCALES - 0.0001, progress));
  const idx = Math.floor(clamped);
  const nextIdx = Math.min(NUM_SCALES - 1, idx + 1);
  // Blend smoothly during the last 35% of each scale
  const frac = clamped - idx;
  const blend = frac > 0.65 ? (frac - 0.65) / 0.35 : 0;

  const cur = SCALES[idx];
  const nxt = SCALES[nextIdx];

  return {
    scaleIndex: idx,
    scale: cur,
    bgInner: lerpRGB(cur.bgInner, nxt.bgInner, blend),
    bgOuter: lerpRGB(cur.bgOuter, nxt.bgOuter, blend),
    moteColor: lerpRGB(cur.moteColor, nxt.moteColor, blend),
    blobCore: lerpRGB(cur.blobCore, nxt.blobCore, blend),
    blobEdge: lerpRGB(cur.blobEdge, nxt.blobEdge, blend),
    blobGlow: lerpRGB(cur.blobGlow, nxt.blobGlow, blend),
  };
}

/**
 * Format continuous progress (0..6) into a poetic scientific measurement string.
 */
export function formatScientificSize(progress) {
  const p = Math.max(0, Math.min(NUM_SCALES + 0.5, progress));
  if (p < 1) {
    const nm = 0.1 * Math.pow(100, p);
    return nm < 10 ? `${nm.toFixed(1)} nm` : `${Math.round(nm)} nm`;
  }
  if (p < 2) {
    const um = 1 * Math.pow(500, p - 1);
    return um < 10 ? `${um.toFixed(1)} µm` : `${Math.round(um)} µm`;
  }
  if (p < 3) {
    const mm = 1 * Math.pow(300, p - 2);
    return mm < 100 ? `${mm.toFixed(1)} mm` : `${(mm / 10).toFixed(1)} cm`;
  }
  if (p < 4) {
    const m = 0.8 * Math.pow(500, p - 3);
    return m < 100 ? `${m.toFixed(1)} m` : `${Math.round(m)} m`;
  }
  if (p < 5) {
    const km = 50 * Math.pow(2500, p - 4);
    if (km < 1000) return `${Math.round(km)} km`;
    return `${(km / 1000).toFixed(1)}k km`;
  }
  const ly = 0.01 * Math.pow(1e7, p - 5);
  if (ly < 1) return `${ly.toFixed(2)} al`;
  if (ly < 1000) return `${Math.round(ly)} al`;
  return `${(ly / 1000).toFixed(1)}k al`;
}

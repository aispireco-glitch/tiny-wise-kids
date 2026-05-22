/**
 * Chroma-key background remover for hero PNGs.
 *
 * Each hero image has a near-uniform light gray background baked in
 * (no real alpha channel). This script:
 *   1. Reads each PNG
 *   2. Samples the corner pixel as the background color
 *   3. Walks every pixel; if it's within tolerance of bg → alpha 0
 *      Within 2× tolerance → linearly faded alpha (soft edge, no jaggies)
 *   4. Writes back an RGBA PNG with transparent background
 *
 * Run with:  node scripts/remove-bg.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_DIR  = path.join(__dirname, '..', 'public', 'hero');

const FILES = [
  'jar-future.png',
  'coin-3d.png',
  'piggy.png',
  'badge-expert.png'
];

// Tolerance for "close to background" detection.
// 28 = a Euclidean RGB distance that catches near-uniform light gray
// without eating into colorful subjects.
const TOLERANCE      = 30;
const SOFT_EDGE_MULT = 2.2;

function sampleBackground(png) {
  // Average a small ring of corner pixels (4 corners × 9 samples each)
  // to find a robust bg color, in case there's some texture noise.
  const { width, height, data } = png;
  const samples = [];
  const corners = [
    [0, 0], [0, 1], [1, 0], [1, 1], [2, 2],
    [width - 1, 0], [width - 2, 0], [width - 1, 1],
    [0, height - 1], [1, height - 1], [0, height - 2],
    [width - 1, height - 1], [width - 2, height - 2]
  ];
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  const r = Math.round(samples.reduce((s, c) => s + c[0], 0) / samples.length);
  const g = Math.round(samples.reduce((s, c) => s + c[1], 0) / samples.length);
  const b = Math.round(samples.reduce((s, c) => s + c[2], 0) / samples.length);
  return { r, g, b };
}

function processImage(filename) {
  const filePath = path.join(HERO_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn('  skip (not found):', filename);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const png = PNG.sync.read(buf);

  const bg = sampleBackground(png);
  const threshSq = TOLERANCE * TOLERANCE;
  const fadeSq   = (TOLERANCE * SOFT_EDGE_MULT) * (TOLERANCE * SOFT_EDGE_MULT);

  let killed = 0, soft = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const dr = r - bg.r, dg = g - bg.g, db = b - bg.b;
    const d2 = dr * dr + dg * dg + db * db;

    if (d2 < threshSq) {
      png.data[i + 3] = 0;          // fully transparent
      killed++;
    } else if (d2 < fadeSq) {
      // Smooth fade: alpha rises from 0 to 255 between thresh and fade
      const t = (d2 - threshSq) / (fadeSq - threshSq);
      png.data[i + 3] = Math.round(255 * Math.sqrt(t));
      soft++;
    } else {
      png.data[i + 3] = 255;
    }
  }

  const outBuf = PNG.sync.write(png, { colorType: 6 });
  fs.writeFileSync(filePath, outBuf);

  const total = png.width * png.height;
  console.log(
    `  ${filename}: ${png.width}x${png.height} bg=rgb(${bg.r},${bg.g},${bg.b}) ` +
    `transparent=${((killed / total) * 100).toFixed(1)}% soft=${((soft / total) * 100).toFixed(2)}%`
  );
}

console.log('Removing baked backgrounds from hero PNGs…');
FILES.forEach(processImage);
console.log('Done.');

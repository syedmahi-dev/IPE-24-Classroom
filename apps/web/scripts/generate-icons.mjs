/**
 * Generate PWA icons from the source logo.
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(__dirname, '../public/logo.png');
const OUT_DIR = resolve(__dirname, '../public/icons');

const SIZES = [48, 72, 96, 128, 144, 192, 384, 512];

mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(resolve(OUT_DIR, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

// Maskable icon (with padding + solid background for Android adaptive icons)
await sharp(SOURCE)
  .resize(432, 432, { fit: 'contain', background: { r: 37, g: 99, b: 235, alpha: 1 } })
  .extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 37, g: 99, b: 235, alpha: 1 } })
  .resize(512, 512)
  .png()
  .toFile(resolve(OUT_DIR, 'maskable-512.png'));
console.log('✓ maskable-512.png');

console.log('\n✅ All icons generated!');

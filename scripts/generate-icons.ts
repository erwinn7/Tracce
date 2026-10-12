/**
 * Génère les icônes PNG (192, 512, maskable-512) à partir du favicon SVG.
 * Usage : npm run generate-icons
 */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(__dirname, '..', 'public', 'icons');
const SVG_PATH = join(__dirname, '..', 'public', 'favicon.svg');

async function generate(): Promise<void> {
  await mkdir(ICON_DIR, { recursive: true });
  const svgBuffer = await readFile(SVG_PATH);

  // Icône standard 192×192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(ICON_DIR, 'icon-192.png'));

  // Icône standard 512×512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(ICON_DIR, 'icon-512.png'));

  // Icône maskable 512×512 : contenu à 65 % sur fond blanc (zone de sécurité 80 %)
  const contentSize = Math.round(512 * 0.65);
  const padding = Math.round((512 - contentSize) / 2);
  const iconContent = await sharp(svgBuffer)
    .resize(contentSize, contentSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: iconContent, left: padding, top: padding }])
    .png()
    .toFile(join(ICON_DIR, 'icon-maskable-512.png'));

  console.log('✅ Icônes générées dans public/icons/');
}

generate().catch((err: unknown) => {
  console.error('❌ Erreur génération icônes :', err);
  process.exit(1);
});

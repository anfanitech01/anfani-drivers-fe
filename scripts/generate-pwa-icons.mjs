/**
 * Renders the PWA install icons from `public/brand/anfani-favicon.svg`
 * (BRAND.md: "generate 192px and 512px PNG renders … maskable variants padded
 * on white"). Home-screen install is an acceptance criterion, and Chrome will
 * not offer the install prompt without a 192 and a 512 in the manifest.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * Never recolour, stretch or restroke the mark — we only scale and pad it.
 * `sharp` comes in with Next.js; this is a build-out script, not a dependency
 * of the app.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "public/brand/anfani-favicon.svg"));
const outDir = join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/**
 * @param size    output square, px
 * @param inset   fraction of the canvas the mark may occupy. Maskable icons are
 *                cropped to an unknown shape by the launcher; everything outside
 *                the centre 80% circle can be shaved, so the mark sits at 60%.
 */
async function render(name, size, inset) {
  const box = Math.round(size * inset);
  // The mark is 252×270 — taller than wide. Fit inside the box, keep the ratio.
  const mark = await sharp(source, { density: 600 })
    .resize(box, box, { fit: "contain", background: { ...WHITE, alpha: 0 } })
    .png()
    .toBuffer();

  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(join(outDir, name), out);
  console.log(`wrote public/icons/${name} (${size}px, mark at ${inset * 100}%)`);
}

// `any` icons: the mark reads as large as the square allows, small breathing room.
await render("icon-192.png", 192, 0.82);
await render("icon-512.png", 512, 0.82);
// `maskable`: padded so an aggressive circle/squircle crop never clips the mark.
await render("icon-maskable-192.png", 192, 0.6);
await render("icon-maskable-512.png", 512, 0.6);
// iOS home screen: no maskable support, no transparency, 180px is the ask.
await render("apple-touch-icon.png", 180, 0.78);

/**
 * Renders every icon the app ships from the one source of truth,
 * `public/brand/anfani-favicon.svg` (BRAND.md: the standalone mark; never
 * recolour, stretch or restroke it — we only scale, pad and rasterise).
 *
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * What it writes and who reads it:
 *   app/favicon.ico              /favicon.ico — the hard-coded path browsers,
 *                                bookmark bars and crawlers ask for. 16/32/48,
 *                                transparent so it sits on a light OR dark tab.
 *   app/icon.svg                 the scalable tab icon: the mark re-framed on a
 *                                square canvas with breathing room, because a
 *                                252×270 viewBox letterboxes in a square slot.
 *   app/apple-icon.png           180px, iOS home screen. iOS has no maskable
 *                                concept and composites transparency on black,
 *                                so this one is flattened on white.
 *   public/icons/icon-*.png      the manifest's `any` icons (192/512).
 *   public/icons/icon-maskable-* the manifest's `maskable` icons — the ones
 *                                Android actually puts on the home screen.
 *   public/icons/icon-monochrome-512.png
 *                                Android 13+ themed icons, tinted by the system.
 *
 * Two things worth knowing before changing the numbers below:
 *
 * 1. THE SOURCE HAS NO GRADIENT. The mark approximates its orange fade with 106
 *    adjacent flat-filled paths. Rasterising straight to 192px leaves white
 *    hairline seams between every strip. So everything is rendered at SUPER×
 *    the target and downscaled with lanczos3, which averages the seams away.
 *
 * 2. THE MASKABLE INSET IS DERIVED, NOT GUESSED. A maskable icon may be cropped
 *    to any shape; only a centred circle of 0.8× the canvas is guaranteed to
 *    survive. Measured against this mark, the furthest ink (the chevron apex)
 *    sits at 0.4999 of the fitted box from its centre, so the mark stays inside
 *    that circle for any inset up to 0.80. MASKABLE_INSET keeps a margin under
 *    that ceiling. If the artwork is ever replaced, re-measure rather than
 *    reusing this number.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public/brand/anfani-favicon.svg");
const source = readFileSync(svgPath);
const iconsDir = join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Rasterise at this square before downscaling — kills the strip seams. */
const SUPER = 2048;
/** Ink at 0.4999 of the fitted box; 0.72 × 0.4999 = 0.36 < the 0.40 safe radius. */
const MASKABLE_INSET = 0.72;
/** Plain icons are shown uncropped, so they only want a little breathing room. */
const PLAIN_INSET = 0.84;
/** iOS masks to a superellipse; keep the mark clear of the corners. */
const APPLE_INSET = 0.78;

/** The mark, supersampled and fitted to `inset` of a `size` square. */
async function mark(size, inset) {
  const box = Math.round(SUPER * inset);
  const big = await sharp(source, { density: 2400 })
    .resize(box, box, { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();

  // Pad to the full supersampled square first...
  const padded = await sharp({
    create: { width: SUPER, height: SUPER, channels: 4, background: CLEAR },
  })
    .composite([{ input: big, gravity: "centre" }])
    .png()
    .toBuffer();

  // ...then downscale in a fresh pipeline. Chaining resize onto the same
  // pipeline would resize the canvas *before* compositing, which is both wrong
  // and an error once the canvas is smaller than the mark.
  return sharp(padded).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
}

async function icon(size, inset, { background = CLEAR } = {}) {
  const art = await mark(size, inset);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: art }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The mark's silhouette in flat black on transparent. Android 13+ tints this
 * to match the user's wallpaper; without it the launcher shrinks the colour
 * icon inside a grey circle, which looks like a mistake.
 */
async function monochrome(size, inset) {
  const art = await mark(size, inset);
  const alpha = await sharp(art).extractChannel("alpha").toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .joinChannel(alpha)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Pack PNGs into an .ico. Every browser in use reads PNG-compressed ICO
 * entries, and it beats a bitmap .ico on both size and edge quality.
 */
function ico(images) {
  const HEADER = 6;
  const ENTRY = 16;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(ENTRY);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/**
 * The tab icon as SVG. The raw asset is 252×270, so dropping it into a square
 * favicon slot letterboxes it edge-to-edge; this re-frames the same paths,
 * untouched, on a square canvas with ~8% padding.
 */
function squareSvg() {
  const raw = readFileSync(svgPath, "utf8");
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();
  const W = 252;
  const H = 270;
  const CANVAS = 324; // 270 / 0.833 — about 8% padding on the long axis
  const dx = (CANVAS - W) / 2;
  const dy = (CANVAS - H) / 2;
  return `<svg width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" fill="none" xmlns="http://www.w3.org/2000/svg">
<!-- The Anfani mark (public/brand/anfani-favicon.svg), unaltered, re-framed on a
     square canvas so it does not sit edge-to-edge in a favicon slot.
     Generated by scripts/generate-pwa-icons.mjs — do not hand-edit. -->
<g transform="translate(${dx} ${dy})">
${inner}
</g>
</svg>
`;
}

// --- Tab icons -------------------------------------------------------------
writeFileSync(join(root, "app/icon.svg"), squareSvg());
console.log("wrote app/icon.svg (square-framed mark)");

const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  // Transparent: the tab strip is light in one theme and dark in the other.
  icoImages.push({ size, data: await icon(size, PLAIN_INSET) });
}
writeFileSync(join(root, "app/favicon.ico"), ico(icoImages));
console.log(`wrote app/favicon.ico (${icoSizes.join("/")}, transparent)`);

// --- Installed app icons ---------------------------------------------------
writeFileSync(join(root, "app/apple-icon.png"), await icon(180, APPLE_INSET, { background: WHITE }));
console.log("wrote app/apple-icon.png (180, on white)");

for (const size of [192, 512]) {
  writeFileSync(join(iconsDir, `icon-${size}.png`), await icon(size, PLAIN_INSET, { background: WHITE }));
  console.log(`wrote public/icons/icon-${size}.png (inset ${PLAIN_INSET})`);
}

for (const size of [192, 512]) {
  writeFileSync(
    join(iconsDir, `icon-maskable-${size}.png`),
    await icon(size, MASKABLE_INSET, { background: WHITE }),
  );
  console.log(`wrote public/icons/icon-maskable-${size}.png (inset ${MASKABLE_INSET})`);
}

writeFileSync(join(iconsDir, "icon-monochrome-512.png"), await monochrome(512, MASKABLE_INSET));
console.log("wrote public/icons/icon-monochrome-512.png");

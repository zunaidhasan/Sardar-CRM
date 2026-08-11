// Generates PWA icons in public/icons from the existing public/sardar-fav.png.
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";

const src = path.resolve("public/sardar-fav.png");
const outDir = path.resolve("public/icons");
fs.mkdirSync(outDir, { recursive: true });

const BACKGROUND = "#1c2233"; // matches the dark theme --background

// Plain (any purpose) icons at 192 and 512.
for (const size of [192, 512]) {
  await sharp(src).resize(size, size).png().toFile(path.join(outDir, `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}

// Maskable icon: favicon at ~66% on a full-bleed background so the app icon
// survives circular/rounded masking on home screens.
const maskSize = 512;
const inset = Math.round(maskSize * 0.17); // keep inner art inside the safe zone
await sharp({
  create: { width: maskSize, height: maskSize, channels: 4, background: BACKGROUND },
})
  .composite([
    {
      input: await sharp(src).resize(maskSize - inset * 2, maskSize - inset * 2).png().toBuffer(),
      left: inset,
      top: inset,
    },
  ])
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));
console.log("icon-maskable-512.png");

console.log("Done.");

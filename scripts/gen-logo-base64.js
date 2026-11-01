// Generates raster logo assets from src/app/icon.svg (FocalDive emblem on a dark tile).
//
//   node scripts/gen-logo-base64.js
//
// Outputs:
//   - stdout: data:image/png;base64,… (200×200) → paste into LOGO_PNG_DATA_URL in src/lib/pdf.ts
//   - src/app/apple-icon.png (180×180, iOS home-screen icon)
//   - src/app/favicon.ico    (32×32 PNG-in-ICO, for clients that request /favicon.ico)
//
// The tile keeps the Acid Green emblem readable on white PDFs and light browser tabs.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "src/app/icon.svg"));

/** Wrap a single PNG in a minimal ICO container (supported by all modern browsers). */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // data offset
  return Buffer.concat([header, entry, png]);
}

async function main() {
  // PDF logo: flatten onto white (jsPDF has no alpha for PNG corners)
  const pdfPng = await sharp(svg, { density: 300 })
    .resize(200, 200)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const apple = await sharp(svg, { density: 300 }).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(root, "src/app/apple-icon.png"), apple);

  const fav = await sharp(svg, { density: 300 }).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(root, "src/app/favicon.ico"), pngToIco(fav, 32));

  process.stdout.write("data:image/png;base64," + pdfPng.toString("base64"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

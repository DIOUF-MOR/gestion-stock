#!/usr/bin/env node
'use strict';

/**
 * Generates icon.png, adaptive-icon.png, splash.png for StockManager.
 * No external dependencies — uses only Node.js built-ins (zlib, fs, path).
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const cv  = Buffer.alloc(4); cv.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, cv]);
}

function encodePNG(w, h, pixels) {
  // pixels: Uint8ClampedArray, RGBA, row-major
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

class Canvas {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  _px(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r; this.data[i+1] = g; this.data[i+2] = b; this.data[i+3] = a;
  }

  fill(r, g, b, a = 255) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        this._px(x, y, r, g, b, a);
  }

  gradient(r1, g1, b1, r2, g2, b2) {
    for (let y = 0; y < this.h; y++) {
      const t = y / (this.h - 1);
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      for (let x = 0; x < this.w; x++) this._px(x, y, r, g, b);
    }
  }

  rect(x1, y1, x2, y2, r, g, b, a = 255) {
    for (let y = Math.max(0,y1); y < Math.min(this.h,y2); y++)
      for (let x = Math.max(0,x1); x < Math.min(this.w,x2); x++)
        this._px(x, y, r, g, b, a);
  }

  circle(cx, cy, rad, r, g, b, a = 255) {
    for (let y = Math.max(0, cy-rad); y < Math.min(this.h, cy+rad+1); y++)
      for (let x = Math.max(0, cx-rad); x < Math.min(this.w, cx+rad+1); x++)
        if ((x-cx)*(x-cx)+(y-cy)*(y-cy) <= rad*rad)
          this._px(x, y, r, g, b, a);
  }

  roundRect(x1, y1, x2, y2, rad, r, g, b, a = 255) {
    this.rect(x1+rad, y1, x2-rad, y2, r, g, b, a);
    this.rect(x1, y1+rad, x2, y2-rad, r, g, b, a);
    this.circle(x1+rad, y1+rad, rad, r, g, b, a);
    this.circle(x2-rad, y1+rad, rad, r, g, b, a);
    this.circle(x1+rad, y2-rad, rad, r, g, b, a);
    this.circle(x2-rad, y2-rad, rad, r, g, b, a);
  }

  // Draw a bitmap glyph (0/1 array, rows×cols) at scale px/cell
  glyph(bitmap, rows, cols, scale, ox, oy, r, g, b, a = 255) {
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        if (bitmap[row * cols + col])
          this.rect(ox+col*scale, oy+row*scale,
                    ox+col*scale+scale, oy+row*scale+scale, r, g, b, a);
  }

  toPNG() { return encodePNG(this.w, this.h, this.data); }
}

// ─── Glyph bitmaps (8×9 cells each) ──────────────────────────────────────────

//  "S"
const S = [
  0,1,1,1,1,1,0,0,
  1,1,0,0,0,1,1,0,
  1,1,0,0,0,0,0,0,
  1,1,0,0,0,0,0,0,
  0,1,1,1,1,0,0,0,
  0,0,0,0,1,1,1,0,
  0,0,0,0,0,1,1,0,
  1,1,0,0,0,1,1,0,
  0,1,1,1,1,1,0,0,
];
// "M"
const M = [
  1,1,0,0,0,1,1,0,
  1,1,1,0,1,1,1,0,
  1,0,1,1,1,0,1,0,
  1,0,0,1,0,0,1,0,
  1,0,0,0,0,0,1,0,
  1,0,0,0,0,0,1,0,
  1,0,0,0,0,0,1,0,
  1,0,0,0,0,0,1,0,
  1,0,0,0,0,0,1,0,
];
const ROWS = 9, COLS = 8;

// App primary colors
const BG1 = [0x2E, 0x86, 0xAB];  // #2E86AB  top
const BG2 = [0x1A, 0x5F, 0x7A];  // #1A5F7A  bottom
const WHITE = [255, 255, 255];

// ─── icon.png ─────────────────────────────────────────────────────────────────

function makeIcon(size) {
  const c = new Canvas(size, size);
  const s = size / 1024;

  // Gradient background
  c.gradient(...BG1, ...BG2);

  // White rounded card
  const pad = Math.round(140 * s);
  const rad = Math.round(120 * s);
  c.roundRect(pad, pad, size-pad, size-pad, rad, ...WHITE);

  // "SM" monogram in primary blue
  const gs  = Math.round(44 * s);                // cell scale (px)
  const gap = Math.round(18 * s);
  const tw  = COLS * gs * 2 + gap;
  const th  = ROWS * gs;
  const ox  = Math.round((size - tw) / 2);
  const oy  = Math.round((size - th) / 2);

  c.glyph(S, ROWS, COLS, gs, ox,           oy, ...BG1);
  c.glyph(M, ROWS, COLS, gs, ox+COLS*gs+gap, oy, ...BG1);

  return c.toPNG();
}

// ─── adaptive-icon.png ────────────────────────────────────────────────────────
// For Android adaptive icons: logo must be centered in safe zone (~66% of image).
// Background color is provided by app.config.js → backgroundColor: "#2E86AB"

function makeAdaptiveIcon(size) {
  const c = new Canvas(size, size);
  const s = size / 1024;

  // Fill with the background color (matches app.config.js backgroundColor)
  c.fill(...BG1);

  // White rounded card — smaller, centered in the safe zone
  const pad = Math.round(250 * s);
  const rad = Math.round(90 * s);
  c.roundRect(pad, pad, size-pad, size-pad, rad, ...WHITE);

  // "SM" monogram
  const gs  = Math.round(33 * s);
  const gap = Math.round(14 * s);
  const tw  = COLS * gs * 2 + gap;
  const th  = ROWS * gs;
  const ox  = Math.round((size - tw) / 2);
  const oy  = Math.round((size - th) / 2);

  c.glyph(S, ROWS, COLS, gs, ox,           oy, ...BG1);
  c.glyph(M, ROWS, COLS, gs, ox+COLS*gs+gap, oy, ...BG1);

  return c.toPNG();
}

// ─── splash.png ───────────────────────────────────────────────────────────────

function makeSplash(size) {
  const c = new Canvas(size, size);
  const s = size / 1024;

  c.gradient(...BG1, ...BG2);

  // White logo circle
  const r = Math.round(220 * s);
  const cx = Math.round(size / 2), cy = Math.round(size / 2 - 40 * s);
  c.circle(cx, cy, r, ...WHITE);

  // "SM" in blue inside the circle
  const gs  = Math.round(26 * s);
  const gap = Math.round(10 * s);
  const tw  = COLS * gs * 2 + gap;
  const th  = ROWS * gs;
  const ox  = Math.round(cx - tw / 2);
  const oy  = Math.round(cy - th / 2);

  c.glyph(S, ROWS, COLS, gs, ox,           oy, ...BG1);
  c.glyph(M, ROWS, COLS, gs, ox+COLS*gs+gap, oy, ...BG1);

  // "StockManager" text below circle — drawn as a thick white bar
  const barY = Math.round(cy + r + 40 * s);
  const barH = Math.round(14 * s);
  c.rect(Math.round(size*0.2), barY, Math.round(size*0.8), barY+barH, ...WHITE);

  return c.toPNG();
}

// ─── Write files ──────────────────────────────────────────────────────────────

const assetsDir = path.join(__dirname, 'assets');

const files = [
  ['icon.png',          makeIcon(1024)],
  ['adaptive-icon.png', makeAdaptiveIcon(1024)],
  ['splash.png',        makeSplash(1024)],
  ['splash-icon.png',   makeIcon(1024)],
  ['favicon.png',       makeIcon(196)],
];

for (const [name, buf] of files) {
  const out = path.join(assetsDir, name);
  fs.writeFileSync(out, buf);
  console.log(`✅  ${name}  (${buf.length.toLocaleString()} bytes)`);
}

console.log('\nAll icons generated successfully!');

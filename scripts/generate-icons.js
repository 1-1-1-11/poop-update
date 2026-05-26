const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 Table & Function
let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[i] = c;
  }
  return crcTable;
}

function crc32(buf) {
  const table = getCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create PNG Chunk
function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  
  return Buffer.concat([len, body, crc]);
}

// Draw basic shape functions on raw row-based pixel buffer
function drawPixel(buf, width, x, y, r, g, b, a) {
  const rowSize = 1 + width * 4;
  const offset = y * rowSize + 1 + x * 4;
  buf[offset] = r;
  buf[offset + 1] = g;
  buf[offset + 2] = b;
  buf[offset + 3] = a;
}

function drawRect(buf, width, x, y, w, h, r, g, b, a) {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      const px = x + i;
      const py = y + j;
      if (px >= 0 && px < width && py >= 0 && py < width) {
        drawPixel(buf, width, px, py, r, g, b, a);
      }
    }
  }
}

function drawLine(buf, width, x0, y0, x1, y1, r, g, b, a) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < width) {
      drawPixel(buf, width, x0, y0, r, g, b, a);
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawCircle(buf, width, cx, cy, radius, r, g, b, a) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const dist = Math.sqrt(x*x + y*y);
      if (Math.abs(dist - radius) < 1.2) {
        const px = Math.round(cx + x);
        const py = Math.round(cy + y);
        if (px >= 0 && px < width && py >= 0 && py < width) {
          drawPixel(buf, width, px, py, r, g, b, a);
        }
      }
    }
  }
}

function drawFilledCircle(buf, width, cx, cy, radius, r, g, b, a) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const dist = Math.sqrt(x*x + y*y);
      if (dist <= radius) {
        const px = Math.round(cx + x);
        const py = Math.round(cy + y);
        if (px >= 0 && px < width && py >= 0 && py < width) {
          drawPixel(buf, width, px, py, r, g, b, a);
        }
      }
    }
  }
}

// Generate PNG buffer with specific icon drawing logic
function generateIconPng(iconType, isHighlighted) {
  const width = 80;
  const height = 80;
  
  // Set drawing color (Orange #FF8C42 vs Gray #999999)
  const color = isHighlighted ? { r: 0xFF, g: 0x8C, b: 0x42 } : { r: 0x99, g: 0x99, b: 0x99 };
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = 255;

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT Chunk - Pixel Data
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  
  // Initialize all pixels as transparent
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter: None
  }
  
  // Draw shapes depending on iconType
  const cx = 40;
  const cy = 40;

  switch (iconType) {
    case 'home':
      // Roof triangle
      for (let i = 0; i <= 20; i++) {
        drawLine(rawData, width, cx - i, 20 + i, cx + i, 20 + i, r, g, b, a);
      }
      // Body box
      drawRect(rawData, width, cx - 14, 40, 28, 20, r, g, b, a);
      // Door (transparent hole)
      drawRect(rawData, width, cx - 5, 48, 10, 12, 0, 0, 0, 0);
      break;

    case 'history':
      // Outer Clock circle
      drawCircle(rawData, width, cx, cy, 22, r, g, b, a);
      drawCircle(rawData, width, cx, cy, 21, r, g, b, a);
      // Clock hands
      drawLine(rawData, width, cx, cy, cx, cy - 12, r, g, b, a);
      drawLine(rawData, width, cx, cy, cx + 10, cy, r, g, b, a);
      // Small center dot
      drawFilledCircle(rawData, width, cx, cy, 3, r, g, b, a);
      break;

    case 'stats':
      // Draw 3 columns
      drawRect(rawData, width, cx - 18, 45, 8, 15, r, g, b, a); // Column 1
      drawRect(rawData, width, cx - 4, 30, 8, 30, r, g, b, a);  // Column 2
      drawRect(rawData, width, cx + 10, 20, 8, 40, r, g, b, a); // Column 3
      // Draw baseline
      drawLine(rawData, width, cx - 22, 60, cx + 22, 60, r, g, b, a);
      break;

    case 'profile':
      // Head
      drawFilledCircle(rawData, width, cx, cy - 12, 9, r, g, b, a);
      // Shoulders/Body (half circle/arch)
      for (let y = cy + 2; y <= cy + 18; y++) {
        const factor = (y - (cy + 2)) / 16;
        const halfWidth = Math.round(Math.sqrt(1 - factor * factor) * 18);
        drawLine(rawData, width, cx - halfWidth, y, cx + halfWidth, y, r, g, b, a);
      }
      break;
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  
  // IEND Chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Output icons
const outputDir = path.join(__dirname, '..', 'src', 'static', 'images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const icons = [
  { file: 'tab-home.png', type: 'home', highlighted: false },
  { file: 'tab-home-active.png', type: 'home', highlighted: true },
  { file: 'tab-history.png', type: 'history', highlighted: false },
  { file: 'tab-history-active.png', type: 'history', highlighted: true },
  { file: 'tab-stats.png', type: 'stats', highlighted: false },
  { file: 'tab-stats-active.png', type: 'stats', highlighted: true },
  { file: 'tab-profile.png', type: 'profile', highlighted: false },
  { file: 'tab-profile-active.png', type: 'profile', highlighted: true }
];

console.log('正在生成 tabbar PNG 图标...');
icons.forEach(ico => {
  const filePath = path.join(outputDir, ico.file);
  const buf = generateIconPng(ico.type, ico.highlighted);
  fs.writeFileSync(filePath, buf);
  console.log(`已成功生成: ${ico.file}`);
});
console.log('所有图标生成成功！');

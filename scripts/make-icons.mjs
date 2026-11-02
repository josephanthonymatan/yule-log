// Draws the app icon, a pixel fire on two logs, at the sizes browsers and phones ask for.
// The art stays inside the middle of the square, so it also works as a maskable icon.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const ART = [
  '.........r..........',
  '.........rr.........',
  '........rrr.........',
  '........rorr........',
  '...r....roor....r...',
  '...rr..rroor...rr...',
  '...rr..rooor...rr...',
  '..rorr.rooyor.rorr..',
  '..roor.rooyor.roor..',
  '..roorrroyyorrroor..',
  '.rooooooyyyooooooor.',
  '.rooyooyyyyyoyoooor.',
  '.rooyyoyyyyyyyyooor.',
  '.rooyyyyywwyyyyyoor.',
  '.roooyyywwwwyyyooor.',
  '..rooyyywwwwyyyoor..',
  '..rrooyyywwyyyoorr..',
  '...rrooyyyyyoorr....',
  'BBbbbbbbBBBBbbbbbbcc',
  'BbbbBbbbbbbbbBbbbbcC',
  'BBbbbbbbBBBBbbbbbbcc',
  '..ccbbbbbbbbbbbbBB..',
  '..cCbbbBbbbbbBbbbB..',
  '..ccbbbbbbbbbbbbBB..',
];
const COLORS = {
  '.': [23, 16, 11], r: [199, 58, 6], o: [248, 144, 30], y: [253, 224, 110], w: [255, 253, 232],
  b: [125, 78, 44], B: [78, 46, 24], c: [214, 176, 122], C: [150, 112, 70],
};
const GRID = 32;
const cell = (gx, gy) => {
  const x = gx - Math.floor((GRID - ART[0].length) / 2), y = gy - Math.floor((GRID - ART.length) / 2);
  return COLORS[(ART[y] && ART[y][x]) || '.'];
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const len = Buffer.alloc(4), sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const png = (size) => {
  const zoom = Math.floor(size / GRID), pad = Math.floor((size - GRID * zoom) / 2);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      const c = cell(Math.floor((x - pad) / zoom), Math.floor((y - pad) / zoom));
      raw.set(c, row + 1 + x * 3);
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head[8] = 8;
  head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

const dir = resolve(new URL('../assets/icons', import.meta.url).pathname);
await mkdir(dir, { recursive: true });
for (const size of [32, 180, 192, 512]) await writeFile(resolve(dir, `icon-${size}.png`), png(size));
console.log('Wrote icons');

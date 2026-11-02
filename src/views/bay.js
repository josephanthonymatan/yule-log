// The view from Russian Hill, north over the wharf to Alcatraz and Angel Island,
// composed from the two photographs: the palm on the left, the wire across the sky, Pier 45,
// the brick and the mansard roofs, ships working the channel. The East Bay hills lie low on
// the right with their lights. Hills are gold in summer and autumn, green after the rains.
(() => {
  const Y = window.Yule;

  const ships = {
    container: () => Y.boatSprite(58, 17, (r) => {
      const cols = ['#b4442f', '#2f5f8a', '#c9892f', '#3a7a5c', '#8a8f96', '#7a3a2f', '#d9d4c8'];
      const rr = Y.rng(9);
      r.rect(0, 12, 58, 4, '#1d2533');
      r.rect(0, 16, 57, 1, '#7c2a22');
      r.poly([[50, 12], [58, 10], [58, 12], [56, 16], [50, 16]], '#1d2533');
      for (let x = 10; x < 50; x += 5) {
        const stack = 2 + Math.floor(rr() * 3);
        for (let s = 0; s < stack; s++) r.rect(x, 11 - s * 2 - 1, 4, 2, cols[Math.floor(rr() * cols.length)]);
      }
      r.rect(2, 5, 7, 7, '#e9e7df');
      r.rect(2, 2, 7, 3, '#f4f2ea');
      r.rect(3, 3, 5, 1, '#39424d');
      r.rect(4, 0, 2, 2, '#b4442f');
    }),
    tanker: () => Y.boatSprite(54, 15, (r) => {
      r.rect(0, 9, 54, 5, '#191c22');
      r.rect(0, 14, 53, 1, '#8f2a22');
      r.poly([[47, 9], [54, 7], [54, 9], [52, 14], [47, 14]], '#191c22');
      r.rect(10, 8, 36, 1, '#7c3a2e');
      for (let x = 12; x < 46; x += 4) r.rect(x, 7, 2, 1, '#94513f');
      r.rect(20, 6, 12, 1, '#c7c4b4');
      r.rect(2, 2, 7, 7, '#e9e7df');
      r.rect(3, 3, 5, 1, '#39424d');
      r.rect(4, 0, 2, 2, '#bdb9aa');
      r.rect(50, 3, 1, 4, '#d9d6c8');
    }),
    bulk: () => Y.boatSprite(50, 14, (r) => {
      r.rect(0, 8, 50, 5, '#27394a');
      r.rect(0, 13, 49, 1, '#8f3a2a');
      r.poly([[44, 8], [50, 6], [50, 8], [48, 13], [44, 13]], '#27394a');
      for (let x = 12; x < 44; x += 8) r.rect(x, 6, 6, 2, '#a88a4a');
      for (let x = 17; x < 42; x += 16) { r.rect(x, 1, 1, 7, '#c2a33e'); r.line(x, 1, x + 5, 4, '#c2a33e'); }
      r.rect(2, 2, 6, 6, '#e6e3d8');
      r.rect(3, 3, 4, 1, '#39424d');
    }),
    // The white cutter with the red and blue slash, from the first photograph
    cutter: () => Y.boatSprite(26, 10, (r) => {
      r.rect(0, 6, 25, 3, '#f1f2ee');
      r.poly([[21, 6], [26, 5], [25, 9], [21, 9]], '#f1f2ee');
      r.rect(0, 9, 24, 1, '#2d3640');
      r.poly([[16, 6], [18, 6], [16, 9], [14, 9]], '#c9332a');
      r.poly([[14, 6], [15, 6], [13, 9], [12, 9]], '#2c4a86');
      r.rect(6, 3, 10, 3, '#f6f7f3');
      r.rect(9, 1, 5, 2, '#f6f7f3');
      r.rect(10, 2, 3, 1, '#39424d');
      r.rect(11, 0, 1, 1, '#c9332a');
      r.rect(2, 4, 3, 2, '#c9c8bf');
    }),
    ferry: () => Y.boatSprite(24, 9, (r) => {
      r.rect(0, 6, 24, 2, '#eef0ec');
      r.rect(0, 8, 23, 1, '#2d3f55');
      r.rect(3, 3, 18, 3, '#f4f5f1');
      for (let x = 4; x < 20; x += 2) r.px(x, 4, '#39506a');
      r.rect(8, 1, 8, 2, '#f4f5f1');
      r.rect(11, 0, 2, 1, '#b4442f');
    }),
    // A little grey troller out of Pier 45, poles up
    fishing: () => Y.boatSprite(19, 12, (r) => {
      r.line(11, 0, 4, 5, '#5a6168');
      r.line(11, 0, 17, 4, '#5a6168');
      r.rect(11, 0, 1, 8, '#4c5359');
      r.rect(3, 5, 6, 3, '#a9b0b4');
      r.rect(4, 6, 4, 1, '#333c44');
      r.rect(2, 4, 8, 1, '#6d757b');
      r.rect(0, 8, 16, 3, '#7c848a');
      r.rect(0, 8, 15, 1, '#a3abb0');
      r.poly([[14, 8], [19, 6], [18, 11], [14, 11]], '#7c848a');
      r.line(15, 7, 18, 6, '#a3abb0');
      r.rect(1, 11, 15, 1, '#2f3439');
    }),
    sail: () => Y.boatSprite(11, 13, (r) => {
      r.rect(1, 11, 9, 1, '#f1f2ee');
      r.rect(2, 12, 7, 1, '#2d3640');
      r.rect(5, 0, 1, 11, '#7a746a');
      r.poly([[6, 0.5], [10, 10], [6, 10]], '#f6f4ea');
      r.poly([[4.5, 2], [4.5, 10], [1, 10]], '#dcd8c8');
    }),
  };
  const lightsFor = {
    container: [{ x: 5, y: 1, c: '#fff4d0' }, { x: 3, y: 3, c: '#ffe39a' }, { x: 6, y: 3, c: '#ffe39a' }, { x: 55, y: 9, c: '#ff4a3a' }, { x: 30, y: 2, c: '#fff4d0' }],
    tanker: [{ x: 4, y: 1, c: '#fff4d0' }, { x: 4, y: 3, c: '#ffe39a' }, { x: 7, y: 3, c: '#ffe39a' }, { x: 50, y: 3, c: '#ffffff' }, { x: 52, y: 8, c: '#4aff8a' }],
    bulk: [{ x: 4, y: 2, c: '#fff4d0' }, { x: 5, y: 3, c: '#ffe39a' }, { x: 47, y: 6, c: '#ff4a3a' }, { x: 17, y: 1, c: '#ffffff' }],
    cutter: [{ x: 11, y: 0, c: '#ffffff' }, { x: 11, y: 2, c: '#ffe39a' }, { x: 8, y: 4, c: '#ffe39a' }, { x: 13, y: 4, c: '#ffe39a' }, { x: 24, y: 6, c: '#4aff8a' }],
    ferry: [{ x: 5, y: 4, c: '#ffe39a' }, { x: 9, y: 4, c: '#ffe39a' }, { x: 13, y: 4, c: '#ffe39a' }, { x: 17, y: 4, c: '#ffe39a' }, { x: 11, y: 0, c: '#ffffff' }],
    fishing: [{ x: 11, y: 0, c: '#ffffff' }, { x: 5, y: 6, c: '#ffe39a' }, { x: 17, y: 7, c: '#4aff8a' }],
    sail: [{ x: 5, y: 0, c: '#ffffff' }],
  };

  Y.viewPainters.mission = ({ back, front, wire, vw, vh, C, A, shade }) => {
    const hy = Math.round(vh * 0.4);
    const green = C.season === 'winter' || C.season === 'spring';
    const hillA = green ? '#55804a' : '#a98f55';
    const hillB = green ? '#3c6239' : '#7a7344';
    const hillC = green ? '#6f9a57' : '#c4aa6c';
    const brush = '#3f5a3c';

    const tex = (x, y, a, b, c, sx = 0.22, sy = 0.34) => {
      const n = Y.fbm(x * sx + 3, y * sy, 3) + (Y.bayer(x, y) - 0.5) * 0.14;
      return n < 0.42 ? a : n < 0.58 ? b : c;
    };

    // Water first, then everything stands in it
    const ax = Math.round(vw * 0.6);
    const pierY = hy + Math.round((vh - hy) * 0.56);
    back.depth = 0.62;
    back.mark = 1;
    const waterFar = Y.mix(Y.mix(Y.mul('#4f7686', A.land), A.mid, 0.34), A.hor, 0.34);
    const waterNear = Y.mix(Y.mul('#3a6070', A.land), A.mid, 0.18);
    for (let y = hy; y < vh; y++) {
      const t = Y.clamp((y - hy) / Math.max(1, pierY - hy));
      back.depth = Y.lerp(0.74, 0.52, t);
      for (let x = 0; x < vw; x++) {
        const q = Math.floor(t * 8 + Y.bayer(x, y)) / 8;
        back.px(x, y, Y.mix(waterFar, waterNear, q));
      }
    }
    back.mark = 0;

    // East Bay hills, low and far off to the right
    const eastTop = (x) => hy - 3 - 6 * Y.fbm(x * 0.05 + 40, 2, 3) - Y.smooth(vw * 0.4, vw, x) * 5;
    back.depth = 1;
    for (let x = Math.round(vw * 0.42); x < vw; x++) {
      for (let y = Math.round(eastTop(x)); y < hy; y++) back.px(x, y, shade(tex(x, y, hillB, hillA, hillA), 1));
    }

    // Angel Island: a long ridge falling away to the right behind the Rock
    const ridge = (x) => {
      const u = (x - (ax - 24)) / 46;
      const lump = Math.exp(-u * u) * 22;
      const fall = Y.clamp(1 - (x - (ax - 24)) / (vw * 0.72 + 12)) * 6;
      return hy - 1 - lump - fall - (Y.fbm(x * 0.09 + 9, 1, 3) - 0.5) * 7;
    };
    back.depth = 0.88;
    for (let x = 0; x < vw; x++) {
      const top = Math.round(ridge(x));
      for (let y = top; y < hy + 1; y++) {
        const rel = (y - top) / Math.max(1, hy - top);
        const low = rel > 0.7 ? brush : tex(x, y, hillB, hillA, hillC);
        back.px(x, y, shade(low, 0.84));
      }
      // Oak on the skyline, a little fringe
      if (Y.noise(x * 0.6, 4) > 0.62) back.px(x, top - 1, shade(brush, 0.84));
    }

    // Alcatraz
    const y0 = hy + 9;
    const ox = ax - 23;
    const prof = [[0, 1], [3, 6], [7, 11], [12, 14], [20, 15], [26, 13], [29, 9], [34, 9], [38, 7], [42, 4], [46, 0]];
    const profile = (u) => {
      for (let i = 0; i + 1 < prof.length; i++) {
        if (u <= prof[i + 1][0]) return Y.lerp(prof[i][1], prof[i + 1][1], (u - prof[i][0]) / (prof[i + 1][0] - prof[i][0]));
      }
      return 0;
    };
    back.depth = 0.72;
    for (let u = 0; u < 46; u++) {
      const h = Math.round(profile(u) + (Y.noise(u * 0.8, 2) - 0.5) * 1.6);
      for (let k = 0; k <= h; k++) {
        const y = y0 - k;
        const rel = k / Math.max(1, h);
        const n = Y.fbm((ox + u) * 0.5, y * 0.6, 2) + (Y.bayer(ox + u, y) - 0.5) * 0.18;
        const col = rel < 0.28 ? (n < 0.5 ? '#6b6a58' : '#8d8a72')
          : rel < 0.6 && u < 28 ? (n < 0.46 ? '#a29a7f' : n < 0.6 ? '#bdb498' : '#4c5f42')
          : n < 0.55 ? '#3f5a3c' : '#55704a';
        back.px(ox + u, y, shade(col, 0.5));
      }
    }
    const top = y0 - 15;
    back.rect(ox + 9, top - 4, 15, 4, shade('#cdbf9f', 0.5));
    back.rect(ox + 9, top - 5, 15, 1, shade('#dacfb2', 0.5));
    for (let x = ox + 10; x < ox + 24; x += 2) back.px(x, top - 3, shade('#6d6a5c', 0.5));
    back.rect(ox + 13, top - 7, 4, 2, shade('#bfb193', 0.5));
    // The lighthouse
    back.rect(ox + 25, top - 11, 2, 11, shade('#e9e3d0', 0.5));
    back.rect(ox + 24, top - 12, 4, 1, shade('#9a9484', 0.5));
    back.px(ox + 25, top - 13, shade('#4c4a42', 0.5));
    // Warden's house ruin and the low white building
    back.rect(ox + 28, y0 - 15, 5, 4, shade('#8d8672', 0.5));
    back.px(ox + 29, y0 - 14, shade('#3d3a30', 0.5));
    back.px(ox + 31, y0 - 14, shade('#3d3a30', 0.5));
    back.rect(ox + 33, y0 - 12, 7, 2, shade('#d8d6c8', 0.5));

    // Pier 45: the long concrete shed
    const pierX = Math.round(vw * 0.12);
    back.depth = 0.42;
    const pH = 8;
    for (let x = pierX; x < vw; x++) {
      back.px(x, pierY, shade('#a7a18e', 0.3));
      back.px(x, pierY + 1, shade('#857f6d', 0.3));
      for (let y = pierY + 2; y < pierY + pH - 1; y++) {
        const seg = (x - pierX) % 11;
        const door = seg >= 3 && seg < 8 && y > pierY + 2;
        back.px(x, y, door ? shade(((x - pierX) / 11 | 0) % 3 === 0 ? '#3c3c3a' : '#b6b5ac', 0.3) : shade('#8f8a78', 0.3));
      }
      back.px(x, pierY + pH - 1, shade('#3e3a31', 0.3));
      if (x % 3 === 0) back.px(x, pierY + pH, shade('#2b2823', 0.3));
    }
    // Crates, a crane and a moored boat, as on the working pier
    back.rect(pierX + 12, pierY + 3, 4, 4, shade('#3f7fb0', 0.3));
    back.line(pierX + 34, pierY + 6, pierX + 40, pierY - 3, shade('#b2502e', 0.3));
    back.rect(pierX + 22, pierY + 5, 8, 3, shade('#e0ddd0', 0.3));
    back.rect(pierX + 25, pierY - 3, 1, 8, shade('#6a655a', 0.3));

    // Rooftops at the bottom of the hill
    const fy = pierY + pH + 4;
    back.depth = 0.26;
    const bh = vh - fy;
    // Brick warehouses on the left
    const bx = Math.round(vw * 0.16);
    back.poly([[bx, fy + 4], [bx + 8, fy - 3], [bx + 22, fy - 3], [bx + 28, fy + 4]], shade('#c25a4a', 0.15));
    back.rect(bx, fy + 4, 28, bh, (x, y) => {
      const v = ((y - fy) % 2 === 0) ^ ((x + (y >> 1)) % 4 === 0);
      return shade(v ? '#8f4a3a' : '#a25644', 0.15);
    });
    back.rect(bx + 3, fy + 7, 7, 1, shade('#d9d4c4', 0.15));
    // Street trees down Columbus
    const blob = (cx, cy, rx, ry) => back.ellipse(cx, cy, rx, ry, (x, y, u, v) => {
      const n = Y.noise(x * 0.5, y * 0.5) + (Y.bayer(x, y) - 0.5) * 0.3 - v * 0.3 - u * 0.1;
      return shade(n > 0.6 ? '#5b7f4a' : n > 0.35 ? '#3d6a3f' : '#2a4c32', 0.1);
    });
    const midX = Math.round(vw * 0.5);
    blob(midX - 8, fy + 6, 13, 9);
    blob(midX + 1, fy + 12, 11, 8);
    blob(midX - 12, fy + 14, 11, 8);
    // Mansard hotel and flat roofs on the right
    const hx = Math.round(vw * 0.62);
    back.rect(midX + 2, fy + 3, hx - midX, bh, shade('#e6e3da', 0.12));
    for (let y = fy + 6; y < vh; y += 5) for (let x = midX + 4; x < hx; x += 5) back.rect(x, y, 2, 3, shade('#49525c', 0.12));
    back.poly([[hx - 1, fy + 6], [hx + 3, fy], [vw + 2, fy], [vw + 2, fy + 6]], shade('#737a84', 0.12));
    back.rect(hx - 1, fy + 6, vw - hx + 3, bh, shade('#c6bda6', 0.12));
    back.rect(hx - 1, fy + 6, vw - hx + 3, 1, shade('#51535a', 0.12));
    for (let x = hx + 7; x < vw; x += 12) {
      back.rect(x, fy - 1, 6, 5, shade('#d3cab2', 0.12));
      back.poly([[x - 1, fy - 1], [x + 3, fy - 4], [x + 7, fy - 1]], shade('#6a7078', 0.12));
      back.rect(x + 2, fy + 1, 2, 3, shade('#3f4750', 0.12));
    }
    for (let y = fy + 9; y < vh; y += 5) for (let x = hx + 2; x < vw; x += 6) back.rect(x, y, 3, 3, shade('#59616a', 0.12));

    // The palm that owns the left of both photographs
    const palmX = Math.max(5, Math.round(vw * 0.09));
    const crownY = Math.round(hy * 0.74);
    front.depth = 0.08;
    const pal = {
      dark: Y.mul('#1f3b2c', A.land), mid: Y.mul('#325c3e', A.land), lit: Y.mul('#54824f', A.land), tip: Y.mul('#7a9b5c', A.land),
      dead: Y.mul('#7c6a44', A.land), deadDark: Y.mul('#54462e', A.land), trunk: Y.mul('#4a3a2c', A.land), trunkLit: Y.mul('#6a543e', A.land),
    };
    // Dead skirt, hanging straight down the trunk
    for (let x = palmX - 8; x < palmX + 11; x++) {
      const len = 14 + Y.noise(x * 0.7, 3) * 16 - Math.abs(x - palmX - 1) * 0.55;
      for (let k = 0; k < len; k++) {
        front.px(x, crownY + 2 + k, (x + k) % 3 === 0 ? pal.deadDark : k > len - 5 ? pal.deadDark : pal.dead);
      }
    }
    // Trunk
    for (let y = crownY + 20; y < vh; y++) {
      for (let x = palmX - 2; x < palmX + 3; x++) {
        front.px(x, y, x < palmX ? pal.trunkLit : (y % 3 === 0 ? pal.dark : pal.trunk));
      }
    }
    // Fronds: a fan of drooping ribs, each bristling with leaflets
    const r = Y.rng(23);
    const fronds = 15;
    for (let f = 0; f < fronds; f++) {
      const ang = Y.lerp(-Math.PI * 1.08, Math.PI * 0.2, f / (fronds - 1)) + (r() - 0.5) * 0.1;
      const len = 21 + r() * 11;
      let x = palmX, y = crownY;
      const droop = 0.022 + r() * 0.012;
      let vx = Math.cos(ang), vy = Math.sin(ang);
      const steps = Math.round(len);
      for (let s = 0; s < steps; s++) {
        x += vx;
        y += vy;
        vy += droop * 1.4;
        const nx = -vy, ny = vx;
        const bristle = 1.5 + (1 - s / steps) * 3.2 + (s % 2) * 1.1;
        for (let b = -bristle; b <= bristle; b += 1) {
          const hang = Math.abs(b) * 0.55;
          const col = Math.abs(b) > bristle - 1 ? pal.dark : (s + Math.round(b)) % 4 === 0 ? pal.dark : s > steps * 0.72 ? pal.tip : f % 3 === 0 ? pal.lit : pal.mid;
          front.px(x + nx * b, y + ny * b + hang, col);
        }
        front.px(x, y, pal.lit);
      }
    }

    // The overhead wire, running up to the right across the sky
    const wY0 = hy + 4, wY1 = hy - Math.round(hy * 0.42);
    const wireU = Y.u32(Y.mul('#1c1c20', A.land));
    for (let x = 0; x < vw; x++) {
      const t = x / vw;
      const y = Math.round(Y.lerp(wY0, wY1, t) + Math.sin(t * Math.PI) * 2);
      if (y >= 0 && y < vh) wire.push({ x, y, c: wireU });
    }

    // Lights
    const lights = [];
    const add = (x, y, col, d, tw, on = 0.1, extra = {}) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= vw || y >= vh) return;
      lights.push({ x, y, u: Y.u32(col), d, tw, on, seed: lights.length * 3.7, ...extra });
    };
    const rl = Y.rng(77);
    const warm = ['#ffd890', '#ffc76a', '#fff0c8', '#ffb45a'];
    // The East Bay, twinkling up the hills
    for (let i = 0; i < 38; i++) {
      const x = vw * 0.42 + rl() * vw * 0.6;
      const yy = hy - 1 - rl() * Math.max(1, hy - eastTop(x) - 1);
      const soft = rl() < 0.6 ? 0.55 : 0;
      add(x, yy, Y.mix(warm[Math.floor(rl() * 4)], A.haze, soft), 0.95, 1.2 + rl() * 3, 0.1 + rl() * 0.5);
    }
    // Tiburon and Belvedere along the far shore on the left
    for (let i = 0; i < 9; i++) add(rl() * vw * 0.4, hy - rl() * 2, Y.mix(warm[Math.floor(rl() * 4)], A.haze, 0.45), 0.9, 1 + rl() * 3, 0.2 + rl() * 0.5);
    // A few on Angel Island
    for (let i = 0; i < 5; i++) add(ax - 40 + rl() * 80, hy - 3 - rl() * 6, '#ffe1a8', 0.85, 0.8, 0.5);
    // The Rock: dock lights and the beacon, one flash every five seconds
    add(ox + 34, y0 - 11, '#ffdfa0', 0.5, 0, 0.3);
    add(ox + 12, top - 3, '#ffdfa0', 0.5, 0, 0.45);
    add(ox + 25, top - 13, '#ffffff', 0.45, 0, 0.1, { period: 5 });
    // Pier 45
    for (let x = pierX + 5; x < vw; x += 11) add(x, pierY + 2, '#ffcf7a', 0.32, 0, 0.2);
    for (let x = pierX + 2; x < vw; x += 7) if (rl() < 0.6) add(x, pierY + 7, '#ffcf7a', 0.32, 0.5, 0.4);
    // Windows on the hill, some of them home and some not
    for (let y = fy + 6; y < vh; y += 5) {
      for (let x = midX + 4; x < hx; x += 5) if (rl() < 0.55) { add(x, y, '#ffd890', 0.12, 0, 0.1 + rl() * 0.5); add(x + 1, y, '#ffd890', 0.12, 0, 0.3); }
    }
    for (let y = fy + 9; y < vh; y += 5) {
      for (let x = hx + 2; x < vw; x += 6) if (rl() < 0.5) { add(x + 1, y + 1, '#ffe2a6', 0.12, 0, 0.1 + rl() * 0.5); add(x, y + 1, '#ffe2a6', 0.12, 0, 0.3); }
    }
    add(bx + 6, fy + 9, '#ffb980', 0.12, 0, 0.4);
    add(bx + 15, fy + 14, '#ffb980', 0.12, 0, 0.5);
    // Street lamps down Columbus
    add(midX + 1, fy + 2, '#ffe6b0', 0.12, 0, 0.05);
    add(midX - 4, vh - 3, '#ffe6b0', 0.1, 0, 0.05);

    const near = hy + 20, far = hy + 13;
    const pickType = (rand, weather, rough) => {
      const roll = rand();
      if (!weather && roll < 0.1) return 'sail';
      // The fleet stays tied up in real weather, and only the cutter goes out
      if (roll < 0.42) return rough ? 'cutter' : 'fishing';
      if (roll < 0.58) return 'cutter';
      if (roll < 0.72) return 'tanker';
      if (roll < 0.86) return 'container';
      if (roll < 0.94) return 'bulk';
      return 'ferry';
    };

    return {
      horizonY: hy,
      water: { y0: hy, y1: pierY },
      lights,
      swayOf: (y) => (y < crownY + 26 ? 1 : Y.clamp(1 - (y - crownY - 26) / 20) * 0.5),
      boatGap: C.fog > 0.5 ? [90, 220] : [60, 170],
      nextBoat: (S, Atm, rand) => {
        const type = pickType(rand, S.rain > 0.3 || S.wind > 0.7 || Atm.lightsOn > 0.7, S.rain > 0.6 || S.wind > 0.7);
        const big = type === 'container' || type === 'tanker' || type === 'bulk';
        return {
          type,
          sprite: ships[type](),
          y: big ? near + (rand() < 0.5 ? 0 : -3) : rand() < 0.5 ? far : near + 3,
          speed: big ? 0.8 + rand() * 0.4 : type === 'sail' ? 0.9 + S.wind : type === 'fishing' ? 0.9 + rand() * 0.6 : 1.4 + rand() * 0.8,
          depth: big ? 0.62 : 0.58,
          wake: type === 'sail' ? 0.4 : 1,
          lights: lightsFor[type],
          haze: 0.14,
        };
      },
    };
  };
})();

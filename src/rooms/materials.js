// The pixel-art vocabulary both rooms are built from. Every function paints
// albedo: what a thing's colour is, before the fire and the daylight get to it.
(() => {
  const Y = window.Yule;
  const M = (Y.mat = {});
  const by = Y.bayer;

  // ---- Walls ----
  M.plaster = (m, x, y, w, h, pal, seed = 1) => {
    m.rect(x, y, w, h, (i, j) => {
      const n = Y.fbm(i * 0.07 + seed, j * 0.09, 3) + (by(i, j) - 0.5) * 0.035;
      const fine = Y.noise(i * 0.7 + seed, j * 0.7);
      if (fine > 0.9 && n < 0.46) return pal.deep;
      return n < 0.4 ? pal.shade : n < 0.66 ? pal.base : pal.lit || pal.base;
    });
  };

  // Horizontal or vertical timber with long grain
  M.timber = (m, x, y, w, h, pal, opts = {}) => {
    const v = opts.vertical, s = opts.seed || 2;
    m.rect(x, y, w, h, (i, j) => {
      const a = v ? i : j, b = v ? j : i;
      const n = Y.fbm(b * 0.035 + s, a * 0.5 + s, 3) + (by(i, j) - 0.5) * 0.08;
      return n < 0.38 ? pal.dark : n < 0.62 ? pal.base : pal.light;
    });
    if (opts.edges !== false) {
      if (v) {
        m.rect(x, y, 1, h, pal.light);
        m.rect(x + w - 1, y, 1, h, pal.deep || pal.dark);
      } else {
        m.rect(x, y, w, 1, pal.light);
        m.rect(x, y + h - 1, w, 1, pal.deep || pal.dark);
      }
    }
  };

  // Stacked logs with pale chinking, the old cabin wall
  M.logWall = (m, x, y, w, h, logH, pal, seed = 4) => {
    for (let ly = y; ly < y + h; ly += logH) {
      for (let j = 0; j < logH; j++) {
        const yy = ly + j;
        if (yy >= y + h) break;
        const t = j / (logH - 1);
        for (let i = x; i < x + w; i++) {
          if (j >= logH - 2) {
            const n = Y.noise(i * 0.8, ly);
            m.px(i, yy, j === logH - 1 ? (n > 0.3 ? pal.chink : pal.chinkDark) : n > 0.55 ? pal.chink : pal.deep);
            continue;
          }
          const n = Y.fbm(i * 0.05 + ly * 0.7 + seed, j * 0.9, 2) + (by(i, yy) - 0.5) * 0.12;
          // Round-log shading: lit along the upper third, dark below
          const form = t < 0.2 ? 0.2 : t < 0.5 ? 0.12 : t < 0.8 ? -0.08 : -0.2;
          const v = n + form;
          m.px(i, yy, v > 0.68 ? pal.light : v > 0.46 ? pal.base : v > 0.3 ? pal.dark : pal.deep);
        }
      }
    }
  };

  // Rounded river rock, from a jittered grid of cells
  M.rock = (m, x, y, w, h, size, colors, opts = {}) => {
    const r = Y.rng(opts.seed || 11);
    const cells = [];
    const cols = Math.ceil(w / size) + 2, rows = Math.ceil(h / (size * 0.72)) + 2;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        cells.push({
          x: x + (i - 0.5 + (j % 2) * 0.5) * size + (r() - 0.5) * size * 0.5,
          y: y + (j - 0.5) * size * 0.72 + (r() - 0.5) * size * 0.34,
          sx: 0.82 + r() * 0.5,
          sy: 1 + r() * 0.3,
          c: colors[Math.floor(r() * colors.length)],
          t: r(),
        });
      }
    }
    const mortar = opts.mortar || '#2c2823';
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (opts.keep && !opts.keep(i, j)) continue;
        let d1 = 1e9, d2 = 1e9, c1 = null;
        for (const c of cells) {
          const dx = (i - c.x) / c.sx, dy = (j - c.y) / c.sy;
          if (Math.abs(dx) > size * 1.5 || Math.abs(dy) > size * 1.5) continue;
          const d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; c1 = c; } else if (d < d2) d2 = d;
        }
        const edge = Math.sqrt(d2) - Math.sqrt(d1);
        if (edge < 1.15) {
          m.px(i, j, mortar);
          continue;
        }
        // Each stone is lit from up and to the left
        const u = (i - c1.x) / size, v = (j - c1.y) / size;
        const lit = -u * 0.6 - v * 0.9 + (by(i, j) - 0.5) * 0.28 + (Y.noise(i * 0.6, j * 0.6) - 0.5) * 0.3;
        const base = Y.rgb(c1.c);
        m.px(i, j, lit > 0.34 ? Y.mix(base, '#ffffff', 0.26) : lit > -0.06 ? base : lit > -0.4 ? Y.dim(base, 0.76) : Y.dim(base, 0.56));
      }
    }
  };

  // ---- Floors ----
  M.terracotta = (m, L, pal) => {
    const { w, h, floorY } = L;
    for (let y = floorY; y < h; y++) {
      const t = (y - floorY) / Math.max(1, h - floorY);
      const rowH = 3 + t * 8;
      const rowIdx = Math.floor(Math.log(1 + t * 6) * 3.6);
      const nextEdge = Math.floor(Math.log(1 + ((y + 1 - floorY) / Math.max(1, h - floorY)) * 6) * 3.6) !== rowIdx;
      const tw = 13 + t * 16;
      for (let x = 0; x < w; x++) {
        const off = (x - w / 2) / (0.62 + t * 0.55);
        const tile = Math.floor(off / tw + (rowIdx % 2) * 0.5);
        const frac = off / tw + (rowIdx % 2) * 0.5 - tile;
        const hue = Y.noise(tile * 3.1, rowIdx * 5.7);
        const base = hue < 0.33 ? pal.dark : hue < 0.72 ? pal.base : pal.light;
        const grout = nextEdge || frac < 1.2 / tw;
        const n = Y.noise(x * 0.6, y * 0.8) + (by(x, y) - 0.5) * 0.12;
        m.px(x, y, grout ? pal.grout : n < 0.34 ? Y.dim(base, 0.88) : base);
      }
      void rowH;
    }
  };

  M.planks = (m, L, pal) => {
    const { w, h, floorY } = L;
    for (let y = floorY; y < h; y++) {
      const t = (y - floorY) / Math.max(1, h - floorY);
      const pw = 11 + t * 14;
      for (let x = 0; x < w; x++) {
        const off = (x - w / 2) / (0.84 + t * 0.3);
        const board = Math.floor(off / pw);
        const frac = off / pw - board;
        const hue = Y.noise(board * 3.7, 1.1);
        const n = Y.fbm(board * 11.3, (y - floorY) * 0.08 / (0.3 + t), 2) + (by(x, y) - 0.5) * 0.1;
        const base = hue < 0.35 ? pal.dark : hue < 0.75 ? pal.base : pal.light;
        m.px(x, y, frac < 1 / pw ? pal.deep : n < 0.4 ? Y.dim(base, 0.86) : base);
      }
    }
  };

  // ---- Persian rug, foreshortened on the floor ----
  const RUG_PAL = {
    field: '#8a1f24', fieldDark: '#671519', navy: '#1d2a54', navyLit: '#2e4178', cream: '#dccba0', gold: '#b98a3a', rust: '#b5502a', teal: '#2f6c6a', fringe: '#e4d8bc',
  };
  // Worked in rug units, not screen pixels, with the far edge foreshortened, so that the
  // borders stay thin and the field stays busy however little of the rug is on screen.
  M.rug = (m, L, cx, halfTop, y0, y1, pal = RUG_PAL) => {
    const rows = y1 - y0;
    const flare = 1 + Math.min(0.5, rows / 110);
    const squash = L.portrait ? 1.7 : 2.6;
    const halfRug = halfTop * 1.02;
    const vLen = Math.max(halfRug * 1.5, rows * squash * 1.04);
    const medY = L.portrait ? vLen * 0.5 : Math.min(vLen * 0.5, rows * squash * 0.72);
    for (let y = Math.round(y0); y < y1; y++) {
      const t = (y - y0) / rows;
      const half = halfTop * Y.lerp(1, flare, t);
      const vy = (y - y0) * squash * (1 + t * 0.3);
      for (let x = Math.round(cx - half); x < cx + half; x++) {
        const hx = (x + 0.5 - cx) * (halfRug / half);
        const du = halfRug - Math.abs(hx);
        const dv = Math.min(vy, vLen - vy);
        const edge = Math.min(du, dv);
        let c;
        if (edge < 2) c = pal.fieldDark;
        else if (edge < 4) c = pal.gold;
        else if (edge < 12) {
          // The main border: a running vine of little diamonds on navy
          const along = du < dv ? vy : hx + 200;
          const k = ((along / 7) % 2 + 2) % 2;
          const across = edge - 8;
          const diamond = Math.abs(k - 1) * 3.4 + Math.abs(across);
          c = diamond < 1.9 ? pal.cream : diamond < 3.1 ? pal.rust : diamond < 3.9 ? pal.gold : pal.navy;
        } else if (edge < 14) c = pal.cream;
        else if (edge < 18) {
          const along = du < dv ? vy : hx + 200;
          c = (((along / 3) | 0) & 1) ? pal.teal : pal.fieldDark;
        } else if (edge < 20) c = pal.gold;
        else {
          // The field: a stepped medallion, corner spandrels, little flowers everywhere
          const ax = Math.abs(hx), ay = Math.abs(vy - medY);
          const md = ax / 1.5 + ay;
          const steps = Math.round(md / 4) * 4;
          if (steps < 9) c = pal.gold;
          else if (steps < 17) c = (((ax + ay) / 3) | 0) % 2 ? pal.cream : pal.navyLit;
          else if (steps < 25) c = pal.navy;
          else if (steps < 29) c = pal.cream;
          else {
            const cu = Math.floor((hx + 400) / 8), cv = Math.floor(vy / 8);
            const fu = (hx + 400) / 8 - cu - 0.5, fv = vy / 8 - cv - 0.5;
            const r = Math.abs(fu) + Math.abs(fv);
            const shift = (cu + cv) % 2 === 0;
            if (shift && r < 0.22) c = (cu * 3 + cv) % 3 === 0 ? pal.cream : pal.gold;
            else if (shift && r < 0.44) c = (cu + cv * 2) % 4 === 0 ? pal.teal : pal.navy;
            else if (!shift && r < 0.14) c = pal.rust;
            else c = by(x, y) < 0.1 ? pal.fieldDark : pal.field;
          }
        }
        m.px(x, y, Y.noise(x * 0.2, y * 0.35) > 0.8 ? Y.mix(c, pal.cream, 0.1) : c);
      }
    }
    // Fringe along the near edge, if it reaches the screen
    const half = halfTop * flare;
    if (y1 < L.h - 1) for (let x = Math.round(cx - half); x < cx + half; x++) if (x % 2 === 0) m.rect(x, y1, 1, 2, pal.fringe);
  };

  // ---- Fittings ----
  // A carved wooden corbel: a scroll stepped out of a beam
  M.corbel = (m, x, y, w, h, pal, flip = false) => {
    for (let j = 0; j < h; j++) {
      const t = j / (h - 1);
      // An S-curve, deep at the top and pinched at the waist
      const reach = w * (t < 0.34 ? 1 : t < 0.6 ? 0.68 : t < 0.82 ? 0.82 : 0.42);
      for (let i = 0; i < reach; i++) {
        const xx = flip ? x + w - 1 - i : x + i;
        const carve = (j % 6 === 3 && i > 1 && i < reach - 1) || (i === Math.round(reach * 0.5) && t > 0.1 && t < 0.3);
        const edge = i >= reach - 1;
        m.px(xx, y + j, edge ? pal.deep : carve ? pal.dark : i < 2 ? pal.light : pal.base);
      }
    }
  };

  // ---- Windows ----
  M.hole = (m, r, inside) => {
    for (let j = r.y; j < r.y + r.h; j++) {
      for (let i = r.x; i < r.x + r.w; i++) if (!inside || inside(i, j)) m.clear(i, j);
    }
  };
  // Greene and Greene lattice: long lights with little squares gathered in the corners
  M.lattice = (m, r, c, hi) => {
    const bar = (x, y, w, h) => m.rect(x, y, w, h, c);
    const inset = Math.round(r.w * 0.2), top = Math.round(r.h * 0.17), bot = Math.round(r.h * 0.11);
    bar(r.x + inset, r.y, 1, r.h);
    bar(r.x + r.w - 1 - inset, r.y, 1, r.h);
    const mid = r.x + Math.round(r.w / 2);
    bar(mid, r.y + top, 1, r.h - top);
    bar(r.x, r.y + top, r.w, 1);
    bar(r.x, r.y + r.h - 1 - bot, r.w, 1);
    // The little grid in the upper corners
    for (const gx of [r.x, r.x + r.w - inset]) {
      bar(gx + Math.round(inset / 2), r.y, 1, top);
      bar(gx, r.y + Math.round(top / 2), inset, 1);
    }
    // And the row of small lights along the bottom
    const n = Math.max(3, Math.round(r.w / 12));
    for (let i = 1; i < n; i++) bar(r.x + inset + Math.round(((r.w - inset * 2) * i) / n), r.y + r.h - bot, 1, bot);
    if (hi) bar(r.x, r.y + top + 1, r.w, 0);
  };
  M.casement = (m, r, c) => {
    m.rect(r.x + Math.round(r.w / 2), r.y, 2, r.h, c);
    m.rect(r.x, r.y + Math.round(r.h * 0.22), r.w, 1, c);
  };
  // ---- The firebox: splayed firebrick sides, a soot-black back ----
  M.firebox = (m, L, pal) => {
    const o = L.open;
    const inside = (i, j) => L.openAt(i, j);
    const bx = o.x + Math.round(o.w * 0.11), bw = o.w - Math.round(o.w * 0.22);
    const floorTop = o.y + o.h - Math.round(o.h * 0.14);
    for (let j = o.y; j < o.y + o.h; j++) {
      for (let i = o.x; i < o.x + o.w; i++) {
        if (!inside(i, j)) continue;
        let c;
        if (j >= floorTop) {
          // Hearth floor, ash-grey
          const n = Y.noise(i * 0.5, j * 0.9) + (by(i, j) - 0.5) * 0.2;
          c = n < 0.45 ? pal.ash : pal.ashLit;
        } else {
          const left = i < bx, right = i >= bx + bw;
          const soot = Y.clamp(1 - (j - o.y) / (o.h * 0.75));
          if (left || right) {
            // Courses run in toward the back, so the sides read as receding
            const t = left ? (bx - i) / (bx - o.x) : (i - bx - bw) / (bx - o.x);
            const slope = (j - o.y - o.h * 0.4) * t * 0.45;
            const row = Math.floor((j + slope) / 5);
            const col = Math.floor((left ? i : -i) / 4 + (row % 2) * 0.5);
            const joint = (j + slope) % 5 < 1 || (left ? i : -i) % 8 < 0.8;
            const hue = Y.noise(col * 2.3, row * 4.1);
            c = joint ? pal.joint : hue < 0.4 ? pal.brickDark : pal.brick;
            c = Y.dim(c, 0.9);
          } else {
            const row = Math.floor(j / 5);
            const col = Math.floor((i + (row % 2) * 5) / 10);
            const joint = j % 5 === 4 || (i + (row % 2) * 5) % 10 === 9;
            const hue = Y.noise(col * 3.1, row * 2.7);
            c = joint ? pal.joint : hue < 0.4 ? pal.brickDark : pal.brick;
            c = Y.dim(c, 0.74);
          }
          if (by(i, j) < soot * 1.05 - 0.04) c = Y.mix(c, pal.soot, 0.7);
        }
        m.px(i, j, c);
      }
    }
    // Where back meets side, a dark line for depth
    for (let j = o.y; j < floorTop; j++) {
      for (const xx of [bx, bx + bw - 1]) if (inside(xx, j)) m.px(xx, j, pal.soot);
    }
    for (let i = o.x; i < o.x + o.w; i++) if (inside(i, floorTop)) m.px(i, floorTop, pal.joint);
  };

  // ---- The logs ----
  // Fire is not seasonal: the same honest orange fire everywhere, on the local wood.
  M.woods = {
    oak: { bark: '#463223', barkDark: '#241811', barkLit: '#6e5139', cut: '#b48b5e', ring: '#7a5a39', furrow: true, sound: { rate: 2.6, cluster: 0.08, pop: 0.09, bright: 0.68 } },
    eucalyptus: { bark: '#a39a86', barkDark: '#5d5345', barkLit: '#d6cdb4', cut: '#c99b6f', ring: '#8a5f3e', strip: true, sound: { rate: 10, cluster: 0.36, pop: 0.16, bright: 1.25 } },
    pine: { bark: '#5e3a24', barkDark: '#2f1c11', barkLit: '#8c5a35', cut: '#d6b07a', ring: '#a57b47', plated: true, sound: { rate: 5.2, cluster: 0.2, pop: 0.2, bright: 1 } },
    fir: { bark: '#4c4038', barkDark: '#27211c', barkLit: '#74645a', cut: '#cfae7e', ring: '#9d7c50', furrow: true, sound: { rate: 4, cluster: 0.16, pop: 0.14, bright: 0.9 } },
  };

  // One log, as a shaded cylinder with one sawn end showing
  const drawLog = (m, x0, y0, x1, y1, r, wood, ember, seed) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const minX = Math.floor(Math.min(x0, x1) - r - 2), maxX = Math.ceil(Math.max(x0, x1) + r + 2);
    const minY = Math.floor(Math.min(y0, y1) - r - 2), maxY = Math.ceil(Math.max(y0, y1) + r + 2);
    for (let j = minY; j <= maxY; j++) {
      for (let i = minX; i <= maxX; i++) {
        const px = i + 0.5 - x0, py = j + 0.5 - y0;
        const a = px * ux + py * uy, b = px * nx + py * ny;
        if (a < 0 || a > len || Math.abs(b) > r + (Y.noise(a * 0.4 + seed, seed) - 0.5) * 1.6) continue;
        const v = b * (ny >= 0 ? 1 : -1) / r;
        const n = Y.fbm(a * 0.14 + seed, b * 0.9, 2) + (by(i, j) - 0.5) * 0.16;
        let c;
        if (wood.strip) {
          // Eucalyptus sheds long pale strips
          c = n > 0.6 ? wood.barkLit : n > 0.42 ? wood.bark : wood.barkDark;
        } else if (wood.plated) {
          const plate = Y.noise(a * 0.3 + seed, b * 0.8) > 0.5;
          c = plate ? (v < 0 ? wood.barkLit : wood.bark) : wood.barkDark;
        } else {
          const furrow = Y.noise(a * 0.09 + seed, b * 1.7);
          c = furrow > 0.56 ? wood.barkDark : v < -0.3 ? wood.barkLit : wood.bark;
        }
        // Form shading: lit by the fire above, dark underneath
        if (v > 0.45) c = Y.dim(c, 0.56);
        else if (v > 0.1) c = Y.dim(c, 0.82);
        // Burning: char on the upper side, with live cracks flagged for the ember pass
        const charred = v < -0.12 && n + (-v) * 0.24 > 0.6;
        if (ember && charred) {
          m.mark = 2;
          m.px(i, j, '#17110e');
          m.mark = 1;
        } else m.px(i, j, c);
      }
    }
  };

  M.fireLogs = (m, L, woodKeys) => {
    const f = L.fire;
    const W = (i) => M.woods[woodKeys[i % woodKeys.length]];
    const cx = f.cx, by0 = f.by, w = f.w;
    const r = Math.max(5, Math.round(L.open.h * 0.092));
    m.mark = 0;
    // A back log, up against the firebrick: fire will mostly hide it
    drawLog(m, cx - w * 0.46, by0 - r * 2.3, cx + w * 0.44, by0 - r * 2.1, r * 1.05, W(0), false, 2);
    m.mark = 1;
    drawLog(m, cx - w * 0.3, by0 - r * 1.3, cx + w * 0.1, by0 - r * 2.4, r * 0.8, W(1), true, 17);
    drawLog(m, cx - w * 0.1, by0 - r * 2.2, cx + w * 0.36, by0 - r * 1.2, r * 0.74, W(2), true, 29);
    drawLog(m, cx - w * 0.44, by0 - r * 0.62, cx + w * 0.42, by0 - r * 0.8, r, W(3), true, 41);
    m.mark = 0;
  };

  // Iron firedogs standing either side of the logs
  M.andirons = (m, L, c = '#141210', hi = '#4a4640', brass) => {
    const f = L.fire;
    const by0 = L.open.y + L.open.h - 1;
    const h = Math.max(14, Math.round(L.open.h * 0.26));
    m.mark = 1;
    for (const x of [Math.round(f.cx - f.w * 0.36), Math.round(f.cx + f.w * 0.36)]) {
      m.rect(x - 1, by0 - h, 3, h, c);
      m.rect(x - 3, by0 - 2, 7, 2, c);
      m.rect(x - 4, by0, 2, 1, c);
      m.rect(x + 3, by0, 2, 1, c);
      m.rect(x, by0 - h, 1, h - 1, hi);
      // Ball finial
      m.ellipse(x + 0.5, by0 - h - 2, 2.6, 2.6, (i, j, u, v) => (u + v < -0.5 ? (brass ? '#f2d57e' : hi) : brass || c));
    }
    m.mark = 0;
  };

  M.fireTools = (m, x, floorY, h, c = '#17130f', hi = '#4d463c', brass) => {
    m.rect(x - 4, floorY + 1, 9, 1, c);
    m.rect(x, floorY - h, 1, h + 1, c);
    m.rect(x - 5, floorY - h, 11, 1, c);
    for (const [dx, type] of [[-5, 'poker'], [0, 'broom'], [5, 'shovel']]) {
      const tl = h - 3;
      m.rect(x + dx, floorY - h - 3, 1, 3, brass || hi);
      m.rect(x + dx, floorY - h, 1, tl, c);
      const by0 = floorY - h + tl;
      if (type === 'broom') {
        m.rect(x + dx - 2, by0 - 6, 5, 7, '#7a5f34');
        for (let i = 0; i < 5; i += 2) m.rect(x + dx - 2 + i, by0 - 6, 1, 7, '#4f3d20');
      } else if (type === 'shovel') m.rect(x + dx - 1, by0 - 2, 3, 3, hi);
      else m.rect(x + dx - 1, by0 - 1, 1, 2, c);
    }
  };

  // ---- Spanish things ----
  // The big Talavera urn from the photograph: blue rim, yellow band, prickly pear, iron stand
  M.urn = (m, cx, baseY, h, opts = {}) => {
    const W = h * 0.48;
    const profile = (t) => {
      // t = 0 rim, 1 foot. Wide belly, narrow neck.
      if (t < 0.1) return 0.74 - t * 0.6;
      if (t < 0.22) return 0.68 + (t - 0.1) * 1.4;
      if (t < 0.92) return 0.85 + Math.sin(((t - 0.22) / 0.7) * Math.PI) * 0.17 - (t - 0.22) * 0.5;
      return 0.5;
    };
    const top = baseY - h;
    // Iron stand
    const standH = Math.round(h * 0.09);
    m.rect(cx - W * 0.62, baseY - standH, W * 1.24, 2, '#1c1a18');
    m.rect(cx - W * 0.6, baseY - standH + 2, 2, standH - 2, '#141210');
    m.rect(cx + W * 0.6 - 2, baseY - standH + 2, 2, standH - 2, '#141210');
    for (let i = -W * 0.5; i < W * 0.5; i += 4) m.px(cx + i, baseY - standH + 1, '#3c3a36');
    const bh = h - standH;
    // Handles behind the shoulders
    for (const s of [-1, 1]) {
      for (let a = -1.3; a < 1.5; a += 0.08) {
        const x = cx + s * (W * 0.84 + Math.cos(a) * W * 0.26);
        const y = top + bh * 0.26 + Math.sin(a) * bh * 0.14;
        m.px(x, y, '#2b4f9a');
        m.px(x + s, y, '#6d8fce');
      }
    }
    const r = Y.rng(opts.seed || 4);
    for (let j = 0; j < bh; j++) {
      const t = j / bh;
      const halfW = W * profile(t);
      for (let x = Math.round(cx - halfW); x <= cx + halfW; x++) {
        const u = (x + 0.5 - cx) / halfW;
        // Glaze highlight sits up and left, the far side falls away
        const form = -u * 0.55 - (t - 0.3) * 0.3 + (by(x, top + j) - 0.5) * 0.18;
        let c = '#eadfca';
        if (t < 0.06) c = '#2b4f9a';
        else if (t < 0.085) c = '#7f98c9';
        else if (t < 0.11) c = '#d9b64a';
        else if (t < 0.22) {
          // The painted border of arches
          const a = Math.floor((u + 1) * 7);
          const fu = (u + 1) * 7 - a, fv = (t - 0.11) / 0.11;
          c = Math.hypot(fu - 0.5, fv - 0.8) < 0.42 ? (a % 2 ? '#2b4f9a' : '#c9772f') : '#dbe3ee';
        } else if (t < 0.245) c = '#d9b64a';
        else if (t > 0.9) c = t > 0.96 ? '#2b4f9a' : '#d9b64a';
        else if (by(x, top + j) < 0.1 && Y.noise(x * 0.7, j * 0.7) > 0.55) c = '#a9c0dc';
        c = form > 0.34 ? Y.mix(c, '#ffffff', 0.25) : form < -0.32 ? Y.dim(c, 0.62) : form < -0.08 ? Y.dim(c, 0.84) : c;
        m.px(x, top + j, c);
      }
    }
    // Prickly pear paddles painted on the belly, with yellow flowers and orange fruit
    const pad = (px, py, rx, ry, a, col) => {
      for (let v = -ry; v <= ry; v += 0.5) {
        for (let u = -rx; u <= rx; u += 0.5) {
          if ((u * u) / (rx * rx) + (v * v) / (ry * ry) > 1) continue;
          const xr = u * Math.cos(a) - v * Math.sin(a), yr = u * Math.sin(a) + v * Math.cos(a);
          const shade = (Y.bayer(Math.round(px + xr), Math.round(py + yr)) + (u / rx) * 0.3) > 0.6;
          m.px(px + xr, py + yr, shade ? Y.dim(col, 0.78) : col);
        }
      }
    };
    const py = top + bh * 0.64, s = h * 0.085;
    pad(cx - s * 0.9, py + s * 1.4, s * 1.1, s * 1.5, 0.35, '#3f8f5b');
    pad(cx + s * 0.8, py + s * 0.9, s * 1.05, s * 1.3, -0.45, '#4d9b5f');
    pad(cx - s * 1.5, py - s * 0.5, s * 0.8, s * 1.1, -0.2, '#5ba866');
    pad(cx + s * 0.2, py - s * 1, s * 0.75, s * 1, 0.3, '#3f8f5b');
    for (const [fx, fy] of [[-1.4, -1.7], [-0.5, -2.1], [0.9, -2.0], [1.9, 0.0], [2.0, 0.9]]) {
      m.rect(cx + fx * s, py + fy * s, 2, 3, r() < 0.5 ? '#e5962f' : '#d97b2a');
      m.px(cx + fx * s, py + fy * s, '#f4d464');
    }
    m.rect(cx - 2.3 * s, py - 0.1 * s, 2, 2, '#f4d464');
    return { rimY: top + 2, rimW: W * 0.7 };
  };

  // Schefflera: stems rising out of the urn into umbrellas of leaves
  M.schefflera = (m, cx, rimY, h, spread, seed = 5) => {
    const r = Y.rng(seed);
    const stems = [[-0.46, 0.8], [0.06, 1], [0.54, 0.74]];
    const leaf = (x, y, a, len, col) => {
      const dark = Y.dim(col, 0.74);
      for (let i = 0; i < len; i++) {
        const wid = Math.sin((i / (len - 1 || 1)) * Math.PI) * (len * 0.2 + 0.4);
        for (let w = -wid; w <= wid; w += 0.7) {
          m.px(x + Math.cos(a) * i - Math.sin(a) * w, y + Math.sin(a) * i + Math.cos(a) * w, w > 0 ? dark : col);
        }
      }
    };
    for (const [sx, sh] of stems) {
      let x = cx + sx * 3, y = rimY;
      const tx = cx + sx * spread, ty = rimY - h * sh;
      const n = 22;
      for (let k = 0; k < n; k++) {
        x = Y.lerp(x, tx, 0.1);
        y = Y.lerp(y, ty, 0.1);
        m.px(x, y, '#776a4c');
        m.px(x + 1, y, '#50482f');
      }
    }
    const greens = ['#2c5e3c', '#3a7247', '#4d8a55', '#6aa263', '#224a30'];
    const count = Math.round(spread * h * 0.17);
    const crown = [];
    for (let i = 0; i < count; i++) {
      const a = r() * Y.TAU, rad = Math.sqrt(r());
      crown.push({ x: cx + Math.cos(a) * rad * spread * 1.1, y: rimY - h * 0.7 + Math.sin(a) * rad * h * 0.42, g: r(), a: r() * Y.TAU, l: 4 + Math.floor(r() * 3) });
    }
    crown.sort((p, q) => p.g - q.g);
    for (const c of crown) {
      // Light-side leaves on top
      const k = Math.floor(c.g * 4.99);
      leaf(c.x, c.y, c.a, c.l, greens[c.g < 0.1 ? 4 : k]);
    }
  };

  // A silver or iron candlestick. Returns the flame position for the engine to animate.
  M.candlestick = (m, x, baseY, h, metal = '#8f8a7d', hi = '#d6d2c4', wax = '#ece4cd') => {
    m.rect(x - 3, baseY - 1, 7, 1, metal);
    m.rect(x - 2, baseY - 2, 5, 1, hi);
    m.rect(x, baseY - h, 1, h - 2, metal);
    m.rect(x - 1, baseY - Math.round(h * 0.5), 3, 1, hi);
    m.rect(x - 2, baseY - h, 5, 1, hi);
    const cH = 7;
    m.rect(x, baseY - h - cH, 2, cH, wax);
    return { x, y: baseY - h - cH - 1 };
  };

  // ---- Tahoe things ----
  // A rainbow trout on a plaque
  M.trout = (m, cx, cy, L0, plaque) => {
    const H = Math.round(L0 * 0.26);
    if (plaque && plaque.board) {
      // An old barn board, for hanging against stone
      const bw = Math.round(L0 * 1.12), bh = Math.round(H * 1.36);
      M.timber(m, cx - bw / 2, cy - bh / 2 + 1, bw, bh, plaque, { seed: 15 });
      m.rect(cx - bw / 2 + 1, cy + bh / 2 + 1, bw, 1, '#15100c');
      for (const px of [cx - bw / 2 + 3, cx + bw / 2 - 4]) for (const py of [cy - bh / 2 + 3, cy + bh / 2 - 2]) m.px(px, py, '#120c08');
    } else if (plaque) {
      const pW = L0 * 0.62, pH = H * 1.05;
      m.ellipse(cx, cy + 1, pW, pH, (i, j, u, v) => {
        const d = Math.hypot(u, v);
        const n = Y.noise(i * 0.08, j * 0.9) + (by(i, j) - 0.5) * 0.14;
        if (d > 0.93) return plaque.deep;
        if (d > 0.87) return plaque.light;
        return n > 0.52 ? plaque.base : plaque.dark;
      });
    }
    const x0 = Math.round(cx - L0 / 2);
    // Upper and lower body curves, head to the left
    const up = (t) => (t < 0.12 ? 0.35 + (t / 0.12) * 0.5 : t < 0.42 ? 0.85 + ((t - 0.12) / 0.3) * 0.15 : 1 - Math.pow((t - 0.42) / 0.58, 1.5) * 0.82);
    const dn = (t) => (t < 0.12 ? 0.26 + (t / 0.12) * 0.46 : t < 0.5 ? 0.72 + ((t - 0.12) / 0.38) * 0.28 : 1 - Math.pow((t - 0.5) / 0.5, 1.3) * 0.84);
    const r = Y.rng(31);
    const bodyLen = Math.round(L0 * 0.86);
    const HH = H * 0.52;
    for (let i = 0; i < bodyLen; i++) {
      const t = i / bodyLen;
      const top = Math.round(cy - up(t) * HH), bot = Math.round(cy + dn(t) * HH);
      for (let y = top; y <= bot; y++) {
        const v = (y - top) / Math.max(1, bot - top);
        let c;
        if (v < 0.3) c = '#4c5c3c';
        else if (v < 0.42) c = '#7c8a5c';
        else if (v < 0.58) c = (by(x0 + i, y) < 0.32) ? '#c87a78' : '#d0635f';
        else if (v < 0.72) c = '#d4cdaa';
        else c = '#efead4';
        if (y === top) c = '#2e3a26';
        if (y === bot) c = '#a5a184';
        m.px(x0 + i, y, c);
      }
      // Spots along the back and down the tail
      if (r() < 0.55) {
        const sy = top + Math.floor(r() * (bot - top) * 0.5);
        m.px(x0 + i, sy, '#1a2015');
      }
    }
    // Head: gill plate, eye, jaw
    const gx = x0 + Math.round(L0 * 0.14);
    for (let y = -HH * 0.55; y < HH * 0.6; y++) m.px(gx + Math.abs(y) * 0.25, cy + y, '#3d4230');
    m.rect(x0 + Math.round(L0 * 0.07), cy - Math.round(HH * 0.28), 2, 2, '#f2e2a0');
    m.px(x0 + Math.round(L0 * 0.07), cy - Math.round(HH * 0.28), '#0e0e0c');
    m.line(x0, cy + 1, x0 + Math.round(L0 * 0.09), cy + Math.round(HH * 0.3), '#3d2a24');
    // Tail
    const tx = x0 + bodyLen - 1;
    m.poly([[tx - 1, cy - 1], [tx + L0 * 0.14, cy - HH * 0.82], [tx + L0 * 0.1, cy + 1], [tx + L0 * 0.14, cy + HH * 0.82], [tx - 1, cy + 1]], (x, y) => ((x + y) % 3 === 0 ? '#2e3a26' : '#5a6848'));
    // Fins
    const fin = (t, side, len) => {
      const fx = x0 + Math.round(L0 * t);
      const fy = side < 0 ? Math.round(cy - up(t) * HH) : Math.round(cy + dn(t) * HH);
      m.poly([[fx, fy], [fx + len, fy], [fx + len * 0.8, fy + side * len * 0.55]], (x, y) => ((x * 2 + y) % 3 === 0 ? '#39452d' : '#7f7a55'));
    };
    fin(0.38, -1, L0 * 0.14);
    fin(0.72, -1, L0 * 0.06);
    fin(0.2, 1, L0 * 0.09);
    fin(0.48, 1, L0 * 0.08);
    fin(0.68, 1, L0 * 0.07);
  };

  // Shaggy sheepskin: a heap of cream fleece with hanging locks
  M.sheepskin = (m, x, y, w, h, opts = {}) => {
    const r = Y.rng(opts.seed || 3);
    const pal = opts.pal || ['#f2ead8', '#e0d5bd', '#c8baa0', '#a4957c'];
    const drape = opts.drape || 0;
    for (let i = 0; i < w; i++) {
      const u = i / (w - 1);
      const top = y + (1 - Math.sin(u * Math.PI)) * h * 0.26 + (Y.noise(i * 0.4, 2) - 0.5) * 2;
      const bottom = y + h + drape * Math.pow(Math.sin(u * Math.PI), 0.7) + (Y.noise(i * 0.6, 8) - 0.5) * 6 + (i % 3 === 0 ? 2 : 0);
      for (let j = Math.round(top); j < bottom; j++) {
        const v = (j - top) / Math.max(1, bottom - top);
        const n = Y.noise(i * 0.8, j * 0.42) + (by(i, j) - 0.5) * 0.24;
        // Vertical locks give it the shag
        const lock = Math.sin(i * 1.5 + Y.noise(j * 0.2, i) * 5);
        const tone = n + lock * 0.16 - v * 0.34;
        m.px(i + x, j, tone > 0.5 ? pal[0] : tone > 0.26 ? pal[1] : tone > 0.05 ? pal[2] : pal[3]);
      }
    }
    void r;
  };

  // A whole fleece lying on the floor: an irregular hide with leg stubs, and curls all over
  M.pelt = (m, cx, cy, rx, ry, seed = 5) => {
    const pal = ['#ece3cf', '#d8ccb4', '#bcae95', '#94856e', '#55493a'];
    const inside = (x, y) => {
      const u = (x - cx) / rx, v = (y - cy) / ry;
      const a = Math.atan2(v, u);
      // Four lobes for the legs, wandering a little
      const lobes = 0.86 + 0.12 * Math.cos(a * 4 + 0.6) + (Y.noise(x * 0.3 + seed, y * 0.5) - 0.5) * 0.2;
      return u * u + v * v < lobes * lobes;
    };
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 3; y++) {
      for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
        if (!inside(x, y) && inside(x, y - 2)) m.px(x, y, pal[4]);
      }
    }
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
      for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
        if (!inside(x, y)) continue;
        // Big soft clumps of fleece, with a darker line under each
        const clump = Y.noise(x * 0.26 + seed, y * 0.5);
        const under = Y.noise(x * 0.26 + seed, (y - 1.4) * 0.5);
        const edge = !inside(x, y + 1) || !inside(x + 1, y);
        const tone = clump + (under - clump) * 1.8 + (edge ? -0.26 : 0) + (cy - y) / ry * 0.06 + (by(x, y) - 0.5) * 0.05;
        m.px(x, y, tone > 0.62 ? pal[0] : tone > 0.44 ? pal[1] : tone > 0.28 ? pal[2] : pal[3]);
      }
    }
  };

  M.snowshoes = (m, x, y, h) => {
    const one = (cx, cy, tilt) => {
      for (let t = 0; t < 1; t += 0.006) {
        const a = t * Y.TAU;
        const rx = Math.max(1, h * 0.17 * (1 - Math.max(0, Math.sin(a)) * 0.4)), ry = h * 0.48;
        const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
        const nx = cx + px * Math.cos(tilt) - py * Math.sin(tilt), ny = cy + px * Math.sin(tilt) + py * Math.cos(tilt);
        m.px(nx, ny, '#c49a5e');
        m.px(nx + 1, ny, '#7c5a2c');
      }
      for (let i = -h * 0.4; i < h * 0.42; i += 3) {
        for (let k = -h * 0.14; k < h * 0.15; k += 1.5) {
          const px = k * (1 - Math.abs(i) / (h * 0.55)), py = i + (k > 0 ? 1 : 0);
          m.px(cx + px * Math.cos(tilt) - py * Math.sin(tilt), cy + px * Math.sin(tilt) + py * Math.cos(tilt), '#4b3a24');
        }
      }
    };
    one(x - h * 0.08, y, 0.28);
    one(x + h * 0.08, y, -0.28);
    m.rect(x - 2, y - 2, 5, 4, '#3a2a18');
  };

  // A wool camp blanket folded over the end of a beam, with the broad stripes
  M.blanket = (m, x, y, w, h) => {
    const bands = ['#e9dfc6', '#e9dfc6', '#2a4a7a', '#c9a13e', '#b0362c', '#e9dfc6', '#e9dfc6', '#3a6a4c', '#e9dfc6'];
    for (let j = 0; j < h; j++) {
      const c = bands[Math.floor((j / h) * bands.length)];
      for (let i = 0; i < w; i++) {
        const fold = i < 2 ? 0.82 : i >= w - 2 ? 0.74 : 1;
        m.px(x + i, y + j, Y.dim(c, fold * (by(x + i, y + j) < 0.12 ? 0.92 : 1)));
      }
    }
    for (let i = 0; i < w; i += 2) m.rect(x + i, y + h, 1, 2, '#d9cfb6');
  };

  // A bottle on a shelf: whiskey in Tahoe, mezcal on Russian Hill
  M.bottle = (m, x, baseY, pal) => {
    m.rect(x, baseY - 16, 9, 16, pal.glass);
    m.rect(x + 1, baseY - 17, 7, 1, pal.dark);
    m.rect(x + 3, baseY - 25, 3, 8, pal.dark);
    m.rect(x + 3, baseY - 27, 3, 2, pal.cap);
    m.rect(x + 1, baseY - 14, 1, 12, pal.hi);
    m.rect(x + 8, baseY - 16, 1, 16, pal.dark);
    m.rect(x + 1, baseY - 10, 7, 7, pal.label);
    m.rect(x + 2, baseY - 9, 5, 1, pal.ink);
    m.rect(x + 3, baseY - 7, 3, 1, pal.mark);
    m.rect(x + 2, baseY - 5, 5, 1, pal.ink2);
  };
  M.bottles = {
    whiskey: { glass: '#7a3f13', hi: '#d6863a', dark: '#3e1e08', cap: '#c7ae80', label: '#e7dcbc', ink: '#3a2a18', mark: '#9c2f24', ink2: '#6a5a44' },
    mezcal: { glass: '#3fa968', hi: '#b4f4bc', dark: '#1f7043', cap: '#c9a26a', label: '#f2e9d0', ink: '#1f3a2a', mark: '#c23a24', ink2: '#5e6a4e' },
  };

  // ---- What's on the mantel, by the calendar. The fire itself never changes. ----
  // Small hand-placed sprites stay legible at this size where shaded shapes turn to mush.
  M.pumpkin = (m, cx, baseY, r) => {
    m.ellipse(cx, baseY - r * 0.82, r * 1.15, r * 0.84, (x, y, u, v) => {
      const rib = Math.abs(Math.sin(u * 4.4)) < 0.28;
      const lit = -u * 0.5 - v * 0.6 + (by(x, y) - 0.5) * 0.3;
      return rib ? '#a64f12' : lit > 0.25 ? '#f2a63c' : lit > -0.2 ? '#e0822a' : '#b25e16';
    });
    m.rect(cx - 1, baseY - r * 1.8, 3, 3, '#5f7030');
    m.px(cx + 2, baseY - r * 1.8, '#7f9140');
  };

  // A carved pumpkin. Hands back the face, so that the room can light it after dark.
  const JACK_FACE = [
    '..#.......#..',
    '.###.....###.',
    '#####...#####',
    '......#......',
    '.....###.....',
    '#...........#',
    '###.#####.###',
    '.###.###.###.',
    '...#######...',
  ];
  M.jackOLantern = (m, cx, baseY, r) => {
    M.pumpkin(m, cx, baseY, r);
    const face = [];
    const top = Math.round(baseY - r * 0.82 - 5);
    m.spr(cx - 6, top, JACK_FACE, { '#': '#241006' });
    JACK_FACE.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') face.push({ x: cx - 6 + i, y: top + j, row: j });
    });
    return { face, rows: JACK_FACE.length, x: cx, y: top + 6 };
  };

  M.baseball = (m, cx, baseY) => {
    m.spr(cx - 5, baseY - 11, [
      '...OOOOO...',
      '..OWWWWSO..',
      '.ORWWWSSRO.',
      'OWWRWSSRSSO',
      'OWRWSSSSRTO',
      'OWRSSSSSRTO',
      'OSRSSSSTRTO',
      'OSSRSSTRTTO',
      '.ORSSTTTRO.',
      '..OTTTTTO..',
      '...OOOOO...',
    ], { W: '#fffdf4', S: '#ece8da', T: '#bfbaa9', R: '#e0302a', O: '#3e392e' });
    // A little stand, so it doesn't roll off
    m.rect(cx - 3, baseY - 1, 7, 1, '#2a1a10');
  };

  M.football = (m, cx, baseY) => {
    m.spr(cx - 9, baseY - 9, [
      '.....HHHHHHHH.....',
      '...HHBBBBBBBBHH...',
      '.HHBBWBBBBBBWBBDD.',
      'HBBBBWBBLBLBBWBBDD',
      'BBBBBWBLLLLLBWBBDD',
      'DBBBBWBBLBLBBWBDDD',
      '.DDBBWBBBBBBWBDDD.',
      '...DDDBBBBBBDDD...',
      '.....DDDDDDDD.....',
    ], { H: '#9c5a30', B: '#7c4222', D: '#54290f', W: '#efe6d0', L: '#f4efe0' });
  };

  // Dried flint corn: three ears gathered at a knot, with the husks flaring up above it
  M.driedCorn = (m, cx, baseY) => {
    const kernels = ['#9a2c2e', '#eebc42', '#5a2a52', '#f4d67c', '#cc5c2c', '#eebc42'];
    const tieY = baseY - 15;
    for (const [off, seed] of [[-6, 3], [6, 7], [0, 1]]) {
      for (let j = 0; j < 15; j++) {
        const t = j / 14;
        const x = Math.round(cx + off * (0.3 + 0.7 * t));
        const half = t > 0.92 ? 1 : 2;
        for (let i = -half; i <= half; i++) {
          // Kernels are two pixels tall and staggered, column by column
          const row = Math.floor((j + (i & 1)) / 2);
          const k = Math.floor(Y.noise((i + 5) * 3.1 + seed * 7, row * 4.7) * 977) % kernels.length;
          m.px(x + i, tieY + j, i === half ? Y.dim(kernels[k], 0.62) : kernels[k]);
        }
      }
    }
    [[-8, '#c9b37a'], [8, '#a68f58'], [-4, '#e2d198'], [4, '#b8a26a'], [0, '#d4c084']].forEach(([dx, c]) => {
      for (let k = 0; k < 10; k++) {
        const u = k / 9;
        const x = Math.round(cx + dx * u ** 1.3), y = tieY - k + Math.round(Math.abs(dx) * u ** 3 * 0.5);
        m.px(x, y, c);
        if (k < 7) m.px(x + 1, y, Y.dim(c, 0.72));
      }
    });
    m.rect(cx - 3, tieY - 1, 7, 2, '#6a4a26');
  };

  M.gift = (m, cx, baseY) => {
    const w = 15, h = 10, x = cx - 7, y = baseY - h;
    m.rect(x, y, w, h, '#b3262e');
    m.rect(x, y, w, 1, '#dd4a4a');
    m.rect(x, y, 2, h, '#cc3539');
    m.rect(x + w - 2, y, 2, h, '#84181f');
    m.rect(x, y + h - 1, w, 1, '#84181f');
    m.rect(cx - 1, y, 3, h, '#e8c04a');
    m.rect(cx - 1, y, 1, h, '#f6df86');
    m.rect(x, y + 4, w, 2, '#e8c04a');
    m.rect(x, y + 4, w, 1, '#f6df86');
    m.spr(cx - 5, y - 4, [
      '.GG.....GG.',
      'GggG...GggG',
      '.GGGG.GGGG.',
      '...GGGGG...',
    ], { G: '#e8c04a', g: '#a8802a' });
  };

  // Fruit in a Talavera bowl: one sort for each season
  const ROUND = [
    '..ooooo..',
    '.oLLbbbo.',
    'oLLbbbbdo',
    'oLbbbbbdo',
    'obbbbbbdo',
    'obbbbbddo',
    'obbbbdddo',
    '.odddddo.',
    '..ooooo..',
  ];
  const ROUND_CUT = [
    '..ooooo..',
    '.occccco.',
    'ocfsfsfco',
    'ocsfsfsco',
    'ocfsfsfco',
    'ocsfsfsco',
    'ocfsfsfco',
    '.occccco.',
    '..ooooo..',
  ];
  const FRUITS = {
    orange: { L: '#ffd98a', b: '#ff9a22', d: '#d9660c', o: '#7c3a08', leaf: true },
    grapefruit: { L: '#fffbd0', b: '#fbec7c', d: '#f0a878', o: '#8f5c2c', cut: { c: '#fbf3d6', f: '#ee6a64', s: '#fba79a' } },
    peach: { L: '#ffe4b6', b: '#f9b070', d: '#e4574a', o: '#84342a', leaf: true },
    pomegranate: { L: '#ec5a5e', b: '#b0242e', d: '#771620', o: '#3e0a10', crown: true, cut: { c: '#f2e0b4', f: '#7c1019', s: '#f4465c' } },
  };
  const SEASON_FRUIT = { winter: 'orange', spring: 'grapefruit', summer: 'peach', autumn: 'pomegranate' };

  // x and y are the fruit's top-left corner
  const oneFruit = (m, x, y, f, cut) => {
    if (cut && f.cut) {
      m.spr(x, y, ROUND_CUT, { o: f.o, ...f.cut });
      return;
    }
    m.spr(x, y, ROUND, f);
    if (f.leaf) {
      m.rect(x + 4, y - 1, 1, 1, '#3c7a34');
      m.rect(x + 5, y - 2, 3, 1, '#5cb352');
      m.rect(x + 5, y - 1, 2, 1, '#37803a');
    }
    if (f.crown) {
      m.rect(x + 3, y - 1, 3, 1, f.d);
      m.px(x + 3, y - 2, f.b);
      m.px(x + 5, y - 2, f.b);
    }
  };

  M.fruitBowl = (m, cx, baseY, kind) => {
    const f = FRUITS[kind];
    const rimY = baseY - 7, halfW = 15;
    // A heap of five, the bowl's lip hiding the bottom of the front row
    const backY = rimY - 11, frontY = rimY - 6;
    oneFruit(m, cx - 9, backY, f);
    oneFruit(m, cx, backY, f);
    oneFruit(m, cx - 14, frontY, f);
    oneFruit(m, cx + 5, frontY, f);
    oneFruit(m, cx - 4, frontY + 1, f, true);
    for (let j = 0; j < 6; j++) {
      const t = j / 5;
      const half = Math.round(halfW * (1 - t * t * 0.62));
      for (let x = cx - half; x <= cx + half; x++) {
        let c = j === 0 ? '#ece4cf' : j === 2 ? '#d9a93a' : j === 3 && (x + cx) % 4 === 0 ? '#ece4cf' : '#2b4f9a';
        if (x <= cx - half + 1 && j > 0) c = Y.mix(c, '#ffffff', 0.3);
        if (x >= cx + half - 1) c = Y.dim(c, 0.68);
        m.px(x, rimY + j, c);
      }
    }
    m.rect(cx - 4, rimY + 6, 9, 1, '#1d3a70');
  };

  M.garland = (m, x0, x1, y) => {
    const r = Y.rng(14);
    const out = [];
    const span = x1 - x0;
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / span;
      const sag = Math.abs(Math.sin(u * Math.PI * 4)) * 5;
      for (let k = -3; k <= 3; k++) {
        if (r() < 0.2) continue;
        const col = r() < 0.2 ? '#49784c' : r() < 0.5 ? '#2c5238' : '#1d3b29';
        m.px(x, y + sag + k + (r() < 0.25 ? 1 : 0), col);
      }
      if (Math.round(u * 40) % 3 === 0 && r() < 0.32) out.push({ x, y: Math.round(y + sag + (r() - 0.5) * 3), seed: r() * 100 });
    }
    return out;
  };

  // at: { y, main, side, left } are places along the shelf; fruit says whether this house keeps a bowl
  M.decorate = (m, L, kind, at) => {
    const out = { fairy: [], jack: null };
    if (kind === 'halloween') {
      out.jack = M.jackOLantern(m, at.main, at.y, 9);
      M.baseball(m, at.side, at.y);
    } else if (kind === 'thanksgiving') {
      M.pumpkin(m, at.main, at.y, 9);
      M.football(m, at.side, at.y);
      M.driedCorn(m, at.left, at.y);
    } else if (kind === 'christmas') {
      out.fairy = M.garland(m, at.x0 == null ? L.mantel.x + 2 : at.x0, at.x1 == null ? L.mantel.x + L.mantel.w - 2 : at.x1, L.mantel.y + L.mantel.h + 1);
      if (at.fruit) {
        M.fruitBowl(m, at.main, at.y, 'orange');
        M.gift(m, at.left, at.y);
      } else M.gift(m, at.main, at.y);
    } else if (at.fruit) {
      M.fruitBowl(m, at.main, at.y, SEASON_FRUIT[L.season]);
    }
    return out;
  };
})();

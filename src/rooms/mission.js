// Russian Hill, Spanish Colonial. Whitewashed adobe, dark timber, a Persian rug,
// and the tall white plaster hood from the Lou Henry Hoover House, carved corbels above.
(() => {
  const Y = window.Yule;
  const M = Y.mat;

  const WALL = { base: '#e6decb', lit: '#e9e2d0', shade: '#e1d8c4', deep: '#c6b9a0' };
  const OAK = { base: '#4a2c1a', light: '#6d4428', dark: '#301b0f', deep: '#1c0f08' };
  const TERRA = { base: '#ad5f3e', dark: '#8f4b30', light: '#c17049', grout: '#5a3425' };
  const BRICK = { brick: '#7a3c28', brickDark: '#5a2b1d', joint: '#2a1812', soot: '#0c0807', ash: '#3a3530', ashLit: '#56504a' };

  const ceilingBeams = (m, L, depth = 10, corbels = true) => {
    M.timber(m, 0, 0, L.w, depth, OAK);
    if (corbels) {
      for (let x = 8 + (L.w % 12); x < L.w; x += Math.round(L.w / 6)) {
        M.corbel(m, x, depth, 11, 10, OAK);
        M.corbel(m, x + 11, depth, 11, 10, OAK, true);
      }
    }
    m.rect(0, depth, L.w, 1, '#8a7c64');
  };

  // Thick adobe means the window sits deep in the wall
  const reveal = (m, r, pal = WALL, out = 4) => {
    for (let j = r.y - out; j < r.y + r.h + out; j++) {
      for (let i = r.x - out; i < r.x + r.w + out; i++) {
        if (i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h) continue;
        // Light falls on the sill and the left jamb, the head stays in shadow
        const below = j >= r.y + r.h;
        const above = j < r.y;
        m.px(i, j, below ? pal.lit : above ? pal.deep : i < r.x + r.w / 2 ? pal.shade : pal.deep);
      }
    }
    m.rect(r.x - out, r.y + r.h + out, r.w + out * 2, 1, '#8a7a60');
  };

  const skirting = (m, L, c = '#6b3d26') => {
    m.rect(0, L.floorY - 3, L.w, 3, c);
    m.rect(0, L.floorY - 3, L.w, 1, Y.mix(c, '#ffffff', 0.15));
  };

  const hearthStone = (m, L, pal) => {
    const y = L.floorY - 1;
    const x0 = L.fpX - 4, wd = L.fpW + 8;
    m.rect(x0, y, wd, 2, pal.light);
    m.rect(x0, y + 2, wd, 3, pal.base);
    m.rect(x0 - 2, y + 5, wd + 4, 1, pal.dark);
  };

  // A rug that fills the floor in landscape and can really spread out in portrait
  const floorRug = (m, L) => {
    const fh = L.h - L.floorY;
    const y0 = L.floorY + (L.portrait ? Math.round(fh * 0.16) : Math.max(5, Math.round(fh * 0.24)));
    const y1 = L.h - (L.portrait ? Math.round(fh * 0.12) : 2);
    M.rug(m, L, L.cx, Math.min(L.fpW * 0.56, L.w * 0.46), y0, y1);
  };

  // The urn and its plant, hard against the right of the screen, under the window
  const plantCorner = (m, L, seed) => {
    const h = Math.round(L.portrait ? Math.min(36, L.w * 0.23) : L.h * 0.165);
    const base = L.floorY + (L.portrait ? 19 : 10);
    const x = L.w - Math.round(h * 0.56);
    // Shadow on the floor
    m.ellipse(x, base + 1, h * 0.36, 2.5, (i, j) => (Y.bayer(i, j) < 0.6 ? '#2a1a12' : null));
    const rim = M.urn(m, x, base, h);
    M.schefflera(m, x, rim.rimY + 2, L.portrait ? 32 : Math.round(h * 0.9), Math.round(h * 0.52), seed);
  };

  Y.rooms.mission = {
    // The window keeps its size and the fireplace takes the rest: a little oversized, on purpose
    layout: { winW: 78, winH: 0.5, winY: 0.135, mantelAt: 0.31, mantelH: 7, lintel: 9, shape: 'soft', openW: 0.68, fireFirst: true, winHP: 0.5, winWP: 0.7 },
    paint(m, L, woods) {
      M.plaster(m, 0, 0, L.w, L.floorY, WALL, 1);
      ceilingBeams(m, L, L.portrait ? 12 : 9);
      // Dark panelled wainscot, as the room in the photograph has
      const wy = Math.round(L.floorY - (L.floorY - L.mantelY) * (L.portrait ? 0.46 : 0.42));
      M.timber(m, 0, wy, L.w, L.floorY - wy, OAK, { seed: 9 });
      m.rect(0, wy, L.w, 2, OAK.light);
      for (let x = 2; x < L.w; x += 22) {
        m.rect(x, wy + 6, 18, L.floorY - wy - 13, OAK.dark);
        m.rect(x + 1, wy + 7, 16, L.floorY - wy - 15, OAK.base);
        m.rect(x, wy + 6, 18, 1, OAK.deep);
        m.rect(x, wy + 6, 1, L.floorY - wy - 13, OAK.deep);
      }
      skirting(m, L);
      M.terracotta(m, L, TERRA);
      floorRug(m, L);

      // Hood: a white pyramid rising to the ceiling from a moulded shelf
      const shelfY = L.mantelY, topY = L.portrait ? 12 : 9;
      const baseHalf = Math.round(L.fpW * 0.47), topHalf = Math.round(L.fpW * 0.17);
      const cxf = L.cx;
      m.poly([[cxf - topHalf, topY], [cxf + topHalf, topY], [cxf + baseHalf, shelfY], [cxf - baseHalf, shelfY]], (i, j) => {
        const n = Y.fbm(i * 0.1 + 4, j * 0.12, 3) + (Y.bayer(i, j) - 0.5) * 0.08;
        const left = i < cxf;
        const t = (j - topY) / Math.max(1, shelfY - topY);
        const ridge = Math.abs(i - cxf) < 1;
        if (ridge) return '#c8bda6';
        const base = left ? '#f0e9da' : '#dcd2bd';
        const dark = left ? '#ddd3bd' : '#c5b9a2';
        return n + t * 0.1 < 0.46 ? dark : base;
      });
      // Crisp edges and a cast shadow, so the hood stands proud of the wall
      m.line(cxf - topHalf, topY, cxf - baseHalf, shelfY, '#fff9ea');
      m.line(cxf + topHalf, topY, cxf + baseHalf, shelfY, '#8f8169');
      for (let j = topY; j < shelfY; j++) {
        const t = (j - topY) / Math.max(1, shelfY - topY);
        const ex = Math.round(Y.lerp(cxf + topHalf, cxf + baseHalf, t));
        for (let k = 1; k <= 7; k++) if (Y.bayer(ex + k, j) < 1 - k / 8) m.px(ex + k, j, '#b5a78e');
      }
      // Stepped moulding under the hood
      const steps = [[0, 2, '#f4eee0'], [2, 2, '#c9bda5'], [4, 2, '#ebe3d2'], [6, 1, '#a5977f']];
      for (const [dy, hh, c] of steps) {
        m.rect(cxf - baseHalf - 5 + dy * 0.5, shelfY + dy, baseHalf * 2 + 10 - dy, hh, c);
      }
      // Window, last so that in portrait it can sit in the face of the hood
      const r = L.win;
      reveal(m, r, WALL, 4);
      M.hole(m, r);
      M.casement(m, r, '#2a1a10');
      m.rect(r.x, r.y, r.w, 1, '#1c120b');

      // Chimney breast below the shelf
      const y0 = shelfY + 7;
      const breastX = L.fpX + 4, breastW = L.fpW - 8;
      M.plaster(m, breastX, y0, breastW, L.floorY - y0, { base: '#e9e2d0', lit: '#ece6d6', shade: '#e3dbc8', deep: '#c9bda6' }, 8);
      m.rect(breastX, y0, 1, L.floorY - y0, '#f5efe2');
      m.rect(breastX + breastW - 1, y0, 2, L.floorY - y0, '#a5977f');
      m.rect(breastX, y0, breastW, 1, '#b9ac93');

      // Stone trim around the opening
      for (let j = L.open.y - 3; j < L.open.y + L.open.h; j++) {
        for (let i = L.open.x - 3; i < L.open.x + L.open.w + 3; i++) {
          if (L.openAt(i, j)) continue;
          let near = false;
          for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [2, 2], [-2, 2]]) if (L.openAt(i + dx, j + dy)) near = true;
          if (near) m.px(i, j, Y.bayer(i, j) < 0.2 ? '#b7a98e' : '#cfc3aa');
        }
      }
      M.firebox(m, L, BRICK);
      hearthStone(m, L, { base: '#a89a80', light: '#cdc1a7', dark: '#5f5442' });
      M.fireLogs(m, L, woods);
      M.andirons(m, L, '#121010', '#4a4640');

      // On the shelf: the mezcal lives here all year, the rest goes by the calendar
      const my = L.mantelY;
      const mx0 = cxf - baseHalf - 3, span = baseHalf * 2 + 6;
      const at = (u) => Math.round(mx0 + span * u);
      M.bottle(m, at(0.09), my, M.bottles.mezcal);
      const d = M.decorate(m, L, L.holiday, { y: my, main: at(0.74), side: at(0.89), left: at(0.26), fruit: true, x0: mx0 - 2, x1: mx0 + span + 2 });

      // Fire tools and broom, like the ones in the photo
      M.fireTools(m, L.fpX + L.fpW + (L.portrait ? -8 : 6), L.floorY + 1, Math.round(L.h * (L.portrait ? 0.1 : 0.2)), '#141210', '#4a4640');
      plantCorner(m, L, 6);
      return { fairy: d.fairy, jack: d.jack };
    },
  };
})();

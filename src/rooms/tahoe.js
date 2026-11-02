// The cabin at Tahoe City. Arts and Crafts by way of the old lodge: round logs,
// chinking, a river-rock chimney and a half-log mantel, with sheepskin, a Pendleton blanket,
// a bottle of whiskey and a trout on the wall.
(() => {
  const Y = window.Yule;
  const M = Y.mat;

  const LOG = { base: '#8a5a32', light: '#a97a48', dark: '#6b4324', deep: '#4b2d17', chink: '#c6b28c', chinkDark: '#9c8866' };
  const CEDAR = { base: '#a2602e', light: '#bb7a40', dark: '#804820', deep: '#4f2a12' };
  const HEWN = { base: '#5e3a20', light: '#7f5430', dark: '#42270f', deep: '#27160a' };
  const FLOOR = { base: '#7f5230', light: '#94643b', dark: '#654024', deep: '#33200f' };
  const BRICK = { brick: '#6e3a28', brickDark: '#4e2a1d', joint: '#241510', soot: '#0b0706', ash: '#37322d', ashLit: '#544e47' };

  const hearthStone = (m, L, pal) => {
    const y = L.floorY - 1;
    const x0 = L.fpX - 5, wd = L.fpW + 10;
    m.rect(x0, y, wd, 2, pal.light);
    m.rect(x0, y + 2, wd, 4, pal.base);
    m.rect(x0 - 2, y + 6, wd + 4, 1, pal.dark);
  };

  const windowFrame = (m, r, pal, out = 4) => {
    M.timber(m, r.x - out, r.y - out, r.w + out * 2, out, pal, { seed: 4 });
    M.timber(m, r.x - out, r.y + r.h, r.w + out * 2, out + 1, pal, { seed: 5 });
    M.timber(m, r.x - out, r.y, out, r.h, pal, { vertical: true, seed: 6 });
    M.timber(m, r.x + r.w, r.y, out, r.h, pal, { vertical: true, seed: 7 });
    m.rect(r.x - out, r.y - out, r.w + out * 2, 1, pal.light);
    m.rect(r.x - out - 1, r.y + r.h + out + 1, r.w + out * 2 + 2, 1, pal.deep);
  };

  const trout = (m, L, plaque) => {
    const space = L.mantelY - L.overY;
    const len = Math.round(Math.min(L.fpW * 0.24, 42));
    M.trout(m, L.cx, Math.round(L.overY + space * 0.46), len, plaque);
  };

  // The heap of fleece in front of the hearth
  const hearthSkin = (m, L, xOff, wide) => {
    const fh = L.h - L.floorY;
    const ry = L.portrait ? Math.min(20, fh * 0.32) : Math.max(6, fh * 0.34);
    const cy = L.floorY + (L.portrait ? 12 : 7) + ry;
    M.pelt(m, L.cx + xOff, cy, wide / 2, ry, 6);
  };

  // A low bench against the wall with a sheepskin thrown over it
  const bench = (m, L, x, wd, seed) => {
    const y = L.floorY - Math.round(L.portrait ? 13 : Math.max(11, L.h * 0.09));
    M.timber(m, x, y, wd, 4, HEWN, { seed: 3 });
    m.rect(x + 2, y + 4, 3, L.floorY + 3 - y - 3, HEWN.dark);
    m.rect(x + wd - 5, y + 4, 3, L.floorY + 3 - y - 3, HEWN.dark);
    M.sheepskin(m, x + 3, y - 7, wd - 6, 7, { drape: 8, seed });
  };

  const ROCK = ['#7a7468', '#8d8678', '#5f5a50', '#94826a', '#6f6a60', '#a08a70', '#6a5e4c', '#847a70'];

  Y.rooms.tahoe = {
    layout: { winW: 76, winH: 0.5, winY: 0.17, mantelAt: 0.34, mantelH: 9, lintel: 13, shape: 'soft', openW: 0.62, fpW: 0.62, winHP: 0.46, winWP: 0.66 },
    paint(m, L, woods) {
      M.logWall(m, 0, 0, L.w, L.floorY, 15, LOG);
      M.planks(m, L, FLOOR);
      m.rect(0, L.floorY - 3, L.w, 3, LOG.deep);

      // Chimney of river rock, floor to ceiling. It narrows above the mantel.
      const neck = Math.round(L.fpW * 0.86);
      const nx = L.cx - Math.round(neck / 2);
      M.rock(m, nx, 0, neck, L.mantelY + L.mantelH, 15, ROCK, { seed: 7 });
      M.rock(m, L.fpX, L.mantelY, L.fpW, L.floorY - L.mantelY, 16, ROCK, {
        seed: 3,
        keep: (i, j) => !L.openAt(i, j),
      });
      // Shadow down each side of the chimney
      m.rect(L.fpX + L.fpW, L.mantelY, 2, L.floorY - L.mantelY, (i, j) => (Y.bayer(i, j) < 0.7 ? '#2f1c10' : null));
      m.rect(nx + neck, 0, 2, L.mantelY, (i, j) => (Y.bayer(i, j) < 0.7 ? '#2f1c10' : null));

      const r = L.win;
      windowFrame(m, r, CEDAR);
      M.hole(m, r);
      M.lattice(m, r, CEDAR.deep);

      M.firebox(m, L, BRICK);
      // Heavy stone lintel over the opening
      const o = L.open;
      m.rect(o.x - 5, o.y - 6, o.w + 10, 6, (i, j) => (L.openAt(i, j) ? null : Y.noise(i * 0.4, j * 0.7) > 0.5 ? '#7c7668' : '#6a6458'));
      m.rect(o.x - 5, o.y - 6, o.w + 10, 1, '#9b9486');
      hearthStone(m, L, { base: '#6c675d', light: '#918b7e', dark: '#37342e' });
      M.fireLogs(m, L, woods);
      M.andirons(m, L, '#100e0c', '#3c3934');

      // Half-log mantel: bark still on the ends
      const mt = L.mantel;
      for (let j = 0; j < mt.h; j++) {
        const t = j / (mt.h - 1);
        for (let i = mt.x; i < mt.x + mt.w; i++) {
          const n = Y.fbm(i * 0.04, j * 0.8, 2) + (Y.bayer(i, mt.y + j) - 0.5) * 0.12;
          let c = t < 0.15 ? '#b58a55' : t < 0.55 ? (n > 0.5 ? '#855a30' : '#6e4726') : n > 0.5 ? '#553519' : '#3f2612';
          if (i < mt.x + 4 || i >= mt.x + mt.w - 4) c = Y.dim(c, 0.72);
          m.px(i, mt.y + j, c);
        }
      }
      m.rect(mt.x, mt.y + mt.h, mt.w, 1, '#1a0f07');

      trout(m, L, { ...HEWN, board: true });
      // The Pendleton folded over one end of the mantel, a sheepskin thrown over the other.
      // On a phone the mantel runs off the screen, so measure from what's actually visible.
      const x0 = Math.max(mt.x, 0);
      M.blanket(m, x0 + 3, mt.y - 2, 20, L.portrait ? 20 : 26);
      M.bottle(m, x0 + 27, mt.y, M.bottles.whiskey);
      M.sheepskin(m, mt.x + mt.w - 28, mt.y - 3, 24, 6, { drape: 12, seed: 9 });
      const d = M.decorate(m, L, L.holiday, { y: mt.y, main: L.cx + 24, side: L.cx + 45, left: L.cx - 24 });
      const flames = [M.candlestick(m, x0 + 43, mt.y, 3, '#2a2622', '#4d463c', '#d9caa0')];

      // Snowshoes on the logs, where there's wall to spare
      if (!L.portrait && L.fpX > 20) M.snowshoes(m, Math.round(L.fpX * 0.52), Math.round(L.h * 0.42), Math.min(52, L.fpX * 1.9));
      else if (L.portrait) M.snowshoes(m, 15, Math.round(L.mantelY * 0.42), 40);

      hearthSkin(m, L, L.portrait ? -2 : 6, Math.min(L.fpW * 0.46, L.portrait ? 84 : 88));
      if (!L.portrait) bench(m, L, Math.min(L.w - 56, L.win.x), Math.min(52, L.w - L.win.x - 2), 12);
      return { flames, fairy: d.fairy, jack: d.jack };
    },
  };
})();

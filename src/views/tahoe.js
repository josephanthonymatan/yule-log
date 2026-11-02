// From the west shore at Tahoe City, east across the lake to the Carson Range.
// Pines and nothing else. Sunrise comes up behind the far mountains; at sunset they catch
// the alpenglow, the way the Quito backdrop does. Snow follows the season and the live
// snow depth. The occasional sailboat in sailing weather, otherwise perfectly still.
(() => {
  const Y = window.Yule;

  const sail = () => Y.boatSprite(9, 11, (r) => {
    r.rect(4, 0, 1, 9, '#6a6458');
    r.poly([[5, 0.5], [8.5, 8.5], [5, 8.5]], '#fbf8ec');
    r.poly([[3.5, 2], [3.5, 8.5], [0.6, 8.5]], '#e6e0cc');
    r.rect(1, 9, 7, 1, '#f1efe6');
    r.rect(2, 10, 5, 1, '#2d3640');
  });

  // A conifer built bough by bough: each one droops, and carries needles hanging from it.
  // Lit from the left, dark at the heart, with snow lying along the tops if there is any.
  const pine = (m, x, baseY, height, halfW, seed, pal, snow, opts = {}) => {
    const top = baseY - height;
    const bare = opts.bare || 0;
    const r = Y.rng(seed);
    const boughEnd = top + height * (1 - bare);
    // Trunk
    const tw = Math.max(1, Math.round(halfW * 0.11));
    for (let y = Math.round(top + height * 0.05); y < baseY; y++) {
      for (let dx = -tw; dx <= tw; dx++) {
        const open = y > boughEnd - 2;
        const plate = Y.noise((x + dx) * 0.8, y * 0.3) > 0.55;
        const col = open
          ? (dx === tw ? pal.barkDark : plate ? pal.barkLit : pal.bark)
          : pal.dark;
        m.px(x + dx, y, col);
      }
    }
    const gap = opts.gap || 4;
    const boughs = [];
    for (let y = top; y < boughEnd; y += gap * (0.75 + r() * 0.5)) {
      const t = (y - top) / Math.max(1, boughEnd - top);
      for (const side of [-1, 1]) {
        const reach = halfW * Math.pow(t, 0.72) * (0.66 + r() * 0.42) + 1;
        boughs.push({ y, side, reach, t, seed: r() * 100 });
      }
    }
    // Silhouette first: every bough, dark, with needles hanging from it
    const place = (b, k) => {
      const u = k / Math.max(1, b.reach);
      return { u, xx: x + b.side * k, yy: b.y + (0.12 + b.t * 0.24) * k + u * u * 2 };
    };
    for (const b of boughs) {
      for (let k = 0; k <= b.reach; k++) {
        const { u, xx, yy } = place(b, k);
        if (u > 0.8 && Y.noise(k * 1.7, b.seed + 3) > 0.6) continue;
        const hang = Math.round((1 - u * 0.55) * gap * (0.9 + Y.noise(k * 0.5, b.seed) * 0.8));
        for (let j = 0; j <= hang; j++) m.px(xx, yy + j, pal.dark);
      }
    }
    // Then clumps of lit needles along the tops, sparse, so that it reads as foliage
    for (const b of boughs) {
      const rc = Y.rng(Math.floor(b.seed * 31) + 1);
      let k = 1 + rc() * 2;
      while (k < b.reach) {
        const { u, xx, yy } = place(b, k);
        const wide = 2 + Math.floor(rc() * 3);
        const snowy = snow > 0.05 && rc() < 0.42 + snow * 0.55;
        const litSide = b.side < 0;
        for (let i = -wide; i <= wide; i++) {
          const dip = Math.abs(i) * 0.45;
          const c1 = snowy ? (litSide ? pal.snow : pal.snowShade) : litSide ? pal.lit : pal.mid;
          const c2 = litSide ? pal.mid : pal.dark;
          m.px(xx + i, yy + dip, c1);
          if (Math.abs(i) < wide) m.px(xx + i, yy + dip + 1, snowy && snow > 0.5 ? c1 : c2);
        }
        k += 3 + rc() * 4 + u * 2;
      }
    }
  };

  Y.viewPainters.tahoe = ({ back, front, wire, vw, vh, C, A, place, shade }) => {
    const hy = Math.round(vh * 0.52);
    const shoreY = vh - Math.max(8, Math.round(vh * 0.13));

    // How much snow, from the season and then the live reading
    const seasonSnow = { winter: 0.92, spring: 0.55, summer: 0.13, autumn: 0.08 }[C.season];
    const peakSnow = Y.clamp(Math.max(seasonSnow, C.snow > 0 ? 0.8 : 0, Y.smooth(0, 0.4, C.snowDepth) * 0.95));
    const groundSnow = Y.clamp(Math.max(C.season === 'winter' ? 0.9 : 0, Y.smooth(0.01, 0.15, C.snowDepth), C.snow > 0.4 ? 0.8 : 0));

    // Sun in the west and low? The east shore catches it. Sun in the east? Silhouette.
    const evening = C.sunAz > 180;
    const alpen = evening ? Y.smooth(13, 2, C.sunAlt) * Y.smooth(-5, -0.5, C.sunAlt) * (1 - Math.pow(C.cloud, 2)) : 0;
    const backlit = !evening ? Y.smooth(16, 3, C.sunAlt) * Y.smooth(-7, -1, C.sunAlt) * (1 - Math.pow(C.cloud, 2) * 0.7) : 0;

    const ridgeFar = (x) => {
      const u = x / vw;
      return hy - 14 - 18 * Y.fbm(x * 0.028 + 5, 3.7, 4) - 9 * Math.exp(-(((u - 0.68) / 0.2) ** 2)) - 5 * Math.exp(-(((u - 0.3) / 0.14) ** 2));
    };
    const ridgeNear = (x) => hy - 5 - 12 * Y.fbm(x * 0.05 + 21, 8.1, 3) - 3 * Math.exp(-(((x / vw - 0.2) / 0.2) ** 2));

    const paintRange = (top, d, snowAmt, hasForest) => {
      back.depth = d;
      for (let x = 0; x < vw; x++) {
        const y0 = Math.round(top(x));
        for (let y = y0; y <= hy; y++) {
          const rel = (y - y0) / Math.max(4, hy - y0);
          const slope = top(x + 2) - top(x - 2);
          // Diagonal gullies, picked out in dither, like the hatching on the Quito peaks
          const gully = (Y.fbm((x + y * (slope > 0 ? 0.75 : -0.75)) * 0.3 + 11, y * 0.05, 3) - 0.5) * 4.2;
          const n = Y.fbm(x * 0.2 + 2, y * 0.3, 3) + (Y.bayer(x, y) - 0.5) * 0.16;
          const snowy = rel < snowAmt * 1.05 + (n - 0.5) * 0.5 + gully * 0.1;
          const lit = slope < 0 ? 1 : 0.76;
          let col;
          if (snowy) {
            col = gully > 0.1 ? '#f4f7fb' : '#c6d4e6';
            col = Y.dim(col, 0.9 + lit * 0.1);
          } else if (hasForest && rel > 0.4 + (n - 0.5) * 0.5) {
            col = n > 0.55 ? '#2f4a3a' : '#223a30';
          } else {
            col = gully > 0.2 ? '#6c7a8c' : '#515f73';
            col = Y.dim(col, 0.7 + lit * 0.3);
          }
          col = Y.mix(Y.mul(col, A.land), A.haze, d * 0.58);
          if (alpen > 0) {
            // Pink on the snow, rust on the rock, fading to the blue shadow at the foot
            const glow = alpen * Y.smooth(0.9, 0.1, rel);
            col = Y.mix(col, snowy ? '#ffb2a0' : hasForest ? '#7b5a64' : '#b0626a', glow * 0.85);
          }
          if (backlit > 0) col = Y.mix(col, Y.mix(A.mid, '#31406a', 0.62), backlit * (0.92 - d * 0.28));
          back.px(x, y, col);
        }
      }
    };
    paintRange(ridgeFar, 0.92, peakSnow, false);
    paintRange(ridgeNear, 0.72, Math.max(0, peakSnow - 0.2), true);

    // The lake. Near-black cobalt in the distance, the famous turquoise in the shallows.
    back.mark = 1;
    const deep = Y.mix(Y.mul('#123f8e', A.land), A.mid, 0.2 + A.golden * 0.4);
    const middle = Y.mix(Y.mul('#1a5bab', A.land), A.mid, 0.12 + A.golden * 0.3);
    const shallow = Y.mix(Y.mul('#2fa6ad', A.land), A.mid, 0.1 + A.golden * 0.25);
    const still = Y.clamp(1 - C.wind * 1.8);
    for (let y = hy; y < vh; y++) {
      const t = (y - hy) / Math.max(1, shoreY - hy);
      back.depth = Y.lerp(0.66, 0.38, Y.clamp(t));
      for (let x = 0; x < vw; x++) {
        const q = Math.floor(t * 7 + Y.bayer(x, y)) / 7;
        let col = q < 0.6 ? Y.mix(deep, middle, q / 0.6) : Y.mix(middle, shallow, Y.smooth(0.6, 1, q) * (0.25 + A.dayish * 0.75) * (1 - Math.pow(C.cloud, 2) * 0.6));
        // A soft mirror of the mountains when the water is calm
        if (t < 0.55 && still > 0.05) {
          const rx = Math.round(x + Math.sin(y * 1.9) * (1 + t * 3));
          const ry = Math.round(hy - (y - hy) * 1.5);
          if (ry >= 0 && rx >= 0 && rx < vw && back.alpha(rx, ry)) {
            const k = still * (1 - t / 0.55) * 0.62;
            if (Y.bayer(x, y) < k + 0.2) col = Y.mix(col, back.get(rx, ry), k);
          } else if (ry >= 0) {
            col = Y.mix(col, A.hor, still * (1 - t / 0.55) * 0.4);
          }
        }
        back.px(x, y, col);
      }
    }
    back.mark = 0;

    // The near shore: granite boulders, sand or snow
    back.depth = 0.2;
    const ground = (x) => shoreY + (Y.fbm(x * 0.09, 6.6, 3) - 0.5) * 7;
    for (let x = 0; x < vw; x++) {
      for (let y = Math.round(ground(x)); y < vh; y++) {
        const n = Y.fbm(x * 0.3, y * 0.5, 2) + (Y.bayer(x, y) - 0.5) * 0.15;
        const col = groundSnow > 0.3
          ? (n > 0.42 ? '#f2f5fa' : '#c8d6e6')
          : (n > 0.55 ? '#a3926f' : n > 0.4 ? '#8c7c5e' : '#6d6048');
        back.px(x, y, shade(col, 0.1));
      }
    }
    const rr = Y.rng(5);
    for (let i = 0; i < Math.ceil(vw / 22); i++) {
      const cx = rr() * vw, cy = shoreY + 2 + rr() * 5, rx = 4 + rr() * 7, ry = 2.5 + rr() * 3;
      back.ellipse(cx, cy, rx, ry, (x, y, u, v) => {
        const lit = -u * 0.35 - v * 0.75 + (Y.bayer(x, y) - 0.5) * 0.3;
        const top2 = groundSnow > 0.3 && v < -0.2;
        const col = top2 ? '#f2f5fa' : lit > 0.25 ? '#b5b1a6' : lit > -0.15 ? '#8a877d' : '#5d5a54';
        return shade(col, 0.1);
      });
    }

    // Sunrise glitters on the lake from the east
    let sunGlitterX = null;
    if (!evening && C.sunAlt > -1 && C.sunAlt < 22 && C.cloud < 0.7) {
      const diff = ((C.sunAz - place.faces + 540) % 360) - 180;
      sunGlitterX = vw / 2 + (diff / place.fov) * (vw / 2);
    }

    // Pines, big and close, framing the view on both sides
    const snowOn = groundSnow > 0.25 || C.snow > 0.2 ? Math.max(groundSnow, C.snow) : 0;
    const palOf = (depthK) => ({
      dark: shade(Y.dim('#16301f', depthK), 0.06),
      mid: shade(Y.dim('#264a31', depthK), 0.06),
      lit: shade(Y.dim('#3f6c45', depthK), 0.06),
      bark: shade('#6b4128', 0.05),
      barkLit: shade('#93603a', 0.05),
      barkDark: shade('#3d2415', 0.05),
      snow: shade('#f3f6fb', 0.04),
      snowShade: shade('#c5d3e4', 0.04),
    });
    front.depth = 0.12;
    const P1 = palOf(1), P2 = palOf(1.25);
    const bigH = vh * 1.5;
    pine(front, Math.round(vw * 0.86), vh + 6, vh * 0.8, Math.max(13, vw * 0.16), 31, P2, snowOn, { bare: 0.12, gap: 3.4 });
    pine(front, Math.round(vw * 0.25), vh + 4, vh * 0.62, Math.max(10, vw * 0.13), 12, P2, snowOn, { bare: 0.14, gap: 3 });
    pine(front, Math.round(vw * 1.0), vh + 8, bigH, Math.max(20, vw * 0.25), 44, P1, snowOn, { bare: 0.24, gap: 4.6 });
    pine(front, Math.round(vw * 0.02), vh + 8, bigH, Math.max(22, vw * 0.28), 7, P1, snowOn, { bare: 0.28, gap: 4.6 });

    // Pines are all there is out there. A cabin light or two on the far shore after dark.
    const lights = [];
    const rl = Y.rng(19);
    for (let i = 0; i < 9; i++) {
      const x = Math.round(vw * (0.25 + rl() * 0.55)), y = hy - 1 - Math.round(rl() * 1.4);
      lights.push({ x, y, u: Y.u32(rl() > 0.5 ? '#ffd890' : '#ffe9b8'), d: 0.86, tw: 1.5 + rl() * 2, on: 0.4 + rl() * 0.5, seed: i * 4.1 });
    }

    const canSail = C.sailing && C.wind < 0.65 && C.rain < 0.1 && C.snow < 0.05 && A.dayish > 0.35;

    return {
      horizonY: hy,
      water: { y0: hy, y1: shoreY + 3 },
      lights,
      sunGlitterX,
      boatGap: [120, 300],
      boatStart: canSail && Math.random() < 0.4,
      swayOf: (y) => Y.clamp(1.1 - y / vh),
      nextBoat: canSail
        ? (S, Atm, rand) => ({ type: 'sail', sprite: sail(), y: hy + Math.round((shoreY - hy) * (0.35 + rand() * 0.25)), speed: 0.55 + S.wind * 1.6, depth: 0.5, wake: 0.3, haze: 0.1, lights: [] })
        : null,
    };
  };
})();

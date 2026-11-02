// The living diorama in the window. A place's painter (src/views/) lays down
// static layers once per change of light. This engine animates everything on top:
// drifting cloud, dithered fog that respects depth, water, boats, lights, swaying
// foreground, rain and snow.
(() => {
  const Y = window.Yule;
  Y.viewPainters = {};

  // A tile of soft noise that wraps, shared by clouds, fog and water
  const TW = 256, TH = 64;
  let tile = null;
  const getTile = () => {
    if (tile) return tile;
    tile = new Float32Array(TW * TH);
    let lo = 1, hi = 0;
    for (let y = 0; y < TH; y++) {
      for (let x = 0; x < TW; x++) {
        const a = Y.fbm(x * 0.045, y * 0.13, 4), b = Y.fbm((x - TW) * 0.045, y * 0.13, 4);
        const v = Y.lerp(a, b, x / TW);
        tile[y * TW + x] = v;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    for (let i = 0; i < tile.length; i++) tile[i] = (tile[i] - lo) / (hi - lo);
    return tile;
  };
  const T = (x, y) => getTile()[(((y | 0) % TH + TH) % TH) * TW + (((x | 0) % TW + TW) % TW)];

  const angleDiff = (a, b) => ((a - b + 540) % 360) - 180;

  Y.createView = (placeId, vw, vh) => {
    const place = Y.places[placeId];
    const paintFn = Y.viewPainters[placeId];
    const buf = new Uint32Array(vw * vh);
    const skyBuf = new Uint32Array(vw * vh);
    const depthNow = new Float32Array(vw * vh);
    const bayer = new Float32Array(vw * vh);
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) bayer[y * vw + x] = Y.bayer(x, y);
    getTile();

    let back = null, front = null, wire = [], P = null, A = null, C = null;
    let cloudLit = 0, cloudMid = 0, cloudShade = 0, fogC = 0, fogRGB = [0, 0, 0];
    let stars = [], cloudX = Math.random() * 200, fogX = Math.random() * 200, waterX = 0;
    let boats = [], nextBoat = 0, drops = [], glassDrops = [], flash = 0, swayT = 0;
    const rand = Math.random;

    const toBuf = (r, i) => {
      const a = i * 4, d = r.d;
      return (255 << 24) | (d[a + 2] << 16) | (d[a + 1] << 8) | d[a];
    };

    const paintSky = () => {
      const hy = P.horizonY;
      const top = Y.rgb(A.top), mid = Y.rgb(A.mid), hor = Y.rgb(A.hor);
      const levels = 14;
      for (let y = 0; y < vh; y++) {
        const t = Y.clamp(y / Math.max(1, hy));
        for (let x = 0; x < vw; x++) {
          // Quantised bands with a Bayer step between them, the Pocket Planes sky
          const q = Math.floor(t * levels + Y.bayer(x, y)) / levels;
          const c = q < 0.55 ? Y.mix(top, mid, q / 0.55) : Y.mix(mid, hor, (q - 0.55) / 0.45);
          skyBuf[y * vw + x] = Y.u32(c);
        }
      }
      // Stars, with a Milky Way where the air is thin and dark
      const r = Y.rng(place.id === 'tahoe' ? 41 : 17);
      stars = [];
      const many = place.id === 'tahoe' ? 90 : 26;
      if (A.stars > 0.02) {
        for (let i = 0; i < many; i++) {
          const x = Math.floor(r() * vw), y = Math.floor(r() * hy * 0.92), big = r();
          stars.push({ x, y, big, seed: r() * 50 });
        }
        if (place.id === 'tahoe') {
          for (let y = 0; y < hy; y++) {
            for (let x = 0; x < vw; x++) {
              const u = x / vw - 0.32 - (y / hy) * 0.45;
              const band = Math.exp(-u * u * 34) * Y.fbm(x * 0.14, y * 0.2, 3);
              if (band * A.stars > 0.28 + Y.bayer(x, y) * 0.3) skyBuf[y * vw + x] = Y.u32(Y.mix(Y.rgb(A.top), '#7f8bb0', 0.34 * A.stars));
            }
          }
        }
      }
      // Sun and moon only appear if they are really in this window's slice of the sky
      const xOf = (az) => vw / 2 + (angleDiff(az, place.faces) / place.fov) * (vw / 2);
      const yOf = (alt) => hy - 2 - alt * 2.3;
      if (C.sunAlt > -1.5 && C.cloud < 0.85) {
        const sx = xOf(C.sunAz), sy = yOf(C.sunAlt);
        if (sx > -6 && sx < vw + 6) {
          const r0 = 4;
          for (let y = -r0 * 5; y <= r0 * 5; y++) {
            for (let x = -r0 * 5; x <= r0 * 5; x++) {
              const px = Math.round(sx) + x, py = Math.round(sy) + y;
              if (px < 0 || py < 0 || px >= vw || py >= vh) continue;
              const d = Math.hypot(x, y);
              const i = py * vw + px;
              if (d <= r0) skyBuf[i] = Y.u32(C.sunAlt < 8 ? '#fff0c4' : '#ffffff');
              else if (d < r0 * 5 && Y.bayer(px, py) < (1 - d / (r0 * 5)) * 0.75) skyBuf[i] = Y.u32(Y.mix(Y.rgb(A.hor), '#fff2cc', 0.7));
            }
          }
        }
      }
      P.moon = null;
      if (C.moonAlt > 0 && C.sunAlt < 4 && C.cloud < 0.92) {
        const mx = xOf(C.moonAz), my = yOf(Math.min(C.moonAlt, 16));
        if (mx > -5 && mx < vw + 5) {
          const r0 = 4, lit = Y.smooth(-3, 2, -C.sunAlt) * 0.6 + 0.4;
          const age = C.moonAge;
          for (let y = -r0; y <= r0; y++) {
            for (let x = -r0; x <= r0; x++) {
              if (x * x + y * y > r0 * r0 + 1) continue;
              const px = Math.round(mx) + x, py = Math.round(my) + y;
              if (px < 0 || py < 0 || px >= vw || py >= vh) continue;
              const w = Math.sqrt(Math.max(0, r0 * r0 - y * y));
              const edge = Math.cos(age * Y.TAU) * w;
              const on = age < 0.5 ? x >= edge : x <= -edge;
              if (on) skyBuf[py * vw + px] = Y.u32(Y.mix(A.hor, Y.bayer(px, py) > 0.8 ? '#d9d6c4' : '#f4f1dd', lit));
            }
          }
          P.moon = { x: Math.round(mx), glow: Math.abs(0.5 - age) < 0.3 ? 1 : 0.5 };
        }
      }
    };

    const applyColours = () => {
      cloudLit = Y.u32(A.lit);
      cloudMid = Y.u32(Y.mix(A.lit, A.shade, 0.5));
      cloudShade = Y.u32(A.shade);
      fogC = Y.u32(A.fog);
      fogRGB = Y.rgb(A.fog).map((v) => v | 0);
    };

    // ---- Boats ----
    const spawnBoat = (midway) => {
      const spec = P.nextBoat && P.nextBoat(C, A, rand);
      if (!spec) return;
      const dir = rand() < 0.5 ? 1 : -1;
      const w = spec.sprite.w;
      const b = {
        ...spec,
        dir,
        x: midway ? vw * (0.42 + rand() * 0.25) - w / 2 : dir > 0 ? -w - 3 : vw + 3,
        vx: dir * spec.speed,
      };
      boats.push(b);
    };

    const drawBoats = (t, dt) => {
      const lights = A.lightsOn;
      for (const b of boats) {
        b.x += b.vx * dt;
        const bob = Math.sin(t * 0.7 + b.y) * (0.2 + C.wind * 0.7);
        const by = Math.round(b.y - b.sprite.h + bob);
        const bx = Math.round(b.x);
        const s = b.sprite;
        for (let j = 0; j < s.h; j++) {
          for (let i = 0; i < s.w; i++) {
            const a = (j * s.w + (b.dir > 0 ? i : s.w - 1 - i)) * 4;
            if (!s.d[a + 3]) continue;
            const x = bx + i, y = by + j;
            if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
            const c = Y.mix(Y.mul([s.d[a], s.d[a + 1], s.d[a + 2]], A.land), A.haze, b.haze || 0);
            buf[y * vw + x] = Y.u32(c);
            depthNow[y * vw + x] = b.depth;
          }
        }
        // Wake: a thin bright line off the stern, plus a bow wave
        if (b.wake) {
          const y = by + s.h;
          if (y >= 0 && y < vh) {
            const n = Math.round(s.w * 0.6 * (b.wake || 1));
            for (let k = 0; k < n; k++) {
              const x = b.dir > 0 ? bx - k : bx + s.w - 1 + k;
              if (x < 0 || x >= vw || Y.bayer(x, y) > 1 - k / n) continue;
              buf[y * vw + x] = Y.u32(Y.mix(A.lit, A.hor, 0.2));
            }
          }
        }
        if (lights > 0.25 && b.lights) {
          for (const l of b.lights) {
            const x = bx + (b.dir > 0 ? l.x : s.w - 1 - l.x), y = by + l.y;
            if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
            if (l.blink && Math.sin(t * 1.3 + b.y) < -0.2) continue;
            buf[y * vw + x] = Y.u32(l.c);
          }
        }
      }
      boats = boats.filter((b) => (b.dir > 0 ? b.x < vw + 3 : b.x > -b.sprite.w - 3));
    };

    const api = {
      paint(state, atmos) {
        C = state;
        A = atmos;
        back = new Y.Raster(vw, vh, { depth: true, mark: true });
        front = new Y.Raster(vw, vh, { depth: true });
        wire = [];
        P = paintFn({ back, front, wire, vw, vh, C, A, place, shade: (c, d = 0) => Y.mix(Y.mul(c, A.land), A.haze, d * 0.58) });
        paintSky();
        applyColours();
        // Rain and snow are recycled, so their count only needs setting here
        const n = Math.round((C.rain * 90 + C.snow * 80) * (vw * vh) / 12000);
        drops = [];
        for (let i = 0; i < n; i++) drops.push({ x: rand() * vw, y: rand() * vh, z: rand() });
        glassDrops = [];
        if (C.rain > 0.05) {
          for (let i = 0; i < 10 + C.rain * 16; i++) glassDrops.push({ x: Math.floor(rand() * vw), y: rand() * vh, v: 2 + rand() * 7, len: 1 + Math.floor(rand() * 3) });
        }
      },
      prewarm() {
        boats = [];
        if (P.nextBoat && P.boatStart !== false) spawnBoat(true);
        nextBoat = (P.boatGap ? P.boatGap[0] : 40) * rand();
      },
      flash() {
        flash = 1;
      },
      frame(t, dt) {
        if (!P) return buf;
        const wind = C.wind;
        cloudX += dt * (0.25 + wind * 3);
        fogX += dt * (0.8 + wind * 3.5);
        waterX += dt * (1 + wind * 4);
        swayT += dt * (0.5 + wind * 2.4);

        // Sky with cloud
        const thr = Y.lerp(0.72, 0.17, Math.pow(Y.clamp(C.cloud), 0.8));
        const ox = cloudX | 0;
        const backD = back.d, bDepth = back.depthBuf, bMark = back.markBuf;
        const tileNow = getTile();
        const tw1 = TW - 1;
        for (let y = 0; y < vh; y++) {
          const row = y * vw;
          const ty = ((y * 2 + 11) % TH) * TW, ty2 = ((y * 2 + 16) % TH) * TW;
          for (let x = 0; x < vw; x++) {
            const i = row + x;
            if (backD[i * 4 + 3]) {
              buf[i] = toBuf(back, i);
              depthNow[i] = bDepth[i];
              continue;
            }
            depthNow[i] = 1;
            const n = tileNow[ty + ((x + ox) & tw1)];
            const d = n - thr;
            if (d <= 0 || (d < 0.035 && bayer[i] > d / 0.035)) {
              buf[i] = skyBuf[i];
            } else {
              const e = n - tileNow[ty2 + ((x + ox + 3) & tw1)];
              const tone = Y.clamp(0.42 + e * 3.6 + d * 0.5) + (bayer[i] - 0.5) * 0.34;
              buf[i] = tone > 0.62 ? cloudLit : tone > 0.34 ? cloudMid : cloudShade;
            }
          }
        }
        // Stars sit behind cloud only: test against the sky buffer
        if (A.stars > 0.02 && C.cloud < 0.75) {
          for (const s of stars) {
            const i = s.y * vw + s.x;
            if (backD[i * 4 + 3] || buf[i] !== skyBuf[i]) continue;
            const tw = Y.noise(s.seed, t * 1.6);
            if (tw < 0.26) continue;
            const v = (s.big > 0.8 ? 1 : 0.55) * tw * 1.25 * A.stars;
            buf[i] = Y.u32(Y.mix(A.top, '#f2f4ff', Y.clamp(v)));
          }
        }

        // Water: moving glints, more and longer with wind
        if (P.water) {
          const W = P.water;
          const glint = Y.u32(Y.mix(A.lit, A.hor, 0.35));
          const glintDim = Y.u32(Y.mix(Y.mix(A.lit, A.hor, 0.35), A.mid, 0.5));
          const cap = Y.u32(Y.mix(A.lit, '#ffffff', 0.5));
          const sharp = 0.76 - wind * 0.24;
          const wx = waterX | 0;
          for (let y = W.y0; y < W.y1; y++) {
            const near = (y - W.y0) / Math.max(1, W.y1 - W.y0);
            const stretch = 1 + (1 - near) * 2;
            for (let x = 0; x < vw; x++) {
              const i = y * vw + x;
              if (bMark[i] !== 1) continue;
              const n = T((x * stretch) + wx * (0.6 + near), y * 7 + Math.floor(t * 0.9) * 3);
              if (n > sharp) buf[i] = n > sharp + 0.1 ? glint : glintDim;
              // Whitecaps once it blows
              if (wind > 0.42 && n > 0.93 - (wind - 0.42) * 0.22) buf[i] = cap;
            }
          }
          // A column of glitter under a low sun or a good moon
          const gx = P.moon ? P.moon.x : P.sunGlitterX;
          if (gx != null) {
            const gc = Y.u32(P.moon ? '#e8e6d0' : '#ffe7b8');
            for (let y = W.y0; y < W.y1; y++) {
              const near = (y - W.y0) / Math.max(1, W.y1 - W.y0);
              const half = 2 + near * 6;
              for (let k = 0; k < 3; k++) {
                const x = Math.round(gx + (T(y * 9 + k * 40, Math.floor(t * 5) + k * 7) - 0.5) * half * 2);
                if (x < 0 || x >= vw) continue;
                const i = y * vw + x;
                if (bMark[i] === 1 && bayer[i] < 0.6) buf[i] = gc;
              }
            }
          }
        }

        // Boats
        if (P.nextBoat) {
          nextBoat -= dt;
          if (nextBoat <= 0) {
            spawnBoat(false);
            nextBoat = P.boatGap[0] + rand() * (P.boatGap[1] - P.boatGap[0]);
          }
          drawBoats(t, dt);
        }

        // Foreground, nudged row by row so palm and pine move with the wind
        const fd = front.d, fDepth = front.depthBuf;
        const swayAmp = 0.35 + wind * 2.2;
        for (let y = 0; y < vh; y++) {
          const k = P.swayOf ? P.swayOf(y) : 0;
          const shift = Math.round((Math.sin(swayT * 1.6 + y * 0.09) + Math.sin(swayT * 3.1 + y * 0.21) * 0.45) * swayAmp * k);
          for (let x = 0; x < vw; x++) {
            const sx = x - shift;
            if (sx < 0 || sx >= vw) continue;
            const si = y * vw + sx;
            if (!fd[si * 4 + 3]) continue;
            buf[y * vw + x] = toBuf(front, si);
            depthNow[y * vw + x] = fDepth[si];
          }
        }
        for (const w of wire) {
          const i = w.y * vw + w.x;
          buf[i] = w.c;
          depthNow[i] = 0.04;
        }

        // Fog: dithered, thicker with distance, with a ceiling that comes down over the hills
        // A measured deck sits at its real height: the Bay's hills are drawn at about ten metres a row
        const deck = C.deckM != null ? C.deckM : null;
        if (C.fog > 0.02 || deck != null) {
          const fog = C.fog;
          const ceil = deck != null ? P.horizonY - deck * 0.1 : P.horizonY * (1.05 - fog * 1.0);
          const deckA = deck != null ? 1 : 0.6 + fog * 0.6;
          const soft = 0.55 * Math.min(1, deck != null ? Math.max(0.7, fog * 1.8) : fog * 1.8);
          const fx = fogX | 0;
          for (let y = 0; y < vh; y++) {
            const ceiling = y < ceil ? Y.clamp((ceil - y) / Math.max(4, ceil * 0.4)) : 0;
            const ty = ((y * 2 + 30) % TH) * TW;
            for (let x = 0; x < vw; x++) {
              const i = y * vw + x;
              const n = tileNow[ty + ((x + fx) & tw1)] - 0.5;
              const body = Math.max(ceiling * deckA, fog * (depthNow[i] * 1.28 - 0.08));
              if (body <= 0) continue;
              const a = body + n * soft;
              if (a <= 0) continue;
              // Four strengths with a dither between them: soft, but still pixels
              let lvl = (a * 4 + bayer[i]) | 0;
              if (lvl <= 0) continue;
              if (lvl >= 4) { buf[i] = fogC; continue; }
              const c = buf[i], m0 = 4 - lvl;
              const r = ((c & 255) * m0 + fogRGB[0] * lvl) >> 2;
              const g = (((c >> 8) & 255) * m0 + fogRGB[1] * lvl) >> 2;
              const bl = (((c >> 16) & 255) * m0 + fogRGB[2] * lvl) >> 2;
              buf[i] = (255 << 24) | (bl << 16) | (g << 8) | r;
            }
          }
        }

        // Lights come through fog, but only just
        if (P.lights && A.lightsOn > 0.02) {
          for (const l of P.lights) {
            if (A.lightsOn < l.on) continue;
            if (l.period) {
              // The Alcatraz light: one white flash every five seconds
              const ph = (t % l.period) / l.period;
              if (ph > 0.14) continue;
            } else if (l.tw && Y.noise(l.seed, t * l.tw) < 0.32) continue;
            const fogA = C.fog * (l.d * 1.25);
            const i = l.y * vw + l.x;
            if (bayer[i] < fogA * 0.85) continue;
            buf[i] = l.u;
            if (l.period && l.x + 1 < vw && l.x > 0) {
              buf[i - 1] = l.u;
              buf[i + 1] = l.u;
            }
          }
        }

        // Rain and snow
        if (drops.length) {
          const slant = (C.windDir > 180 ? -1 : 1) * (0.15 + wind * 1.1);
          if (C.rain > 0.01) {
            const light = Y.mix(A.fog, '#ffffff', 0.25), dim = Y.mix(A.fog, A.shade, 0.5);
            const lightU = Y.u32(light), dimU = Y.u32(dim);
            for (const d of drops) {
              const v = 95 + d.z * 90;
              d.y += v * dt;
              d.x += v * slant * 0.42 * dt;
              if (d.y > vh + 3) { d.y = -4; d.x = rand() * vw; }
              if (d.x < -3) d.x += vw + 3;
              if (d.x > vw + 3) d.x -= vw + 3;
              const len = d.z > 0.6 ? 3 : 2;
              for (let k = 0; k < len; k++) {
                const x = Math.round(d.x - slant * k * 0.5), y = Math.round(d.y - k);
                if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
                buf[y * vw + x] = d.z > 0.6 ? lightU : dimU;
              }
            }
          } else {
            const flake = Y.u32(Y.mix('#ffffff', A.fog, 0.1 + (1 - A.level) * 0.5));
            const dimF = Y.u32(Y.mix('#cfd8e0', A.fog, 0.55));
            for (const d of drops) {
              const v = 7 + d.z * 14;
              d.y += v * dt;
              d.x += (slant * (12 + d.z * 18) + Math.sin(t * 0.9 + d.z * 40) * 3) * dt;
              if (d.y > vh + 1) { d.y = -1; d.x = rand() * vw; }
              if (d.x < -1) d.x += vw + 1;
              if (d.x > vw + 1) d.x -= vw + 1;
              const x = Math.round(d.x), y = Math.round(d.y);
              if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
              buf[y * vw + x] = d.z > 0.45 ? flake : dimF;
              if (d.z > 0.88 && x + 1 < vw) buf[y * vw + x + 1] = flake;
            }
          }
        }

        // Water running down the outside of the glass
        for (const g of glassDrops) {
          g.y += g.v * dt;
          if (g.y > vh + 3) { g.y = -3; g.x = Math.floor(rand() * vw); }
          for (let k = 0; k < g.len; k++) {
            const y = Math.round(g.y) - k;
            if (y < 0 || y >= vh) continue;
            const i = y * vw + g.x;
            const c = buf[i];
            const r = c & 255, gr = (c >> 8) & 255, b = (c >> 16) & 255;
            buf[i] = (255 << 24) | (Math.min(255, b + 34) << 16) | (Math.min(255, gr + 34) << 8) | Math.min(255, r + 34);
          }
        }

        // Lightning washes the whole view
        if (flash > 0.02) {
          const add = flash * 150;
          for (let i = 0; i < buf.length; i++) {
            if (depthNow[i] < 0.3 && bayer[i] > flash) continue;
            const c = buf[i];
            const r = (c & 255) + add, gr = ((c >> 8) & 255) + add, b = ((c >> 16) & 255) + add * 1.1;
            buf[i] = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, gr) << 8) | Math.min(255, r);
          }
          flash *= Math.exp(-dt * 6);
        }
        return buf;
      },
      get lightning() {
        return flash;
      },
      buf,
    };
    return api;
  };

  // Shared little helpers for painters
  Y.boatSprite = (w, h, draw) => {
    const r = new Y.Raster(w, h);
    draw(r);
    return r;
  };
})();

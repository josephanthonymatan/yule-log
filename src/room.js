// The close-up. A room is painted once as flat colour, then relit every frame
// by the fire and whatever daylight is coming through the window, through a limited
// palette. That's what makes it read as 8-bit even though the light is moving.
(() => {
  const Y = window.Yule;
  Y.rooms = {};

  // ---- Layout: most of the screen is fireplace. Landscape puts the window beside it,
  // portrait above the mantel. ----
  Y.layoutRoom = (w, h, o = {}) => {
    const portrait = h > w * 1.25;
    const mantelH = o.mantelH || 9;
    const lintel = o.lintel == null ? 13 : o.lintel;
    let floorY, fpW, cx, mantelY, openW, openTop, openH, win;
    if (!portrait) {
      floorY = Math.round(h * 0.87);
      // A phone on its side is very wide, so there the fireplace and window both grow
      const wide = w / h > 1.9;
      const wantW = (o.winW || 86) * (wide ? 1.2 : 1);
      fpW = o.fireFirst
        ? Math.min(Math.round(w - wantW - 22), Math.round(h * (wide ? 1.46 : 1.24)))
        : Math.min(Math.round(w * (o.fpW || 0.6)), Math.round(h * (wide ? 1.36 : 1.12)));
      const winW = Math.round(o.fireFirst ? wantW : Math.min(wantW, (w - fpW) * 0.8));
      const winH = Math.round(h * (o.winH || 0.56));
      const winY = Math.round(h * (o.winY || 0.15));
      const free = Math.max(0, w - fpW - winW - 12);
      const left = Math.max(3, Math.round(free * 0.42));
      cx = left + Math.round(fpW / 2);
      win = { x: left + fpW + Math.max(7, Math.round(free * 0.22)), y: winY, w: winW, h: winH };
      mantelY = Math.round(h * (o.mantelAt || 0.3));
      openW = Math.round(fpW * (o.openW || 0.67));
      openTop = mantelY + mantelH + lintel;
      openH = floorY - 2 - openTop;
    } else {
      // On a phone the fire gets the whole width and most of the height
      floorY = Math.round(h * 0.86);
      fpW = Math.round(w * 1.02);
      cx = Math.round(w / 2);
      openW = Math.round(fpW * 0.78);
      openH = Math.round(openW * Math.min(1.08, (h * 0.42) / openW));
      openTop = floorY - 2 - openH;
      mantelY = openTop - lintel - mantelH;
      const winW = Math.round(w * (o.winWP || 0.66));
      const winH = Math.round(mantelY * (o.winHP || 0.56));
      win = { x: Math.round(w / 2 - winW / 2), y: Math.round(mantelY * (o.winYP || 0.1)), w: winW, h: winH };
    }
    const openX = cx - Math.round(openW / 2);
    const shape = o.shape || 'rect';
    const rise = shape === 'arch' ? Math.min(openW / 2, openH * 0.5) : shape === 'tudor' ? openH * 0.2 : shape === 'soft' ? openH * 0.08 : 0;
    const openAt = (i, j) => {
      if (i < openX || i >= openX + openW || j < openTop || j >= openTop + openH) return false;
      if (!rise || j >= openTop + rise) return true;
      const u = (i + 0.5 - cx) / (openW / 2), v = (openTop + rise - j - 0.5) / rise;
      if (shape === 'tudor' || shape === 'soft') {
        const k = Math.abs(u);
        const edge = k < 0.56 ? 0.82 + (0.56 - k) * 0.3 : Math.sqrt(Math.max(0, 1 - ((k - 0.56) / 0.44) ** 2)) * 0.82;
        return v <= edge;
      }
      return u * u + v * v <= 1;
    };
    const mantel = { x: cx - Math.round(fpW * 0.54), y: mantelY, w: Math.round(fpW * 1.08), h: mantelH };
    return {
      w, h, portrait, floorY, cx, fpW, fpX: cx - Math.round(fpW / 2),
      mantel, mantelY, mantelH,
      open: { x: openX, y: openTop, w: openW, h: openH, shape },
      openAt,
      win,
      fire: { cx, by: openTop + openH - Math.round(openH * 0.1), w: openW * 0.8, h: openH * 0.96 },
      // Where a mounted trout or a painting can go
      overY: portrait ? win.y + win.h + 3 : 2,
    };
  };

  // ---- Median-cut palette ----
  const medianCut = (samples, count) => {
    const boxes = [samples];
    while (boxes.length < count) {
      let best = -1, bestRange = -1, bestAxis = 0;
      boxes.forEach((b, i) => {
        if (b.length < 2) return;
        const lo = [255, 255, 255], hi = [0, 0, 0];
        for (const s of b) for (let k = 0; k < 3; k++) { if (s[k] < lo[k]) lo[k] = s[k]; if (s[k] > hi[k]) hi[k] = s[k]; }
        const ranges = [hi[0] - lo[0], (hi[1] - lo[1]) * 1.1, hi[2] - lo[2]];
        const axis = ranges.indexOf(Math.max(...ranges));
        const score = ranges[axis] * Math.log2(b.length + 1);
        if (score > bestRange) { bestRange = score; best = i; bestAxis = axis; }
      });
      if (best < 0) break;
      const b = boxes[best];
      b.sort((p, q) => p[bestAxis] - q[bestAxis]);
      const mid = b.length >> 1;
      boxes.splice(best, 1, b.slice(0, mid), b.slice(mid));
    }
    return boxes.map((b) => {
      const c = [0, 0, 0];
      for (const s of b) { c[0] += s[0]; c[1] += s[1]; c[2] += s[2]; }
      return [c[0] / b.length, c[1] / b.length, c[2] / b.length];
    });
  };

  // ---- The natural fire: the same in every room and every season ----
  const FIRE_RAMP = ['#4e0c04', '#8d1d04', '#c73a06', '#ec650c', '#f8901e', '#fcb838', '#fde06e', '#fff4b4', '#fffde8'];
  const FIRE_LIGHT = [1.42, 0.86, 0.42];

  Y.createRoom = (placeId, W, H, C, woods) => {
    const portrait = H > W * 1.25;
    const scale = portrait
      ? Math.max(2, Math.round(W / 168))
      : Math.max(2, Math.min(Math.round(H / 180), Math.floor(W / 236)));
    const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
    const def = Y.rooms[placeId];
    const L = Y.layoutRoom(w, h, def.layout);
    L.holiday = C.holiday;
    L.season = C.season;
    const m = new Y.Raster(w, h, { mark: true });
    const info = def.paint(m, L, woods) || {};
    const N = w * h;

    // Sort pixels into room and glass
    const alb = new Float32Array(N * 3);
    const roomIdx = [], glassIdx = [];
    const win = L.win;
    for (let i = 0; i < N; i++) {
      const a = i * 4;
      if (!m.d[a + 3]) {
        const x = i % w, y = (i / w) | 0;
        if (x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h) glassIdx.push(i);
        else { alb[i * 3] = 0.02; alb[i * 3 + 1] = 0.02; alb[i * 3 + 2] = 0.02; roomIdx.push(i); }
        continue;
      }
      alb[i * 3] = m.d[a] / 255;
      alb[i * 3 + 1] = m.d[a + 1] / 255;
      alb[i * 3 + 2] = m.d[a + 2] / 255;
      roomIdx.push(i);
    }
    const roomList = Int32Array.from(roomIdx);
    const glassList = Int32Array.from(glassIdx);
    const glassMap = new Int32Array(glassIdx.length);
    glassIdx.forEach((i, k) => {
      const x = i % w, y = (i / w) | 0;
      glassMap[k] = (y - win.y) * win.w + (x - win.x);
    });

    // ---- Light maps ----
    const fA = new Float32Array(N), fB = new Float32Array(N), winMap = new Float32Array(N), lampMap = new Float32Array(N), sunMap = new Float32Array(N);
    const by = new Float32Array(N);
    const o = L.open, f = L.fire;
    const lobeY = o.y + o.h * 0.62, lobeDX = o.w * 0.24;
    const R = Math.max(h * 0.62, L.portrait ? w * 0.95 : 0);
    const wcx = win.x + win.w / 2, wcy = win.y + win.h * 0.55;
    const WR = Math.max(win.w, win.h) * 1.15;
    const lintelTop = L.mantelY + L.mantelH;
    const surroundX0 = L.fpX, surroundX1 = L.fpX + L.fpW;
    const mantelX0 = L.mantel.x, mantelX1 = L.mantel.x + L.mantel.w;
    // A jack-o'-lantern is the one light in the house besides the fire
    const jack = info.jack || null;
    const lamps = jack ? [{ x: jack.x, y: jack.y, r: 15, k: 0.5 }] : [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        by[i] = Y.bayer(x, y);
        const fall = (dx) => {
          const d = Math.hypot(x - (f.cx + dx), (y - lobeY) * 1.1);
          return 1 / (1 + (d / R) * (d / R) * 2.1);
        };
        // How much of the fire this surface can actually see
        let k;
        if (y >= L.floorY) k = 1.02;
        else if (m.markBuf[i] >= 1) k = 0.34;
        else if (L.openAt(x, y)) k = 1.3;
        else if (x >= surroundX0 && x < surroundX1 && y >= lintelTop) {
          const dOpen = Math.max(o.x - x, x - (o.x + o.w), o.y - y, 0);
          k = 0.6 + 0.6 * Math.exp(-dOpen / 7);
        } else if (y >= L.mantelY && y < lintelTop && x >= mantelX0 && x < mantelX1) k = 0.62;
        else if (y < L.mantelY && x >= mantelX0 && x < mantelX1) k = 0.46 + (y / L.mantelY) * 0.12;
        else k = 0.78;
        if (y >= lintelTop && y < lintelTop + 2 && x >= mantelX0 && x < mantelX1) k += 0.42;
        // The last term is bounce: a fire warms the whole room a little
        fA[i] = fall(-lobeDX) * k + 0.075;
        fB[i] = fall(lobeDX) * k + 0.075;

        const dw = Math.hypot((x - wcx) / WR, (y - wcy) / WR);
        let wl = 1 / (1 + dw * dw * 2.2);
        if (y >= L.floorY) {
          // A pool on the floor below the window
          const fx = (x - wcx) / (win.w * 1.2);
          wl = Math.max(wl, Math.exp(-fx * fx) * 0.9);
        }
        winMap[i] = wl;

        for (const l of lamps) {
          const d = Math.hypot(x - l.x, y - l.y);
          // The shell itself stays dark, so that the carved face is what glows
          if (d > 10) lampMap[i] += l.k / (1 + (d / l.r) ** 2 * 2);
        }
        // Direct sun lands on the floor in front of the window, and only there
        if (y >= L.floorY) {
          const skew = (y - L.floorY) * -0.9;
          const inX = x >= win.x + skew && x < win.x + win.w + skew;
          const bars = Math.floor((x - win.x - skew) / Math.max(5, win.w / 4)) % 2 === 0 ? 1 : 0.7;
          if (inX) sunMap[i] = bars;
        }
      }
    }

    // ---- Fire automaton ----
    const fw = Math.max(16, Math.round(f.w));
    const fh = Math.max(20, Math.round(f.h));
    const grid = new Float32Array(fw * fh);
    const table = new Uint32Array(72);
    const steps = FIRE_RAMP.length;
    for (let i = 0; i < 72; i++) {
      const v = Y.clamp((i - 8) / 60);
      table[i] = Y.u32(FIRE_RAMP[Math.min(steps - 1, Math.floor(v * steps))]);
    }
    const columns = new Float32Array(fw);
    const fx0 = Math.round(f.cx - fw / 2), fy0 = Math.round(f.by - fh + 3);
    const stepFire = (t, power) => {
      const top = 71 * Math.min(1.05, power * 1.02);
      const decay = (72 / (fh * 0.74)) * (1.08 - (power - 0.9) * 0.55);
      const sway = (Y.noise(t * 0.5, 3) - 0.5) * 0.14;
      for (let pass = 0; pass < 3; pass++) {
        for (let x = 0; x < fw; x++) {
          const u = (x / (fw - 1) - 0.5) * 2;
          const bell = Math.pow(Math.max(0, 1 - u * u), 0.45);
          const heat = top * bell * (0.78 + 0.22 * Math.random());
          grid[(fh - 1) * fw + x] = heat;
          grid[(fh - 2) * fw + x] = heat * 0.96;
        }
        for (let x = 0; x < fw; x++) columns[x] = 0.28 + 1.8 * Y.noise(x * 0.3, t * 1.5 + pass * 0.03);
        for (let y = 0; y < fh - 2; y++) {
          const row = (y + 1) * fw;
          for (let x = 0; x < fw; x++) {
            const sx = Math.round(x + (Math.random() - 0.5) * 1.1 + sway);
            const c = sx < 0 ? 0 : sx >= fw ? fw - 1 : sx;
            const l = c > 0 ? c - 1 : 0, r = c < fw - 1 ? c + 1 : fw - 1;
            const below = (grid[row + c] * 2 + grid[row + l] + grid[row + r]) / 4;
            const v = below - Math.random() * decay * columns[x];
            grid[y * fw + x] = v > 0 ? v : 0;
          }
        }
      }
    };
    for (let i = 0; i < 40; i++) stepFire(i * 0.1, 0.9);

    // Pre-mask the fire so it can only appear in the opening and behind the front logs
    const fireMask = new Uint8Array(fw * fh);
    const fireIdx = new Int32Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const px = fx0 + x, py = fy0 + y;
        const k = y * fw + x;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const i = py * w + px;
        fireIdx[k] = i;
        if (L.openAt(px, py) && !m.markBuf[i] && py < f.by - 1) fireMask[k] = 1;
      }
    }

    // Ember cracks: charred log pixels that glow and fade on their own
    const embers = [];
    for (let i = 0; i < N; i++) {
      if (m.markBuf[i] === 2) embers.push({ i, x: i % w, y: (i / w) | 0 });
    }
    const emberRamp = ['#2a0d05', '#6a1804', '#b83206', '#f0640c', '#fbb03a'].map(Y.u32);

    // ---- Output ----
    const low = document.createElement('canvas');
    low.width = w;
    low.height = h;
    const lowG = low.getContext('2d');
    const image = lowG.createImageData(w, h);
    const buf = new Uint32Array(image.data.buffer);

    const amb = new Float32Array(N * 3);
    let palette = [];
    let lut = new Int32Array(32768);
    const view = Y.createView(placeId, win.w, win.h);
    let viewClock = 0;
    let viewReady = false;
    let A = null, state = C;
    let lampOn = 0;

    const apply = (cond, atmos) => {
      state = cond;
      A = atmos;
      // Candlelit from the evening on. By dawn it has burned out.
      lampOn = cond.sunAlt < -6 || (cond.sunAlt < 6 && cond.sunAz > 180) ? 1 : 0;
      // Daylight: quantised and dithered so walls have bands, not gradients
      const sunOn = cond.sunIn || 0;
      const rm = atmos.room;
      for (let i = 0; i < N; i++) {
        const wk = 0.32 + winMap[i] * 0.86;
        const q = Math.floor(wk * 7 + 0.5 + (by[i] - 0.5) * 0.2) / 7;
        const sun = sunMap[i] * sunOn;
        amb[i * 3] = rm[0] * q + sun * 0.5;
        amb[i * 3 + 1] = rm[1] * q + sun * 0.42;
        amb[i * 3 + 2] = rm[2] * q + sun * 0.28;
      }
      // Palette: sampled from how this room looks in this light, at low and high flicker
      const samples = [];
      for (let k = 0; k < roomList.length; k += 7) {
        const i = roomList[k];
        const fv = fA[i] + fB[i] + lampMap[i] * lampOn;
        for (const pow of [0, 0.5, 1.05]) {
          const fl = fv * pow * 0.6;
          samples.push([
            255 * Math.min(1, alb[i * 3] * (amb[i * 3] + fl * FIRE_LIGHT[0])),
            255 * Math.min(1, alb[i * 3 + 1] * (amb[i * 3 + 1] + fl * FIRE_LIGHT[1])),
            255 * Math.min(1, alb[i * 3 + 2] * (amb[i * 3 + 2] + fl * FIRE_LIGHT[2])),
          ]);
        }
      }
      palette = medianCut(samples, 104);
      lut = new Int32Array(32768).fill(-1);
      view.paint(cond, atmos);
      if (!viewReady) view.prewarm();
      viewReady = true;
      viewClock = 1;
    };

    const nearest = (r, g, b) => {
      let best = 0, bd = 1e9;
      for (let i = 0; i < palette.length; i++) {
        const c = palette[i];
        const d = (c[0] - r) ** 2 * 0.9 + (c[1] - g) ** 2 * 1.1 + (c[2] - b) ** 2 * 0.7;
        if (d < bd) { bd = d; best = i; }
      }
      const c = palette[best];
      return (255 << 24) | ((c[2] | 0) << 16) | ((c[1] | 0) << 8) | (c[0] | 0);
    };

    const flames = (info.flames || []).map((fl, i) => ({ ...fl, seed: i * 7.3 + 1 }));
    const fairy = info.fairy || [];
    const fairyCols = ['#ffd27a', '#ff6a4a', '#7ac8ff', '#ffe9b0', '#8aff9a'].map(Y.u32);
    const flameA = Y.u32('#fff2b0'), flameB = Y.u32('#ffb740'), flameC = Y.u32('#f06c14');
    const jackFlame = Y.u32('#ffe88a');

    const BANDS = 11;

    return {
      w, h, scale, L, m, view, def,
      apply,
      flash: () => view.flash(),
      draw(ctx, F, t, dt) {
        if (!A) return;
        const power = F.power;
        // Two lobes wandering out of step, so shadows actually move
        const n1 = Y.noise(t * 2.1, 11.3), n2 = Y.noise(t * 2.6, 27.9);
        const ka = power * (0.42 + n1 * 0.42) * 0.82;
        const kb = power * (0.42 + n2 * 0.42) * 0.82;
        const kl = lampOn * (0.8 + Y.noise(t * 4.1, 3.3) * 0.28);
        const fr = FIRE_LIGHT[0], fg = FIRE_LIGHT[1], fb = FIRE_LIGHT[2];

        for (let k = 0; k < roomList.length; k++) {
          const i = roomList[k];
          const fv = fA[i] * ka + fB[i] * kb + lampMap[i] * kl;
          const q = ((fv * BANDS + 0.5 + (by[i] - 0.5) * 0.24) | 0) / BANDS;
          const i3 = i * 3;
          const r = alb[i3] * (amb[i3] + q * fr);
          const g = alb[i3 + 1] * (amb[i3 + 1] + q * fg);
          const b = alb[i3 + 2] * (amb[i3 + 2] + q * fb);
          const ri = r >= 0.999 ? 31 : (r * 32) | 0, gi = g >= 0.999 ? 31 : (g * 32) | 0, bi = b >= 0.999 ? 31 : (b * 32) | 0;
          const key = (ri << 10) | (gi << 5) | bi;
          let v = lut[key];
          if (v === -1) {
            v = nearest((ri + 0.5) * 8, (gi + 0.5) * 8, (bi + 0.5) * 8);
            lut[key] = v;
          }
          buf[i] = v;
        }

        // The window runs at half speed; nothing out there hurries
        viewClock += dt;
        if (viewClock >= 0.1) {
          view.frame(t, viewClock);
          viewClock = 0;
        }
        const vb = view.buf;
        for (let k = 0; k < glassList.length; k++) buf[glassList[k]] = vb[glassMap[k]];
        // On a dark night the fire is reflected, faintly, in the glass
        const dark = 1 - Y.smooth(0.1, 0.5, A.level);
        if (dark > 0.05 && glassList.length) {
          const rw = win.w, rh = win.h;
          const near = f.cx < win.x ? 0 : rw;
          for (let k = 0; k < glassList.length; k++) {
            const i = glassList[k];
            const gi = glassMap[k];
            const gx = gi % rw, gy = (gi / rw) | 0;
            const d = Math.hypot((gx - (near ? rw : 0) * 1 + (near ? 0 : 0)) / (rw * 0.6), (gy - rh * 0.72) / (rh * 0.34));
            if (d > 1 || by[i] > (1 - d) * 0.2 * dark * (0.7 + power * 0.4)) continue;
            const c = buf[i];
            const r = Math.min(255, (c & 255) + 52), g2 = Math.min(255, ((c >> 8) & 255) + 22), b2 = (c >> 16) & 255;
            buf[i] = (255 << 24) | (b2 << 16) | (g2 << 8) | r;
          }
        }

        // Fire
        stepFire(t, power);
        const low8 = 8;
        for (let k = 0; k < grid.length; k++) {
          if (!fireMask[k]) continue;
          const v = grid[k] | 0;
          if (v <= low8) continue;
          const i = fireIdx[k];
          // Tips dissolve in dither rather than ending in a hard edge
          if (v < 18 && by[i] > (v - low8) / 10) continue;
          buf[i] = table[v > 71 ? 71 : v];
        }

        // Embers crawl over the charred logs
        for (const e of embers) {
          const nv = Y.noise(e.x * 0.32 + 5, e.y * 0.55 + t * 0.55) + Y.noise(e.x * 0.9, e.y * 0.9 - t * 0.2) * 0.3;
          const heat = (nv - 0.66) * 4.6 * (0.75 + power * 0.35);
          if (heat <= 0) continue;
          buf[e.i] = emberRamp[Math.min(4, (heat * 5) | 0)];
        }

        // Sparks
        for (const s of F.sparks) {
          const a = s.life / s.max;
          const x = Math.round(f.cx + (s.x * f.w) / 2), y = Math.round(f.by - s.y * f.h);
          if (x < 0 || y < 0 || x >= w || y >= h || !L.openAt(x, y)) continue;
          const i = y * w + x;
          if (m.markBuf[i]) continue;
          buf[i] = a > 0.5 ? table[66] : a > 0.25 ? table[50] : table[28];
        }

        // Candles
        for (const fl of flames) {
          const on = Y.noise(fl.seed, t * 6);
          const tall = on > 0.55 ? 3 : 2;
          const xo = Y.noise(fl.seed + 9, t * 3) > 0.62 ? 1 : 0;
          for (let j = 0; j < tall; j++) {
            const y = fl.y - j, x = fl.x + (j === tall - 1 ? xo : 0);
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            buf[y * w + x] = j === 0 ? flameB : j === tall - 1 ? flameC : flameA;
          }
        }
        if (jack && lampOn) {
          // The candle sits low inside, so the bottom of the face burns brightest
          const beat = Y.noise(t * 5.3, 41.7);
          for (const p of jack.face) {
            const v = p.row / (jack.rows - 1) * 0.7 + beat * 0.5 + (Y.noise(p.x * 0.7, t * 3) - 0.5) * 0.3;
            buf[p.y * w + p.x] = v > 0.62 ? jackFlame : v > 0.3 ? flameA : flameB;
          }
        }
        for (const l of fairy) {
          if (Y.noise(l.seed, t * 1.3) < 0.36) continue;
          const i = l.y * w + l.x;
          if (i >= 0 && i < N) buf[i] = fairyCols[Math.floor(l.seed * 3) % fairyCols.length];
        }

        lowG.putImageData(image, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(low, 0, 0, w * scale, h * scale);
      },
    };
  };
})();

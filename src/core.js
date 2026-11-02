// Shared math, colour, a crisp pixel raster, and the fire's state.
(() => {
  const Y = (window.Yule = {});
  const TAU = (Y.TAU = Math.PI * 2);

  Y.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  Y.lerp = (a, b, t) => a + (b - a) * t;
  Y.smooth = (a, b, x) => {
    const t = Y.clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  Y.rng = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Value noise
  const perm = new Float32Array(512);
  {
    const r = Y.rng(1337);
    for (let i = 0; i < 512; i++) perm[i] = r();
  }
  const h2 = (x, y) => perm[(((x * 73) ^ (y * 151)) >>> 0) % 512];
  Y.noise = (x, y = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  Y.fbm = (x, y = 0, oct = 3) => {
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < oct; i++) {
      s += a * Y.noise(x, y);
      n += a;
      x = x * 2.03 + 17;
      y = y * 2.03 + 9;
      a *= 0.5;
    }
    return s / n;
  };

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  Y.bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

  // Colour: everything is [r, g, b] in 0..255. Hex strings are accepted anywhere.
  const hexCache = new Map();
  const rgb = (Y.rgb = (c) => {
    if (typeof c !== 'string') return c;
    let v = hexCache.get(c);
    if (!v) {
      const n = parseInt(c.slice(1), 16);
      v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      hexCache.set(c, v);
    }
    return v;
  });
  Y.mix = (a, b, t) => {
    a = rgb(a);
    b = rgb(b);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  Y.mul = (a, m) => {
    a = rgb(a);
    return [a[0] * m[0], a[1] * m[1], a[2] * m[2]];
  };
  Y.dim = (a, k) => {
    a = rgb(a);
    return [a[0] * k, a[1] * k, a[2] * k];
  };
  Y.u32 = (c) => {
    c = rgb(c);
    return (255 << 24) | ((Y.clamp(c[2], 0, 255) | 0) << 16) | ((Y.clamp(c[1], 0, 255) | 0) << 8) | (Y.clamp(c[0], 0, 255) | 0);
  };

  // A raster with no anti-aliasing. Everything in the picture is drawn through this,
  // so edges stay as crisp as sprites. `depth` and `mark` tag pixels for later passes.
  Y.Raster = class {
    constructor(w, h, opts = {}) {
      this.w = w;
      this.h = h;
      this.d = new Uint8ClampedArray(w * h * 4);
      this.depthBuf = opts.depth ? new Float32Array(w * h) : null;
      this.markBuf = opts.mark ? new Uint8Array(w * h) : null;
      this.depth = 0;
      this.mark = 0;
    }
    px(x, y, c) {
      x |= 0;
      y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x, a = i * 4;
      const v = typeof c === 'string' ? rgb(c) : c;
      this.d[a] = v[0];
      this.d[a + 1] = v[1];
      this.d[a + 2] = v[2];
      this.d[a + 3] = 255;
      if (this.depthBuf) this.depthBuf[i] = this.depth;
      if (this.markBuf) this.markBuf[i] = this.mark;
    }
    clear(x, y) {
      x |= 0;
      y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.d[(y * this.w + x) * 4 + 3] = 0;
    }
    alpha(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
      return this.d[(y * this.w + x) * 4 + 3];
    }
    get(x, y) {
      const a = ((y | 0) * this.w + (x | 0)) * 4;
      return [this.d[a], this.d[a + 1], this.d[a + 2]];
    }
    rect(x, y, w, h, c) {
      const fn = typeof c === 'function';
      const x0 = Math.round(x), y0 = Math.round(y), x1 = x0 + Math.round(w), y1 = y0 + Math.round(h);
      for (let j = y0; j < y1; j++) {
        for (let i = x0; i < x1; i++) {
          const v = fn ? c(i, j) : c;
          if (v) this.px(i, j, v);
        }
      }
    }
    // Filled polygon, scanline style. c may be a function of (x, y).
    poly(pts, c) {
      const fn = typeof c === 'function';
      let top = Infinity, bot = -Infinity;
      for (const p of pts) {
        top = Math.min(top, p[1]);
        bot = Math.max(bot, p[1]);
      }
      for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if (a[1] <= yc !== b[1] <= yc) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
            const v = fn ? c(x, y) : c;
            if (v) this.px(x, y, v);
          }
        }
      }
    }
    ellipse(cx, cy, rx, ry, c) {
      const fn = typeof c === 'function';
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
          if (u * u + v * v > 1) continue;
          const col = fn ? c(x, y, u, v) : c;
          if (col) this.px(x, y, col);
        }
      }
    }
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0);
      y0 = Math.round(y0);
      x1 = Math.round(x1);
      y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let guard = 0; guard < 4000; guard++) {
        this.px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    // ASCII sprite: '.' is empty, anything else looks up the map.
    spr(x, y, rows, map, flip = false) {
      for (let j = 0; j < rows.length; j++) {
        const row = rows[j];
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === '.' || ch === ' ') continue;
          const col = map[ch];
          if (col) this.px(x + (flip ? row.length - 1 - i : i), y + j, col);
        }
      }
    }
  };

  // ---- The fire itself: slow breathing plus flares and sparks from crackles ----
  Y.createFire = () => {
    const F = {
      level: 0.9,
      flare: 0,
      sparks: [],
      t: 0,
      pop(strength, pan) {
        F.flare = Math.min(1, F.flare + strength * 0.22);
        const n = strength > 0.75 ? 7 : strength > 0.4 ? 3 : 1;
        for (let i = 0; i < n && F.sparks.length < 70; i++) F.spawn(pan + (Math.random() - 0.5) * 0.3, strength);
      },
      spawn(x, strength = 0.3) {
        const life = 0.9 + Math.random() * 1.8;
        F.sparks.push({
          x: Y.clamp(x, -0.85, 0.85),
          y: 0.14 + Math.random() * 0.14,
          vx: (Math.random() - 0.5) * 0.55,
          vy: 0.32 + Math.random() * 0.5 + strength * 0.35,
          life,
          max: life,
          seed: Math.random() * 100,
        });
      },
      update(dt) {
        F.t += dt;
        F.level = 0.74 + 0.3 * Y.fbm(F.t * 0.22, 3.1, 3);
        F.flare *= Math.exp(-dt * 3.2);
        if (Math.random() < dt * 0.9) F.spawn((Math.random() - 0.5) * 1.1, 0.1);
        for (const s of F.sparks) {
          s.life -= dt;
          s.vx += (Y.noise(s.seed, F.t * 1.8) - 0.5) * dt * 3.2;
          s.vy *= Math.exp(-dt * 0.45);
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        F.sparks = F.sparks.filter((s) => s.life > 0 && s.y < 1.5);
      },
      get power() {
        return F.level + F.flare * 0.35;
      },
    };
    return F;
  };
})();

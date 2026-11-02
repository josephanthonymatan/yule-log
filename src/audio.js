// All sound is synthesised, so nothing loops and each wood can sound different.
// The crackle generator is separate from the audio graph. It runs with the sound
// off too, because the same events throw sparks in the picture.
// This is a fire, not a white noise machine: the fire is only its crackle, a calm sky is
// silent, and rain is mostly separate drops. Continuous noise is kept for wind and storms.
(() => {
  const Y = window.Yule;

  // ---- Crackle events. Real fire crackle is bursty and heavy-tailed: mostly tiny
  // ticks with the occasional loud snap. Gains come from a Pareto distribution. ----
  Y.createCrackleGen = (rand = Math.random) => {
    let profile = null, t = 0, nextSettle = 0, seedOffset = rand() * 100;
    const occasionals = [];
    const pareto = (min, alpha) => Math.min(1, min / Math.pow(1 - rand() * 0.9999, 1 / alpha));

    return {
      setProfile(sound, occasional, now) {
        profile = sound;
        t = now;
        nextSettle = now + 12 + rand() * 25;
        occasionals.length = 0;
        for (const o of occasional || []) {
          occasionals.push({ ...o, next: now + 8 + rand() * (o.every[1] - o.every[0]) });
        }
      },
      // All events in [t, until), in order
      generate(until) {
        const out = [];
        if (!profile) return out;
        while (t < until) {
          const act = 0.25 + 1.25 * Math.pow(Y.fbm(t * 0.16 + seedOffset, 2.2, 3), 1.7) * 2;
          const rate = Math.max(0.2, profile.rate * act);
          t += -Math.log(1 - rand() * 0.999) / rate;
          const pan = (rand() - 0.5) * 1.5;
          const r = rand();
          if (r < profile.pop) {
            out.push({ t, type: 'pop', gain: 0.45 + rand() * 0.55, pan, spark: 0.9 });
          } else if (r < profile.pop + profile.cluster) {
            // A little run of ticks that speeds up and then dies away
            const n = 3 + Math.floor(rand() * 14);
            const lead = pareto(0.2, 1.4);
            let at = t;
            for (let i = 0; i < n; i++) {
              at += 0.006 + rand() * rand() * 0.07;
              const g = lead * (0.4 + rand() * 0.6) * (1 - (i / n) * 0.55);
              out.push({ t: at, type: rand() < 0.2 ? 'snap' : 'tick', gain: g, pan: pan + (rand() - 0.5) * 0.18, spark: i === 0 ? 0.5 : 0 });
            }
          } else if (r < 0.75) {
            out.push({ t, type: 'tick', gain: pareto(0.1, 1.3), pan, spark: 0 });
          } else {
            const g = pareto(0.16, 1.35);
            out.push({ t, type: 'snap', gain: g, pan, spark: g > 0.5 ? g : 0 });
          }
          if (t > nextSettle) {
            out.push({ t, type: 'settle', gain: 0.55 + rand() * 0.45, pan: pan * 0.5, spark: 1 });
            nextSettle = t + 25 + rand() * 50;
          }
          for (const o of occasionals) {
            if (t > o.next) {
              // Thunder arrives a few seconds after the flash, as it does a few miles off
              out.push({ t, type: o.type, gain: o.type === 'thunder' ? 0.5 + rand() * 0.5 : 1, delay: o.type === 'thunder' ? 1.5 + rand() * 5 : 0, pan: (rand() - 0.5) * 0.6, spark: 0 });
              o.next = t + o.every[0] + rand() * (o.every[1] - o.every[0]);
            }
          }
        }
        return out.sort((a, b) => a.t - b.t);
      },
    };
  };

  // ---- Buffers ----
  const noiseBuffer = (ctx, seconds, kind) => {
    const sr = ctx.sampleRate;
    const n = Math.floor(seconds * sr);
    const fade = Math.floor(sr * 0.25);
    const b = ctx.createBuffer(1, n + fade, sr);
    const d = b.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n + fade; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else if (kind === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
      } else {
        d[i] = w * 0.5;
      }
    }
    // Crossfade the tail into the head for a seamless loop
    const out = ctx.createBuffer(1, n, sr);
    const o = out.getChannelData(0);
    o.set(d.subarray(0, n));
    for (let i = 0; i < fade; i++) {
      const f = i / fade;
      o[i] = d[i] * f + d[n + i] * (1 - f);
    }
    return out;
  };

  const shot = (ctx, dur, fn) => {
    const sr = ctx.sampleRate;
    const b = ctx.createBuffer(1, Math.ceil(dur * sr), sr);
    const d = b.getChannelData(0);
    fn(d, sr);
    let peak = 1e-6;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < d.length; i++) d[i] /= peak;
    return b;
  };

  const makeShots = (ctx) => {
    const R = Math.random;
    const tick = () => {
      const tau = 0.0004 + R() * 0.0012;
      return shot(ctx, 0.008, (d, sr) => {
        let prev = 0;
        for (let i = 0; i < d.length; i++) {
          const w = R() * 2 - 1;
          d[i] = (w - prev * 0.85) * Math.exp(-i / sr / tau);
          prev = w;
        }
      });
    };
    const snap = () => {
      const modes = [0, 1, 2].map(() => ({ f: 1100 + R() * R() * 5200, tau: 0.002 + R() * 0.007, ph: R() * Y.TAU, a: 0.4 + R() * 0.6 }));
      const nt = 0.0015 + R() * 0.003;
      return shot(ctx, 0.05, (d, sr) => {
        for (let i = 0; i < d.length; i++) {
          const s = i / sr;
          let v = (R() * 2 - 1) * Math.exp(-s / nt);
          for (const m of modes) v += m.a * 0.6 * Math.sin(Y.TAU * m.f * s + m.ph) * Math.exp(-s / m.tau);
          d[i] = v;
        }
      });
    };
    const pop = () => {
      const f0 = 340 + R() * 620, f1 = 120 + R() * 150, tau = 0.012 + R() * 0.03, nt = 0.002 + R() * 0.004;
      return shot(ctx, 0.14, (d, sr) => {
        let ph = 0;
        for (let i = 0; i < d.length; i++) {
          const s = i / sr;
          const f = f1 + (f0 - f1) * Math.exp(-s / 0.012);
          ph += (Y.TAU * f) / sr;
          d[i] = Math.sin(ph) * Math.exp(-s / tau) + (R() * 2 - 1) * 0.9 * Math.exp(-s / nt);
        }
      });
    };
    const settle = () =>
      shot(ctx, 0.7, (d, sr) => {
        // A log shifting: a low thud with a scatter of debris
        let lp = 0;
        const hits = Array.from({ length: 14 }, () => ({ at: R() * 0.55, g: 0.1 + R() * 0.35, tau: 0.002 + R() * 0.006 }));
        for (let i = 0; i < d.length; i++) {
          const s = i / sr;
          lp += ((R() * 2 - 1) - lp) * 0.035;
          let v = lp * 6 * Math.exp(-s / 0.09) + Math.sin(Y.TAU * 74 * s) * 0.7 * Math.exp(-s / 0.07);
          for (const h of hits) if (s > h.at) v += (R() * 2 - 1) * h.g * Math.exp(-(s - h.at) / h.tau);
          d[i] = v;
        }
      });
    // One raindrop on the glass: a soft pip, or now and then a rounder drip off the eaves
    const drop = () => {
      const eaves = R() < 0.18;
      const f = eaves ? 620 + R() * 480 : 1500 + R() * 2100;
      const tau = eaves ? 0.012 + R() * 0.016 : 0.003 + R() * 0.008;
      return shot(ctx, 0.06, (d, sr) => {
        for (let i = 0; i < d.length; i++) {
          const s = i / sr;
          d[i] = Math.sin(Y.TAU * f * s * (1 + s * 9)) * Math.exp(-s / tau) + (R() * 2 - 1) * 0.3 * Math.exp(-s / 0.0007);
        }
      });
    };
    const many = (n, f) => Array.from({ length: n }, f);
    return { tick: many(14, tick), snap: many(16, snap), pop: many(8, pop), settle: many(3, settle), drop: many(12, drop) };
  };

  const roomIR = (ctx) => {
    const sr = ctx.sampleRate, n = Math.floor(sr * 0.75);
    const b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.28;
        d[i] = lp * Math.exp(-(i / sr) / 0.17);
      }
    }
    return b;
  };

  // ---- The graph. Works on a live AudioContext or an OfflineAudioContext. ----
  Y.createAudioEngine = (ctx, destination = ctx.destination) => {
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -9;
    comp.ratio.value = 3;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    master.connect(comp);
    comp.connect(destination);

    const fireBus = ctx.createGain();
    const ambBus = ctx.createGain();
    fireBus.connect(master);
    ambBus.connect(master);
    const verb = ctx.createConvolver();
    verb.buffer = roomIR(ctx);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.85;
    verb.connect(verbOut);
    verbOut.connect(master);
    const fireSend = ctx.createGain();
    fireSend.connect(verb);

    const noise = {
      brown: noiseBuffer(ctx, 9, 'brown'),
      pink: noiseBuffer(ctx, 7, 'pink'),
      white: noiseBuffer(ctx, 5, 'white'),
    };
    const shots = makeShots(ctx);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];

    const loop = (kind, offset = Math.random() * 3) => {
      const s = ctx.createBufferSource();
      s.buffer = noise[kind];
      s.loop = true;
      s.start(ctx.currentTime, offset);
      return s;
    };
    const lfo = (freq, depth, param) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g);
      g.connect(param);
      o.start();
      return o;
    };
    const filter = (type, f, q = 0.7) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      return n;
    };

    let sound = { bright: 1 };

    // Outside the glass. A calm sky is silent: every layer here sits at zero unless the
    // weather has earned it.
    const outside = ctx.createGain();
    outside.gain.value = 0.8;
    const glass = filter('lowpass', 5200, 0.4);
    outside.connect(glass);
    glass.connect(ambBus);

    // Heavy rain only: steady patter on the glass, plus a darker wash off the roof
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainGain.connect(outside);
    {
      const hi = filter('highpass', 900, 0.4), lo = filter('lowpass', 6800, 0.4), g1 = ctx.createGain();
      g1.gain.value = 0.2;
      loop('pink').connect(hi);
      hi.connect(lo);
      lo.connect(g1);
      g1.connect(rainGain);
      const bp = filter('bandpass', 380, 0.5), g2 = ctx.createGain();
      g2.gain.value = 0.28;
      loop('brown').connect(bp);
      bp.connect(g2);
      g2.connect(rainGain);
      lfo(0.05, 0.06, g1.gain);
      lfo(0.031, 0.07, g2.gain);
    }

    // Drizzle is separate drops, with only a breath of air under them to hold them together
    const drizzleAir = ctx.createGain();
    drizzleAir.gain.value = 0;
    {
      const bp = filter('bandpass', 2300, 0.4);
      loop('pink').connect(bp);
      bp.connect(drizzleAir);
      drizzleAir.connect(outside);
    }

    // Wind and needles both pass through the gust envelope, which is what makes them come
    // and go. In a storm it opens fully and stays open.
    const gustEnv = ctx.createGain();
    gustEnv.gain.value = 1;
    gustEnv.connect(outside);

    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windGain.connect(gustEnv);
    const windBP = filter('bandpass', 420, 1.1);
    loop('pink').connect(windBP);
    const gusting = ctx.createGain();
    gusting.gain.value = 0.7;
    windBP.connect(gusting);
    gusting.connect(windGain);
    lfo(0.073, 180, windBP.frequency);
    lfo(0.041, 0.28, gusting.gain);

    // Through pine needles, wind goes up into a long hiss
    const needleGain = ctx.createGain();
    needleGain.gain.value = 0;
    const needleBP = filter('bandpass', 2600, 0.5);
    loop('white').connect(needleBP);
    needleBP.connect(needleGain);
    needleGain.connect(gustEnv);

    let drizzle = 0, dropAt = 0;
    let steadyWind = true, gustAt = 0, gustPhase = 'calm', windLevel = 0;

    // The next step of the gust cycle: a real lull, then a rise, sometimes a second wind
    const stepGust = (at) => {
      const R = Math.random;
      let target, tc, hold;
      if (gustPhase === 'calm') {
        target = 0.75 + R() * 0.65;
        tc = 0.5 + R() * 0.9;
        hold = 1.5 + R() * 3.5;
        gustPhase = 'gust';
      } else if (R() < 0.3) {
        target = 0.22 + R() * 0.2;
        tc = 0.5;
        hold = 0.8 + R() * 1.4;
        gustPhase = 'calm';
      } else {
        target = 0.02 + R() * 0.04;
        tc = 1 + R() * 1.5;
        hold = 6 + R() * (20 - windLevel * 10);
        gustPhase = 'calm';
      }
      gustEnv.gain.setTargetAtTime(target, at, tc);
      return at + hold;
    };

    const voice = (buffer, when, gain, pan, opts = {}) => {
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.playbackRate.value = opts.rate || 1;
      const g = ctx.createGain();
      g.gain.value = gain;
      const p = ctx.createStereoPanner();
      p.pan.value = Y.clamp(pan, -1, 1);
      s.connect(g);
      g.connect(p);
      p.connect(opts.bus || fireBus);
      if (opts.send) {
        const send = ctx.createGain();
        send.gain.value = opts.send;
        p.connect(send);
        send.connect(fireSend);
      }
      s.start(when);
    };

    const foghorn = (when) => {
      // Two falling tones a long way off, out past the bridge
      const out = ctx.createGain();
      out.gain.value = 0;
      const lp = filter('lowpass', 300, 0.8);
      lp.connect(out);
      out.connect(ambBus);
      const send = ctx.createGain();
      send.gain.value = 0.5;
      out.connect(send);
      send.connect(verb);
      for (const [start, dur, f] of [[0, 2.3, 176], [2.75, 2.8, 148]]) {
        const a = ctx.createOscillator(), b = ctx.createOscillator(), g = ctx.createGain();
        a.type = 'sawtooth';
        b.type = 'sawtooth';
        a.frequency.value = f;
        b.frequency.value = f * 1.004;
        g.gain.setValueAtTime(0, when + start);
        g.gain.linearRampToValueAtTime(0.5, when + start + 0.35);
        g.gain.setValueAtTime(0.5, when + start + dur - 0.5);
        g.gain.linearRampToValueAtTime(0, when + start + dur);
        a.connect(g);
        b.connect(g);
        g.connect(lp);
        a.start(when + start);
        b.start(when + start);
        a.stop(when + start + dur + 0.05);
        b.stop(when + start + dur + 0.05);
      }
      out.gain.setValueAtTime(0.13, when);
    };

    const shipHorn = (when) => {
      // One long low blast, a ship working the channel
      const out = ctx.createGain();
      out.gain.value = 0;
      const lp = filter('lowpass', 260, 0.7);
      lp.connect(out);
      out.connect(ambBus);
      const send = ctx.createGain();
      send.gain.value = 0.5;
      out.connect(send);
      send.connect(verb);
      const dur = 3.2;
      for (const f of [92, 92.6, 138]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(lp);
        o.start(when);
        o.stop(when + dur + 0.1);
      }
      out.gain.setValueAtTime(0, when);
      out.gain.linearRampToValueAtTime(0.1, when + 0.3);
      out.gain.setValueAtTime(0.1, when + dur - 0.5);
      out.gain.linearRampToValueAtTime(0, when + dur);
    };

    const thunder = (when, gain = 1) => {
      // Rolling thunder: filtered noise with a slow, lumpy envelope
      const s = ctx.createBufferSource();
      s.buffer = noise.brown;
      s.loop = true;
      const lp = filter('lowpass', 150, 0.6);
      const g = ctx.createGain();
      const dur = 5 + Math.random() * 5;
      g.gain.setValueAtTime(0, when);
      let at = when;
      const peak = 1.2 * gain;
      g.gain.linearRampToValueAtTime(peak, when + 0.25);
      while (at < when + dur - 1) {
        at += 0.4 + Math.random() * 0.9;
        g.gain.linearRampToValueAtTime(peak * (0.2 + Math.random() * 0.7) * (1 - (at - when) / dur), at);
      }
      g.gain.linearRampToValueAtTime(0, when + dur);
      s.connect(lp);
      lp.connect(g);
      g.connect(ambBus);
      const send = ctx.createGain();
      send.gain.value = 0.3;
      g.connect(send);
      send.connect(verb);
      s.start(when, Math.random() * 3);
      s.stop(when + dur + 0.1);
    };

    const owl = (when) => {
      const out = ctx.createGain();
      out.gain.value = 0.12;
      out.connect(ambBus);
      const send = ctx.createGain();
      send.gain.value = 0.7;
      out.connect(send);
      send.connect(verb);
      for (const [start, dur, f] of [[0, 0.32, 345], [0.48, 0.2, 345], [0.74, 0.7, 318]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(f * 1.05, when + start);
        o.frequency.linearRampToValueAtTime(f, when + start + dur);
        g.gain.setValueAtTime(0, when + start);
        g.gain.linearRampToValueAtTime(1, when + start + dur * 0.25);
        g.gain.linearRampToValueAtTime(0, when + start + dur);
        o.connect(g);
        g.connect(out);
        o.start(when + start);
        o.stop(when + start + dur + 0.02);
      }
    };

    return {
      ctx,
      setVolumes(fire, weather) {
        const now = ctx.currentTime;
        fireBus.gain.setTargetAtTime(fire, now, 0.05);
        fireSend.gain.setTargetAtTime(fire, now, 0.05);
        ambBus.gain.setTargetAtTime(weather, now, 0.05);
      },
      setWood(wood) {
        sound = wood.sound;
      },
      // The weather outside, live or previewed
      setOutside(C, placeId) {
        const now = ctx.currentTime;
        const rain = Math.max(C.rain, 0);
        const heavy = Y.smooth(0.7, 0.95, rain);
        rainGain.gain.setTargetAtTime(rain > 0.01 ? (0.45 + rain * 0.75) * heavy : 0, now, 1.2);
        drizzle = rain * (1 - heavy);
        drizzleAir.gain.setTargetAtTime(drizzle * 0.018, now, 1.5);

        const pines = placeId === 'tahoe';
        const w = Y.clamp(Math.max(C.wind, C.gust * 0.8));
        // Only real wind makes a sound. Falling snow is silent unless it's blowing a gale.
        const windy = C.snow > 0.05 && w < 0.8 ? 0 : Y.smooth(0.45, 0.85, w);
        windGain.gain.setTargetAtTime((w * w * (pines ? 0.5 : 0.62) + w * 0.06) * windy, now, 1.5);
        windBP.frequency.setTargetAtTime(280 + w * 420, now, 1.5);
        needleGain.gain.setTargetAtTime(pines ? (w * w * 0.09 + w * 0.012) * windy : 0, now, 1.5);

        // A storm's wind is a wall. Any other wind comes in gusts, with quiet between them.
        const steady = Math.max(heavy, Y.smooth(0.7, 0.95, C.snow || 0)) > 0.5;
        windLevel = w;
        if (steady && !steadyWind) gustEnv.gain.setTargetAtTime(1, now, 1);
        if (!steady && steadyWind) {
          gustPhase = 'calm';
          gustEnv.gain.setTargetAtTime(0.04, now, 0.2);
          gustAt = now + 1 + Math.random() * 5;
        }
        steadyWind = steady;
      },
      // Schedules whatever isn't tied to the crackle, up to a time on the audio clock
      advance(until) {
        const now = ctx.currentTime;
        if (drizzle > 0.01) {
          dropAt = Math.max(dropAt, now);
          while (dropAt < until) {
            dropAt += -Math.log(1 - Math.random() * 0.999) / (4 + drizzle * 22);
            // A drizzle has no loud drops: the spread is capped well under a crackle
            const g = Math.min(0.5, 0.1 / Math.pow(1 - Math.random() * 0.999, 1 / 1.5));
            voice(pick(shots.drop), dropAt, g * 0.42, (Math.random() - 0.5) * 1.7, { rate: 0.85 + Math.random() * 0.4, bus: outside });
          }
        }
        if (!steadyWind) {
          gustAt = Math.max(gustAt, now);
          while (gustAt < until) gustAt = stepGust(gustAt);
        }
      },
      play(ev, when) {
        const b = sound.bright || 1;
        if (ev.type === 'tick') voice(pick(shots.tick), when, ev.gain * 0.5, ev.pan, { rate: b * (0.8 + Math.random() * 0.6), send: 0.1 });
        else if (ev.type === 'snap') voice(pick(shots.snap), when, ev.gain * 0.72, ev.pan, { rate: b * (0.75 + Math.random() * 0.55), send: 0.22 });
        else if (ev.type === 'pop') voice(pick(shots.pop), when, ev.gain * 0.72, ev.pan, { rate: 0.8 + Math.random() * 0.5, send: 0.3 });
        else if (ev.type === 'settle') voice(pick(shots.settle), when, ev.gain * 0.5, ev.pan, { send: 0.36 });
        else if (ev.type === 'foghorn') foghorn(when);
        else if (ev.type === 'owl') owl(when);
        else if (ev.type === 'horn') shipHorn(when);
        else if (ev.type === 'thunder') thunder(when + ev.delay, ev.gain);
      },
    };
  };
})();

// Shell. Picks the room, resolves the conditions (live, or previewed),
// runs the clock, starts the sound, and gets out of the way once the fire is going.
(() => {
  const Y = window.Yule;
  const $ = (id) => document.getElementById(id);

  const SCENES = {
    mission: {
      label: 'Russian Hill',
      woods: [
        { label: 'Coast live oak and eucalyptus', logs: ['oak', 'eucalyptus', 'oak', 'eucalyptus'], sound: { rate: 5.2, cluster: 0.2, pop: 0.12, bright: 0.95 } },
        { label: 'Coast live oak', logs: ['oak'], sound: Y.mat.woods.oak.sound },
        { label: 'Eucalyptus', logs: ['eucalyptus'], sound: Y.mat.woods.eucalyptus.sound },
      ],
      skies: ['live', 'clear', 'clouds', 'lowfog', 'fog', 'rain', 'storm', 'wind'],
    },
    tahoe: {
      label: 'Tahoe City',
      woods: [
        { label: 'Jeffrey pine and red fir', logs: ['pine', 'fir', 'pine', 'pine'], sound: { rate: 4.8, cluster: 0.18, pop: 0.18, bright: 0.96 } },
        { label: 'Jeffrey pine', logs: ['pine'], sound: Y.mat.woods.pine.sound },
        { label: 'Red fir', logs: ['fir'], sound: Y.mat.woods.fir.sound },
      ],
      skies: ['live', 'clear', 'clouds', 'fog', 'rain', 'snow', 'storm', 'wind'],
    },
  };
  const SCENE_IDS = Object.keys(SCENES);
  const CYCLES = {
    time: ['live', 'dawn', 'day', 'sunset', 'dusk', 'night'],
    season: ['live', 'spring', 'summer', 'autumn', 'winter'],
    decor: ['live', 'none', 'halloween', 'thanksgiving', 'christmas'],
  };
  const PRETTY = { live: 'Live', none: 'None', fog: 'Fog', lowfog: 'Low fog', clouds: 'Clouds' };
  const pretty = (s) => PRETTY[s] || s[0].toUpperCase() + s.slice(1);

  const canvas = $('stage');
  const ctx = canvas.getContext('2d');
  const state = { scene: 'mission', woodIndex: 0, soundOn: false, fire: 0.85, weather: 0.7, time: 'live', sky: 'live', season: 'live', decor: 'live' };

  const fromHash = () => {
    const parts = (location.hash || '').slice(1).split('-');
    if (SCENES[parts[0]]) state.scene = parts[0];
    state.time = CYCLES.time.includes(parts[1]) ? parts[1] : 'live';
    state.sky = SCENES[state.scene].skies.includes(parts[2]) ? parts[2] : 'live';
    state.season = CYCLES.season.includes(parts[3]) ? parts[3] : 'live';
    state.decor = CYCLES.decor.includes(parts[4]) ? parts[4] : 'live';
  };
  const toHash = () => {
    const allLive = state.time === 'live' && state.sky === 'live' && state.season === 'live' && state.decor === 'live';
    const h = `#${state.scene}${allLive ? '' : `-${state.time}-${state.sky}-${state.season}-${state.decor}`}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  };

  // ---- Weather: live where the network allows, the almanac where it doesn't ----
  const weather = { mission: null, tahoe: null };
  const source = { mission: 'almanac', tahoe: 'almanac' };
  const CACHE_MS = 15 * 60 * 1000;

  const loadCache = (id) => {
    try {
      const raw = localStorage.getItem(`yule-weather-${id}`);
      if (!raw) return;
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at < 3 * CACHE_MS) {
        weather[id] = data;
        source[id] = 'live';
      }
    } catch { /* A private window has no storage, and that's fine */ }
  };
  const fetchLive = async (id) => {
    try {
      const data = await Y.fetchWeather(Y.places[id]);
      weather[id] = data;
      source[id] = 'live';
      try {
        localStorage.setItem(`yule-weather-${id}`, JSON.stringify({ at: Date.now(), data }));
      } catch { /* See above */ }
      refresh();
    } catch {
      source[id] = weather[id] ? source[id] : 'almanac';
    }
  };

  const resolve = () => {
    const place = Y.places[state.scene];
    const now = new Date();
    const cal = Y.calendar(now, place);
    const sm = Y.sunMoon(now, place);
    const season = state.season === 'live' ? cal.season : state.season;
    const base = weather[state.scene] || Y.almanacWeather(place, now, season);
    const C = {
      ...base,
      sunAlt: sm.sun.alt, sunAz: sm.sun.az, moonAlt: sm.moon.alt, moonAz: sm.moon.az, moonAge: sm.age,
      season,
      // Previewing another season means seeing it plain, not with today's holiday on the mantel
      holiday: state.decor !== 'live' ? state.decor : state.season === 'live' ? cal.holiday : 'none',
      sailing: state.season === 'live' ? cal.sailing : season !== 'winter',
      clock: cal.clock,
      source: weather[state.scene] ? source[state.scene] : 'almanac',
    };
    if (state.time !== 'live') Object.assign(C, Y.timePresets[state.time](place));
    if (state.sky !== 'live') {
      Object.assign(C, { snowDepth: 0, deckM: null }, Y.skyPresets[state.sky]);
      C.source = 'preview';
      if (state.scene === 'tahoe' && season === 'winter' && (state.sky === 'storm' || state.sky === 'rain')) {
        // At lake level in winter, a storm is a snowstorm
        C.snow = C.rain || 0.7;
        C.rain = 0;
        C.thunder = false;
        C.word = 'Snowstorm';
        C.snowDepth = 0.5;
      }
    } else if (state.time !== 'live' || state.season !== 'live') {
      C.source = 'preview';
    }
    // Morning sun only reaches into the east-facing cabin, and only when it's out
    const morning = state.scene === 'tahoe' && C.sunAz > 45 && C.sunAz < 150 && C.sunAlt > 2;
    C.sunIn = morning ? Y.smooth(0.8, 0.3, C.cloud) * Y.smooth(2, 10, C.sunAlt) * 0.8 : 0;
    return C;
  };

  // ---- Fire and crackle clock ----
  const F = Y.createFire();
  const gen = Y.createCrackleGen();
  const queue = [];
  const flashes = [];
  const clock = () => performance.now() / 1000;
  let engine = null;
  let audioCtx = null;

  const scene = () => SCENES[state.scene];
  const wood = () => scene().woods[state.woodIndex] || scene().woods[0];

  const pump = () => {
    const now = clock();
    for (const ev of gen.generate(now + 0.9)) {
      if (ev.spark > 0) queue.push(ev);
      if (ev.type === 'thunder') flashes.push(ev.t);
      if (engine) {
        const when = audioCtx.currentTime + Math.max(0, ev.t - now);
        engine.play(ev, when);
      }
    }
    if (engine) engine.advance(audioCtx.currentTime + 1.5);
  };
  setInterval(pump, 220);

  // What can be heard out there depends on what's going on out there
  const occasionalFor = (C) => {
    const list = [];
    const night = C.sunAlt < -6;
    if (state.scene === 'mission') {
      if (C.fog > 0.3) list.push({ type: 'foghorn', every: [50, 110] });
      list.push({ type: 'horn', every: [C.fog > 0.3 ? 110 : 190, 420] });
    } else if (night && C.wind < 0.5 && C.rain === 0) {
      list.push({ type: 'owl', every: [60, 180] });
    }
    if (C.thunder) list.push({ type: 'thunder', every: [18, 60] });
    return list;
  };

  // ---- Sound ----
  const startSound = async () => {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC({ latencyHint: 'playback' });
      // Without this, iOS mutes web audio whenever the ringer switch is off
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
      engine = Y.createAudioEngine(audioCtx);
      engine.setWood(wood());
      engine.setOutside(current || resolve(), state.scene);
      engine.setVolumes(state.fire, state.weather);
    }
    await audioCtx.resume();
    state.soundOn = true;
    syncUI();
  };
  const stopSound = async () => {
    state.soundOn = false;
    if (audioCtx) await audioCtx.suspend();
    syncUI();
  };

  // ---- Rendering ----
  let room = null, dirty = true, W = 0, H = 0;
  let current = null, lastKey = '', lastSoundKey = '';

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(window.innerWidth * dpr);
    H = Math.round(window.innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    dirty = true;
  };
  window.addEventListener('resize', resize);

  const conditionKey = (C) => [Math.round(C.sunAlt), Math.round(C.sunAz / 8), Math.round(C.moonAlt / 6), Math.round(C.cloud * 20), Math.round(C.fog * 20), C.deckM == null ? 'x' : Math.round(C.deckM / 20), Math.round(C.rain * 10), Math.round(C.snow * 10), Math.round(C.wind * 10), C.season, C.thunder, Math.round(C.snowDepth * 20), C.sailing].join('|');

  // Conditions change slowly, so only rebuild the picture when they really have
  const refresh = () => {
    current = resolve();
    if (room && (current.holiday !== room.L.holiday || current.season !== room.L.season)) dirty = true;
    if (dirty) rebuild();
    const key = conditionKey(current);
    if (key !== lastKey) {
      room.apply(current, Y.atmosphere(current, Y.places[state.scene]));
      lastKey = key;
    }
    const soundKey = `${state.scene}|${state.woodIndex}|${current.fog > 0.3}|${current.sunAlt < -6}|${current.thunder}|${current.wind < 0.5}|${current.rain === 0}`;
    if (soundKey !== lastSoundKey) {
      gen.setProfile(wood().sound, occasionalFor(current), clock());
      lastSoundKey = soundKey;
    }
    if (engine) {
      engine.setWood(wood());
      engine.setOutside(current, state.scene);
    }
    syncUI();
  };

  const rebuild = () => {
    room = Y.createRoom(state.scene, W, H, current, wood().logs);
    dirty = false;
    lastKey = '';
  };

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FPS = 18;
  let last = performance.now(), lastDraw = 0, tSec = 0, drawnDt = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const rate = motion.matches ? 0.35 : 1;
    tSec += dt * rate;
    F.update(dt * rate);
    const nowS = now / 1000;
    while (queue.length && queue[0].t <= nowS) {
      const ev = queue.shift();
      F.pop(ev.spark, ev.pan);
    }
    while (flashes.length && flashes[0] <= nowS) {
      flashes.shift();
      if (room) room.flash();
    }
    if (dirty) refresh();
    const fps = motion.matches ? 10 : FPS;
    drawnDt += dt * rate;
    if (now - lastDraw < 1000 / fps - 2) return;
    lastDraw = now;
    room.draw(ctx, F, tSec, drawnDt);
    drawnDt = 0;
  };

  // ---- Controls ----
  const makeChoices = (host, ids, labelOf, onPick) => {
    host.innerHTML = '';
    ids.forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = id;
      b.textContent = labelOf(id);
      b.addEventListener('click', () => onPick(id));
      host.append(b);
    });
  };

  const setScene = (id) => {
    state.scene = id;
    state.woodIndex = 0;
    if (!scene().skies.includes(state.sky)) state.sky = 'live';
    dirty = true;
    refresh();
  };
  const cycleScene = (d) => setScene(SCENE_IDS[(SCENE_IDS.indexOf(state.scene) + d + SCENE_IDS.length) % SCENE_IDS.length]);

  const cycleOption = (key) => {
    const list = key === 'sky' ? scene().skies : CYCLES[key];
    state[key] = list[(list.indexOf(state[key]) + 1) % list.length];
    refresh();
  };

  const toF = (c) => Math.round((c * 9) / 5 + 32);

  const syncUI = () => {
    toHash();
    for (const b of $('scenes').children) b.setAttribute('aria-pressed', b.dataset.id === state.scene);
    const C = current;
    if (C) {
      const tag = C.source === 'live' ? 'Live' : C.source === 'preview' ? 'Preview' : 'Almanac';
      const place = scene().label;
      const showClock = state.time === 'live';
      $('place').textContent = `${place} \u00b7 ${showClock ? C.clock : pretty(state.time)}`;
      $('conditions').textContent = `${toF(C.temp)}\u00b0F \u00b7 ${C.word} \u00b7 ${tag}`;
      $('conditions').dataset.source = C.source;
    }
    const woodBtn = $('wood');
    woodBtn.textContent = wood().label;
    for (const key of ['time', 'sky', 'season', 'decor']) {
      $(`opt-${key}`).querySelector('b').textContent = pretty(state[key]);
    }
    const allLive = ['time', 'sky', 'season', 'decor'].every((key) => state[key] === 'live');
    $('previewToggle').textContent = `${$('previewPanel').hidden ? 'Show' : 'Hide'} time, sky and season${allLive ? '' : ' (previewing)'}`;
    $('backToLive').disabled = allLive;
    $('sound').textContent = state.soundOn ? 'Sound off' : 'Crackle on';
    $('sound').classList.toggle('primary', !state.soundOn);
  };

  makeChoices($('scenes'), SCENE_IDS, (id) => SCENES[id].label, setScene);
  for (const key of ['time', 'sky', 'season', 'decor']) $(`opt-${key}`).addEventListener('click', () => cycleOption(key));
  $('previewToggle').addEventListener('click', () => {
    const opening = $('previewPanel').hidden;
    $('previewPanel').hidden = !opening;
    $('previewToggle').setAttribute('aria-expanded', opening);
    syncUI();
  });
  $('backToLive').addEventListener('click', () => {
    for (const key of ['time', 'sky', 'season', 'decor']) state[key] = 'live';
    refresh();
  });
  $('wood').addEventListener('click', () => {
    state.woodIndex = (state.woodIndex + 1) % scene().woods.length;
    dirty = true;
    refresh();
  });
  $('sound').addEventListener('click', () => (state.soundOn ? stopSound() : startSound()));
  $('fireVol').addEventListener('input', (e) => {
    state.fire = +e.target.value;
    if (engine) engine.setVolumes(state.fire, state.weather);
  });
  $('weatherVol').addEventListener('input', (e) => {
    state.weather = +e.target.value;
    if (engine) engine.setVolumes(state.fire, state.weather);
  });
  const fsBtn = $('full');
  if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => { fsBtn.hidden = true; });
  });

  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && !/ArrowUp|ArrowDown/.test(e.key)) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); cycleScene(-1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); cycleScene(1); }
    else if (e.key === 't') cycleOption('time');
    else if (e.key === 'w') cycleOption('sky');
    else if (e.key === 'e') cycleOption('season');
    else if (e.key === 'd') cycleOption('decor');
    else if (e.key === 's' || e.key === 'm') { state.soundOn ? stopSound() : startSound(); }
    else if (e.key === 'f') fsBtn.click();
    else return;
    wake();
  });

  // Installing to a home screen, where the browser offers it. iPhones do this from the Share menu.
  let installOffer = null;
  const installBtn = $('install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installOffer = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!installOffer) return;
    installOffer.prompt();
    await installOffer.userChoice;
    installOffer = null;
    installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });
  // Only on the real site: a service worker would get in the way when developing locally
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* It still works online without one */ });
  }

  // Controls fade away so nothing sits on top of the fire
  const chrome = $('chrome');
  let hideTimer = 0;
  const wake = () => {
    chrome.classList.remove('asleep');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      // Phones keep :hover and focus on the last tapped button, so only a real mouse
      // hover or keyboard focus should hold the controls open
      const hovering = window.matchMedia('(hover: hover)').matches && chrome.matches(':hover');
      if (!hovering && !chrome.querySelector(':focus-visible')) chrome.classList.add('asleep');
    }, 6000);
  };
  ['pointermove', 'pointerdown', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  wake();

  // A fire you watch shouldn't let the screen sleep
  const keepAwake = async () => {
    try {
      if (navigator.wakeLock && document.visibilityState === 'visible') await navigator.wakeLock.request('screen');
    } catch { /* Not every browser allows it */ }
  };
  document.addEventListener('visibilitychange', keepAwake);
  keepAwake();

  window.addEventListener('hashchange', () => {
    const before = state.scene;
    fromHash();
    if (before !== state.scene) {
      state.woodIndex = 0;
      dirty = true;
    }
    refresh();
  });

  fromHash();
  resize();
  for (const id of SCENE_IDS) loadCache(id);
  current = resolve();
  refresh();
  gen.setProfile(wood().sound, occasionalFor(current), clock());
  // The sun keeps moving, so look again every minute. The weather every fifteen.
  setInterval(refresh, 60 * 1000);
  // Nobody needs fresh weather in a background tab, so catch up on returning
  let lastWeather = 0;
  const refreshWeather = () => {
    if (document.hidden) return;
    lastWeather = Date.now();
    SCENE_IDS.forEach(fetchLive);
  };
  refreshWeather();
  setInterval(refreshWeather, CACHE_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastWeather >= CACHE_MS) refreshWeather();
  });
  requestAnimationFrame(frame);
})();

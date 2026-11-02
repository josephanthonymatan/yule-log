// Where the sun and moon really are, what the sky looks like because of it,
// and the live weather. All of it is worked out for the place, not for wherever you
// happen to be sitting, so Tahoe is dark at Tahoe's nightfall even from New York.
(() => {
  const Y = window.Yule;
  const RAD = Math.PI / 180;

  Y.places = {
    mission: { id: 'mission', name: 'Russian Hill', lat: 37.8014, lon: -122.4187, faces: 5, fov: 40, tz: 'America/Los_Angeles' },
    tahoe: { id: 'tahoe', name: 'Tahoe City', lat: 39.1677, lon: -120.1452, faces: 88, fov: 40, tz: 'America/Los_Angeles' },
  };

  const altAz = (ra, dec, date, p) => {
    const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const gmst = (280.46061837 + 360.98564736629 * d) % 360;
    const ha = (gmst + p.lon - ra / RAD) * RAD;
    const lat = p.lat * RAD;
    const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
    const az = Math.atan2(-Math.sin(ha) * Math.cos(dec), Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(ha));
    return { alt: alt / RAD, az: (az / RAD + 360) % 360 };
  };

  // Low-precision almanac: good to a fraction of a degree, plenty for a window
  Y.sunMoon = (date, p) => {
    const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const g = (357.529 + 0.98560028 * d) * RAD;
    const q = 280.459 + 0.98564736 * d;
    const lam = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 0.00000036 * d) * RAD;
    const sunDec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const sunRa = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const sun = altAz(sunRa, sunDec, date, p);

    const age = (((d + 2451545.0 - 2451550.1) / 29.530588853) % 1 + 1) % 1;
    const mlam = lam + age * Y.TAU;
    const mdec = Math.asin(Math.sin(eps) * Math.sin(mlam));
    const mra = Math.atan2(Math.cos(eps) * Math.sin(mlam), Math.cos(mlam));
    const moon = altAz(mra, mdec, date, p);
    return { sun, moon, age };
  };

  // ---- Sky keyed by the sun's altitude ----
  const KEYS = [
    { alt: -18, top: '#070b1c', mid: '#0c1430', hor: '#15213f', lit: '#2a3350', shade: '#141b33', land: [0.17, 0.2, 0.32], haze: '#141e38', room: [0.1, 0.12, 0.2], stars: 1 },
    { alt: -8, top: '#0e1738', mid: '#1c2a5a', hor: '#3f4a7c', lit: '#4c5274', shade: '#252c52', land: [0.26, 0.28, 0.43], haze: '#30386a', room: [0.15, 0.16, 0.27], stars: 0.5 },
    { alt: -3, top: '#2a3a78', mid: '#7a6a9c', hor: '#e8917a', lit: '#c98a96', shade: '#4f4a78', land: [0.44, 0.39, 0.5], haze: '#7a6488', room: [0.27, 0.24, 0.32], stars: 0.1 },
    { alt: 1, top: '#6a86b4', mid: '#f4bd8a', hor: '#f49a7e', lit: '#ffd2a6', shade: '#a77a96', land: [0.8, 0.63, 0.58], haze: '#d8a090', room: [0.52, 0.42, 0.4], stars: 0 },
    { alt: 8, top: '#5f94cf', mid: '#b7cde0', hor: '#f5dab0', lit: '#fff0d4', shade: '#b9a7b4', land: [0.96, 0.86, 0.73], haze: '#d8cfc4', room: [0.74, 0.67, 0.6], stars: 0 },
    { alt: 25, top: '#3f86d4', mid: '#86bce8', hor: '#cfe6f2', lit: '#ffffff', shade: '#b8c6d8', land: [1, 1, 1], haze: '#c0d6e6', room: [0.92, 0.92, 0.9], stars: 0 },
  ];
  const mixKey = (a, b, t) => {
    const out = { stars: Y.lerp(a.stars, b.stars, t) };
    for (const k of ['top', 'mid', 'hor', 'lit', 'shade', 'haze', 'land', 'room']) {
      out[k] = k === 'land' || k === 'room'
        ? a[k].map((v, i) => Y.lerp(v, b[k][i], t))
        : Y.mix(a[k], b[k], t);
    }
    return out;
  };

  // Turns sun, cloud and rain into every colour the window and the room need
  Y.atmosphere = (C, place) => {
    const alt = C.sunAlt;
    let A = KEYS[KEYS.length - 1];
    if (alt <= KEYS[0].alt) A = mixKey(KEYS[0], KEYS[0], 0);
    else {
      for (let i = 0; i + 1 < KEYS.length; i++) {
        if (alt < KEYS[i + 1].alt) {
          A = mixKey(KEYS[i], KEYS[i + 1], (alt - KEYS[i].alt) / (KEYS[i + 1].alt - KEYS[i].alt));
          break;
        }
      }
      if (alt >= KEYS[KEYS.length - 1].alt) A = mixKey(KEYS[KEYS.length - 1], KEYS[KEYS.length - 1], 0);
    }
    const level = (A.land[0] + A.land[1] + A.land[2]) / 3;
    // Overcast washes the colour out, the way it does on a grey Bay afternoon
    const c = Math.pow(Y.clamp(C.cloud), 1.6);
    const wet = Y.clamp(C.rain * 0.7 + C.snow * 0.3 + (C.thunder ? 0.3 : 0));
    const dark = level * (1 - wet * 0.32);
    const greyTop = Y.dim('#79858f', dark), greyMid = Y.dim('#96a2aa', dark), greyHor = Y.dim('#aeb6ba', dark);
    A.top = Y.mix(A.top, greyTop, c);
    A.mid = Y.mix(A.mid, greyMid, c);
    A.hor = Y.mix(A.hor, greyHor, c);
    A.lit = Y.mix(A.lit, Y.dim('#c9d0d4', dark), c);
    A.shade = Y.mix(A.shade, Y.dim('#7a8690', dark), c);
    A.haze = Y.mix(A.haze, Y.dim('#a2adb4', dark), c);
    const flat = (level * 0.82 + 0.02) * (1 - wet * 0.28);
    A.land = A.land.map((v, i) => Y.lerp(v, flat * [0.94, 0.98, 1.04][i], c));
    A.room = A.room.map((v, i) => Y.lerp(v, v * (0.72 - wet * 0.14) * [0.96, 0.99, 1.05][i], c));
    A.stars *= 1 - Y.clamp(C.cloud * 1.5);

    // The fog itself: pale by day, sodium-stained over the city at night
    const fogDay = Y.mix(A.hor, '#c3cbcf', 0.55);
    A.fog = Y.mix(fogDay, Y.dim('#c3cbcf', Math.max(level, 0.12)), 0.5);
    A.fogDim = Y.dim(A.fog, 0.84);
    if (place.id === 'mission' && alt < -3) {
      const glow = Y.smooth(-3, -12, alt) * (0.35 + c * 0.65);
      A.hor = Y.mix(A.hor, '#4a3d48', glow * 0.7);
      A.mid = Y.mix(A.mid, '#262634', glow * 0.6);
      A.fog = Y.mix(A.fog, '#4d4750', glow * (0.4 + C.fog * 0.5));
      A.fogDim = Y.mix(A.fogDim, '#3a3844', glow * (0.4 + C.fog * 0.5));
    }
    // Looking east at sunset you see the Earth's own shadow, slate blue, with pink above it.
    // That's what the alpenglow stands out against.
    if (place.id === 'tahoe' && C.sunAz > 180) {
      const g = Y.smooth(12, 2, alt) * Y.smooth(-8, -2, alt) * (1 - c);
      A.hor = Y.mix(A.hor, '#7a88b0', g);
      A.mid = Y.mix(A.mid, '#d8a3b0', g * 0.72);
      A.top = Y.mix(A.top, '#5d78a8', g * 0.5);
      A.haze = Y.mix(A.haze, '#8a8fb4', g * 0.7);
    }
    A.level = level;
    A.lightsOn = Y.smooth(5, -4, alt) * 0.5 + Y.smooth(-1, -7, alt) * 0.5;
    A.golden = Y.smooth(14, 3, alt) * Y.smooth(-7, -1, alt) * (1 - c);
    A.dayish = Y.smooth(-2, 10, alt);
    return A;
  };

  // ---- Live weather. Open-Meteo needs no key and allows browser requests. ----
  const CURRENT = 'temperature_2m,relative_humidity_2m,weather_code,cloud_cover,cloud_cover_low,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,snow_depth';

  const WORDS = {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Freezing fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
  };

  const interpret = (cur) => {
    const code = cur.weather_code;
    const snowy = [71, 73, 75, 77, 85, 86].includes(code);
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    const intensity = { 51: 0.2, 53: 0.3, 55: 0.45, 56: 0.3, 57: 0.45, 61: 0.35, 63: 0.6, 65: 0.9, 66: 0.5, 67: 0.8, 71: 0.35, 73: 0.6, 75: 0.95, 77: 0.25, 80: 0.5, 81: 0.65, 82: 0.95, 85: 0.5, 86: 0.9, 95: 0.85, 96: 0.9, 99: 1 }[code] || 0;
    // Forecast models rarely say "fog" for San Francisco even with the Gate socked in,
    // so low cloud, near-saturated air and poor visibility all count as evidence.
    const vis = cur.visibility == null ? 20000 : cur.visibility;
    const low = (cur.cloud_cover_low || 0) / 100, rh = (cur.relative_humidity_2m || 0) / 100;
    let fog = Math.max(Y.smooth(9000, 1200, vis), low * Y.smooth(0.8, 0.96, rh));
    if (code === 45 || code === 48) fog = Math.max(fog, 0.85);
    return {
      code,
      word: !rainy && !snowy && fog >= 0.5 ? 'Fog' : WORDS[code] || 'Unsettled',
      temp: cur.temperature_2m,
      cloud: Y.clamp((cur.cloud_cover || 0) / 100),
      fog: Y.clamp(fog),
      rain: rainy ? intensity : 0,
      snow: snowy ? intensity : 0,
      wind: Y.clamp((cur.wind_speed_10m || 0) / 16),
      gust: Y.clamp((cur.wind_gusts_10m || 0) / 26),
      windDir: cur.wind_direction_10m || 0,
      thunder: code >= 95,
      snowDepth: cur.snow_depth || 0,
    };
  };

  const getJSON = async (url) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  // ---- San Francisco's fog, measured rather than guessed. It comes in two forms: fog on the
  // water, which NOAA's visibility sensors see, and a low deck that cuts off the hills while
  // the shore stays clear, which only shows up as the height of the cloud at the airports.
  // The Golden Gate points at Oakland, so its airport comes first and SFO is the spare. ----
  const FRESH_MS = 90 * 60 * 1000;
  const SENSOR_MAX_KM = 10;

  const readSensor = async (station) => {
    const json = await getJSON(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${station}&product=visibility&units=metric&time_zone=gmt&format=json&application=yule-log`);
    const row = json.data && json.data[0];
    const km = row ? parseFloat(row.v) : NaN;
    if (!(km >= 0) || Date.now() - Date.parse(`${row.t.replace(' ', 'T')}Z`) > FRESH_MS) throw new Error('no fresh reading');
    return km;
  };
  // The metres to the base of the lowest cloud that covers most of the sky, or Infinity if clear
  const readAirport = async (station) => {
    const { properties: p } = await getJSON(`https://api.weather.gov/stations/${station}/observations/latest`);
    if (Date.now() - Date.parse(p.timestamp) > FRESH_MS) throw new Error('no fresh report');
    const layers = p.cloudLayers || [];
    if (!layers.length) throw new Error('no cloud report');
    const bases = layers.filter((l) => ['BKN', 'OVC', 'VV'].includes(l.amount) && l.base && l.base.value != null).map((l) => l.base.value);
    return { deck: bases.length ? Math.min(...bases) : Infinity, visKm: p.visibility && p.visibility.value != null ? p.visibility.value / 1000 : null };
  };
  const firstOf = async (...tries) => {
    for (const attempt of tries) {
      try {
        return await attempt;
      } catch { /* On to the next source */ }
    }
    return null;
  };

  const measuredBayFog = async () => {
    // Started together, so that a slow source doesn't hold up the others
    const pier = readSensor('9414296'), berth = readSensor('9414797');
    const oak = readAirport('KOAK'), sfo = readAirport('KSFO');
    [pier, berth, oak, sfo].forEach((p) => p.catch(() => {}));
    const sensor = await firstOf(pier, berth);
    const airport = await firstOf(oak, sfo);
    return { visKm: sensor != null ? sensor : airport && airport.visKm, deck: airport ? airport.deck : null };
  };

  const applyBayFog = (out, { visKm, deck }) => {
    if (visKm == null && deck == null) return out;
    const fromVis = visKm == null ? 0 : Y.clamp(Math.log(SENSOR_MAX_KM / Math.max(visKm, 0.2)) / Math.log(SENSOR_MAX_KM / 0.8));
    // Cloud down near the height of the hill is fog at the window too
    const inIt = deck == null ? 0 : Y.smooth(150, 40, deck) * 0.6;
    out.fog = Math.max(fromVis, inIt);
    out.deckM = deck != null && deck < 400 ? Math.round(deck) : null;
    if (deck != null && deck < 600) out.cloud = Math.max(out.cloud, 0.9);
    const dry = !out.rain && !out.snow && !out.thunder;
    if (dry) {
      const forecast = out.code === 45 || out.code === 48 ? 'Overcast' : WORDS[out.code] || 'Unsettled';
      out.word = out.fog >= 0.3 ? 'Fog' : out.deckM != null && out.deckM < 300 ? 'Fog on the hills' : forecast;
    }
    return out;
  };

  Y.fetchWeather = async (place) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=${CURRENT}&wind_speed_unit=ms&timezone=${encodeURIComponent(place.tz)}`;
    // If the fog sources are all down, the estimate from the forecast stays in place
    const fog = place.id === 'mission' ? measuredBayFog().catch(() => null) : null;
    const out = interpret((await getJSON(url)).current);
    const measured = await fog;
    return measured ? applyBayFog(out, measured) : out;
  };

  // When there is no network (or the page isn't allowed out), fall back on what the
  // place usually does in that season. It stays put for a few hours at a time.
  // San Francisco's fog is the promised coin toss.
  Y.almanacWeather = (place, date, season) => {
    const block = Math.floor(date.getTime() / (4 * 3600000));
    const r = Y.rng(block * (place.id === 'tahoe' ? 7 : 3));
    const a = r(), b = r(), c = r();
    const wet = place.id === 'mission'
      ? { winter: 0.26, spring: 0.08, summer: 0, autumn: 0.05 }[season]
      : { winter: 0.34, spring: 0.16, summer: 0.03, autumn: 0.1 }[season];
    const out = { code: 0, word: 'Clear', temp: 12, cloud: 0.1 + b * 0.5, fog: 0, rain: 0, snow: 0, wind: 0.1 + c * 0.25, gust: 0.15 + c * 0.3, windDir: 270, thunder: false, snowDepth: 0 };
    if (place.id === 'tahoe') {
      out.temp = { winter: -3, spring: 7, summer: 22, autumn: 10 }[season];
      out.snowDepth = season === 'winter' ? 0.4 : 0;
      if (a < wet) {
        const cold = season === 'winter' || (season !== 'summer' && b < 0.5);
        out.snow = cold ? 0.5 : 0;
        out.rain = cold ? 0 : 0.4;
        out.cloud = 0.95;
        out.fog = 0.3;
        out.word = cold ? 'Snow' : 'Rain';
      } else out.word = out.cloud > 0.45 ? 'Partly cloudy' : 'Clear';
      return out;
    }
    out.temp = { winter: 11, spring: 14, summer: 16, autumn: 17 }[season];
    if (a < wet) {
      out.rain = 0.45;
      out.cloud = 0.95;
      out.fog = 0.2;
      out.word = 'Rain';
    } else if (b < 0.5) {
      out.fog = 0.5 + c * 0.45;
      out.cloud = 0.9;
      out.word = 'Fog';
    } else out.word = out.cloud > 0.45 ? 'Partly cloudy' : 'Clear';
    return out;
  };

  // ---- What the calendar says, in the place's own time zone ----
  const pacificParts = (date, tz) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(date);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    return { month: +get('month'), day: +get('day'), clock: `${get('hour')}:${get('minute')} ${get('dayPeriod')}` };
  };
  Y.calendar = (date, place) => {
    const { month, day, clock } = pacificParts(date, place.tz);
    const season = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
    let holiday = 'none';
    if (month === 10 && day >= 15) holiday = 'halloween';
    else if (month === 11) holiday = 'thanksgiving';
    else if (month === 12 || (month === 1 && day <= 6)) holiday = 'christmas';
    // Sailing weather on Tahoe: late spring to early autumn
    const sailing = (month >= 5 && month <= 9) || (month === 10 && day <= 10);
    return { month, day, clock, season, holiday, sailing };
  };

  // ---- Preview presets, so every combination can be judged without waiting for it ----
  Y.timePresets = {
    dawn: (place) => ({ sunAlt: 1.5, sunAz: place.id === 'tahoe' ? 92 : 80 }),
    day: () => ({ sunAlt: 42, sunAz: 165 }),
    sunset: (place) => ({ sunAlt: 1.2, sunAz: place.id === 'tahoe' ? 262 : 285 }),
    dusk: (place) => ({ sunAlt: -5, sunAz: place.id === 'tahoe' ? 268 : 290 }),
    night: () => ({ sunAlt: -34, sunAz: 350, moonAlt: 32, moonAz: 88, moonAge: 0.42 }),
  };
  Y.skyPresets = {
    clear: { word: 'Clear', cloud: 0.04, fog: 0, rain: 0, snow: 0, wind: 0.12, gust: 0.15, thunder: false },
    clouds: { word: 'Partly cloudy', cloud: 0.5, fog: 0, rain: 0, snow: 0, wind: 0.25, gust: 0.3, thunder: false },
    fog: { word: 'Fog', cloud: 0.92, fog: 0.72, rain: 0, snow: 0, wind: 0.16, gust: 0.2, thunder: false },
    lowfog: { word: 'Fog on the hills', cloud: 0.95, fog: 0.04, deckM: 170, rain: 0, snow: 0, wind: 0.16, gust: 0.2, thunder: false },
    rain: { word: 'Rain', cloud: 0.98, fog: 0.16, rain: 0.62, snow: 0, wind: 0.38, gust: 0.5, thunder: false },
    storm: { word: 'Storm', cloud: 1, fog: 0.26, rain: 1, snow: 0, wind: 1, gust: 1, thunder: true },
    snow: { word: 'Snow', cloud: 0.97, fog: 0.36, rain: 0, snow: 0.7, wind: 0.3, gust: 0.4, thunder: false, snowDepth: 0.5 },
    wind: { word: 'High wind', cloud: 0.36, fog: 0, rain: 0, snow: 0, wind: 0.95, gust: 1, thunder: false },
  };
})();

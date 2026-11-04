// Asks Jev whether the Crissy Beach camera looks foggy. Visitors share one answer through
// Vercel's cache, so the model runs about once every 15 minutes however many people are watching.
// The app decides what to do with the answer. A failure is reported as no answer, never as "no fog".
const CAMERA = 'https://parksconservancy.siteproxy.net/api/live?doc=Crissy%20Beach';
const MODEL = 'jev-1.14.0';
const QUESTION = 'Is it foggy in `photo`, counting a low, thick marine layer as fog?';
const ANSWER_S = 15 * 60;
const FAILURE_S = 5 * 60;

const askJev = async () => {
  const camera = await fetch(CAMERA, { signal: AbortSignal.timeout(20000) });
  if (!camera.ok || !(camera.headers.get('content-type') || '').startsWith('image/jpeg')) {
    throw new Error(`Camera returned ${camera.status}`);
  }
  const reference = crypto.randomUUID();
  const form = new FormData();
  form.append('request', new Blob([JSON.stringify({
    model: MODEL,
    state: { photo: reference },
    assets: { [reference]: { type: 'image', part: 'frame' } },
    questions: { foggy: { type: 'noul', instructions: QUESTION } },
  })], { type: 'application/json' }));
  form.append('frame', new Blob([await camera.arrayBuffer()], { type: 'image/jpeg' }), 'frame.jpg');
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'TypeSafe-Danger-Zone-Images': 'true' },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Jev returned ${res.status}`);
  const foggy = (await res.json()).answers.foggy.noul;
  if (typeof foggy !== 'number') throw new Error('Jev gave no probability');
  return foggy;
};

const check = async () => {
  const at = new Date().toISOString();
  try {
    return { foggy: await askJev(), at };
  } catch (error) {
    console.error('Fog check failed:', error.message);
    return { foggy: null, at };
  }
};

// A second guard on spending, for requests that reach this instance despite the cache
let latest = null;

export async function GET(request) {
  // Query strings and credentials can each get past the cache, and nothing here needs them
  if (new URL(request.url).search || request.headers.has('authorization')) {
    return new Response('Not found', { status: 404 });
  }
  if (!latest || Date.now() - latest.started >= latest.keepMs) {
    latest = { started: Date.now(), keepMs: FAILURE_S * 1000, answer: check() };
    latest.answer.then((a) => { if (a.foggy != null) latest.keepMs = ANSWER_S * 1000; });
  }
  const body = await latest.answer;
  const seconds = body.foggy == null ? FAILURE_S : ANSWER_S;
  return Response.json(body, {
    headers: { 'Cache-Control': `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds}` },
  });
}

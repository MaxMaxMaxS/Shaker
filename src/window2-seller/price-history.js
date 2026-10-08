// Window 2 · market price history per product: real snapshots collected by background.js when there are
// enough, otherwise a DEMO history. The demo is shaped like a real second-hand market (slow drift,
// noise, a season, the odd price shock) and different for every product, and it ends on the market
// price window 2 already shows for that listing.
import { DAY_MS, histKey, productQuery } from '../shared/price-watch.js';
import { rng } from '../shared/seeded.js';

const MIN_REAL_SNAPSHOTS = 4; // fewer than this and the chart would be two dots — show the demo instead
const STEP_DAYS = 2;
const DEMO_SPAN_DAYS = 400; // a bit over a year, so "6+ mj" has more than six months to show

const storage = () => (globalThis.chrome?.runtime?.id ? chrome.storage.local : null);

/** Tells background.js which products to keep collecting prices for. Fire and forget. */
export function trackProducts(items) {
  const products = items.map((l) => ({ query: productQuery(l.title), title: l.title })).filter((p) => p.query);
  if (!products.length || !storage()) return;
  chrome.runtime.sendMessage({ type: 'pw:track', products }).catch(() => {});
}

/** Real snapshots for several products at once: { [query]: snapshots } (only those with enough data). */
export async function readRealHistories(queries) {
  const store = storage();
  const keys = [...new Set(queries.filter(Boolean))].map(histKey);
  if (!store || !keys.length) return {};
  const got = await store.get(keys).catch(() => ({}));
  const out = {};
  for (const q of queries) {
    const h = q && got[histKey(q)];
    if (Array.isArray(h) && h.filter((s) => s.n >= 3).length >= MIN_REAL_SNAPSHOTS) out[q] = h.filter((s) => s.n >= 3);
  }
  return out;
}

/**
 * Price history for one listing: { query, demo, points: [{ t, med, p25, p75, n }] }, oldest first.
 * `marketPrice` is what window 2 shows as "tržište" for the listing; the demo history ends on it.
 */
export async function loadPriceHistory(listing, marketPrice) {
  const query = productQuery(listing.title);
  const real = query ? (await readRealHistories([query]))[query] : null;
  if (real) return { query, demo: false, points: real };
  if (!marketPrice) return { query, demo: true, points: [] };
  return { query, demo: true, points: demoPriceHistory(query || listing.id || listing.title, marketPrice) };
}

/** Standard normal sample from a uniform PRNG (Box–Muller). */
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

const priceStep = (v) => (v < 50 ? 0.1 : v < 2000 ? 1 : 5);
const roundPrice = (v) => Math.round(Math.round(v / priceStep(v)) * priceStep(v) * 10) / 10;

const MAX_DEMO_SWING = 0.1; // the demo median never strays more than 10 % from today's price

/**
 * DEMO: a year of snapshots every 2 days, unique to `seed`, ending exactly on `endPrice` today.
 * The shape comes from a random walk; it is then scaled so the median stays within ±10 % of `endPrice`.
 */
export function demoPriceHistory(seed, endPrice, now = Date.now()) {
  const r = rng(`price-history:${seed}`);
  const steps = Math.floor(DEMO_SPAN_DAYS / STEP_DAYS);
  const perStepYear = STEP_DAYS / 365;

  // This product's character. Most used goods lose value, some hold it, a few climb.
  const drift = (-0.34 + r() * 0.44) * perStepYear; // −34 % … +10 % a year (log scale)
  const vol = 0.005 + r() * 0.014; // day-to-day wobble of the median
  const pull = 0.05 + r() * 0.12; // how fast the wobble fades
  const seasonAmp = r() < 0.55 ? 0.01 + r() * 0.05 : 0; // e.g. bikes in spring, skis in winter
  const seasonPhase = r() * 2 * Math.PI;
  const shocks = Array.from({ length: Math.floor(r() * 3) }, () => ({
    at: 10 + Math.floor(r() * (steps - 20)), // a new model, a sale at the big shops, a wave of listings
    size: -0.13 + r() * 0.19,
    keep: 0.9 + r() * 0.1, // share of the jump that stays
  }));
  const spread = 0.03 + r() * 0.04; // half-width of the middle 50 % of asking prices
  const baseN = 5 + Math.floor(r() * 45); // listings found per scrape

  const xs = [];
  let noise = 0;
  let shock = 0;
  for (let i = 0; i <= steps; i++) {
    noise = noise * (1 - pull) + gauss(r) * vol;
    for (const s of shocks) {
      if (i === s.at) shock += s.size;
      if (i > s.at && i < s.at + 15) shock -= (s.size * (1 - s.keep)) / 15; // partial recovery over a month
    }
    const season = seasonAmp * Math.sin((2 * Math.PI * i * STEP_DAYS) / 365 + seasonPhase);
    xs.push(drift * i + noise + shock + season);
  }

  // Scale the walk so its biggest move away from today is 4–10 % (varies per product), never more.
  const rel = xs.map((x) => x - xs[steps]);
  const widest = Math.max(...rel.map(Math.abs)) || 1;
  const k = Math.log(1 + 0.04 + r() * (MAX_DEMO_SWING - 0.04)) / widest;
  // Bounds rounded inwards, so rounding a price can't push it past ±10 % either.
  const step = priceStep(endPrice);
  const lo = Math.ceil((endPrice * (1 - MAX_DEMO_SWING)) / step - 1e-9) * step;
  const hi = Math.floor((endPrice * (1 + MAX_DEMO_SWING)) / step + 1e-9) * step;
  const bound = (v) => Math.round(Math.min(hi, Math.max(lo, roundPrice(v))) * 10) / 10;
  const points = [];
  // The spread of asking prices and the number of listings drift slowly, they don't jump every scrape.
  let width = 0;
  let count = 0;
  for (let i = 0; i <= steps; i++) {
    const t = now - (steps - i) * STEP_DAYS * DAY_MS;
    const med = i === steps ? endPrice : bound(endPrice * Math.exp(rel[i] * k));
    width = width * 0.88 + gauss(r) * 0.05;
    count = count * 0.8 + gauss(r) * 0.12;
    const s = spread * Math.min(1.5, Math.max(0.6, 1 + width));
    const skew = 0.9 + r() * 0.2; // asking prices lean a little more above the median than below
    const n = Math.max(3, Math.round(baseN * Math.min(1.6, Math.max(0.5, 1 + count))));
    if (i < steps && r() < 0.04) continue; // a missed scrape now and then, like the real thing
    points.push({ t, med, p25: bound(med * (1 - s * 0.85)), p75: bound(med * (1 + s * skew)), n });
  }
  return points;
}

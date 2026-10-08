// Price watch: shared by the background scraper (background.js) and window 2 (price-history.js).
// A "product" is the search query we derive from a listing title; its market price history is a list
// of snapshots, one every 2 days, stored in chrome.storage.local.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const SCRAPE_EVERY_MS = 2 * DAY_MS;
export const PRODUCTS_KEY = 'pw:products'; // { [query]: { title, lastViewedAt, lastScrapedAt } }, written by background.js only
export const histKey = (query) => `pw:hist:${query}`; // [{ t, med, p25, p75, n }], oldest first

// Words that describe the ad rather than the product ("prodajem", "kao nov", "hitno"...).
const STOP = new Set(
  'prodajem prodaja prodam prodajemo kupujem novo nov nova novi kao ocuvan očuvan ocuvano očuvano odlicno odlično stanje stanju hitno akcija povoljno top super extra original originalan originalni ispravan ispravno ispravna garancija garancijom jamstvo jamstvom racun račun r1 hr gratis dostava moguca moguća zamjena zamjenu i ili s sa za u na od do the and with for new used'.split(' ')
);
// Words that make it a different product: a "14 Pro Max" is not a "14 Pro", a case is not a phone.
const VARIANTS = new Set('pro max plus mini ultra lite se fe air'.split(' '));
const ACCESSORIES = new Set('maska maskica futrola etui staklo folija punjac punjač kabel case cover remen narukvica nosac nosač'.split(' '));

function words(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/(\d+)\s*(gb|tb|mb|kw|ks|cm|mm|kg|l|ml|w|mah|inch)\b/g, '$1$2') // "128 GB" -> "128gb"
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w));
}

/** Search query for a listing title, or null: "iPhone 14 Pro, 128 GB — kao nov" -> "iphone 14 pro 128gb". */
export function productQuery(title) {
  const w = words(title);
  const q = w.slice(0, 4);
  // Storage size changes the price a lot, so keep it even when it comes later in the title.
  const size = w.slice(4).find((x) => /^\d+(gb|tb)$/.test(x));
  if (size && !q.some((x) => /^\d+(gb|tb)$/.test(x))) q.push(size);
  return q.join(' ') || null;
}

/** Is a search result the same product as the query (not a bigger variant or an accessory for it)? */
export function matchesProduct(resultTitle, query) {
  const got = new Set(words(resultTitle));
  const want = new Set(query.split(' '));
  for (const w of want) if (!got.has(w)) return false;
  for (const w of got) if ((VARIANTS.has(w) || ACCESSORIES.has(w)) && !want.has(w)) return false;
  return true;
}

const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (i - lo);
};

/** One snapshot from the asking prices found in a search, or null with fewer than 3 usable prices. */
export function summarize(prices, t = Date.now()) {
  let s = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (s.length >= 4) {
    // Drop "1 €" placeholders and typos: anything outside 1.5 × the interquartile range.
    const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), k = 1.5 * (q3 - q1);
    s = s.filter((p) => p >= q1 - k && p <= q3 + k);
  }
  if (s.length < 3) return null;
  const r = (v) => Math.round(v);
  return { t, med: r(quantile(s, 0.5)), p25: r(quantile(s, 0.25)), p75: r(quantile(s, 0.75)), n: s.length };
}

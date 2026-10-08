// Background service worker: collects market prices for products the user has looked at, so window 2
// can chart how a product's price moves. Every product gets a new snapshot once its last one is 2 days
// old. Source is the Index Oglasi search API (JSON); Njuškalo answers scripted searches with a captcha,
// and Facebook is never scraped in the background.
import { DAY_MS, SCRAPE_EVERY_MS, PRODUCTS_KEY, histKey, matchesProduct, summarize } from './shared/price-watch.js';

const ALARM = 'price-watch';
const CHECK_EVERY_MIN = 6 * 60; // wake every 6 h; a product is only scraped when it is due (2 days)
const PER_RUN = 8; // products per wake-up, one after another
const PAUSE_MS = 1500; // between requests, to stay a polite visitor
const MAX_PRODUCTS = 80;
const FORGET_AFTER_MS = 180 * DAY_MS; // stop following products nobody opened for half a year
const MAX_SNAPSHOTS = 400; // ~2 years at one snapshot per 2 days

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM))) chrome.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: CHECK_EVERY_MIN });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) scrapeDue();
});

// Window 2 reports the products it shows: { type: 'pw:track', products: [{ query, title }] }
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'pw:track' && Array.isArray(msg.products)) track(msg.products).then(scrapeDue);
});

async function track(products) {
  const now = Date.now();
  const { [PRODUCTS_KEY]: reg = {} } = await chrome.storage.local.get(PRODUCTS_KEY);
  for (const { query, title } of products) {
    if (typeof query !== 'string' || !query) continue;
    reg[query] = { lastScrapedAt: 0, ...reg[query], title: String(title || query).slice(0, 120), lastViewedAt: now };
  }
  // Forget stale products, then the least recently viewed ones over the cap.
  const keep = Object.entries(reg)
    .filter(([, p]) => now - p.lastViewedAt < FORGET_AFTER_MS)
    .sort((a, b) => b[1].lastViewedAt - a[1].lastViewedAt)
    .slice(0, MAX_PRODUCTS);
  const dropped = Object.keys(reg).filter((q) => !keep.some(([k]) => k === q));
  if (dropped.length) await chrome.storage.local.remove(dropped.map(histKey));
  await chrome.storage.local.set({ [PRODUCTS_KEY]: Object.fromEntries(keep) });
}

let running = false;

async function scrapeDue() {
  if (running) return;
  running = true;
  try {
    const now = Date.now();
    const { [PRODUCTS_KEY]: reg = {} } = await chrome.storage.local.get(PRODUCTS_KEY);
    const due = Object.entries(reg)
      .filter(([, p]) => now - (p.lastScrapedAt || 0) >= SCRAPE_EVERY_MS - 60 * 60 * 1000)
      .sort((a, b) => b[1].lastViewedAt - a[1].lastViewedAt)
      .slice(0, PER_RUN);
    for (const [i, [query]] of due.entries()) {
      if (i) await sleep(PAUSE_MS);
      const snap = await scrapeIndex(query).catch(() => null);
      if (snap) await addSnapshot(query, snap);
      // Mark as tried even when nothing was found, so a dead query isn't retried every 6 hours.
      const { [PRODUCTS_KEY]: latest = {} } = await chrome.storage.local.get(PRODUCTS_KEY);
      if (latest[query]) {
        latest[query].lastScrapedAt = Date.now();
        await chrome.storage.local.set({ [PRODUCTS_KEY]: latest });
      }
    }
  } finally {
    running = false;
  }
}

/** Asking prices for the product on Index Oglasi (first two result pages), summarised. */
async function scrapeIndex(query) {
  const prices = [];
  for (let page = 1; page <= 2; page++) {
    const params = new URLSearchParams({ text: query, sortOption: '4', page: String(page), itemPerPage: '24' });
    const url = `https://www.index.hr/oglasi/api/aditem?${params}`;
    let res = await fetch(url, { credentials: 'include' });
    if (res.status === 400) {
      // The API wants the session cookie Index sets on an ordinary visit; get it once, then retry.
      await fetch('https://www.index.hr/oglasi/', { credentials: 'include' });
      res = await fetch(url, { credentials: 'include' });
    }
    if (!res.ok) break;
    const data = (await res.json())?.data || [];
    for (const ad of data) if (ad.price > 0 && matchesProduct(ad.title, query)) prices.push(ad.price);
    if (data.length < 24) break;
    await sleep(PAUSE_MS);
  }
  return summarize(prices);
}

async function addSnapshot(query, snap) {
  const key = histKey(query);
  const { [key]: hist = [] } = await chrome.storage.local.get(key);
  // One snapshot per day: a second scrape on the same day replaces the first.
  const day = (t) => new Date(t).toDateString();
  const next = hist.filter((s) => day(s.t) !== day(snap.t)).concat(snap).slice(-MAX_SNAPSHOTS);
  await chrome.storage.local.set({ [key]: next });
}

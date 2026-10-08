// Shared helpers used by both windows: result shapes, DOM shortcuts, parsing, PII redaction.
// Every scraper runs as a content script, so it only sees the DOM — never the page's JS globals.

/** Empty result shape that every scraper fills in. Fields the page doesn't show stay null. */
export function emptyListing(platform) {
  return {
    platform,
    listingId: null,
    url: location.href.split(/[?#]/)[0],
    title: null,
    price: null, // { amount: number, currency: 'EUR' | 'USD' | ... }
    location: null,
    postedAt: null, // ISO 8601
    description: null, // PII-redacted
    images: [],
    status: null, // 'active' | 'sold' | 'pending'
    condition: null,
    category: null,
    seller: {
      id: null,
      name: null,
      profileUrl: null,
      type: null, // 'private' | 'business'
      platformVerified: null, // true if the platform itself shows a verification badge
      platformRating: null,
      platformReviewCount: null,
      memberSince: null, // ISO date
      responseInfo: null,
    },
    scrapedAt: new Date().toISOString(),
  };
}

/** Result shape for window 2 (seller profile). Starts from what the listing page already gave us. */
export function emptySellerProfile(platform, listingSeller = {}) {
  return {
    platform,
    seller: {
      ...listingSeller,
      avatarUrl: null,
      location: null,
      verifiedPhone: null,
      description: null,
    },
    activeListings: null, // total count the platform reports
    listings: [], // { id, title, url, price, image, postedAt }
    limited: false, // true when the platform hid data (e.g. Facebook while logged out)
    scrapedAt: new Date().toISOString(),
  };
}

export const text = (el) => (el ? el.innerText.replace(/\s+\n/g, '\n').trim() : null);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Resolves when `selector` exists (SPAs render after load), or with null after `timeout` ms. */
export function waitFor(selector, timeout = 5000) {
  const found = document.querySelector(selector);
  if (found) return Promise.resolve(found);
  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      resolve(null);
    }, timeout);
  });
}

const CURRENCY = { '€': 'EUR', eur: 'EUR', kn: 'HRK', $: 'USD', usd: 'USD', '£': 'GBP' };

/** "16.995 €" -> { amount: 16995, currency: 'EUR' }. Croatian format: "." thousands, "," decimals. */
export function parsePrice(raw) {
  if (!raw) return null;
  const s = raw.replace(/\s/g, ' ').trim();
  const cur = Object.keys(CURRENCY).find((c) => s.toLowerCase().includes(c));
  const num = s.match(/\d[\d.,]*/);
  if (!num) return null;
  let n = num[0];
  if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
  else n = n.replace(/[.,](?=\d{3}\b)/g, '');
  const amount = parseFloat(n);
  return Number.isFinite(amount) ? { amount, currency: cur ? CURRENCY[cur] : null } : null;
}

/**
 * "19.08.2026. u 17:47", "07.10.26. 15:04" -> ISO timestamp (from local time).
 * "08.01.2017." (no time) -> "2017-01-08", so a date-only value doesn't shift across timezones.
 */
export function parseHrDate(raw) {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})\.?(?:\D{0,4}(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  let [, d, mo, y, h, mi] = m;
  if (y.length === 2) y = '20' + y;
  if (h == null) return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(+y, +mo - 1, +d, +h, +mi);
  return isNaN(date) ? null : date.toISOString();
}

/** Strips phone numbers, emails and IBANs before the description leaves the browser. */
export function redactPII(s) {
  if (!s) return s;
  return s
    .replace(/\bHR\d{2}\s?(?:\d{4}\s?){4}\d{1}\b/gi, '[IBAN]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    // +385 91 234 5678, 00385912345678, 095 597 93 58, 091/234-5678 …
    .replace(/(?:(?:\+|\b00)\d{3}[\s/-]?|\b0)\d{1,2}(?:[\s/-]?\d){6,8}\b/g, '[PHONE]');
}

export const uniq = (arr) => [...new Set(arr.filter(Boolean))];

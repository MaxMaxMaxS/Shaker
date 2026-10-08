// Window 2 · Facebook seller's other listings.
// Facebook doesn't put them on the item page and won't let us load the profile in the background
// (X-Frame-Options: DENY; a plain fetch returns an empty shell). So the user opens the seller's profile
// with one click, we read the listings Facebook shows there, and remember them per seller in
// chrome.storage.local. Back on any of that seller's items, window 2 shows them from the cache.
import { text, $$, parsePrice } from '../shared/utils.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cacheKey = (sellerId) => `fbSellerListings:${sellerId}`;

/** Seller id when the current page is a Marketplace seller profile, else null. */
export const facebookProfileId = () => location.pathname.match(/^\/marketplace\/profile\/(\d+)/)?.[1] || null;

/**
 * Listings shown in the seller-profile dialog. Each card is a link whose text reads
 * "price | title | location" (title missing on some cards — then the photo's alt has it).
 */
function readProfileListings() {
  const dialog = $$('[role="dialog"]').find((d) => d.querySelector('a[href*="/marketplace/item/"]'));
  if (!dialog) return []; // without the dialog we'd be reading the feed behind it
  const jsonTitles = readProfileJsonTitles();
  // A line that is ONLY a price ("28.000 €", "$100", "FREE"), so titles like "Euro palete 120x80" stay titles.
  const isPrice = (l) => /^(free|besplatno|(€|\$|£)\s?[\d.,]+|[\d.,]+\s?(€|eur|kn|usd|\$|£))$/i.test(l);
  const seen = new Set();
  const listings = [];
  for (const a of $$('a[href*="/marketplace/item/"]', dialog)) {
    const id = a.getAttribute('href').match(/\/marketplace\/item\/(\d+)/)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    // Card text: price, [old price when reduced], [title — vehicles have none], location.
    const lines = (text(a) || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const price = /^(free|besplatno)$/i.test(lines[0] || '') ? { amount: 0, currency: null } : parsePrice(lines[0]);
    const rest = lines.slice(1).filter((l) => !isPrice(l));
    listings.push({
      id,
      title: (rest.length >= 2 ? rest[0] : null) || jsonTitles.get(id) || null,
      url: `https://www.facebook.com/marketplace/item/${id}/`,
      price,
      image: a.querySelector('img')?.src || null,
      postedAt: null,
      location: rest.at(-1) || null,
    });
  }
  return listings;
}

/** Titles Facebook embedded for the profile's listings (vehicle cards don't print theirs). */
function readProfileJsonTitles() {
  const titles = new Map();
  for (const s of $$('script[type="application/json"]')) {
    if (!s.textContent.includes('marketplace_listing_title')) continue;
    try {
      const stack = [JSON.parse(s.textContent)];
      while (stack.length) {
        const n = stack.pop();
        if (!n || typeof n !== 'object') continue;
        if (n.__typename === 'GroupCommerceProductItem' && n.id && n.marketplace_listing_title) titles.set(n.id, n.marketplace_listing_title);
        for (const v of Object.values(n)) if (v && typeof v === 'object') stack.push(v);
      }
    } catch {
      /* not JSON we care about */
    }
  }
  return titles;
}

let lastSaved = '';

/** Called on every tick of content.js; saves whenever the profile shows a new set of listings. */
export async function captureFacebookProfileListings() {
  const sellerId = facebookProfileId();
  if (!sellerId) return;
  const listings = readProfileListings();
  const signature = `${sellerId}:${listings.map((l) => l.id).join(',')}`;
  if (!listings.length || signature === lastSaved) return;
  lastSaved = signature;
  await chrome.storage.local.set({ [cacheKey(sellerId)]: { listings, savedAt: Date.now() } });
}

/** Cached listings for a seller, or null if we have none (or they're older than the TTL). */
export async function loadFacebookSellerListings(sellerId) {
  if (!sellerId || !globalThis.chrome?.storage?.local) return null;
  const entry = (await chrome.storage.local.get(cacheKey(sellerId)))[cacheKey(sellerId)];
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
  return entry;
}

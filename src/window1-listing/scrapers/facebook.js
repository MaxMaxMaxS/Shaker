// Window 1 · Facebook Marketplace item: https://www.facebook.com/marketplace/item/<id>/
// Class names are obfuscated and change constantly, so we never use them. Listing data comes from the
// Relay JSON that Facebook embeds in <script type="application/json">; seller data only exists there
// (or in the DOM) when the user is logged in.
import { emptyListing, $$, redactPII, uniq } from '../../shared/utils.js';
import { pickDefined, readFacebookSellerFromPage, facebookProfileUrl } from '../../shared/facebook-seller-dom.js';

const LISTING_KEYS = [
  'marketplace_listing_title',
  'listing_price',
  'redacted_description',
  'marketplace_listing_category_name',
  'marketplace_listing_seller',
];

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Fills in only missing values, so a sparse fragment never wipes data from a richer one.
 * Nested objects merge too (one fragment has listing_price.amount, another listing_price.currency).
 */
function mergeDefined(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v == null) continue;
    if (target[k] == null) target[k] = isPlainObject(v) ? { ...v } : v;
    else if (isPlainObject(target[k]) && isPlainObject(v)) mergeDefined(target[k], v);
  }
}

/** Walks parsed JSON and collects every object whose id is the listing id. */
function collectListingNodes(root, itemId, acc = []) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (node.id === itemId && LISTING_KEYS.some((k) => k in node)) acc.push(node);
    for (const v of Object.values(node)) if (v && typeof v === 'object') stack.push(v);
  }
  return acc;
}

export function scrapeFacebook() {
  const out = emptyListing('facebook');
  const itemId = location.pathname.match(/\/marketplace\/item\/(\d+)/)?.[1] || null;
  out.listingId = itemId;
  out.url = itemId ? `https://www.facebook.com/marketplace/item/${itemId}/` : out.url;

  // Merge every embedded fragment that describes this listing.
  const listing = {};
  if (itemId) {
    for (const s of $$('script[type="application/json"]')) {
      if (!s.textContent.includes(itemId)) continue;
      try {
        collectListingNodes(JSON.parse(s.textContent), itemId).forEach((n) => mergeDefined(listing, n));
      } catch {
        /* not JSON we care about */
      }
    }
  }

  const og = (p) => document.querySelector(`meta[property="og:${p}"]`)?.content || null;

  out.title = listing.marketplace_listing_title || og('title');
  const lp = listing.listing_price;
  if (lp?.amount) out.price = { amount: parseFloat(lp.amount), currency: lp.currency || null };
  out.location = listing.location_text?.text || listing.location?.reverse_geocode?.city_page?.display_name || null;
  if (listing.creation_time) out.postedAt = new Date(listing.creation_time * 1000).toISOString();
  out.description = redactPII(listing.redacted_description?.text || og('description') || '') || null;
  out.category = listing.marketplace_listing_category_name || null;
  out.condition = (listing.attribute_data || []).find((a) => a.attribute_name === 'Condition')?.label || null;
  if (listing.is_sold) out.status = 'sold';
  else if (listing.is_pending) out.status = 'pending';
  else if (listing.is_live) out.status = 'active';

  // The same photo appears with different CDN query strings; dedupe on the path.
  const seen = new Set();
  out.images = uniq([
    ...(listing.listing_photos || []).map((p) => p?.image?.uri),
    listing.primary_listing_photo?.image?.uri,
    og('image'),
  ]).filter((u) => {
    const key = u.split('?')[0];
    return !seen.has(key) && seen.add(key);
  });

  // Seller: Relay field when logged in, otherwise the "Seller information" block in the DOM.
  const s = out.seller;
  const rs = listing.marketplace_listing_seller || listing.story?.actors?.[0];
  if (rs) {
    s.id = rs.id || null;
    s.name = rs.name || null;
  }
  Object.assign(s, pickDefined(readFacebookSellerFromPage(), s));
  if (s.id) s.profileUrl = facebookProfileUrl(s.id);
  s.type = 'private';

  return out;
}

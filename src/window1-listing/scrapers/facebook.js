// Window 1 · Facebook Marketplace item: https://www.facebook.com/marketplace/item/<id>/
// Class names are obfuscated and change constantly, so we never use them. Listing data comes from the
// Relay JSON that Facebook embeds in <script type="application/json">; seller data only exists there
// (or in the DOM) when the user is logged in.
import { emptyListing, text, $, $$, parsePrice, redactPII, uniq, waitFor } from '../../shared/utils.js';
import { pickDefined, readFacebookSellerFromPage, readFacebookSellerFromJson, facebookProfileUrl } from '../../shared/facebook-seller-dom.js';

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

/**
 * The listing as rendered on screen: the "Marketplace listing viewer" dialog when the item was opened from
 * the feed, or the main column when the item URL was loaded directly. Needed because in-app navigation
 * fetches the data by XHR, so it is NOT in the embedded JSON (and og: tags still describe the old page).
 * Reads labels in English and Croatian.
 */
function readFacebookListingFromPage() {
  const found = { title: null, price: null, location: null, condition: null, description: null, images: [] };
  const container =
    // Not just any dialog: Facebook's Notifications panel is a dialog with a heading and images too.
    $$('[role="dialog"]').find(
      (d) =>
        d.querySelector('h1') &&
        (d.querySelector('a[href*="/marketplace/profile/"]') || $$('img[alt]', d).some((i) => /^(Product photo|Fotografija proizvoda)/i.test(i.alt)))
    ) ||
    document.querySelector('[role="main"]');
  if (!container) return found;

  const lines = (text(container) || '').split('\n').map((l) => l.trim()).filter(Boolean);
  found.title = text($('h1', container)) || lines[0] || null;
  const at = Math.max(0, lines.indexOf(found.title));

  // Price is the line right after the title: "250 €", "30 USD", "$30", "FREE" / "Besplatno".
  const priceLine = lines[at + 1] || '';
  found.price = /^(free|besplatno)$/i.test(priceLine) ? { amount: 0, currency: null } : parsePrice(priceLine);

  // "Listed about an hour ago in Karlovac, …" / "Objavljeno prije sat vremena u mjestu Karlovac"
  const listed = lines.find((l) => /^(Listed|Objavljeno)\b/i.test(l));
  found.location =
    listed?.match(/\s(?:in|u mjestu|u)\s+(.+)$/i)?.[1] ||
    lines.find((l) => /·\s*(Location is approximate|Lokacija je približna)/i.test(l))?.split('·')[0].trim() ||
    null;

  const condIdx = lines.findIndex((l) => /^(Condition|Stanje)$/i.test(l));
  if (condIdx >= 0) found.condition = lines[condIdx + 1] || null;

  // Description: everything after the condition value up to the location / seller block.
  const stop = lines.findIndex((l, i) => i > condIdx && /(Location is approximate|Lokacija je približna|^Seller information$|^Podaci o prodava)/i.test(l));
  if (condIdx >= 0 && stop > condIdx + 2) found.description = lines.slice(condIdx + 2, stop).join('\n');

  // Product photos only (the dialog also contains avatars and ads).
  found.images = uniq(
    $$('img', container)
      .filter((i) => /^(Product photo|Fotografija proizvoda)/i.test(i.alt || '') || (i.src.includes('fbcdn') && i.naturalWidth >= 300))
      .map((i) => i.src)
  );
  return found;
}

let lastItem = { id: null, title: null };

export async function scrapeFacebook() {
  // In-app navigation changes the URL first and renders the listing a moment later.
  await waitFor('[role="dialog"] h1, [role="main"] h1', 6000);
  await waitFor('a[href*="/marketplace/profile/"]', 2500); // seller block (logged-in only)

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

  // og: tags only describe the listing when the item URL itself was loaded (no in-app navigation).
  const jsonOk = Object.keys(listing).length > 0;
  const og = (p) => (jsonOk ? document.querySelector(`meta[property="og:${p}"]`)?.content || null : null);

  // Going from one item straight to the next, the old item can still be on screen for a moment.
  let page = readFacebookListingFromPage();
  for (let i = 0; i < 6 && itemId !== lastItem.id && page.title && page.title === lastItem.title; i++) {
    await new Promise((r) => setTimeout(r, 500));
    page = readFacebookListingFromPage();
  }
  lastItem = { id: itemId, title: page.title };

  out.title = listing.marketplace_listing_title || page.title || og('title');
  const lp = listing.listing_price;
  if (lp?.amount) out.price = { amount: parseFloat(lp.amount), currency: lp.currency || null };
  else out.price = page.price;
  out.location = listing.location_text?.text || listing.location?.reverse_geocode?.city_page?.display_name || page.location;
  if (listing.creation_time) out.postedAt = new Date(listing.creation_time * 1000).toISOString();
  out.description = redactPII(listing.redacted_description?.text || page.description || og('description') || '') || null;
  out.category = listing.marketplace_listing_category_name || null;
  out.condition = (listing.attribute_data || []).find((a) => a.attribute_name === 'Condition')?.label || page.condition;
  if (listing.is_sold) out.status = 'sold';
  else if (listing.is_pending) out.status = 'pending';
  else if (listing.is_live) out.status = 'active';

  // The same photo appears with different CDN query strings; dedupe on the path.
  const seen = new Set();
  out.images = uniq([
    ...(listing.listing_photos || []).map((p) => p?.image?.uri),
    listing.primary_listing_photo?.image?.uri,
    og('image'),
    ...page.images,
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
  Object.assign(s, pickDefined(readFacebookSellerFromJson(itemId), s));
  Object.assign(s, pickDefined(readFacebookSellerFromPage(), s));
  if (s.id) s.profileUrl = facebookProfileUrl(s.id);
  s.type = 'private';

  return out;
}

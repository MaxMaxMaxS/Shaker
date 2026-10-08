// Facebook's "Seller information / Podaci o prodavaču" block. Window 1 reads it for the seller name,
// window 2 reads it again (it often renders a moment after the rest of the page).
import { text, $$ } from './utils.js';

/** Fields from `fresh` only where `current` has none. */
export const pickDefined = (fresh, current) =>
  Object.fromEntries(Object.entries(fresh).filter(([k, v]) => v != null && current[k] == null));

/**
 * Rendered only for logged-in users. Handles English and Croatian UI. Scoped to the item dialog when the
 * listing is opened as a modal over the feed, so links from feed cards aren't mistaken for the seller.
 */
export function readFacebookSellerFromPage() {
  const found = { id: null, name: null, memberSince: null, platformRating: null, platformReviewCount: null };
  const scope =
    $$('[role="dialog"]').find((d) => d.querySelector('a[href*="/marketplace/profile/"]')) ||
    document.querySelector('[role="main"]') ||
    document.body;
  if (!scope) return found;

  // Logged in, the block has several links to the same profile: the "Seller details" heading, the avatar
  // (name only in aria-label) and the name itself. Take the name from the avatar's label or from a link
  // whose text isn't the heading.
  const HEADING = /^(Seller (details|information)|Podaci o prodava\S*|Detalji o prodava\S*|Informacije o prodava\S*)$/i;
  const links = $$('a[href*="/marketplace/profile/"]', scope);
  const first = links[0];
  if (first) found.id = first.getAttribute('href').match(/\/marketplace\/profile\/(\d+)/)?.[1] || null;
  const labelled = links.map((a) => a.getAttribute('aria-label')?.trim()).find((l) => l && !HEADING.test(l));
  const texted = links.map((a) => (text(a) || '').split('\n')[0].trim()).find((t) => t && !HEADING.test(t));
  found.name = labelled || texted || null;

  const block = text(scope) || '';
  // "Joined Facebook in 2015" · "Pridružio se Facebooku 2015." · "Pridružila se Facebooku u 2015."
  const joined = block.match(/(?:Joined Facebook in|se Facebooku(?:\s+u)?)\s*(\d{4})/i);
  if (joined) found.memberSince = `${joined[1]}-01-01`;

  // Star widget: aria-label "4.8 out of 5" / "Ocjena 4,8 od 5", review count shown as "(23)".
  const stars = $$('[aria-label]', scope).find((e) => /(\d[.,]\d|\d)\s*(?:out of|od)\s*5/i.test(e.getAttribute('aria-label')));
  if (stars) {
    found.platformRating = parseFloat(stars.getAttribute('aria-label').match(/(\d[.,]\d|\d)\s*(?:out of|od)/i)[1].replace(',', '.'));
    const count = (text(stars.parentElement) || '').match(/\((\d+)\)/);
    if (count) found.platformReviewCount = +count[1];
  }
  return found;
}

export const facebookProfileUrl = (id) => `https://www.facebook.com/marketplace/profile/${id}/`;

/**
 * Seller from the Relay JSON embedded in the page (logged in, page loaded directly). Richer than the DOM:
 * join date, Marketplace verified badge and ratings. When the item was opened by clicking inside Facebook,
 * the data arrives by XHR instead and this returns nulls; the DOM reader above covers that case.
 */
export function readFacebookSellerFromJson(itemId) {
  const found = { id: null, name: null, memberSince: null, platformVerified: null, platformRating: null, platformReviewCount: null, avatarUrl: null };
  let seller = null;
  for (const s of $$('script[type="application/json"]')) {
    // The embedded JSON stays from the first page load; after in-app navigation it describes an OLD item.
    if (!itemId || !s.textContent.includes(itemId) || !s.textContent.includes('"marketplace_listing_seller":{')) continue;
    try {
      const stack = [JSON.parse(s.textContent)];
      while (stack.length && !seller) {
        const n = stack.pop();
        if (!n || typeof n !== 'object') continue;
        if (n.marketplace_listing_seller?.name) seller = n.marketplace_listing_seller;
        else for (const v of Object.values(n)) if (v && typeof v === 'object') stack.push(v);
      }
    } catch {
      /* not JSON we care about */
    }
    if (seller) break;
  }
  if (!seller) return found;

  found.id = seller.id || seller.user_id || null;
  found.name = seller.name || null;
  found.avatarUrl = seller.profile_picture_160?.uri || seller.profile_picture?.uri || null;

  // join_time and the verified flag sit somewhere inside the seller object; search its subtree.
  const stack = [seller];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== 'object') continue;
    if (typeof n.join_time === 'number') found.memberSince = new Date(n.join_time * 1000).toISOString().slice(0, 10);
    if (typeof n.marketplace_should_display_verified_badge === 'boolean') found.platformVerified = n.marketplace_should_display_verified_badge;
    for (const v of Object.values(n)) if (v && typeof v === 'object') stack.push(v);
  }

  // Ratings as a seller; Facebook lets sellers hide them, and then we show nothing rather than a 0.
  const stats = seller.marketplace_ratings_stats_by_role_v2;
  if (stats && !stats.seller_ratings_are_private && stats.seller_stats?.five_star_total_rating_count_by_role > 0) {
    found.platformRating = stats.seller_stats.five_star_ratings_average;
    found.platformReviewCount = stats.seller_stats.five_star_total_rating_count_by_role;
  }
  return found;
}

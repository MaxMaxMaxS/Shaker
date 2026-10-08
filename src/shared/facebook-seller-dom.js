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

  const link = $$('a[href*="/marketplace/profile/"]', scope).find((a) => text(a));
  if (link) {
    found.id = link.getAttribute('href').match(/\/marketplace\/profile\/(\d+)/)?.[1] || null;
    found.name = text(link).split('\n')[0] || null;
  }

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

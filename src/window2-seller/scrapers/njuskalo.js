// Window 2 · Njuškalo seller profile.
import { emptySellerProfile, text, $, $$, parsePrice, parseHrDate } from '../../shared/utils.js';

/**
 * Window 2: the seller's public profile (/korisnik/<name> or /trgovina/<name>).
 * One same-origin request, made only when the user opens the seller view.
 */
export async function scrapeNjuskaloSeller(listing) {
  const out = emptySellerProfile('njuskalo', listing.seller);
  const s = out.seller;
  if (!s.profileUrl) return { ...out, limited: true };

  const res = await fetch(s.profileUrl, { credentials: 'include' });
  if (!res.ok) return { ...out, limited: true };
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

  s.name = text($('.UserProfileDetails-title', doc)) || s.name;
  s.memberSince = parseHrDate(text($('.UserProfileDetails-subtitle', doc))?.match(/od:?\s*([\d.]+)/)?.[1]) || s.memberSince;
  const logo = $('.UserProfileDetails-logo img', doc)?.getAttribute('src');
  if (logo) s.avatarUrl = new URL(logo, location.origin).href;

  // Contact entries are identified by their icon: Verified (phone), User (trader or not), Pin (address).
  for (const entry of $$('.UserProfileDetailsContactInfo-contactEntry', doc)) {
    const icon = $('[class*="icon--userProfileIcon"]', entry)?.className.toString() || '';
    const t = text(entry) || entry.textContent.trim();
    if (icon.includes('Verified')) {
      s.verifiedPhone = true;
      s.platformVerified = true;
    } else if (icon.includes('IconUser')) {
      s.type = /nije trgovac/i.test(t) ? 'private' : 'business';
    } else if (icon.includes('Pin')) {
      s.location = t;
    }
  }

  // The seller's own ads; "EntityList--Latest" is Njuškalo's site-wide "newest ads" box, not theirs.
  out.listings = $$('.EntityList:not(.EntityList--Latest) li.EntityList-item[data-href]', doc).map((li) => {
    let id = null;
    try {
      id = String(JSON.parse(li.dataset.options || '{}').id || '') || null;
    } catch {}
    const img = $('img', li);
    const src = img?.getAttribute('data-src') || img?.getAttribute('src');
    return {
      id: id || li.dataset.href.match(/oglas-(\d+)/)?.[1] || null,
      title: $('.entity-title', li)?.textContent.trim() || null,
      url: new URL(li.dataset.href, location.origin).href,
      price: parsePrice($('.price-item', li)?.textContent),
      image: src ? new URL(src, location.origin).href : null,
      postedAt: $('time', li)?.getAttribute('datetime') || null,
    };
  });
  out.activeListings = out.listings.length; // first page only; enough for the popup
  out.listings = out.listings.filter((l) => l.id !== listing.listingId); // "his other ads"

  return out;
}

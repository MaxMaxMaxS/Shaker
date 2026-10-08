// Window 2 · Index Oglasi seller, via the JSON endpoints Index's own profile page uses.
import { emptySellerProfile } from '../../shared/utils.js';

const IMG = (path, size = 'ad_large') => `${location.origin}/oglasi/api/image/direct/${path}?m=${size}`;

/**
 * Window 2: Index Oglasi exposes the seller through the same JSON endpoints its own profile page uses:
 *   /oglasi/api/user/<uuid>, /oglasi/api/user-rating/overall-count/<uuid>, /oglasi/api/aditem?userId=<uuid>
 * Three same-origin requests, made only when the user opens the seller view.
 */
export async function scrapeIndexOglasiSeller(listing) {
  const out = emptySellerProfile('index-oglasi', listing.seller);
  const s = out.seller;
  const uid = /^[0-9a-f-]{36}$/.test(s.id || '') ? s.id : null;
  if (!uid) return { ...out, limited: true };

  const json = (url) => fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const ads = new URLSearchParams({ userId: uid, sortOption: '4', page: '1', itemPerPage: '24' });
  const [user, rating, list] = await Promise.all([
    json(`/oglasi/api/user/${uid}`),
    json(`/oglasi/api/user-rating/overall-count/${uid}`),
    json(`/oglasi/api/aditem?${ads}`),
  ]);

  if (user) {
    s.name = user.username || s.name;
    s.memberSince = user.registrationDate?.slice(0, 10) || s.memberSince;
    s.platformVerified = !!user.isVerified;
    s.verifiedPhone = !!user.isVerified && !!user.hasPhones;
    s.type = user.legalEntity === 2 ? 'business' : user.legalEntity === 1 ? 'private' : s.type; // 2 = "Pravna osoba"
    s.location = [user.cityName, user.countyName].filter(Boolean).join(', ') || null;
    s.responseInfo = user.replyStatisticsMessage || s.responseInfo;
    s.description = user.description || null;
    if (user.avatar) s.avatarUrl = IMG(user.avatar);
  } else {
    out.limited = true;
  }

  if (rating) {
    s.platformRating = rating.averageRating ?? null;
    s.platformReviewCount = rating.totalCount ?? null;
  }

  // Ad URLs need a category path the API doesn't return; reuse the current listing's,
  // which matches for sellers who post in one category (the common case).
  const base = location.pathname.match(/^(\/oglasi\/.+?)\/oglas\//)?.[1];
  out.activeListings = list?.count ?? null;
  out.listings = (list?.data || []).filter((a) => String(a.code) !== listing.listingId).map((a) => ({
    id: String(a.code),
    title: a.title,
    url: base && a.smartLink ? `${location.origin}${base}/oglas/${a.smartLink}/${a.code}` : s.profileUrl,
    price: a.price != null ? { amount: a.price, currency: 'EUR' } : null,
    image: a.images?.[0] ? IMG(a.images[0]) : null,
    postedAt: a.postedTime || null,
  }));

  return out;
}

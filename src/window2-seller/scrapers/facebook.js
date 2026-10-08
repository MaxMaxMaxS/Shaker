// Window 2 · Facebook seller. No extra requests at all (Facebook's terms forbid automated collection, and
// the seller profile needs a login anyway). We read what the item page contains, plus the seller's other
// listings remembered from the last time the user opened their profile (facebook-seller-cache.js).
import { emptySellerProfile, $$ } from '../../shared/utils.js';
import { pickDefined, readFacebookSellerFromPage, readFacebookSellerFromJson, facebookProfileUrl } from '../../shared/facebook-seller-dom.js';
import { loadFacebookSellerListings } from '../facebook-seller-cache.js';

export async function scrapeFacebookSeller(listing) {
  const out = emptySellerProfile('facebook', listing.seller);
  // The seller block often renders after window 1 was built; read it again now.
  Object.assign(out.seller, pickDefined(readFacebookSellerFromJson(listing.listingId), out.seller));
  Object.assign(out.seller, pickDefined(readFacebookSellerFromPage(), out.seller));
  if (out.seller.id) out.seller.profileUrl = facebookProfileUrl(out.seller.id);
  const sellerId = out.seller.id;
  if (!sellerId) return { ...out, limited: true };

  const seen = new Set([listing.listingId]);
  for (const s of $$('script[type="application/json"]')) {
    if (!s.textContent.includes(sellerId)) continue;
    let root;
    try {
      root = JSON.parse(s.textContent);
    } catch {
      continue;
    }
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (!n || typeof n !== 'object') continue;
      if (n.marketplace_listing_title && n.id && !seen.has(n.id) && n.marketplace_listing_seller?.id === sellerId) {
        seen.add(n.id);
        out.listings.push({
          id: n.id,
          title: n.marketplace_listing_title,
          url: `https://www.facebook.com/marketplace/item/${n.id}/`,
          price: n.listing_price?.amount ? { amount: parseFloat(n.listing_price.amount), currency: n.listing_price.currency || null } : null,
          image: n.primary_listing_photo?.image?.uri || null,
          postedAt: n.creation_time ? new Date(n.creation_time * 1000).toISOString() : null,
        });
      }
      for (const v of Object.values(n)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  // The item page almost never carries them; use what we saw on the seller's profile, if anything.
  if (!out.listings.length) {
    const cached = await loadFacebookSellerListings(sellerId);
    if (cached) out.listings = cached.listings.filter((l) => l.id !== listing.listingId);
    else out.needsProfileVisit = true; // window 2 offers "open their profile" instead of an empty list
  }
  out.activeListings = out.listings.length || null;
  return out;
}

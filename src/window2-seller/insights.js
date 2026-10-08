// Window 2 · Shaker platform data for a seller: price fairness, scam check, response time.
// DEMO data in the shape we expect from GET /sellers/{platform}/{id} (PROJECT_BRAIN.md §3.7).
// Replace the body of getSellerInsights with a fetch() once the endpoint is live.
// Market prices already use real data when background.js has collected enough for a product.
import { seeded } from '../shared/seeded.js';
import { productQuery } from '../shared/price-watch.js';
import { readRealHistories } from './price-history.js';

/** GET /sellers/{platform}/{id} — window 2 */
export async function getSellerInsights(profile) {
  const r = seeded(`${profile.platform}:${profile.seller.id}`);
  const queries = profile.listings.map((l) => productQuery(l.title));
  const real = await readRealHistories(queries);
  const diffs = profile.listings.map((l, i) => {
    if (!l.price?.amount) return null;
    const latest = real[queries[i]]?.at(-1);
    if (latest) return { marketPrice: latest.med, diffPct: Math.round(((l.price.amount - latest.med) / latest.med) * 100), real: true };
    const d = Math.round((seeded(l.id) - 0.6) * 20); // -12 % … +8 %
    const market = l.price.amount / (1 + d / 100);
    return { marketPrice: market >= 2000 ? Math.round(market / 50) * 50 : Math.round(market), diffPct: d, real: false };
  });
  const known = diffs.filter(Boolean);
  const avg = known.length ? Math.round(known.reduce((a, b) => a + b.diffPct, 0) / known.length) : null;
  return {
    demo: true,
    priceVerdict: avg == null ? null : avg <= -5 ? 'Odlične' : avg <= 3 ? 'Fer' : 'Visoke',
    avgDiffPct: avg,
    // Unknown seller (e.g. Facebook while logged out) -> no verdict rather than a reassuring "Nema".
    scamReports: profile.seller.id ? 0 : null,
    scamVerdict: profile.seller.id ? 'Nema' : null,
    responseMinutes: 10 + Math.round(r * 50),
    perListing: diffs, // same order as profile.listings
  };
}

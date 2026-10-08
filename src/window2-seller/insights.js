// Window 2 · Shaker platform data for a seller: price fairness, scam check, response time.
// DEMO data in the shape we expect from GET /sellers/{platform}/{id} (PROJECT_BRAIN.md §3.7).
// Replace the body of getSellerInsights with a fetch() once the endpoint is live.
import { seeded } from '../shared/seeded.js';

/** GET /sellers/{platform}/{id} — window 2 */
export async function getSellerInsights(profile) {
  const r = seeded(`${profile.platform}:${profile.seller.id}`);
  const diffs = profile.listings.map((l) => {
    if (!l.price?.amount) return null;
    const d = Math.round((seeded(l.id) - 0.6) * 20); // -12 % … +8 %
    return { marketPrice: Math.round(l.price.amount / (1 + d / 100)), diffPct: d };
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

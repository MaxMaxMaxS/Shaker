// Window 1 · Vrijedi.Ly platform data for a listing, from the web app's check (POST /api/extension/v1/checks).
// Opening a listing reuses a check from the last 6 hours or starts one; while it runs we poll its progress.
// The headline score is Ocjena ponude (0–100 → 0–5). When the platform has no score it says so: nothing here
// falls back to a made-up number. Only what the platform doesn't compute at all stays DEMO and is labelled:
// "bolji od X % sličnih" and the verified-seller box.
import { seeded } from '../shared/seeded.js';
import { callApi } from '../shared/api.js';

const POLL_MS = 1500;
const GIVE_UP_MS = 4 * 60 * 1000; // a check normally takes well under a minute

const VERDICT_LABEL = {
  great_price: 'Odlična cijena',
  fair_price: 'Fer cijena',
  room_to_haggle: 'Prostor za pregovor',
  risk: 'Rizik',
  no_data: 'Nema podataka o cijeni', // the verdict alone; the web shows it next to the price
};

const initials = (name) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

/** "danas", "3 d", "2 tj.", "4 mj." — like the demo reviews used to show. */
function ago(iso, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000));
  if (days === 0) return 'danas';
  if (days < 7) return `${days} d`;
  if (days < 30) return `${Math.floor(days / 7)} tj.`;
  if (days < 365) return `${Math.floor(days / 30)} mj.`;
  return `${Math.floor(days / 365)} g.`;
}

/** What the platform doesn't compute yet: seeded per listing, always shown as demo. */
function demoParts(listing) {
  const r = seeded(`${listing.platform}:${listing.listingId}`);
  return {
    betterThanPct: Math.round(40 + r * 55),
    shakerVerified: !!listing.seller.id && r > 0.35, // can't vouch for a seller we couldn't identify
  };
}

/** Before the API answered, and when it can't be reached. */
export function pendingInsights(listing, state = 'checking', progress = null) {
  return { state, progress, ...demoParts(listing), score: null, reviews: [], reviewCount: 0 };
}

/** The API's check (status, progress, report) → what window 1 renders. */
export function toListingInsights(listing, check) {
  const done = check.progress?.rows?.filter((row) => row.status !== 'queued' && row.status !== 'running').length ?? 0;
  const progress = { done, total: check.progress?.rows?.length ?? 0 };
  if (check.status !== 'completed' || !check.report) {
    return { ...pendingInsights(listing, check.status === 'running' ? 'checking' : check.status, progress), checkId: check.checkId };
  }
  const { report } = check;
  const offer = report.offerScore;
  return {
    state: 'ready',
    checkId: check.checkId,
    listingId: report.listing.id,
    sellerId: report.seller?.sellerId ?? null,
    ...demoParts(listing),
    // Ocjena ponude needs 5 reviews of the seller; until then there is no score, not a guessed one.
    score: offer.kind === 'score' ? Math.round(offer.value / 2) / 10 : null,
    verdict: VERDICT_LABEL[report.verdict] ?? VERDICT_LABEL.no_data,
    reviewCount: report.seller?.reviewCount ?? 0,
    reviews: report.reviews.map((r) => ({
      author: r.reviewerName || 'Kupac',
      initials: initials(r.reviewerName || 'Kupac'),
      stars: r.stars,
      ago: ago(r.createdAt, Date.parse(report.now)),
      text: r.text,
      helpful: r.helpfulCount,
      reply: r.reply?.text ?? null,
    })),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Checks the listing and reports every state to `onUpdate` (checking → ready / failed / removed /
 * unavailable). Stops polling once `isCurrent()` says the user moved on. Resolves with the last state.
 */
export async function checkListing(listing, onUpdate, isCurrent = () => true) {
  const emit = (insights) => (onUpdate(insights), insights);
  try {
    let res = await callApi('/api/extension/v1/checks', { method: 'POST', body: { url: listing.url } });
    if (res.status === 422) return emit(pendingInsights(listing, 'unsupported'));
    if (res.status !== 200 && res.status !== 202) return emit(pendingInsights(listing, 'unavailable'));
    const started = Date.now();
    let insights = emit(toListingInsights(listing, res.data));
    while (insights.state === 'checking' && Date.now() - started < GIVE_UP_MS) {
      await sleep(POLL_MS);
      if (!isCurrent()) return insights;
      res = await callApi(`/api/extension/v1/checks/${res.data.checkId}`);
      if (res.status !== 200) return emit(pendingInsights(listing, 'unavailable'));
      insights = emit(toListingInsights(listing, res.data));
    }
    return insights.state === 'checking' ? emit(pendingInsights(listing, 'unavailable')) : insights;
  } catch {
    return emit(pendingInsights(listing, 'unavailable'));
  }
}

/** The report again (after a review was posted), without starting anything. */
export async function reloadListing(listing, checkId) {
  const res = await callApi(`/api/extension/v1/checks/${checkId}`);
  return res.status === 200 ? toListingInsights(listing, res.data) : null;
}

const REVIEW_ERRORS = {
  already_reviewed: 'S ovog preglednika već si ocijenio ovog prodavača.',
  no_seller: 'Ne znamo tko je prodavač, pa ga zasad ne možeš ocijeniti.',
  invalid_request: 'Odaberi 1–5 zvjezdica i napiši par riječi.',
};

/** Posts an anonymous review of the listing's seller. Resolves with { ok, message }. */
export async function postReview(listingId, stars, text) {
  try {
    const res = await callApi('/api/extension/v1/reviews', { method: 'POST', body: { listingId, stars, text } });
    if (res.status === 201) return { ok: true, message: 'Hvala! Recenzija je objavljena.' };
    return { ok: false, message: REVIEW_ERRORS[res.data?.error] || 'Recenzija nije spremljena. Pokušaj ponovo.' };
  } catch {
    return { ok: false, message: 'Vrijedi.Ly trenutno nije dostupan.' };
  }
}

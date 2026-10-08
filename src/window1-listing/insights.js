// Window 1 · Vrijedi.Ly platform data for a listing: score 0–5 (shown with a star), verification, reviews.
// Leonard's API doesn't exist yet, so this returns DEMO data in the shape we expect from
// GET /listings/{platform}/{id}/insights (PROJECT_BRAIN.md §3.7). Everything has `demo: true`; the UI labels it.
// Replace the body of getListingInsights with a fetch() once the endpoint is live.
import { seeded, rng } from '../shared/seeded.js';

// Generic enough to fit any item (phone, car, furniture…). score = the reviewer's 1–10 grade; shown as 1–5 stars.
const REVIEW_POOL = [
  { author: 'Ana K.', score: 10, text: 'Sve točno kako piše u opisu. Preuzimanje bez problema, preporučujem.' },
  { author: 'Ivan P.', score: 8, text: 'Brzo odgovara. Cijena malo visoka, ali dalo se dogovoriti.' },
  { author: 'Petra M.', score: 9, text: 'Dobro zapakirano i stiglo na vrijeme.' },
  { author: 'Marko B.', score: 10, text: 'Korektan prodavač, sve dogovoreno u jednom danu. Svaka preporuka.' },
  { author: 'Lucija T.', score: 7, text: 'Stvar je u redu, ali na slikama izgleda malo bolje nego uživo.' },
  { author: 'Tomislav R.', score: 9, text: 'Pristojan i točan, došao je na dogovoreno mjesto čak i ranije.' },
  { author: 'Maja Š.', score: 6, text: 'Trebalo mu je dva dana da odgovori, ali na kraju je sve prošlo OK.' },
  { author: 'Dario V.', score: 10, text: 'Odlična komunikacija, poslao dodatne slike i video na zahtjev.' },
  { author: 'Ivana L.', score: 8, text: 'Sve funkcionira. Sitna ogrebotina koju nije spomenuo, ali ništa strašno.' },
  { author: 'Filip G.', score: 9, text: 'Fer cijena za ovo stanje. Kupio bih opet od njega.' },
  { author: 'Nina H.', score: 5, text: 'Kasnio je na preuzimanje skoro sat vremena i nije se javio.' },
  { author: 'Josip M.', score: 9, text: 'Poslao preko BoxNowa isti dan, paket uredno zapakiran.' },
  { author: 'Karla D.', score: 10, text: 'Ugodan za dogovor, spustio cijenu bez puno natezanja.' },
  { author: 'Luka Č.', score: 7, text: 'Opis je bio malo štur, ali na pitanja je odgovarao iskreno.' },
  { author: 'Sara P.', score: 8, text: 'Sve kako je dogovoreno. Jedino je nedostajala originalna kutija.' },
  { author: 'Antonio J.', score: 10, text: 'Najbolja kupovina na oglasniku dosad. Stanje kao novo.' },
  { author: 'Martina K.', score: 6, text: 'Dva puta mijenjao termin preuzimanja, ali artikl je ispravan.' },
  { author: 'Domagoj F.', score: 9, text: 'Dao mi je da sve isprobam prije plaćanja. Tako treba.' },
  { author: 'Helena V.', score: 8, text: 'Brza razmjena poruka i jasni odgovori na sva pitanja.' },
  { author: 'Matej S.', score: 4, text: 'Na kraju je tražio više nego što je pisalo u oglasu. Nismo se dogovorili.' },
  { author: 'Iva R.', score: 10, text: 'Sve savršeno, uz artikl mi je dao i dodatnu opremu.' },
  { author: 'Patrik Z.', score: 7, text: 'U redu kupnja. Treba ga malo požuriti s odgovorima.' },
  { author: 'Ema B.', score: 9, text: 'Pouzdan prodavač, račun i jamstvo uredno predani.' },
  { author: 'Krešimir N.', score: 8, text: 'Dobra cijena, malo truda oko dogovora termina.' },
  { author: 'Tea M.', score: 10, text: 'Vrlo ljubazna, sve objasnila i pokazala kako radi.' },
  { author: 'Hrvoje A.', score: 6, text: 'Stanje je lošije od „kao novo”, ali je spustio cijenu kad sam pokazao.' },
  { author: 'Lana O.', score: 9, text: 'Uredno, čisto i točno na vrijeme. Preporuka.' },
  { author: 'Bruno K.', score: 8, text: 'Sve OK, samo je dostava trajala dan duže od dogovorenog.' },
  { author: 'Dora J.', score: 10, text: 'Iskren opis, pokazao i nedostatke prije nego što sam pitala.' },
  { author: 'Nikola P.', score: 5, text: 'Prestao se javljati nakon što sam pitao za dodatne slike.' },
];
const AGO = ['danas', '1 d', '2 d', '4 d', '6 d', '1 tj.', '2 tj.', '3 tj.', '1 mj.', '2 mj.'];
const initials = (name) => name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/** 3 reviews per listing, stable per listing, roughly matching its score (weaker listings get a critical one). */
function pickReviews(key, score) {
  const rand = rng(`reviews:${key}`);
  const pool = [...REVIEW_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const good = pool.filter((r) => r.score >= 8);
  const mixed = pool.filter((r) => r.score < 8);
  const picks = score >= 4.25 ? [good[0], good[1], good[2]] : score >= 3.5 ? [good[0], mixed[0], good[1]] : [mixed[0], good[0], mixed[1]];
  const agoStart = Math.floor(rand() * 3);
  return picks.map((r, i) => ({
    ...r,
    initials: initials(r.author),
    stars: Math.max(1, Math.round(r.score / 2)), // 1–10 grade -> 1–5 stars
    ago: AGO[Math.min(AGO.length - 1, agoStart + i * 2 + Math.floor(rand() * 2))],
    helpful: Math.floor(rand() * 14) + (i === 0 ? 3 : 0),
  }));
}

/** GET /listings/{platform}/{id}/insights — window 1 */
export async function getListingInsights(listing) {
  const key = `${listing.platform}:${listing.listingId}`;
  const r = seeded(key);
  const score = Math.round((3 + r * 1.7) * 10) / 10; // 3.0 – 4.7 on the 0–5 scale
  return {
    demo: true,
    score,
    betterThanPct: Math.round(40 + r * 55),
    verdict: score >= 4 ? 'Odličan oglas' : score >= 3.5 ? 'Dobar oglas' : 'Prosječan oglas',
    shakerVerified: !!listing.seller.id && r > 0.35, // can't vouch for a seller we couldn't identify
    reviewCount: 3 + Math.round(r * 30),
    reviews: pickReviews(key, score),
  };
}


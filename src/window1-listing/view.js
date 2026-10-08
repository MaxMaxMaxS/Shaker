// Window 1 · view: the listing card (Figma design "Oglas B"). Pure function: data in, HTML string out.
import { PLATFORM_NAME } from '../shared/platforms.js';
import { esc, fmtPrice, fmtNum, icon, logo } from '../shared/ui.js';

// Five white stars that fill with yellow up to the score (a partial star for 4,2).
const STAR_PTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
const starSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${STAR_PTS}"/></svg>`;
// Each star fills on its own, so 4,2 gives four full stars and a fifth that is 20 % yellow.
// The star spans x 2–22 of its 24-unit box, so the fill is mapped onto that visible width.
const starFill = (f) => (f <= 0 ? 0 : f >= 1 ? 100 : Math.round(((2 + f * 20) / 24) * 100));
const starBar = (score) =>
  `<span class="star-bar" role="img" aria-label="${fmtNum(score)} od 5 zvjezdica">${Array.from({ length: 5 }, (_, i) =>
    `<span class="star">${starSvg()}<span class="star-fill" style="width:${starFill(Math.max(0, Math.min(1, score - i)))}%">${starSvg()}</span></span>`).join('')}</span>`;

// What the hero says when there is no score to show. Gray and neutral: no data is unknown, not suspicious.
const STATE_TEXT = {
  checking: 'Provjeravam oglas…',
  failed: 'Provjera nije uspjela.',
  removed: 'Oglas više nije dostupan.',
  unsupported: 'Ovaj oglas ne možemo provjeriti.',
  unavailable: 'Vrijedi.Ly trenutno nije dostupan.',
};

function heroScore(insights) {
  if (insights.state !== 'ready') {
    const p = insights.progress;
    const steps = insights.state === 'checking' && p?.total ? ` · ${p.done}/${p.total} koraka` : '';
    return `<div class="row end gap6"><span class="score empty-score">—</span></div>
      <div class="hero-verdict">${esc(STATE_TEXT[insights.state] || STATE_TEXT.unavailable)}${steps}</div>`;
  }
  const verdict = `${esc(insights.verdict)} · bolji od ${insights.betterThanPct} % sličnih`;
  // No Ocjena ponude yet (it needs 5 reviews of the seller): unknown, never a zero.
  if (insights.score == null) {
    return `<div class="row end gap6"><span class="score empty-score" aria-label="Nema podataka">—</span></div>
      <div class="hero-verdict">Nema podataka · ocjena treba barem 5 recenzija prodavača</div>
      <div class="hero-small">${verdict}</div>`;
  }
  return `<div class="row end gap6"><span class="score">${fmtNum(insights.score)}</span><span class="score-of">/5</span>${starBar(insights.score)}</div>
    <div class="hero-verdict">${verdict}</div>`;
}

function reviewsBody(insights) {
  if (insights.state === 'checking') return '<div class="muted">Recenzije stižu kad provjera završi.</div>';
  if (insights.state !== 'ready') return '';
  if (!insights.reviews.length) return '<div class="muted">Još nema recenzija ovog prodavača. Budi prvi.</div>';
  return insights.reviews
    .map(
      (r, i) => `
    <div class="review">
      <div class="avatar a${i % 3}">${esc(r.initials)}</div>
      <div class="review-body">
        <div class="review-head"><span class="strong">${esc(r.author)}</span><span class="chip-score">${esc(r.stars)} ★</span><span class="muted ml-auto">${esc(r.ago)}</span></div>
        <p>${esc(r.text)}</p>
        ${r.reply ? `<p class="reply"><span class="strong">Prodavač:</span> ${esc(r.reply)}</p>` : ''}
        ${r.helpful ? `<div class="muted small">${icon('thumbUp', 14)} ${esc(r.helpful)} kupaca smatra ovo korisnim</div>` : ''}
      </div>
    </div>`
    )
    .join('');
}

/** @param {{ stars?: number, message?: string, busy?: boolean }} form  the review form's state */
export function renderListing(listing, insights, form = {}) {
  const segs = insights.score == null
    ? ''
    : Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, insights.score - i));
        return `<div class="seg" style="--fill:${fill * 100}%"></div>`;
      }).join('');
  const s = listing.seller;
  const platform = PLATFORM_NAME[listing.platform];
  const canReview = insights.state === 'ready' && !!insights.sellerId && !form.busy;
  const placeholder = canReview
    ? 'Podijeli svoje iskustvo…'
    : insights.state === 'checking'
      ? 'Recenzije su moguće kad provjera završi'
      : insights.state === 'ready' && !insights.sellerId
        ? 'Ne znamo tko je prodavač, pa ga ne možeš ocijeniti'
        : 'Recenzije trenutno nisu moguće';
  const starPicker = Array.from({ length: 5 }, (_, i) => {
    const n = i + 1;
    return `<button class="pick-star${form.stars >= n ? ' on' : ''}" data-stars="${n}" aria-label="${n} od 5" aria-pressed="${form.stars === n}"${canReview ? '' : ' disabled'}>${icon('star', 20)}</button>`;
  }).join('');

  return `
  <section class="slide" aria-label="Ocjena oglasa">
    <div class="hero">
      <div class="topbar">
        <div class="row gap8">${logo()}<span class="brand">Vrijedi.Ly</span></div>
        <div class="row gap4">
          <button class="ghost-pill" data-go="1">Prodavač ${icon('chevronRight', 16)}</button>
          <button class="icon-btn on-dark" data-close aria-label="Zatvori">${icon('x', 20)}</button>
        </div>
      </div>
      <div>
        <div class="hero-sub">${esc(listing.title)} · ${esc(fmtPrice(listing.price))}</div>
        ${heroScore(insights)}
      </div>
      ${segs ? `<div>
        <div class="segs">${segs}</div>
        <div class="row between scale-labels"><span>0 · Loše</span><span>5 · Izvrsno</span></div>
      </div>` : ''}
      <div class="verified-box">
        ${icon(insights.shakerVerified ? 'shieldCheck' : 'shield', 20, insights.shakerVerified ? 'olive300' : 'muted-dark')}
        <div>
          <div class="strong">${insights.shakerVerified ? 'Verificiran prodavač' : 'Prodavač još nije verificiran'}</div>
          <div class="hero-small">${esc(s.name || 'Nepoznat prodavač')} · ${esc(platform)}${s.platformVerified ? ' · telefon potvrđen' : ''}</div>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="row between baseline section-head">
        <span class="h2">Što kažu kupci</span><span class="muted">${esc(insights.reviewCount)} recenzija</span>
      </div>
      ${reviewsBody(insights)}
      <div class="demo-note">„Bolji od X % sličnih” i verifikacija prodavača su demo podaci dok platforma ne bude spremna.</div>
    </div>

    <div class="footer review-form">
      <div class="row between">
        <div class="row star-picker" role="group" aria-label="Tvoja ocjena prodavača">${starPicker}</div>
        ${form.message ? `<span class="form-message">${esc(form.message)}</span>` : ''}
      </div>
      <div class="row gap8">
        <label class="sr-only" for="shk-comment">Tvoj komentar</label>
        <input id="shk-comment" type="text" maxlength="2000" placeholder="${placeholder}"${canReview ? '' : ' disabled'}>
        <button class="send-btn" data-send aria-label="Pošalji recenziju"${canReview ? '' : ' disabled'}>${icon('send', 20)}</button>
      </div>
    </div>
  </section>`;
}

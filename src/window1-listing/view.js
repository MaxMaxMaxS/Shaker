// Window 1 · view: the listing card (Figma design "Oglas B"). Pure function: data in, HTML string out.
import { PLATFORM_NAME } from '../shared/platforms.js';
import { esc, fmtPrice, fmtNum, icon, logo } from '../shared/ui.js';

// Five white stars that fill with yellow up to the score (a partial star for 4,2).
const STAR_PTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
const starRow = () => Array.from({ length: 5 }, () => `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${STAR_PTS}"/></svg>`).join('');
const starBar = (score) =>
  `<span class="star-bar" role="img" aria-label="${fmtNum(score)} od 5 zvjezdica">${starRow()}<span class="star-bar-fill" style="width:${Math.round(Math.max(0, Math.min(100, (score / 5) * 100)))}%">${starRow()}</span></span>`;

export function renderListing(listing, insights) {
  const segs = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, insights.score - i));
    return `<div class="seg" style="--fill:${fill * 100}%"></div>`;
  }).join('');
  const s = listing.seller;
  const platform = PLATFORM_NAME[listing.platform];

  const reviews = insights.reviews
    .map(
      (r, i) => `
    <div class="review">
      <div class="avatar a${i % 3}">${esc(r.initials)}</div>
      <div class="review-body">
        <div class="review-head"><span class="strong">${esc(r.author)}</span><span class="chip-score">${r.stars} ★</span><span class="muted ml-auto">${esc(r.ago)}</span></div>
        <p>${esc(r.text)}</p>
        <div class="row gap6">
          <button class="pill-btn">${icon('thumbUp', 14)}Korisno · ${r.helpful}</button>
          <button class="pill-btn icon-only" aria-label="Nije korisno">${icon('thumbDown', 14)}</button>
        </div>
      </div>
    </div>`
    )
    .join('');

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
        <div class="row end gap6"><span class="score">${fmtNum(insights.score)}</span><span class="score-of">/5</span>${starBar(insights.score)}</div>
        <div class="hero-verdict">${esc(insights.verdict)} · bolji od ${insights.betterThanPct} % sličnih</div>
      </div>
      <div>
        <div class="segs">${segs}</div>
        <div class="row between scale-labels"><span>0 · Loše</span><span>5 · Izvrsno</span></div>
      </div>
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
        <span class="h2">Što kažu kupci</span><span class="muted">${insights.reviewCount} recenzija</span>
      </div>
      ${reviews}
      ${insights.demo ? '<div class="demo-note">Ocjena i recenzije su demo podaci dok platforma ne bude spremna.</div>' : ''}
    </div>

    <div class="footer">
      <label class="sr-only" for="shk-comment">Tvoj komentar</label>
      <input id="shk-comment" type="text" placeholder="Podijeli svoje iskustvo…">
      <button class="send-btn" aria-label="Pošalji komentar">${icon('send', 20)}</button>
    </div>
  </section>`;
}

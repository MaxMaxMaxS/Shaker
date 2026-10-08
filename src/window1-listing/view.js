// Window 1 · view: the listing card (Figma design "Oglas B"). Pure function: data in, HTML string out.
import { PLATFORM_NAME } from '../shared/platforms.js';
import { esc, fmtPrice, fmtNum, icon, logo } from '../shared/ui.js';

export function renderListing(listing, insights) {
  const segs = Array.from({ length: 10 }, (_, i) => {
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
        <div class="review-head"><span class="strong">${esc(r.author)}</span><span class="chip-score">${r.score}/10</span><span class="muted ml-auto">${esc(r.ago)}</span></div>
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
        <div class="row end gap8"><span class="score">${fmtNum(insights.score)}</span><span class="score-of">/10</span></div>
        <div class="hero-verdict">${esc(insights.verdict)} · bolji od ${insights.betterThanPct} % sličnih</div>
      </div>
      <div>
        <div class="segs">${segs}</div>
        <div class="row between scale-labels"><span>1 · Loše</span><span>10 · Izvrsno</span></div>
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

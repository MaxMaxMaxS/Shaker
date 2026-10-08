// Window 2 · view: the seller card (Figma design "Popup G"). Pure functions: data in, HTML string out.
import { PLATFORM_NAME } from '../shared/platforms.js';
import { esc, fmtPrice, fmtNum, icon, logo } from '../shared/ui.js';

export function renderSellerLoading() {
  return `<section class="slide" aria-label="Prodavač"><div class="loading">Učitavam prodavača…</div></section>`;
}

export function renderSeller(profile, insights) {
  const s = profile.seller;
  const platform = PLATFORM_NAME[profile.platform];
  const meta = [
    s.memberSince ? `Član od ${s.memberSince.slice(0, 4)}.` : null,
    s.location?.split(',')[0].replace(/^\d{5}\s*/, ''), // "10000 Zagreb, Grad Zagreb, …" -> "Zagreb"
    profile.activeListings != null ? `${profile.activeListings} oglasa` : null,
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');

  // "Odgovara na 100% poruka, prosječno za 1 dan." -> "1 dan" / "u 100 % poruka"
  const resp = s.responseInfo?.match(/(\d+)\s*%.*?za\s+(.+?)\.?$/i);
  const respValue = resp ? resp[2] : insights ? `${insights.responseMinutes} min` : '—';
  const respSub = resp ? `u ${resp[1]} % poruka` : insights?.demo ? 'demo' : '';

  const diffChip = (d) => {
    if (d == null) return '<span class="diff none">—</span>';
    const cls = d <= -5 ? 'good' : d <= 3 ? 'fair' : 'high';
    return `<span class="diff ${cls}">${d > 0 ? '+' : ''}${d} %</span>`;
  };

  const rows = profile.listings.length
    ? profile.listings
        .slice(0, 8)
        .map((l, i) => {
          const m = insights?.perListing[i];
          return `
      <a class="listing-row" href="${esc(l.url)}" target="_top">
        <div class="min0"><div class="row-title">${esc(l.title)}</div><div class="muted small">tržište ${m ? esc(fmtPrice({ amount: m.marketPrice, currency: l.price?.currency })) : '—'}</div></div>
        <span class="row-price">${esc(fmtPrice(l.price))}</span>
        ${diffChip(m?.diffPct)}
      </a>`;
        })
        .join('')
    : `<div class="empty">${
        profile.limited
          ? `${esc(platform)} prikazuje prodavača i njegove oglase samo prijavljenim korisnicima.`
          : 'Prodavač trenutno nema drugih aktivnih oglasa.'
      }</div>`;

  return `
  <section class="slide light" aria-label="Prodavač">
    <div class="topbar light">
      <div class="row gap8">
        <button class="icon-btn" data-go="0" aria-label="Natrag na oglas">${icon('chevronLeft', 20)}</button>
        ${logo(24)}<span class="brand small">Shaker</span><span class="muted">· ${esc(platform)}</span>
      </div>
      <button class="icon-btn" data-close aria-label="Zatvori">${icon('x', 20)}</button>
    </div>

    <div class="scroll">
      <div class="profile">
        <div class="profile-avatar">${esc((s.name || '?').trim()[0]?.toUpperCase())}</div>
        <div class="min0 grow">
          <div class="row gap6"><span class="profile-name">${esc(s.name || 'Nepoznat prodavač')}</span>${
            s.platformVerified ? `<span class="verified-icon" title="Verificiran na ${esc(platform)}">${icon('badgeCheck', 18)}</span>` : ''
          }</div>
          <div class="muted small">${meta || '&nbsp;'}</div>
        </div>
        <div class="rating">
          <div class="row gap4 end-x">${icon('star', 16, 'pollen500')}<span class="rating-num">${s.platformRating != null ? fmtNum(s.platformRating) : '—'}</span></div>
          <div class="muted tiny">${s.platformReviewCount ? `${s.platformReviewCount} recenzija` : 'nema ocjena'}</div>
        </div>
      </div>

      <div class="stats">
        <div><span class="stat-label">Cijene</span><span class="stat-value">${esc(insights?.priceVerdict || '—')}</span><span class="stat-sub">${
          insights?.avgDiffPct != null ? `${insights.avgDiffPct > 0 ? '+' : ''}${insights.avgDiffPct} % vs. tržište` : 'nema podataka'
        }</span></div>
        <div class="bl"><span class="stat-label">Prevara</span><span class="stat-value">${esc(insights?.scamVerdict || '—')}</span><span class="stat-sub">${
          insights?.scamReports != null ? `${insights.scamReports} prijava` : 'nema podataka'
        }</span></div>
        <div class="bl"><span class="stat-label">Odgovara</span><span class="stat-value">${esc(respValue)}</span><span class="stat-sub">${esc(respSub)}</span></div>
      </div>

      <div class="row between baseline section-head pad">
        <span class="h3">Njegovi oglasi</span><span class="muted small">cijena · tržište</span>
      </div>
      <div class="listings">${rows}</div>
      ${insights?.demo ? '<div class="demo-note pad">Tržišne cijene i procjena prevare su demo podaci.</div>' : ''}
    </div>

    <div class="footer light">
      <button class="dashed-btn" aria-label="Učitaj snimku razgovora">${icon('image', 18)}</button>
      <button class="primary-btn">${icon('searchStar', 18)}<span>Analiziraj poruke</span></button>
    </div>
  </section>`;
}

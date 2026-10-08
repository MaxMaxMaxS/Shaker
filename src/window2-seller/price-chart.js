// Window 2 · price chart sheet: opens over the seller view when a price in "Njegovi oglasi" is clicked.
// Median asking price over time (line), the middle 50 % of asking prices (band) and this listing's price
// (dashed rule), with 1 / 3 / 6+ month ranges and a crosshair tooltip. Pure SVG, no chart library.
import { DAY_MS } from '../shared/price-watch.js';
import { esc, fmtPrice, icon } from '../shared/ui.js';

export const RANGES = [
  { id: '30', label: '1 mj', days: 30, since: 'u zadnjih mjesec dana' },
  { id: '90', label: '3 mj', days: 90, since: 'u zadnja 3 mjeseca' },
  { id: 'all', label: '6+ mj', days: null, since: null },
];

const W = 348, H = 196;
const PAD = { l: 46, r: 10, t: 10, b: 24 };
const MONTHS = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
const dateLong = (t) => new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' }).format(t);
const eur = (v) => fmtPrice({ amount: v, currency: 'EUR' });
const axisEur = (v) => (v >= 10000 ? `${Math.round(v / 1000)} tis. €` : eur(v));
const pct = (a, b) => Math.round(((a - b) / b) * 100);
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** 3–5 round tick values covering [lo, hi]. */
function niceTicks(lo, hi) {
  if (hi - lo < 1) (lo -= 1), (hi += 1);
  const raw = (hi - lo) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/** Geometry shared by the renderer and the hover layer. */
export function chartModel(points, rangeId, listingPrice) {
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[1];
  const end = points.at(-1).t;
  const pts = range.days ? points.filter((p) => p.t >= end - range.days * DAY_MS) : points;
  const from = pts[0].t;
  const vals = pts.flatMap((p) => [p.p25, p.p75]).concat(listingPrice ? [listingPrice] : []);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks.at(-1);
  const x = (t) => PAD.l + ((t - from) / (end - from || 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
  return { range, pts, from, end, ticks, x, y };
}

function xTicks(m) {
  const out = [];
  if (m.range.days === 30) {
    for (let t = m.end; t >= m.from; t -= 7 * DAY_MS) out.unshift({ t, label: `${new Date(t).getDate()}. ${new Date(t).getMonth() + 1}.` });
    return out;
  }
  const every = (m.end - m.from) / DAY_MS > 200 ? 2 : 1; // a year of labels every month would collide
  const d = new Date(m.from);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  for (let k = 0; d.getTime() <= m.end; k++, d.setMonth(d.getMonth() + 1)) {
    if (k % every) continue;
    const label = d.getMonth() === 0 ? `sij ${String(d.getFullYear()).slice(2)}.` : MONTHS[d.getMonth()];
    out.push({ t: d.getTime(), label });
  }
  return out;
}

function svgChart(m, listingPrice) {
  const line = m.pts.map((p, i) => `${i ? 'L' : 'M'}${m.x(p.t).toFixed(1)} ${m.y(p.med).toFixed(1)}`).join('');
  const band =
    m.pts.map((p, i) => `${i ? 'L' : 'M'}${m.x(p.t).toFixed(1)} ${m.y(p.p75).toFixed(1)}`).join('') +
    m.pts.slice().reverse().map((p) => `L${m.x(p.t).toFixed(1)} ${m.y(p.p25).toFixed(1)}`).join('') + 'Z';
  const last = m.pts.at(-1);
  const grid = m.ticks
    .map((v) => `<line class="grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${m.y(v)}" y2="${m.y(v)}"/><text class="axis" x="${PAD.l - 6}" y="${m.y(v) + 3.5}" text-anchor="end">${esc(axisEur(v))}</text>`)
    .join('');
  const xs = xTicks(m)
    .map((k) => `<text class="axis" x="${Math.min(W - PAD.r - 12, Math.max(PAD.l + 12, m.x(k.t)))}" y="${H - 6}" text-anchor="middle">${esc(k.label)}</text>`)
    .join('');
  const ref = listingPrice ? `<line class="ref" x1="${PAD.l}" x2="${W - PAD.r}" y1="${m.y(listingPrice)}" y2="${m.y(listingPrice)}"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${grid}${xs}
    <path class="band" d="${band}"/>
    ${ref}
    <path class="median" d="${line}"/>
    <circle class="end-dot" cx="${m.x(last.t)}" cy="${m.y(last.med)}" r="4"/>
    <g class="cross" visibility="hidden"><line class="cross-line" y1="${PAD.t}" y2="${H - PAD.b}"/><circle class="end-dot" r="4"/></g>
  </svg>`;
}

/**
 * Inner HTML of the chart sheet.
 * @param {object} o
 * @param {{ title, price }} o.listing
 * @param {{ query, demo, points }} o.history  from loadPriceHistory()
 * @param {string} o.rangeId                   one of RANGES[].id
 */
export function renderPriceSheet({ listing, history, rangeId }) {
  const listingPrice = listing.price?.amount || null;
  const top = `
    <div class="topbar light">
      <div class="row gap8 min0">
        <button class="icon-btn" data-chart-close aria-label="Natrag na prodavača">${icon('chevronLeft', 20)}</button>
        <span class="h3">Kretanje cijene</span>
      </div>
      <button class="icon-btn" data-close aria-label="Zatvori">${icon('x', 20)}</button>
    </div>`;
  const head = `
      <div class="chart-head pad">
        <div class="chart-title">${esc(listing.title || 'Oglas bez naslova')}</div>
        <div class="muted small">Tržište za „${esc(history.query || listing.title)}” · ${history.demo ? 'demo podaci' : 'Index oglasi'}</div>
      </div>`;

  if (history.points.length < 2) {
    return `${top}<div class="scroll">${head}<div class="empty pad">Za ovaj proizvod još nemamo tržišnih cijena. Vrijedi.Ly ih skuplja svaka 2 dana, pa se graf puni sam.</div></div>`;
  }

  const m = chartModel(history.points, rangeId, listingPrice);
  const first = m.pts[0], last = m.pts.at(-1);
  const change = pct(last.med, first.med);
  const since = m.range.since || `od ${dateLong(first.t)}`;
  const lows = m.pts.reduce((a, p) => (p.med < a.med ? p : a));
  const highs = m.pts.reduce((a, p) => (p.med > a.med ? p : a));
  const vsListing = listingPrice ? pct(listingPrice, last.med) : null;
  const ago = Math.round((Date.now() - last.t) / DAY_MS);
  const agoText = ago <= 0 ? 'danas' : ago === 1 ? 'jučer' : `prije ${ago} dana`;
  // Every ~14th point for screen readers; the full series is in the hover layer.
  const every = Math.max(1, Math.ceil(m.pts.length / 14));
  const rows = m.pts
    .filter((_, i) => i % every === 0 || i === m.pts.length - 1)
    .map((p) => `<tr><td>${esc(dateLong(p.t))}</td><td>${esc(eur(p.med))}</td><td>${esc(eur(p.p25))} – ${esc(eur(p.p75))}</td><td>${p.n}</td></tr>`)
    .join('');

  return `${top}
    <div class="scroll">
      ${head}
      <div class="pad"><div class="range-tabs" role="group" aria-label="Razdoblje">${RANGES.map(
        (r) => `<button class="range-tab${r.id === m.range.id ? ' on' : ''}" data-range="${r.id}" aria-pressed="${r.id === m.range.id}">${r.label}</button>`
      ).join('')}</div></div>
      <div class="chart-now-row pad">
        <span class="chart-now">${esc(eur(last.med))}</span>
        <span class="chart-delta">${change > 0 ? '↑' : change < 0 ? '↓' : '→'} ${signed(change)} % ${esc(since)}</span>
      </div>
      <div class="muted small pad">Medijan tražene cijene${
        vsListing != null ? ` · ovaj oglas ${esc(fmtPrice(listing.price))} (${signed(vsListing)} %)` : ''
      }</div>
      <div class="chart-plot" tabindex="0" role="img" aria-label="Medijan cijene ${esc(since)}: od ${esc(eur(first.med))} do ${esc(eur(last.med))}. Strelicama lijevo i desno kroz mjerenja.">
        ${svgChart(m, listingPrice)}
        <div class="chart-tip" hidden><strong></strong><span></span><span class="muted"></span></div>
      </div>
      <div class="chart-key pad">
        <span><i class="key-line"></i>medijan</span>
        <span><i class="key-band"></i>srednjih 50 % oglasa</span>
        ${listingPrice ? '<span><i class="key-ref"></i>ovaj oglas</span>' : ''}
      </div>
      <div class="chart-stats">
        <div><span class="stat-label">Najniže</span><span class="chart-stat">${esc(eur(lows.med))}</span><span class="muted tiny">${esc(dateLong(lows.t))}</span></div>
        <div class="bl"><span class="stat-label">Najviše</span><span class="chart-stat">${esc(eur(highs.med))}</span><span class="muted tiny">${esc(dateLong(highs.t))}</span></div>
        <div class="bl"><span class="stat-label">Oglasa</span><span class="chart-stat">${last.n}</span><span class="muted tiny">na zadnjem mjerenju</span></div>
      </div>
      <div class="demo-note pad">${
        history.demo
          ? 'Demo podaci. Prave cijene Vrijedi.Ly skuplja s Index oglasa svaka 2 dana za proizvode koje si pregledao, a graf prelazi na njih čim ih ima dovoljno.'
          : `Index oglasi · zadnje mjerenje ${agoText} · novo svaka 2 dana`
      }</div>
      <table class="sr-only"><caption>Medijan tražene cijene po datumu</caption><tr><th>Datum</th><th>Medijan</th><th>Srednjih 50 %</th><th>Oglasa</th></tr>${rows}</table>
    </div>`;
}

/** Crosshair + tooltip on the plot: pointer snaps to the nearest snapshot, arrow keys step through them. */
export function bindPriceChart(sheet, history, rangeId, listingPrice) {
  const plot = sheet.querySelector('.chart-plot');
  if (!plot || history.points.length < 2) return;
  const m = chartModel(history.points, rangeId, listingPrice);
  const svg = plot.querySelector('svg');
  const cross = svg.querySelector('.cross');
  const [crossLine, crossDot] = cross.children;
  const tip = plot.querySelector('.chart-tip');
  const [tipValue, tipDate, tipRange] = tip.children;
  let current = -1;

  const show = (i) => {
    current = Math.max(0, Math.min(m.pts.length - 1, i));
    const p = m.pts[current];
    const cx = m.x(p.t), cy = m.y(p.med);
    crossLine.setAttribute('x1', cx);
    crossLine.setAttribute('x2', cx);
    crossDot.setAttribute('cx', cx);
    crossDot.setAttribute('cy', cy);
    cross.setAttribute('visibility', 'visible');
    tipValue.textContent = eur(p.med);
    tipDate.textContent = dateLong(p.t);
    tipRange.textContent = `${eur(p.p25)} – ${eur(p.p75)} · ${p.n} oglasa`;
    tip.hidden = false;
    // Beside the crosshair (left of it past the middle), never outside the plot.
    const scale = svg.getBoundingClientRect().width / W;
    const left = cx * scale;
    const want = left > plot.clientWidth / 2 ? left - tip.offsetWidth - 10 : left + 10;
    tip.style.left = `${Math.max(0, Math.min(plot.clientWidth - tip.offsetWidth, want))}px`;
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };

  plot.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < m.pts.length; i++) if (Math.abs(m.x(m.pts[i].t) - sx) < Math.abs(m.x(m.pts[best].t) - sx)) best = i;
    show(best);
  });
  plot.addEventListener('pointerleave', hide);
  plot.addEventListener('focus', () => show(m.pts.length - 1));
  plot.addEventListener('blur', hide);
  plot.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
    if (step == null) return;
    e.preventDefault();
    e.stopPropagation(); // arrows here move the crosshair, not the panel between windows
    show(Number.isFinite(step) ? current + step : step < 0 ? 0 : m.pts.length - 1);
  });
}

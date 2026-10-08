// Small view helpers shared by window 1, window 2 and the panel: escaping, formatting, icons, logo.

/** Escapes scraped text before it goes into innerHTML. Use it on EVERY value that came from a page. */
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const fmtPrice = (p) => {
  if (!p?.amount && p?.amount !== 0) return '—';
  try {
    return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: p.currency || 'EUR', maximumFractionDigits: 0 }).format(p.amount);
  } catch {
    return `${p.amount}`;
  }
};

export const fmtNum = (n) => Number(n).toFixed(1).replace('.', ','); // 9 -> "9,0", 4.75 -> "4,8"

// Lucide paths (MIT), drawn at 24×24 with currentColor.
const ICON = {
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  shieldCheck:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  badgeCheck:
    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  thumbUp:
    '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  thumbDown:
    '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  searchStar:
    '<path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/><polygon points="10.5 7 11.44 9.51 14.11 9.63 12.02 11.29 12.73 13.87 10.5 12.4 8.27 13.87 8.98 11.29 6.89 9.63 9.56 9.51" fill="currentColor" stroke-width="0.8"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/>',
};

export const icon = (name, size = 18, cls = '') =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

// Logo = variant 01 "Klasik, ink + pollen" (icons/icon.svg) on a white tile, so it reads on the dark hero too.
const LOGO_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7" fill="#fff" stroke="#1A2410" stroke-width="2.6"/><path d="M15.6 15.6 21 21" stroke="#1A2410" stroke-width="2.8" stroke-linecap="round"/><polygon points="10.5 6.6 11.62 9.06 14.3 9.36 12.31 11.19 12.85 13.84 10.5 12.5 8.15 13.84 8.69 11.19 6.7 9.36 9.38 9.06" fill="#FFCF56" stroke="#FFCF56" stroke-width="1" stroke-linejoin="round"/></svg>';

export const logo = (size = 28) => `<span class="logo" style="width:${size}px;height:${size}px">${LOGO_SVG}</span>`;

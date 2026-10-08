// Window 1 · Index Oglasi listing page: https://www.index.hr/oglasi/<category>/oglas/<slug>/<id>
// React SPA with CSS-module class names ("SummarySection__title___2rfVV"): match on the stable
// prefix only, never the hash. Content renders after load, so the scraper waits for it.
import { emptyListing, text, $, $$, parsePrice, parseHrDate, redactPII, uniq, waitFor } from '../../shared/utils.js';

const cls = (name) => `[class*="${name}"]`;

export async function scrapeIndexOglasi() {
  await waitFor(cls('SummarySection__title'));
  await waitFor(cls('SellerInfo__username'), 3000);

  const out = emptyListing('index-oglasi');
  out.listingId = location.pathname.match(/\/(\d+)\/?$/)?.[1] || null;
  // /oglasi/auto-moto/osobni-automobili/oglas/… -> "osobni-automobili"
  out.category = location.pathname.match(/\/oglasi\/(?:.*\/)?([^/]+)\/oglas\//)?.[1] || null;
  out.title = text($(cls('SummarySection__title')));
  out.price = parsePrice(text($(cls('SummarySection__price'))));

  // "Objavljen: 07.10.26. 15:04Kod: 7617595"
  const info = text($(cls('SummarySection__info'))) || '';
  out.postedAt = parseHrDate(info.match(/Objavljen:\s*([\d.\s:]+)/)?.[1]);

  // Detail sections (description, equipment, …) share IndexSection__textArea; the description is the longest one.
  const areas = $$(cls('IndexSection__textArea')).map(text).filter(Boolean);
  const desc = areas.sort((a, b) => b.length - a.length)[0];
  out.description = redactPII(desc || $('meta[property="og:description"]')?.content || '') || null;

  // Gallery images are CSS backgrounds or <img>; the URL path is /image/direct/<sellerUuid>/<imageUuid>.jpg
  const imageUrls = $$(`${cls('indexGallery')}, ${cls('indexGallery')} *`)
    .map((el) => (el.tagName === 'IMG' ? el.src : getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1]))
    .concat($$('meta[property="og:image"]').map((m) => m.content))
    .filter((u) => u && u.includes('/api/image/direct/'))
    .map((u) => u.split('?')[0] + '?m=ad_large');
  out.images = uniq(imageUrls);

  // Seller
  const s = out.seller;
  s.name = text($(cls('SellerInfo__username')));
  const profile = $$('a[href*="/oglasi/korisnik/"]').find((a) => !/\/ocjene\/?$/.test(a.pathname));
  s.profileUrl = profile?.href || null;
  // Stable seller id = the user UUID in the image path; the username in the profile URL can change.
  s.id = out.images[0]?.match(/\/image\/direct\/([0-9a-f-]{36})\//)?.[1] || (s.name ? `name:${s.name}` : null);

  const sellerInfo = text($(cls('SellerInfo__info'))) || '';
  s.memberSince = parseHrDate(sellerInfo.match(/Registriran\s*([\d.]+)/)?.[1]);
  if (/Pravna osoba/i.test(sellerInfo)) s.type = 'business';
  else if (/Fizička osoba/i.test(sellerInfo)) s.type = 'private';

  // Rating link: "nema ocjena" or e.g. "4,8 (12 ocjena)"
  const ratingText = text($('a[href*="/oglasi/korisnik/"][href$="/ocjene"]')) || '';
  if (/nema ocjena/i.test(ratingText)) {
    s.platformRating = null;
    s.platformReviewCount = 0;
  } else {
    const r = ratingText.match(/(\d[.,]\d)/);
    const c = ratingText.match(/\((\d+)/) || ratingText.match(/(\d+)\s*ocjen/);
    if (r) s.platformRating = parseFloat(r[1].replace(',', '.'));
    if (c) s.platformReviewCount = +c[1];
  }

  s.platformVerified = /Verificiran/i.test(text($(cls('sellerSection__verfiedNumbers'))) || '');
  s.responseInfo = text($(cls('sellerSection__replyStatistics')));
  out.location = text($(cls('sellerSection__bottomAddress'))) || sellerInfo.split('\n')[0] || null;

  return out;
}


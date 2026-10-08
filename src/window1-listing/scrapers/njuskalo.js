// Window 1 · Njuškalo listing page: https://www.njuskalo.hr/<category>/<slug>-oglas-<id>
// Primary source is the schema.org Product JSON-LD; the DOM fills in the rest.
import { emptyListing, text, $, $$, parsePrice, parseHrDate, redactPII, uniq } from '../../shared/utils.js';

export function scrapeNjuskalo() {
  const out = emptyListing('njuskalo');

  const graph = $$('script[type="application/ld+json"]')
    .flatMap((s) => {
      try {
        const j = JSON.parse(s.textContent);
        return j['@graph'] || [j];
      } catch {
        return [];
      }
    });
  const product = graph.find((n) => n['@type'] === 'Product') || {};
  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
  const offer = product.offers || {};

  out.listingId = String(product.sku || location.pathname.match(/oglas-(\d+)/)?.[1] || '') || null;
  out.title = text($('.ClassifiedDetailSummary-title')) || product.name || null;

  out.price =
    offer.price != null
      ? { amount: Number(offer.price), currency: offer.priceCurrency || 'EUR' }
      : parsePrice(text($('.ClassifiedDetailSummary-priceDomestic, .ClassifiedDetailSummary-price')));

  if (/SoldOut/.test(offer.availability || '')) out.status = 'sold';
  else if (/InStock/.test(offer.availability || '')) out.status = 'active';

  if (crumbs?.itemListElement?.length) out.category = crumbs.itemListElement.at(-1).name;

  // "Osnovne informacije": <dt>Lokacija</dt><dd>…</dd>, <dt>Stanje</dt><dd>…</dd>
  const details = {};
  $$('.ClassifiedDetailBasicDetails-listTerm').forEach((dt) => {
    const dd = dt.nextElementSibling;
    if (dd) details[text(dt)] = text(dd);
  });
  out.location = details['Lokacija'] || null;
  out.condition = details['Stanje'] || null;

  const system = text($('.ClassifiedDetailSystemDetails')) || '';
  out.postedAt = parseHrDate(system.match(/Oglas objavljen\s*([^\n]+)/)?.[1]);

  const desc = text($('.ClassifiedDetailDescription'));
  out.description = redactPII((desc || product.description || '').replace(/^Opis oglasa\s*/, '')) || null;

  // Gallery thumbnails share the listing's slug; upgrade them to the large size.
  const slug = (product.image || '').match(/image-[^/]+\/([^/]+\/[^/]+)-slika-/)?.[1];
  out.images = uniq([
    product.image,
    ...$$('img')
      .map((i) => i.src)
      .filter((src) => slug && src.includes(slug))
      .map((src) => src.replace(/image-[^/]+\//, 'image-xlsize/')),
  ]);

  // Seller block
  const ownerLink = $('a.ClassifiedDetailOwnerDetails-logo[href*="/korisnik/"], .ClassifiedDetailOwnerDetails a[href*="/korisnik/"]');
  const shopLink = $('.ClassifiedDetailOwnerDetails a[href*="/trgovina/"]');
  const profile = ownerLink || shopLink;
  out.seller.profileUrl = profile?.href || null;
  out.seller.id = profile?.href.match(/\/(?:korisnik|trgovina)\/([^/?#]+)/)?.[1] || null;
  out.seller.name = text($('.ClassifiedDetailOwnerDetails-title')) || out.seller.id;

  // GTM pushes ad metadata in an inline script; content scripts can read the script text but not window.dataLayer.
  const gtm = $$('script:not([src])').map((s) => s.textContent).find((t) => t.includes('ad_owner_type')) || '';
  const ownerType = gtm.match(/"ad_owner_type"\s*:\s*"(\w+)"/)?.[1];
  if (ownerType) out.seller.type = ownerType === 'seller' ? 'private' : 'business';
  if (shopLink && !ownerLink) out.seller.type = 'business';
  const gtmStatus = gtm.match(/"ad_status"\s*:\s*"(\w+)"/)?.[1];
  if (!out.status && gtmStatus) out.status = gtmStatus === 'sold' ? 'sold' : 'active';

  const ownerText = text($('.ClassifiedDetailOwnerDetails')) || '';
  if (/provjeren|verificiran/i.test(ownerText)) out.seller.platformVerified = true;
  out.seller.memberSince = parseHrDate(ownerText.match(/(?:Član|Korisnik) od[:\s]*([\d.\s]+)/i)?.[1]);

  return out;
}


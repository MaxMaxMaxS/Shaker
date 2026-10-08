// Window 2 entry: scrape the seller of the listing that window 1 already read.
import { scrapeNjuskaloSeller } from './scrapers/njuskalo.js';
import { scrapeIndexOglasiSeller } from './scrapers/index-oglasi.js';
import { scrapeFacebookSeller } from './scrapers/facebook.js';

const SELLER_SCRAPERS = { njuskalo: scrapeNjuskaloSeller, 'index-oglasi': scrapeIndexOglasiSeller, facebook: scrapeFacebookSeller };

/** Seller profile (see emptySellerProfile in shared/utils.js) for the given window-1 listing. */
export async function scrapeSeller(listing) {
  const scraper = SELLER_SCRAPERS[listing?.platform];
  return scraper ? scraper(listing) : null;
}

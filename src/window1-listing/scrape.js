// Window 1 entry: scrape the listing on the current page.
import { detectPlatform } from '../shared/platforms.js';
import { scrapeNjuskalo } from './scrapers/njuskalo.js';
import { scrapeIndexOglasi } from './scrapers/index-oglasi.js';
import { scrapeFacebook } from './scrapers/facebook.js';

const LISTING_SCRAPERS = { njuskalo: scrapeNjuskalo, 'index-oglasi': scrapeIndexOglasi, facebook: scrapeFacebook };

/** Normalised listing (see emptyListing in shared/utils.js), or null when this isn't a supported listing page. */
export async function scrapeListing() {
  const scraper = LISTING_SCRAPERS[detectPlatform()];
  return scraper ? scraper() : null;
}

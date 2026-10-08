// Content-script entry: on a supported listing page, build window 1 and open the panel.
// Window 2 is scraped lazily, the first time the user slides to it.
import { detectPlatform } from './shared/platforms.js';
import { scrapeListing } from './window1-listing/scrape.js';
import { checkListing, pendingInsights, postReview, reloadListing } from './window1-listing/insights.js';
import { scrapeSeller } from './window2-seller/scrape.js';
import { getSellerInsights } from './window2-seller/insights.js';
import { trackProducts } from './window2-seller/price-history.js';
import { captureFacebookProfileListings } from './window2-seller/facebook-seller-cache.js';
import { mountPanel } from './panel/panel.js';

// Prototype only: production ships the woff2 files with the extension (DESIGN_SYSTEM.md §5).
function loadFonts() {
  if (document.getElementById('shaker-fonts')) return;
  const link = document.createElement('link');
  link.id = 'shaker-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap';
  document.head.appendChild(link);
}

let lastUrl = null;

async function run() {
  if (location.href === lastUrl) return;
  lastUrl = location.href;
  if (!detectPlatform()) {
    document.getElementById('shaker-root')?.remove();
    return;
  }
  const startedOn = location.href;
  const listing = await scrapeListing();
  // The user may have moved on while we waited for the page to render; that page gets its own run.
  if (!listing?.listingId || location.href !== startedOn) return;
  loadFonts();
  let insights = pendingInsights(listing);
  const panel = mountPanel({
    listing,
    listingInsights: insights,
    loadSeller: async () => {
      const profile = await scrapeSeller(listing);
      // The listing being viewed leads the list, so even a seller with one ad has a price to chart.
      if (listing.price?.amount && !profile.listings.some((l) => l.id === listing.listingId)) {
        profile.listings.unshift({ id: listing.listingId, title: listing.title, url: listing.url, price: listing.price, current: true });
      }
      // Products seen in window 2 get their market price collected every 2 days (background.js).
      trackProducts(profile.listings.slice(0, 8));
      return { profile, insights: await getSellerInsights(profile) };
    },
    onReview: async ({ stars, text }) => {
      const result = await postReview(insights.listingId, stars, text);
      if (result.ok) {
        const fresh = await reloadListing(listing, insights.checkId).catch(() => null);
        if (fresh) panel.setListingInsights((insights = fresh));
      }
      return result;
    },
  });
  // Opening a listing checks it: a check from the last 6 hours comes back at once, otherwise one starts.
  checkListing(listing, (next) => panel.setListingInsights((insights = next)));
}

function tick() {
  run();
  // On a Facebook seller profile, remember their listings for window 2 (see facebook-seller-cache.js).
  if (location.hostname.endsWith('facebook.com')) captureFacebookProfileListings().catch(() => {});
}

tick();
// Facebook and Index are SPAs: the URL changes without a page load.
setInterval(tick, 800);

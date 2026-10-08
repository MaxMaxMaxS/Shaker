// Which marketplace is this page, and is it a single listing? Used by both windows and by content.js.

export const PLATFORM_NAME = { njuskalo: 'Njuškalo', 'index-oglasi': 'Index oglasi', facebook: 'Facebook' };

const LISTING_PAGES = [
  { platform: 'njuskalo', host: /(^|\.)njuskalo\.hr$/, path: /-oglas-\d+/ },
  { platform: 'index-oglasi', host: /(^|\.)index\.hr$/, path: /^\/oglasi\/.+\/oglas\/.+\/\d+/ },
  { platform: 'facebook', host: /(^|\.)facebook\.com$/, path: /^\/marketplace\/item\/\d+/ },
];

/** 'njuskalo' | 'index-oglasi' | 'facebook' when the current page is a listing, otherwise null. */
export function detectPlatform() {
  return LISTING_PAGES.find((p) => p.host.test(location.hostname) && p.path.test(location.pathname))?.platform || null;
}

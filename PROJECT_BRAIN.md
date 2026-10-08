# Vrijedi.Ly (ex Shaker): Project Brain

> Single source of truth for what we're building, why, and how the pieces fit.
> Update it whenever a decision is made. Sections marked **❓** are open questions.
> Visual design (colours, type, spacing, verdict colours): see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

## 1. One-liner

A **trust and review layer for second-hand marketplaces** (Njuškalo, Index Oglasi, Facebook Marketplace). It has two parts:

- **Platform** (web app + backend, built by Leonard): reviews, community ratings, AI summaries, price comparisons, seller verification.
- **Chrome extension** (our focus): brings that data *into* the marketplace pages the user is already on, and protects them from scams in their inbox.

The extension is the **distribution channel and the data collector**. Most users will never open the platform website. They'll see Shaker as a badge or panel on a Njuškalo listing.

---

## 2. Feature map

### 2.1 Platform features (Leonard)

| # | Feature | Notes |
|---|---------|-------|
| P1 | **AI Summary** | Summarise a listing, a seller, or all reviews of a seller |
| P2 | **Usporedbe cijena** (price comparison) | Same or similar item across platforms, price history |
| P3 | **Haggling support** | "Similar items sold for X–Y, a fair offer is Z", based on other pages |
| P4 | **Preporuke za oglas** (listing improvement tips) | Based on reviews + general data: better title, photos, price |
| P5 | **Community komentari i ocjene** | Comments on specific listings, community rating & sentiment, Helpful/Not Helpful voting, warnings about recurring problems, *Verified Experience* badge |
| P6 | **FR-1.5: Cross-platform matching** | Recognise the same listing / same seller across platforms |
| P7 | **Razine verifikacije** (verification levels) | Tiered trust for reviewers/sellers |
| P8 | **Automatska provjera dokaza** | Auto-check proof (screenshots of chat, payment, delivery) behind a "Verified Experience" |
| P9 | **Brisanje osobnih podataka nakon provjere** | Delete proof/PII once verification is done (GDPR by design) |

### 2.2 Extension features (us)

| # | Feature | Depends on platform? |
|---|---------|----------------------|
| E1 | **Scam message checker**: Facebook Messenger / Marketplace inbox + Njuškalo inbox | Partly (rules local, AI via API) |
| E2 | **Listing overlay**: on a listing page, show seller trust score, review summary (P1), community warnings (P5) | Yes |
| E3 | **Price context**: "this is 20% above similar listings" + haggling hint (P2, P3) | Yes |
| E4 | **Write a review in-place**: after a deal, review the seller/buyer right from the listing or chat | Yes |
| E5 | **Proof capture for Verified Experience**: one-click capture of chat/listing as evidence (P8) | Yes |
| E6 | **Data collector**: structured scrape of listing + seller data the user views, feeding P2/P6 | Yes (ingest API) |
| E7 | **Seller-side tips**: when the user is creating/editing *their own* listing, show P4 suggestions | Yes |

E1 is the **wedge feature**: it's useful on day one, even with zero reviews in the database. Everything else needs data (cold start problem, see §7).

---

## 3. Extension: detailed design

### 3.1 Target sites and surfaces

| Site | Surfaces we touch | Difficulty |
|------|-------------------|-----------|
| **njuskalo.hr** | Listing page, seller profile, inbox (`/poruke`-style pages), listing creation form | Medium: server-rendered, fairly stable DOM |
| **index.hr/oglasi** | Listing page, seller profile | Medium: React SPA with hashed CSS-module classes, needs route-change detection |
| **facebook.com/marketplace** + **Messenger** | Item page, seller profile, Marketplace inbox, messenger.com | **Hard**: obfuscated class names, constant DOM changes, heavy SPA |

Rule: **never depend on CSS class names on Facebook.** Use ARIA roles, `aria-label`, text anchors, URL patterns, and structural heuristics. Keep every site's selectors in **one adapter file per site**, so a breakage is a one-file fix. A remote selector config could also let us hot-fix without a store release.

### 3.2 E1: Scam message checker (the wedge)

**Flow**
1. Content script detects an open conversation and reads the visible messages (other party only + context).
2. **Local rule engine** runs instantly, with no network call: regex/keyword/URL heuristics, giving a risk score + reasons.
3. If the score is medium or high, or the user clicks "Check with AI", **redacted** text goes to the platform API for LLM analysis.
4. UI shows a small inline badge on the conversation (🟢/🟡/🔴) + an expandable "why" panel in Croatian.

**Common scam patterns to detect (HR market)**
- Fake delivery/payment links: "BoxNow / Overseas / GLS / Hrvatska pošta / Njuškalo sigurna kupnja", "click to receive payment", lookalike domains (`njuskalo-dostava.*`, `.top`, `.xyz`, URL shorteners)
- Requests for **card data / CVV / OTP** "so you can receive money"
- Moving off-platform: "write me on WhatsApp/Telegram", foreign numbers (+44, +1, +234…)
- Buyer won't see the item, "my courier/cousin will pick it up", overpayment / refund-the-difference
- Seller demands prepayment, a price too good to be true, urgency ("someone else wants it today")
- Gift cards, crypto, Western Union, Revolut-only to an unknown name
- Brand-new profile, no history, stock photos (cross-check with E2 data)
- Copy-paste generic first message ("Is this still available? I'll buy it immediately")

**Privacy rules for E1 (non-negotiable)**
- Rules run locally by default. Nothing leaves the browser unless the user opts in or explicitly clicks.
- Before any API call: strip names, phone numbers, IBANs, emails, addresses (keep *type* tokens like `[PHONE_FOREIGN]`, `[URL:shortener]`, since the type is the signal).
- Never store message content server-side. Analyse it and discard it.
- Chrome Web Store "Limited Use" policy + GDPR: this needs a clear privacy policy and in-extension disclosure *before* first scan.

### 3.3 E2/E3: Listing overlay

- Inject a **Shadow DOM** container (styles isolated from host page) near the price/seller block, with a collapsible **side panel** as a fallback (Chrome `sidePanel` API).
- Shows: seller trust score + verification level, AI review summary, top community warnings, price-vs-market band, haggling suggestion, and a "Write review" CTA.
- Lookup key: `(platform, listing_id)` and `(platform, seller_id)`. The API returns the cross-platform identity if known (P6).
- Cache responses in `chrome.storage.session` for a few minutes to avoid hammering the API on back/forward navigation.

### 3.4 E4/E5: Review + proof

- "Write review" opens a small form (stars + text + "what happened" tags: *as described / not as described / no-show / scam attempt / fast / friendly*).
- Optional **proof**: extension captures a screenshot of the chat (`chrome.tabs.captureVisibleTab`) or structured chat export, which is uploaded to the platform for P8 auto-verification and **deleted after verification** (P9).
- Proof = what turns a review into a **Verified Experience**. The extension can do this much better than the website, because it sees the actual chat.

### 3.5 E6: Data collection

- When the user views a listing, send a normalised record: `platform, listing_id, url, title, price, currency, category, location, condition, photos (hashes, not files), seller_id, seller_display_name, seller_joined, seller_rating, posted_at, scraped_at`.
- Image **perceptual hashes** (pHash) are the best signal for FR-1.5 cross-platform matching (same photos reposted on Njuškalo + FB).
- Must be opt-in or clearly disclosed. Check each site's ToS. Scraping only what the user themselves views is the defensible line, not background crawling.

### 3.6 Architecture

```
┌──────────────────────── Chrome (MV3) ────────────────────────┐
│                                                               │
│  Content scripts (per site)          Side panel / Popup        │
│  ├─ adapters/njuskalo.ts             (React UI: settings,      │
│  ├─ adapters/index.ts                 login, history, review)  │
│  ├─ adapters/facebook.ts                                       │
│  │   └─ extract(): Listing | Seller | Conversation             │
│  ├─ scam/rules.ts  (local engine)                              │
│  └─ ui/ (Shadow DOM widgets)                                   │
│            │  chrome.runtime messages                          │
│            ▼                                                   │
│  Background service worker                                     │
│  ├─ auth (token from platform)                                 │
│  ├─ api client + cache + rate limit                            │
│  ├─ redaction before upload                                    │
│  └─ remote selector config fetch                               │
└───────────────────────────│───────────────────────────────────┘
                            ▼  HTTPS (JSON)
                 Platform API (Leonard)
```

**Suggested stack**
- **WXT** (Vite-based extension framework, MV3, HMR, cross-browser) + **TypeScript** + **React** (or Preact for smaller bundles) for UI.
- Tailwind inside Shadow DOM for widgets.
- Zod schemas for every message/API payload, **shared with the platform** (a shared `types` package or OpenAPI spec).
- Permissions kept minimal: `storage`, `sidePanel`, `activeTab`; host permissions only for the target domains.

### 3.7 Extension ↔ Platform contract (to agree with Leonard)

| Endpoint (draft) | Purpose |
|---|---|
| `POST /auth/extension` | Exchange platform session for extension token |
| `GET /listings/{platform}/{id}/insights` | Summary, price band, haggle hint, community warnings |
| `GET /sellers/{platform}/{id}` | Trust score, verification level, review summary, cross-platform links |
| `POST /listings/ingest` | E6 data collection |
| `POST /scam/analyze` | Redacted conversation → risk score + reasons |
| `POST /reviews` | Create review (+ optional proof upload id) |
| `POST /proofs` | Upload proof → returns id; platform verifies and deletes |
| `GET /listings/tips` | P4 suggestions for user's own draft listing |
| `GET /config/selectors` | Remote selector overrides per site |

---

## 4. Users and core journeys

1. **Buyer browsing Njuškalo** sees a Shaker badge: "Seller ⭐4.6 · 12 reviews · also sells on Index Oglasi · price 15% under market". They feel safer and haggle with confidence.
2. **Seller getting a message on FB** sees a red badge: "Likely scam: fake courier link + asks for card data". They avoid losing money. **This is the viral moment, so make it shareable.**
3. **After a deal**, the user leaves a review in 30 s from the chat, with proof attached automatically, and it becomes a Verified Experience.
4. **Seller creating a listing** gets tips: "Listings with 5+ photos sell 2× faster in this category; your price is high vs. 14 similar."

---

## 5. MVP proposal (extension)

**Phase 0: Foundations (week 1)**
- WXT scaffold, site adapters skeleton, Shadow DOM widget, shared types with Leonard.

**Phase 1: Scam checker, standalone (weeks 2–3)** ← ship first
- Local rule engine for Njuškalo + FB Messenger/Marketplace inbox.
- Inline risk badge + explanation in Croatian.
- No account needed. This works before the platform exists and builds the user base.

**Phase 2: Overlay + reviews (needs platform API)**
- Listing/seller overlay (E2), write review (E4), data ingest (E6).

**Phase 3: Smart layer**
- AI scam analysis, price comparison + haggling (E3), proof capture (E5), seller tips (E7), cross-platform matching UI.

---

## 6. Risks and constraints

| Risk | Mitigation |
|---|---|
| **Facebook DOM breaks constantly** | Adapter pattern, ARIA/text-based selectors, remote selector config, monitoring (send "adapter failed" telemetry) |
| **Site ToS / scraping legality** | Only process pages the user opens; no background crawling; legal check before E6 at scale |
| **Reading private messages** | Local-first, explicit consent, redaction, no storage. Chrome Web Store review will scrutinise this. |
| **GDPR**: reviews name real people | Reviews tied to platform pseudonymous IDs, right to reply, takedown flow, PII deletion after proof check (P9) |
| **Defamation / fake reviews** | Verification levels (P7), Verified Experience, Helpful voting, rate limits per account |
| **Cold start**: no reviews yet | Lead with the scam checker (useful without data), seed price data via ingest |
| **Chrome Web Store rejection** | Minimal permissions, clear single purpose description, privacy policy URL ready |

---

## 7. Open questions ❓

1. **Name/brand**: is "Shaker" the product name?
2. **Auth**: does the extension require login for everything, or only for writing reviews? (Suggestion: scam checker + read-only overlay work anonymously.)
3. **Where does AI run?** Platform backend (recommended, keeps API keys off the client). Which model/provider?
4. **Review subject**: do we review *sellers*, *buyers*, *listings*, or all three? Is identity per platform or a unified cross-platform person?
5. **Proof verification**: what exactly counts as proof (chat screenshot, bank transfer, tracking number)? Manual fallback?
6. **Languages**: Croatian only at launch, or HR + EN?
7. **Other platforms later**: OLX.ba, Bolha.com (SI), Halo oglasi (RS), Kupujem prodajem? This affects how generic the adapter interface must be.
8. **Monetisation**: free? Premium haggling/price history? Seller verification fee? This affects what the extension gates.
9. **Browsers**: Chrome only, or also Firefox/Edge/Safari? (WXT makes Firefox/Edge cheap.)
10. **Mobile**: most marketplace usage is on phones, and extensions don't run there. Is the platform/PWA the mobile answer?

---

## 8. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | Project brain created; extension focus on scam checker as wedge | Delivers value with zero platform data |
| 2026-10-08 | Design system taken from Figma (olive/ink brand, Bricolage + Inter, Lucide, light+dark) | See DESIGN_SYSTEM.md |
| 2026-10-08 | Window 1 (click on oglas) = design "Oglas B · Tamni hero". Window 2 (extension icon) = "Popup G · Cijene po oglasu" (Popup A profile header, Oglas B style, green "Analiziraj poruke" button with a search + star icon) | Mockups: https://claude.ai/artifact/EVpChdUjWvoZGdY9a8ehwd |
| 2026-10-08 | First 3 platforms: Njuškalo, Index Oglasi, Facebook Marketplace. Listing scrapers in `src/scrapers/` (plain JS, ES modules) | Tested on real listings; FB seller data needs a logged-in session |
| 2026-10-08 | Window 1 and window 2 live in one in-page panel (Shadow DOM, `src/ui/panel.js`); swipe/drag left from window 1 to reach window 2. Seller data is fetched only when the user opens window 2; on Facebook no extra requests at all | Platform API not ready: `src/api/platform.js` returns labelled demo data |
| 2026-10-08 | Logo = variant 01 "Klasik, ink + pollen" (magnifier with pollen star). Source `icons/icon.svg`, PNGs 16/32/48/128 | Chosen by Max from 25 variants |
| 2026-10-08 | Vinted dropped — supported platforms are Njuškalo, Index Oglasi and Facebook Marketplace only | Max's decision |
| 2026-10-08 | Product renamed to **Vrijedi.Ly** (was Shaker). Visible names changed in the extension, README and landing; internal ids (`shaker-root`, repo/folder names) unchanged | Max's decision |
| 2026-10-08 | Window 2 primary button renamed from "Analiziraj poruke" to "Provjeri autentičnost" (extension, landing page, mockups) | Max |

---

## 9. Glossary

- **Oglas**: listing
- **Ocjena**: rating
- **Verified Experience**: a review backed by proof the platform has checked
- **FR-1.5**: functional requirement: same listing/seller detection across platforms
- **Adapter**: per-site module that turns a page's DOM into our normalised data types



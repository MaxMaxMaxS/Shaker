# Vrijedi.Ly — Chrome ekstenzija

Ocjena oglasa, provjera prodavača i pomoć pri pregovoru na **Njuškalu**, **Index oglasima** i **Facebook Marketplaceu**.
Na stranici oglasa otvara se panel: **prozor 1** (oglas) → povuci ulijevo → **prozor 2** (prodavač).

> Prozor 1 (ocjena ponude, presuda o cijeni, recenzije, objava recenzije) dolazi s Vrijedi.Ly platforme. Prozor 2, povijest cijena, „bolji od X % sličnih” i verifikacija prodavača su zasad **demo podaci**.

## Instalacija (za testere)

1. Preuzmi `shaker-extension-v0.1.0.zip` i raspakiraj ga u neku mapu (npr. `Dokumenti/shaker`). Mapu nemoj brisati — Chrome učitava ekstenziju iz nje.
2. U Chromeu otvori `chrome://extensions`.
3. Gore desno uključi **Developer mode**.
4. Klikni **Load unpacked** i odaberi raspakiranu mapu (onu u kojoj je `manifest.json`).
5. Otvori bilo koji oglas na Njuškalu, Index oglasima ili Facebook Marketplaceu — panel se pojavi gore desno.

**Nova verzija:** raspakiraj novi zip preko stare mape i na `chrome://extensions` klikni ↻ kod Vrijedi.Ly ekstenzije.

Facebook prikazuje prodavača samo prijavljenim korisnicima — bez prijave prozor 2 to i napiše.

## Za developere

```bash
npm run build   # src/ → dist/  (dist/ se učitava kao "Load unpacked")
npm run zip     # build + shaker-extension-v<verzija>.zip za slanje drugima
API_BASE=https://… npm run build   # drugi API; zadano je http://localhost:3000 (lokalna web aplikacija)
```

Ekstenzija zove Vrijedi.Ly API (`/api/extension/v1`, web aplikacija) preko service workera: on ima `host_permissions` za API (build ih dodaje u `dist/manifest.json`) i čuva `installId`, nasumični ID instalacije koji ograničava recenzije na jednu po prodavaču.

Nema npm ovisnosti — samo Node 18+. Verzija se mijenja u `manifest.json`.

### Struktura

```
manifest.json              Chrome MV3 manifest (stranice na kojima radi, ikone)
icons/                     logo (icon.svg) + PNG 16/32/48/128
scripts/build.js           spaja src/ u dist/content.js i dist/background.js (prati importe, provjerava sudare imena)

src/
├── content.js             ulaz: prepozna oglas → prozor 1 → panel; prozor 2 tek kad ga korisnik otvori
├── background.js          service worker: Vrijedi.Ly API pozivi + svaka 2 dana skuplja tržišne cijene (Index oglasi API)
│
├── window1-listing/       PROZOR 1 · oglas (Figma "Oglas B")
│   ├── scrapers/
│   │   ├── njuskalo.js        naslov, cijena, opis, slike, prodavač… (JSON-LD + DOM)
│   │   ├── index-oglasi.js    isto za Index (React stranica, čeka render)
│   │   └── facebook.js        isto za Facebook (ugrađeni Relay JSON)
│   ├── scrape.js          scrapeListing() — bira scraper prema stranici
│   ├── insights.js        checkListing() — provjera oglasa na platformi (POST /checks + praćenje), recenzije
│   └── view.js            renderListing() — HTML prozora 1
│
├── window2-seller/        PROZOR 2 · prodavač (Figma "Popup G")
│   ├── scrapers/
│   │   ├── njuskalo.js        javni profil: verifikacija, član od, lokacija, njegovi oglasi
│   │   ├── index-oglasi.js    Indexov JSON API: korisnik, ocjene, svi oglasi
│   │   └── facebook.js        samo ono što je već na stranici (bez dodatnih zahtjeva)
│   ├── scrape.js          scrapeSeller(listing)
│   ├── insights.js        getSellerInsights() — cijene vs. tržište (prave kad ih ima), prevara, odgovaranje (DEMO)
│   ├── price-history.js   povijest cijena proizvoda: prave snimke iz background.js ili DEMO krivulja
│   ├── price-chart.js     graf kretanja cijene (klik na cijenu u "Njegovi oglasi"): 1 / 3 / 6+ mj
│   └── view.js            renderSeller() / renderSellerLoading() — HTML prozora 2
│
├── panel/
│   ├── panel.js           mountPanel() — Shadow DOM, klizanje (povlačenje, touchpad, ←/→, gumbi)
│   └── panel-css.js       stilovi prema DESIGN_SYSTEM.md
│
└── shared/                koriste oba prozora
    ├── platforms.js       detectPlatform(), nazivi platformi
    ├── utils.js           oblici rezultata, $/$$, parsiranje cijena i datuma, brisanje osobnih podataka
    ├── facebook-seller-dom.js  čitanje bloka "Podaci o prodavaču" na Facebooku
    ├── api.js             callApi() — poziv Vrijedi.Ly API-ja preko service workera
    ├── config.js          API_BASE (puni ga build)
    ├── ui.js              esc(), formatiranje, ikone, logo
    └── seeded.js          stabilni "random" za demo podatke
```

**Dodavanje nove platforme:** dodaj je u `shared/platforms.js`, napiši `window1-listing/scrapers/<platforma>.js` i `window2-seller/scrapers/<platforma>.js`, i registriraj ih u oba `scrape.js`. Datoteke se spajaju u jedan scope, pa top-level imena moraju biti jedinstvena — build javlja ako nisu.

**API:** prozor 1 koristi Leonardov API (`POST /checks`, `GET /checks/{id}`, `POST /reviews`). `getSellerInsights` (prozor 2) ostaje demo dok platforma nema te podatke.

Više o projektu: [PROJECT_BRAIN.md](PROJECT_BRAIN.md) · dizajn: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

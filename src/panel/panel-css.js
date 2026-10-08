// Panel styles. Colours and type follow DESIGN_SYSTEM.md (Oglas B + Popup G).
export const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.panel {
  --ink: #1A2410; --ink-850: #212B19; --ink-800: #26301E; --ink-700: #343D2C; --ink-600: #4D5645;
  --ink-500: #6B7462; --ink-400: #919B83; --ink-300: #B1B9A4; --ink-200: #CFD5C4; --ink-100: #E4E8DC;
  --ink-50: #F1F3EC; --paper: #FFFFFF; --olive: #A6C36F; --olive-300: #BCD48F;
  --sage-100: #E6F0EB; --sage-900: #22392F; --sage-700: #44705C; --pollen-100: #FFF5D9; --pollen-500: #E5AE24; --pollen-800: #5E4400;
  --icy-100: #E3F2FB; --icy-800: #1F4D68; --on-olive-muted: #2A3618; --on-olive-line: rgba(26, 36, 16, .2); --on-olive-empty: rgba(26, 36, 16, .16);
  width: 380px; height: min(820px, calc(100vh - 32px));
  background: var(--paper); color: var(--ink);
  font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.4; letter-spacing: -0.005em;
  border-radius: 16px; overflow: hidden; position: relative;
  box-shadow: 0 12px 40px rgba(26, 36, 16, .22), 0 2px 8px rgba(26, 36, 16, .12);
  outline: none;
}
button, input { font-family: inherit; }
button { cursor: pointer; }
.viewport { width: 100%; height: 100%; overflow: hidden; touch-action: pan-y; }
.track { display: flex; height: 100%; will-change: transform; }
.slide { flex: 0 0 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; user-select: none; }

/* shared */
.row { display: flex; align-items: center; }
.between { justify-content: space-between; } .baseline { align-items: baseline; } .end { align-items: flex-end; } .end-x { justify-content: flex-end; }
.gap4 { gap: 4px; } .gap6 { gap: 6px; } .gap8 { gap: 8px; }
.ml-auto { margin-left: auto; } .min0 { min-width: 0; } .grow { flex-grow: 1; }
.strong { font-weight: 600; font-size: 14px; }
.muted { color: var(--ink-500); font-size: 13px; } .small { font-size: 12px; } .tiny { font-size: 11px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.logo { display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: #fff; box-shadow: inset 0 0 0 1px var(--ink-100); flex-shrink: 0; }
.logo svg { width: 78%; height: 78%; }
.brand { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 700; font-size: 18px; }
.brand.small { font-size: 16px; }
.h2 { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -0.01em; }
.h3 { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 700; font-size: 16px; }
.icon-btn { width: 44px; height: 44px; border: none; background: transparent; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; color: var(--ink-600); }
.icon-btn:hover { background: var(--ink-50); }
.icon-btn.on-dark { color: var(--ink); } .icon-btn.on-dark:hover { background: var(--on-olive-empty); }
.demo-note { font-size: 11px; color: var(--ink-500); padding: 12px 0 4px; }
.demo-note.pad, .pad { padding-left: 16px; padding-right: 16px; }

/* window 1 — hero */
.hero { background: var(--olive); color: var(--ink); padding: 12px 12px 24px 20px; display: flex; flex-direction: column; gap: 18px; flex-shrink: 0; }
.topbar { display: flex; align-items: center; justify-content: space-between; }
.ghost-pill { display: inline-flex; align-items: center; gap: 2px; height: 36px; padding: 0 10px 0 14px; border-radius: 9999px; border: 1px solid var(--on-olive-line); background: transparent; color: var(--ink); font-size: 13px; font-weight: 600; }
.ghost-pill:hover { background: var(--on-olive-empty); }
.hero-sub { font-size: 13px; color: var(--on-olive-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
.score { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 800; font-size: 80px; line-height: 80px; letter-spacing: -0.04em; color: #fff; }
.score-of { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 700; font-size: 24px; line-height: 36px; color: var(--on-olive-muted); }
.star-bar { position: relative; display: inline-flex; gap: 3px; margin: 0 0 13px 10px; }
.star { position: relative; width: 22px; height: 22px; flex-shrink: 0; }
.star svg { display: block; width: 22px; height: 22px; }
.star-bar polygon { fill: #fff; stroke: #fff; stroke-width: 1.5; stroke-linejoin: round; }
.star-fill { position: absolute; left: 0; top: 0; bottom: 0; overflow: hidden; }
.star-fill polygon { fill: #FFCF56; stroke: #FFCF56; }
.hero-verdict { font-size: 15px; font-weight: 600; padding-top: 4px; }
.segs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; padding-right: 8px; }
.seg { height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--ink) var(--fill), var(--on-olive-empty) var(--fill)); }
.scale-labels { font-size: 11px; color: var(--on-olive-muted); padding: 6px 8px 0 0; }
.verified-box { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--olive-300); margin-right: 8px; }
.hero-small { font-size: 12px; color: var(--on-olive-muted); }
.olive300 { color: var(--ink); flex-shrink: 0; } .muted-dark { color: var(--on-olive-muted); flex-shrink: 0; }

/* window 1 — reviews */
.body { flex: 1; overflow-y: auto; padding: 20px 20px 8px; }
.section-head { padding-bottom: 8px; }
.review { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ink-100); }
.review:last-of-type { border-bottom: none; }
.avatar { width: 36px; height: 36px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }
.a0 { background: #CBE7F6; color: #1F4D68; } .a1 { background: #FFE7A6; color: #5E4400; } .a2 { background: #D3E3B4; color: #3E4F23; }
.review-body { display: flex; flex-direction: column; gap: 6px; flex-grow: 1; }
.review-head { display: flex; align-items: center; gap: 8px; }
.review p { margin: 0; font-size: 13px; line-height: 20px; color: var(--ink-800); }
.chip-score { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background: var(--sage-100); color: #34574A; }
.pill-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: none; background: var(--ink-50); border-radius: 9999px; font-size: 12px; font-weight: 500; color: var(--ink-700); }
.pill-btn.icon-only { width: 32px; padding: 0; justify-content: center; }
.pill-btn:hover { background: var(--ink-100); }
.footer { display: flex; align-items: center; gap: 8px; padding: 12px 16px 20px; border-top: 1px solid var(--ink-100); flex-shrink: 0; background: var(--paper); }
.footer input { flex-grow: 1; height: 48px; padding: 0 16px; border: 1px solid var(--ink-200); border-radius: 12px; font-size: 14px; color: var(--ink); background: #fff; outline: none; }
.footer input:focus { border-color: var(--olive); box-shadow: 0 0 0 3px rgba(166, 195, 111, .35); }
.send-btn { width: 48px; height: 48px; border: none; border-radius: 9999px; background: var(--olive); color: var(--ink); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* window 2 */
.topbar.light { padding: 6px 6px 6px 4px; border-bottom: 1px solid var(--ink-100); flex-shrink: 0; }
.scroll { flex: 1; overflow-y: auto; padding-bottom: 8px; }
.profile { display: flex; align-items: center; gap: 12px; padding: 16px 16px 14px; }
.profile-avatar { width: 52px; height: 52px; border-radius: 9999px; background: #D3E3B4; color: #3E4F23; display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 800; font-size: 20px; flex-shrink: 0; }
.profile-name { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.verified-icon { display: inline-flex; color: var(--ink); }
.verified-icon svg { fill: #86BAA1; stroke-width: 1.8; }
.rating { text-align: right; flex-shrink: 0; }
.rating-num { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.015em; }
.pollen500 { color: var(--pollen-500); }
.stats { margin: 0 12px; padding: 14px 16px; border-radius: 20px; background: var(--olive); color: var(--ink); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.stats > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.stats .bl { padding-left: 12px; border-left: 1px solid var(--on-olive-line); }
.stat-label { font-size: 11px; color: var(--on-olive-muted); }
.stat-value { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-sub { font-size: 11px; color: var(--on-olive-muted); }
.section-head.pad { padding-top: 16px; padding-bottom: 4px; }
.listings { display: flex; flex-direction: column; padding: 0 16px; }
.listing-row { display: grid; grid-template-columns: minmax(0, 1fr) 64px 52px; align-items: center; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--ink-100); color: inherit; text-decoration: none; }
.listing-row:last-child { border-bottom: none; }
.listing-row:hover .row-title { text-decoration: underline; }
.row-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-price { font-size: 13px; font-weight: 600; text-align: right; white-space: nowrap; }
.diff { font-size: 11px; font-weight: 600; text-align: center; padding: 3px 0; border-radius: 9999px; }
.diff.good { background: var(--sage-100); color: var(--sage-900); } .diff.fair { background: var(--icy-100); color: var(--icy-800); }
.diff.high { background: var(--pollen-100); color: var(--pollen-800); } .diff.none { background: var(--ink-50); color: var(--ink-500); }
.empty { font-size: 13px; line-height: 1.5; color: var(--ink-600); padding: 12px 0; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.ghost-link { display: inline-flex; align-items: center; gap: 2px; height: 40px; padding: 0 12px 0 16px; border-radius: 9999px; border: 1px solid var(--ink-200); color: var(--ink); font-size: 13px; font-weight: 600; text-decoration: none; }
.ghost-link:hover { background: var(--ink-50); }
.footer.light { padding: 12px 16px 16px; }
.dashed-btn { width: 48px; height: 48px; border: 1.5px dashed var(--ink-400); border-radius: 9999px; background: #fff; color: var(--ink-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.primary-btn { flex-grow: 1; height: 48px; border: none; border-radius: 9999px; background: var(--olive); color: var(--ink); font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
.loading { margin: auto; color: var(--ink-500); font-size: 13px; }

/* page dots */
.dots { position: absolute; left: 50%; transform: translateX(-50%); bottom: 6px; display: flex; gap: 9px; pointer-events: none; }
.dot { width: 9px; height: 9px; border-radius: 9999px; background: var(--ink-200); transition: width .2s; }
.dot.on { width: 24px; background: var(--ink); }
`;

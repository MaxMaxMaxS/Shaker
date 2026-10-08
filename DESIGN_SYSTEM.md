# Shaker: Design System (from Figma)

Source: [SHAKER Figma file](https://www.figma.com/design/yYrUqxBmK1rH5djf9hvIF4/SHAKER?node-id=0-1)
Read on 2026-10-08. If Figma changes, update this file. It is the reference for building the extension.

Mood: a friendly, "smart street friend", not corporate. Wise-like structure (mostly white + ink; olive where there's an action; yellow and red used rarely so they work).

---

## 1. Brand colours (the 8 named colours)

| Name | Hex | Primitive | Meaning / usage |
|---|---|---|---|
| **Muted Olive** | `#A6C36F` | olive/400 | Brand, logo, primary actions, focus. Ink on it = 7.8:1 |
| **Muted Teal** | `#86BAA1` | sage/400 | Great price, success. Green always means "good deal" |
| **Icy Blue** | `#B0DAF1` | icy/300 | Fair price, information. Calm, neutral, no pressure |
| **Beige** | `#EDEAD0` | sand/200 | Warm community background: seller replies, haggling help |
| **Golden Pollen** | `#FFCF56` | pollen/300 | Room to haggle, savings, stars. An *opportunity*, not a warning |
| **Ink** | `#1A2410` | ink/900 | Text, icons, dark background. Dark olive, like Wise's "forest green" |
| **Risk Red** | `#B92D1F` | red/600 | **Only** for risk confirmed by evidence. Never for "no data" |
| **Paper** | `#FFFFFF` | ink/0 | Main background. The extension lives on the host's white pages |

**Rule:** text on the five light brand colours (olive, teal, icy, beige, pollen) is **always Ink**. White text on them fails contrast.

---

## 2. Primitive scales

Brand tone sits at 400 / 300 / 200. Primitives are **not used directly** in components, only through the semantic tokens (§3).

| Step | olive | sage | icy | sand | pollen | red | ink |
|---|---|---|---|---|---|---|---|
| 0 | | | | | | | `#FFFFFF` |
| 25 | | | | | | | `#F8F9F5` |
| 50 | `#F5F9EE` | | `#F2F9FD` | `#FBFAF3` | | | `#F1F3EC` |
| 100 | `#E9F1D9` | `#E6F0EB` | `#E3F2FB` | `#F6F4E6` | `#FFF5D9` | `#FDECEA` | `#E4E8DC` |
| 200 | `#D3E3B4` | `#C9DFD4` | `#CBE7F6` | `#EDEAD0` | `#FFE7A6` | `#F9C9C3` | `#CFD5C4` |
| 300 | `#BCD48F` | `#A8CCBB` | `#B0DAF1` | `#DDD8B2` | `#FFCF56` | | `#B1B9A4` |
| 400 | `#A6C36F` | `#86BAA1` | | | | | `#919B83` |
| 500 | `#8DAA55` | | `#6FB3DA` | | `#E5AE24` | `#DC3B2C` | `#6B7462` |
| 600 | `#708A40` | `#5B8E76` | | `#8A845C` | | `#B92D1F` | `#4D5645` |
| 700 | `#556B30` | `#44705C` | `#2F6F94` | | `#8A6400` | `#96220F` | `#343D2C` |
| 800 | `#3E4F23` | `#34574A` | `#1F4D68` | `#4E4A30` | `#5E4400` | | `#26301E` |
| 850 | | | | | | | `#212B19` |
| 900 | `#2A3618` | `#22392F` | `#142F40` | | `#3A2E0A` | `#3B1410` | `#1A2410` |
| 925 | | | | | | | `#151D0D` |
| 950 | | | | | | | `#11180A` |

(Empty cells mean that step doesn't exist in Figma.)

---

## 3. Semantic tokens (Light + Dark)

There are two modes. **Dark mode is mandatory**: Facebook has a dark theme, so the extension must adapt.

The Figma page lists token *names* but doesn't show which primitive each mode maps to. When we build, read the exact mapping from Figma Dev Mode (needs sign-in) or ask the designer.

- **bg**: screen, surface, neutral, neutral-hover, elevated, sand, inverse, brand, brand-hover, brand-subtle, accent, positive-subtle, info-subtle, haggle, warning-subtle, danger, danger-subtle, disabled, danger-hover, info
- **text**: primary, secondary, tertiary, on-brand, on-accent, on-danger, inverse, inverse-accent, brand, positive, info, warning, danger, disabled
- **border**: default, strong, focus, danger, brand
- **icon**: primary, secondary, brand, warning, danger

---

## 4. Verdict colours ("Boje presude")

Each colour means exactly one thing. Olive is reserved for actions and is **never** a verdict. A verdict always comes with an icon + word, so colour is never the only signal.

| Verdict | Token | Use |
|---|---|---|
| **Odlična cijena** (great price) | `bg/accent` (teal) | Below market range |
| **Fer cijena** (fair price) | `bg/info` (icy) | Within market range |
| **Prostor za pregovor** (room to haggle) | `bg/haggle` (pollen) | Above range, could save money |
| **Provjeri** (check this) | `bg/warning-subtle` | One thing deserves attention |
| **Rizik** (risk) | `bg/danger` (red) | Scam/risk pattern *proven by evidence* |
| **Nema podataka** (no data) | `bg/neutral` | Unknown, not suspicious, neutral |

**Colour proportions:** Paper 55% · Ink 18% · Olive 12% · Beige 5% · Teal 4% · Icy 4% · Pollen (small remainder). Mostly white and ink; yellow and red are rare, which is why they work.

---

## 5. Typography

| Font | Role |
|---|---|
| **Bricolage Grotesque** (96pt optical size; ExtraBold/Bold) | Display, headings, prices, numbers. Gives the brand its voice |
| **Inter** (Regular / Medium / Semi Bold) | UI, body text, forms. Readable at small sizes in the extension, full č ć đ š ž support, tabular numbers for prices |

Both are Google Fonts with the OFL licence. **Bundle the font files in the extension**, because we can't load from Google inside host pages.
Figma lists alternatives (not chosen): Schibsted Grotesk (headings) and Onest or Geist (UI).

**Scale (17 styles).** Headings use negative letter-spacing. Text is around −0.5%.

| Style | Font | Size / line-height | Tracking |
|---|---|---|---|
| Display/Large | Bricolage ExtraBold | 72/74 | −3% |
| Display/Medium | Bricolage ExtraBold | 56/56 | −3% |
| Display/Small | Bricolage ExtraBold | 40/44 | −2% |
| Heading/Large | Bricolage ExtraBold | 32/36 | −1.5% |
| Heading/Medium | Bricolage Bold | 24/30 | −1% |
| Heading/Small | Inter Semi Bold | 20/28 | −1% |
| Title/Default | Inter Semi Bold | 16/24 | −0.5% |
| Body/Large | Inter Regular | 18/28 | −0.5% |
| Body/Default | Inter Regular | 16/24 | −0.5% |
| Body/Default Strong | Inter Semi Bold | 16/24 | −0.5% |
| Body/Small | Inter Regular | 14/20 | −0.5% |
| Body/Small Strong | Inter Semi Bold | 14/20 | −0.5% |
| Label/Default | Inter Semi Bold | 14/20 | −0.5% |
| Label/Small | Inter Medium | 12/16 | 0% |
| Caption/Default | Inter Regular | 12/16 | 0% |
| Numeric/Price XL | Bricolage ExtraBold | 48/52 | −3% |
| Numeric/Price | Bricolage ExtraBold | 24/28 | −1.5% |

---

## 6. Spacing, radius, elevation

The base unit is 4px. Spacing is generous *between* groups and tight *within* them. Corners are rounded (like Wise): tablets for actions, soft boxes for cards. Shadows are used only when something floats above someone else's page.

**Spacing:** none 0 · 3xs 2 · 2xs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64 · 4xl 96

**Radius:**
- none 0 (tables, borders)
- xs 4 (tags inside text)
- sm 8 (icons, small buttons)
- md 12 (fields for entry)
- lg 16 (badges, popovers, sheets)
- xl 24 (cards)
- 2xl 32 (panels, sections)
- full 9999 (buttons, chips, avatars)

**Elevation:**
- Flat (default): toned background instead of a shadow
- Raised: card lifted on hover. Rare, and the system knows it is raised
- Overlay: extension badges and popovers floating over the host page
- Panel: the extension's side panel docked over the host page

---

## 7. Icons

**Lucide** (MIT), 24×24, 2px stroke, rounded ends. Colour comes from the `icon/*` tokens. Swapped via Instance swap.

Seen in the file: check, circle-check, triangle-alert, shield-check, shield-alert, badge-check, star, message-circle, tag, trending-down, arrow-right, and more.

---

## 8. Implementation notes for the extension

- Define every token as a CSS custom property on the Shadow DOM `:host`, with a `[data-theme="dark"]` override. Detect the host page's theme (Facebook dark mode) and set it.
- Use `lucide-react` (or `lucide-preact`) for icons.
- Ship Bricolage Grotesque + Inter as `woff2` subsets (Latin + Latin Extended for č ć đ š ž).
- **Not yet captured:** the component specs further down the Figma page (buttons, badges, verdict chips, cards). Review them before building the UI.

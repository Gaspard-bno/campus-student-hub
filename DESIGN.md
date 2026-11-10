# DESIGN.md — Campus Student Hub

Source of truth for visuals. Derived from the team's Canva « Table » (Crousty Studio): black aurora backgrounds, warm orange accents, cream content cards, Akzentica 4F + JetBrains Mono (fonts read from the exported PDF).

## 1. Theme decision
Physical scene: an international student on a phone between classes in a bright corridor, and the same app projected in a dim classroom. Decision (team, QCM 16 = B): **dark Crousty theme everywhere**. To stay legible in daylight, text contrast targets exceed WCAG AA (body ≥ 7:1 where possible) and content surfaces are slightly lifted, never pure black.

## 2. Color tokens (OKLCH, hex fallback)
Strategy: **Committed** — the warm aurora carries identity in backgrounds and the primary action; interface neutrals stay quiet.

| Token | Role | Value |
|---|---|---|
| `--ink-950` | App background | oklch(0.14 0.008 40) ≈ #0E0B0A |
| `--ink-900` | Raised surface (cards, sheets) | oklch(0.19 0.010 40) ≈ #1A1513 |
| `--ink-800` | Hover / selected surface | oklch(0.24 0.012 40) ≈ #261F1C |
| `--line` | Hairlines | oklch(0.32 0.012 40) ≈ #3A322E |
| `--text-1` | Primary text | oklch(0.96 0.012 70) ≈ #F6F0E8 |
| `--text-2` | Secondary text | oklch(0.78 0.015 60) ≈ #C4B9AE |
| `--text-3` | Hints, metadata | oklch(0.64 0.015 60) ≈ #9A8F85 (check ≥ 4.5:1 on ink-950) |
| `--ember-500` | Primary action, focus | oklch(0.68 0.17 42) ≈ #E8693C (Canva #E4673C / #E87344) |
| `--ember-400` | Primary hover | oklch(0.74 0.15 50) ≈ #EE8A5A |
| `--amber-300` | Highlights, "Should have" chips | oklch(0.80 0.11 65) ≈ #ECA66A (Canva) |
| `--rose-300` | Aurora / secondary tint | oklch(0.72 0.11 355) ≈ #DB84A2 (Canva) |
| `--violet-400` | Aurora depth | oklch(0.48 0.09 340) ≈ #9B626D (Canva) |
| `--cream-50` | Light content cards (Canva step cards) | oklch(0.97 0.02 85) ≈ #FBF4E4 |
| `--on-ember` | Text on ember | `--ink-950` (verify ≥ 4.5:1) |
| `--danger` | Urgent help | oklch(0.66 0.19 25) ≈ #E5484D |
| `--success` | Confirmation | oklch(0.76 0.13 150) ≈ #6FCF97 |

Rules: never #000 or #fff. Cream cards only for dense readable content (service details, confirmation summary), with ink text. Aurora = 2–3 large blurred radial gradients in `--ember-500`, `--rose-300`, `--violet-400` placed **behind** content in the app header area and in the desktop frame backdrop; static, low opacity, plus a subtle grain (SVG noise, 4–6% opacity) as in the Canva. Never behind body text without a solid surface.

## 3. Typography
- Display / headings: **Akzentica 4F** is the Canva font but is a commercial font, not loadable from Google Fonts. Use **Hanken Grotesk** (Google Fonts, weights 500/600/700) as the closest free grotesque. Note the substitution in the report.
- Technical labels, step numbers, reference codes, chips: **JetBrains Mono** (Google Fonts, 400/500), as in the Canva.
- Body: Hanken Grotesk 400/500.
- Bundle both fonts locally in `/assets/fonts` (woff2) so the offline version renders identically; Google Fonts CDN is not required at runtime.
- Scale (mobile): 12 / 14 / 16 (body) / 20 / 25 / 31. Line-height 1.5 body, 1.15 headings. Max 65ch.
- Sentence case everywhere; uppercase only for tiny mono labels (letter-spacing 0.08em) like the Canva's « CREATIVE STUDIO PROFILE ».

## 4. Layout
- Mobile-first, design width 390 px, works 320–480 px.
- Desktop ≥ 900 px: centered **phone frame** (390×844, radius 44 px, 10 px ink-800 bezel) on the aurora backdrop; left of it a narrow column with the Crousty Studio logo text, the product name, a one-line description, the V1/V2 switch, a "Reset demo" button and a "Conceptual prototype, demo data" notice. No other marketing content.
- Spacing scale 4/8/12/16/24/32/48. Vary rhythm: tight inside groups, generous between sections.
- Bottom tab bar (Home, Bookings, Help) height 64 px + safe area.

## 5. Components
- **Search field**: 48 px, ink-900, 1 px line border, mono placeholder, clear button.
- **Category tiles**: not an identical card grid. 2-column list of large touch rows (icon 28 px in V2, 22 px in V1; label; one-word hint) with varied emphasis: Counselling and Academic advising are featured larger (spans 2 columns) as the most frequent needs.
- **Service sheet**: cream card with advisor avatar (initials circle in ember on ink), languages spoken as mono chips, location, hours, "Book a session" primary button.
- **Date strip**: horizontal scroll of 7 days, selected day ember fill.
- **Time slots**: 3-column grid of 44 px chips; unavailable = struck, not focusable.
- **Primary button**: ember fill, ink text, 52 px, radius 14 px, pressed scale 0.97.
- **Reference code**: mono, large, copy button with "Copied" feedback.
- **Banner "Demo data"**: thin mono strip at top of the app, amber text on ink-900.
- **Tooltip (V2 only)**: anchored coach mark under the search/categories on first visit, dismissible, never a modal.

## 6. Motion
- Screen transitions: 220 ms, translateX 12 px + opacity, ease-out-quint `cubic-bezier(0.22,1,0.36,1)`. Back navigation reverses direction.
- Press feedback 120 ms. No bounce, no elastic, no layout-property animation.
- Respect `prefers-reduced-motion`: crossfade only.

## 7. Icons
Inline SVG outline icons (Lucide set, MIT, copied as SVG strings — no runtime CDN). Stroke 1.75.

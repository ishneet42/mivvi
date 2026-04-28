# Mivvi — Design System

> **Brand metaphor: the receipt.** Every surface is a torn slip of paper. Items, totals, balances — they all live on receipt-shaped cards. Numbers are monospaced (because real receipts are monospaced). Headlines have the warmth of a serif catalogue title. The interface feels like it was printed, not rendered.

---

## 1. Color tokens

Existing palette stays — this is **additive**. Nothing currently rendered breaks on land.

### Paper (backgrounds)

| Token | Hex | Use |
|---|---|---|
| `paper-cream` | `#FAF6EC` | Default receipt-card background (slightly warmer than the existing `--sx-cream`) |
| `paper-deep` | `#F4ECDB` | Page background (existing `--sx-cream`) |
| `paper-edge` | `#EDE3CB` | Perforation edge tint, faint dividers |
| `paper-noise-rgba` | `rgba(26,20,16,0.04)` | Grain overlay |

### Ink (foregrounds)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#1A1410` | Primary text, dark buttons (existing) |
| `ink-soft` | `#3A3328` | Secondary text (existing) |
| `ink-mute` | `rgba(26,20,16,0.55)` | Tertiary text, captions |

### Accents

| Token | Hex | Use |
|---|---|---|
| `acid-green` | `#3BFF66` | **NEW** — pulled from the W logo. Active tab indicator, settled state, balance bar fills, button focus rings. Use sparingly; the punctuation matters. |
| `acid-green-soft` | `#BDFFD4` | Tinted backgrounds for "settled" pills (logo-light stop) |
| `clay` | `#C97A4A` | **NEW** — terracotta replacement for generic red on "owe" / negative balances. Less alarming than coral. |
| `clay-soft` | `#F4D9C5` | Tinted background for owe pills |
| `coral` | `#E5634E` | Existing — keep for genuine errors only (failed scan, unauthorized, etc.). NOT for "you owe X". |
| `sage` | `#B3BEA0` | Existing — kept for assigned-item highlight on snap page |

### Semantic mapping

```css
--success:  var(--acid-green);     /* settled, finalized, success */
--negative: var(--clay);            /* you owe, deficit */
--positive: var(--acid-green);      /* you're owed */
--error:    var(--coral);           /* genuine errors */
```

---

## 2. Typography

### Three families, three jobs

| Family | Where | Why |
|---|---|---|
| **Fraunces** (Google Fonts, variable) | All `<h1>`, `<h2>`, `<h3>`, marketing display copy | Editorial serif with personality — soft, warm. Replaces generic Inter for headings. |
| **Inter** (already loaded) | All body text, UI labels, buttons | Stays. It's the bread. |
| **JetBrains Mono** (Google Fonts) | Every price, every number, every receipt-line, balances | Receipts are monospaced. Numbers in tabular figures so columns line up. |

### Scale

```css
--text-display: 48px / 1.05    /* hero headlines */
--text-h1:      32px / 1.1
--text-h2:      24px / 1.2
--text-body:    15px / 1.55
--text-caption: 12px / 1.4
--text-num-lg:  56px / 1        /* big balance ("$24.50") */
--text-num-md:  20px / 1
--text-num-sm:  14px / 1
```

Letter-spacing: existing `-0.02em` on headings stays. Mono inherits its own.

---

## 3. Spacing & radius

### Spacing — **no change**. Tailwind defaults are fine.

### Radius — sharper

| Token | Value | Use |
|---|---|---|
| `r-receipt` | `0` (top/bottom edges are perforated SVG, not rounded) | Receipt cards |
| `r-pill` | `9999px` | Buttons, badges |
| `r-soft` | `10px` (was `0.85rem` ≈ 14px) | Non-receipt cards, inputs |

The point: receipt cards have **no border-radius** — their character is from the perforated SVG edges, not from rounding.

---

## 4. Shadows

### Paper-lift

```css
--shadow-paper-flat: 0 1px 0 rgba(26, 20, 16, 0.06)
--shadow-paper-lift: 0 8px 24px -10px rgba(26, 20, 16, 0.18), 0 1px 0 rgba(26, 20, 16, 0.04)
--shadow-paper-pop:  0 16px 40px -16px rgba(26, 20, 16, 0.28), 0 2px 0 rgba(26, 20, 16, 0.06)
```

Receipts cast a faint shadow + a hairline bottom edge that suggests paper thickness.

---

## 5. Texture

### Noise overlay

A 200×200 SVG noise tile, mounted as a `body::after` pseudo-element at 4% opacity, `mix-blend-mode: multiply`. Adds warmth to the cream without being visible.

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url('data:image/svg+xml;utf8,<svg ...>'); /* see globals.css */
  opacity: 0.04;
  mix-blend-mode: multiply;
  z-index: 1;
}
```

### Perforated edges (the killer detail)

Receipt cards get scalloped/perforated top and bottom edges via SVG `mask-image`. Specifically:
- Top: row of small semicircles biting into the paper (perforation)
- Bottom: same
- The card content lives between the perforations

Implementation in `<ReceiptCard>` component (see §7).

---

## 6. Motion

### Install

```
pnpm add framer-motion
```

### Baseline grammar

| Pattern | Where | Spec |
|---|---|---|
| Card mount | First render of any receipt card | `opacity 0 → 1`, `y: 8 → 0`, 280ms `ease-out`, 30ms stagger between cards |
| Hover lift | Receipt cards on `:hover` | `y: 0 → -2`, shadow intensifies, 180ms |
| Number count-up | Balance numbers on mount + when they change | `framer-motion`'s `animate(0, target)` with `ease-out`, 600ms |
| Tab switch | Active tab indicator | Layout-id animation (acid-green underline slides between tabs) |
| Sweep on scan | Existing `.scan-sweep` | Keep |
| Receipt unfurl | Talk-page replacement for orb | New Lottie or SVG path animation (see §7) |

### Reduced motion

All of the above respect `prefers-reduced-motion: reduce` — animations collapse to instant cuts.

---

## 7. Components

### `<ReceiptCard>` — the foundation

Props:
```ts
interface ReceiptCardProps {
  variant?: 'default' | 'success' | 'owe' | 'minimal'  // tints background
  perforation?: 'both' | 'top' | 'bottom' | 'none'      // which edges have scallop SVG
  className?: string                                     // composable
  children: React.ReactNode
}
```

Anatomy:
```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  ← perforated SVG mask-image (scalloped)
│                                  │
│  Header — Fraunces serif         │
│  Body — Inter                    │
│  ──────────────────────────────  │  ← optional <ReceiptDivider /> (dashed)
│  Total          $24.50           │  ← JetBrains Mono, tabular
│                                  │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘  ← perforated SVG mask-image
```

### `<ReceiptDivider>` — torn paper line

Inline SVG of a dashed line with optional "torn" jagged variant. Used between sections inside a receipt card (header/body, body/footer).

### `<NumDisplay>` — receipt numbers

```ts
<NumDisplay
  value={2450}                      // cents
  size="lg" | "md" | "sm"
  animate?: boolean                 // count-up on mount
  variant?: 'default' | 'positive' | 'negative'  // colors via tokens
/>
```

JetBrains Mono, `tabular-nums`. `animate` uses framer-motion to count up from 0.

### `<ReceiptOrb>` — the new Talk-page visual

Replace the dotted `.sx-orb` with one of:
- **Option A:** SVG path that draws itself like a thermal-print pattern (concentric arcs of dots that pulse)
- **Option B:** Lottie animation of an unfurling receipt
- **Option C:** Animated SVG of a receipt scrolling down infinitely (rotating linear gradient)

Recommend Option A first — fully custom, no Lottie dependency, plays with the receipt theme.

---

## 8. Icons

Replace generic Heroicons / lucide imports with **Phosphor Icons** at `regular` weight.

```
pnpm add @phosphor-icons/react
```

Migration: keep lucide for now (used in many places); ship Phosphor for new components and any deliberately re-skinned spots. Don't do a global icon swap in the POC — that's a separate atomic change.

---

## 9. Migration plan (after POC sign-off)

The POC ships **only the home page Feature cards** as receipt cards. Once you sign off, here's the rollout order — each is a separate atomic commit so we can revert any one:

1. **Tokens + fonts in place** (this POC)
2. **Home page hero** — apply Fraunces to the headline, swap "Snap → Talk → Settle" trio to receipt cards (this POC)
3. **Group cards on `/groups`** — wrap in `<ReceiptCard>`, mono prices
4. **Snap-page item rows** — convert `.sx-item` to mini receipts
5. **Balances list** — `<NumDisplay>` for big balance, perforated header
6. **Talk-page orb** — replace with `<ReceiptOrb>` (Option A)
7. **Number theatre** — count-up animation on every balance
8. **Color sweep** — convert ~95 hardcoded hex `bg-[#1A1410]` to semantic tokens (`bg-ink`, `bg-success`, `bg-negative`)
9. **Phosphor icons** — selective swap on hero + balances
10. **Drop `.sx-orb` duplicate** in `snap.css`

Estimated effort: 6–10 hours of focused work to do all of it cleanly.

---

## 10. Out of scope (deliberate)

- Dark mode — Mivvi is editorial-light; punt to v2.
- Internationalization of typography (Fraunces has limited Latin Extended only).
- A full grid system rebuild — current Tailwind layout works.
- Re-skinning Clerk auth modals beyond color overrides — not worth the maintenance cost.
- Replacing the entire shadcn button component — extend with `variant="receipt"` instead.

# Bayyinah design system

How the interface should look. Adapted from the Starbucks `DESIGN.md` in
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
(`design-md/starbucks`): a warm cream canvas, a four-green system, full-pill
buttons and whisper-soft cards. Tokens live in `client/src/index.css`.

## Colour

| Token | Value | Role |
| --- | --- | --- |
| `brand` | `#006241` | Headings (`h1`), wordmark, active nav link |
| `accent` | `#00754A` | Filled buttons, links, focus ring, floating button |
| `house` | `#1E3932` | Deep bands: sign-in band, "How it works", footer, score card |
| `uplift` | `#2B5148` | Decoration on dark surfaces only |
| `mint` | `#D4E9E2` | Success tint: approved, cited, verified, active history row |
| `gold` | `#CBA258` | One moment only: the answer the questioner chose, and the dāʿī's score |
| `gold-wash` | `#FAF6EE` | Surface of the chosen answer |
| `canvas` | `#F2F0EB` | Page background. Never pure white |
| `ceramic` | `#EDEBE9` | Neutral chips and quiet washes |
| `ink` / `ink-soft` | black at 87% / 58% | Body text / secondary text. Never pure black, including buttons and shadows (shadows are tinted `house`) |
| `line` | `#D6DBDE` | Input borders |
| `danger` | `#C82014` | Errors, rejection, level D |

Warnings keep Tailwind's amber. No gradients: surfaces are flat colour blocks.

## Type

- Latin: Geist, tracking `-0.01em` (`.display` headlines `-0.03em`). Arabic UI: IBM Plex Sans Arabic, tracking
  `0` (letter-spacing breaks the joins between Arabic letters).
- Qur'an and classical source text: Amiri (`font-quran`). Nowhere else.
- Hierarchy comes from weight and colour, not size: `h1` is semibold in
  `brand`; `h2` is regular weight in `ink`.
- `.eyebrow`: small tracked capitals above a section (plain in Arabic).

## Components

- **Buttons** (`.btn` + variant): always a 50px pill, `scale(0.95)` on press.
  `btn-primary` (accent fill) for the one main action; `btn-outline`,
  `btn-dark`, `btn-dark-outline`, `btn-danger`, `btn-danger-outline`,
  `btn-ghost`; sizes `btn-sm`, `btn-lg`.
- **Cards** (`.card`): white, 12px radius, two low-alpha shadows, no border.
  Separate cards with canvas space, not divider lines.
- **Inputs** (`.input`): 4px radius, `line` border, accent border and soft
  ring on focus, red tint when `aria-invalid`.
- **Chips** (`.chip`): pill status labels; colour carries the tone.
- **Header**: white with a three-layer shadow; sticky from `md` up.
- **Deep band**: `house` background, white text, `white/70` secondary text,
  numbered steps in outlined circles.
- **Floating button**: 56px `accent` circle at the bottom end corner with
  `shadow-float`; shortcut to the ask box from an open question.

## Rules

- Do not use gold as a general accent.
- Do not use one green for everything; each has its role above.
- Do not square button corners or stack one heavy shadow.
- Layouts use logical properties (`ms-`, `ps-`, `end-`) so Arabic mirrors.
- Question, answer and source text keep their own language and direction
  (`dir="auto"`), whatever the interface language.

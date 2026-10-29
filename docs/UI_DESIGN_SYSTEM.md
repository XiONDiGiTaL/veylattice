# Veylattice UI Design System — canonical (2026-10-29)

Status: **canonical requirement.** Every new or changed screen follows this document.
It governs the interface (menus, lobby, panels, buttons, typography, motion). It does NOT
govern rules or balance (`GAME_RULES.md`), the battlefield layout (`docs/ARENA_SYSTEM.md`),
card frames (`CardFrames/FRAME_DIRECTIVE.md`, `docs/CARD_FRAMES.md`) or the soundtrack
(`src/audio/soundtrack.js`). Where an older document describes menu styling differently, this
document wins for presentation, and those documents win for their own subjects.

Implementation: `ui.css` (tokens and components) is loaded after `styles.css` and
`battlefield.css`. Fonts are self-hosted under `fonts/` (OFL, see `fonts/LICENSE-*.txt`).

## 1. Identity

Veylattice is a premium fantasy card battler. It is a mysterious elemental world rendered
with modern UI precision. It is **not** an admin dashboard, a mobile-game template, or a neon
launcher.

- **Surfaces:** deep midnight, obsidian and blue-black. Layered, slightly translucent panels
  with fine borders. One soft glow per composition at most.
- **Accent:** "Lattice gold" marks the primary action and focus. The five element colours
  (Wood, Fire, Earth, Metal, Water) are *meaningful* accents: element badges, card fans, seat
  identities. They never colour whole panels.
- **Typography:** the display face (Cinzel) is used for the wordmark and major headings only.
  The interface face (Inter) is used for everything else: navigation, card information, body
  text and numbers.
- **Imagery:** real Veylattice card faces (`Cards/cards/*.svg`, 543:1024, never stretched),
  approved frames (214:300) and the project's voxel models. No third-party artwork, logos or
  layouts.

### Reference interpretation (inspiration, not templates)

| Reference | What we take | What we do not take |
| --- | --- | --- |
| Moxgate | Card-game-first navigation: Play first, then deck building; play modes named plainly; "no download or account required" honesty | Branding, MTG content, purple theme |
| VoxelRage menu | Cinematic dark backdrop showing the game world, small tracked eyebrow, large two-tone wordmark, short tagline, segmented choices, one warm primary action | Monospace UI, German copy, its art |
| LeapBuddies menu | Modes grouped by *where* you play (online vs. this device), descriptive sub-labels on actions, selectable portrait cards, tactile pressed states | Rounded "toy" style, purple palette, character assets |
| Main menu reference video | Not inspected: the video could not be retrieved from the build sandbox. Nothing here is derived from it. | — |

## 2. Tokens (`ui.css` `:root`)

All new styles use tokens, never raw colours, so that later screens stay consistent.

- **Surfaces:** `--vl-bg-0` (page), `--vl-bg-1`, `--vl-surface`, `--vl-surface-2`,
  `--vl-surface-glass`.
- **Lines:** `--vl-line`, `--vl-line-strong`.
- **Text:** `--vl-text`, `--vl-text-2` (secondary), `--vl-text-3` (tertiary / disabled).
- **Accent:** `--vl-gold`, `--vl-gold-hi`, `--vl-gold-ink` (text on gold).
- **Elements:** `--vl-wood`, `--vl-fire`, `--vl-earth`, `--vl-metal`, `--vl-water`.
- **Status:** `--vl-ok`, `--vl-warn`, `--vl-danger`, `--vl-info`, `--vl-preview`.
- **Radii:** `--vl-r-sm` 6px, `--vl-r-md` 10px, `--vl-r-lg` 16px. Pills only for chips and
  badges.
- **Spacing:** `--vl-s-1`…`--vl-s-8` (4, 8, 12, 16, 24, 32, 48, 64).
- **Motion:** `--vl-dur-fast` 120ms, `--vl-dur` 220ms, `--vl-dur-slow` 420ms; `--vl-ease`.
- **Focus ring:** `--vl-focus` (2px gold outline + 2px offset). Always visible on
  `:focus-visible`.

Contrast: body text on surfaces is at least 4.5:1, and large display text at least 3:1.
Element colours are used as fills and borders. Text in element colours must also meet 4.5:1
against its background, or carry a label.

## 3. Components

All components are plain HTML + CSS classes (`vl-*`), with real behaviour in JS.

| Component | Class | Rules |
| --- | --- | --- |
| Primary button | `.vl-btn.vl-btn--primary` | One per screen region. Gold fill. Hover lift (1px) and glow. Pressed sinks. Disabled is desaturated with `cursor: not-allowed`. Loading uses `aria-busy="true"` and a spinner. |
| Secondary button | `.vl-btn.vl-btn--secondary` | Glass surface with a fine border; the border brightens on hover. |
| Quiet button | `.vl-btn.vl-btn--quiet` | Text-like; used for back, cancel and inline actions. |
| Danger | `.vl-btn.vl-btn--danger` | Leave or delete only, always paired with a clear label. |
| Icon button | `.vl-icon-btn` | 44×44 minimum target, `aria-label` required, `title` tooltip. |
| Panel | `.vl-panel` | Glass surface, `--vl-r-lg`, fine border, padding `--vl-s-5`. |
| Mode card | `.vl-mode` | Selectable option inside the Play dialog: element-tinted rule, title, one-line description, availability badge, and its own action. |
| Badge | `.vl-badge` (`--ok`, `--warn`, `--danger`, `--info`, `--preview`) | Short uppercase label; never the only carrier of meaning. |
| Seat | `.vl-seat` | Lobby player panel: emblem, name, role badges (You, Host), deck summary, ready state. |
| Deck summary | `.vl-deck` | Deck name, card count, Vessel/Action/Relic split, legality badge, and the first validation error when illegal. |
| Dialog | `<dialog class="vl-dialog">` | Native `showModal()` for the focus trap and Esc. Has a labelled heading and a close button, and returns focus to the opener. |
| Status line | `.vl-status` (`role="status"`) | Live, polite updates (connection, joining, errors). |
| Empty / loading / error | `.vl-empty`, `.vl-spinner`, `.vl-error` | Every async surface has all three states. |
| Fields | `.vl-field`, `.vl-input`, `.vl-select` | Visible label, 44px minimum height, gold focus ring. |

Button copy is a verb plus an object ("Start duel", "Create room"). No "Click here".

## 4. Screens

### 4.1 Main menu (entry point)

- The page opens on the menu (or on How to Play for a first visit, as before). **No match
  starts on load.**
- **Composition:**
  - Left: eyebrow, emblem plus wordmark, a tagline of at most two lines, and one **Play**
    primary action. Below it, a quiet vertical destination list.
  - Right: a fanned spread of five real card faces, one per element, with a restrained glow
    and lattice backdrop.
  - Utility corner: audio toggle, settings, and profile chip.
- The global tab bar is hidden on the menu. The menu's own list is the navigation there. On
  every other view the tab bar returns with Menu as home.
- **Destinations,** each shown only because the system exists: Continue match (only while a
  match is live), Deck Builder, Card Library (browse-only, labelled as such), Collection (owned
  cards inside Shop & Collection), Shop, Online Room (badged **Preview**), How to Play, Vessel
  Roster, Settings & Profile.
- **Honesty:** a single footnote states the feature status (practice needs no account; online
  rooms are a peer-validated preview with no rewards; decks and Shards are stored on this
  device).

### 4.2 Play dialog (mode selection)

Opened by Play. Each mode states what it is and has its own action:

| Mode | Availability | Action |
| --- | --- | --- |
| Solo Duel | Implemented | Active deck vs. the tactical AI. Shows the deck summary with legality; opponent difficulty and persona selectors are bound to the same profile settings as Settings. Start is disabled, with the reason shown, while the deck is illegal or not owned. |
| Quick Practice | Implemented | Random practice deck; nothing to prepare. |
| Guided First Match | Implemented | The tutorial. |
| Online Room | **Preview** | Opens the lobby. Badge text: "Peer-validated preview · no rewards". |
| Local Match | **Not implemented**, so **not shown** | Hot-seat was replaced by AI in M1-006. |

### 4.3 Online lobby

- **Header:** title, Preview badge, connection status badge (Offline / Connecting / Connected
  / Error), and Back to menu.
- **No room yet:** two panels, *Host a room* (primary: Create room) and *Join with a code*
  (large 6-character code field plus Join), and a *Your deck* summary. The limits of the
  preview sit in a disclosure that is always reachable (`<details>`) and are summarised in
  the badge.
- **In a room:**
  - Room code shown large, with a copy action.
  - Room status chip.
  - Two seat panels: name, You/Host badges, deck name, count and legality, Ready / Not ready,
    or an empty state "Waiting for an opponent — share the code".
  - Your controls: deck select, Ready/Unready.
  - Host-only Start match (disabled, with the reason, until both seats are ready with decks).
  - Leave room.
- **Joining** shows a spinner and "Waiting for the host…". **Transport failure** shows an
  error panel with Retry. Readiness, start and command legality stay validated by
  `src/game/lobby.js` and the engine (peer-validated). The UI never simulates an opponent.

### 4.4 Other views

Decks, Shop, Library, Roster, Guide, Settings and Battle inherit tokens, typography and
buttons. Their layouts are unchanged by this directive unless a later task says otherwise.

## 5. Motion and atmosphere

- Menu entrance: a staggered fade/rise of at most about 600 ms in total.
- Card fan: slight pointer parallax (transform only) and a slow ambient float of 6–8 s cycles.
- Motes: at most 12 CSS-animated particles, `opacity` + `transform` only.
- Dialogs fade and scale in 180–220 ms.
- `prefers-reduced-motion: reduce` **or** the in-game Reduced motion setting disables
  parallax, float, motes and entrance motion.
- No canvas, WebGL or rAF loop on the menu. The 3D arena initialises only when a match
  renders; its loop is on-demand.

## 6. Audio

Unchanged authority: `src/audio/soundtrack.js` and `viewMusicRole`. The menu, lobby and Play
dialog are menu-family and play the main theme; Decks plays preparations, Shop plays shop,
Battle plays battle. The audio toggle in the utility corner calls the existing manager
(`applySettings({ muted })`) and persists via profile settings. There is no second audio path.

## 7. Responsive and accessibility

- **Desktop first:** the 1366–1920 × 768–1080 menu fits without vertical scrolling.
- **Tablet (≤ 1024px):** the hero stacks (copy, then a smaller card fan).
- **Phone (≤ 640px):** the card fan becomes a compact 3-card fan above the copy. The Play
  button is visible without scrolling at 390×844. No horizontal overflow.
- Touch targets are at least 44×44px. Headings are semantic (one `h1` per view). The dialog
  focus trap is native. Focus is visible everywhere.

## 8. Feature-availability policy

A destination appears only when its system works. A *Preview* badge marks systems that work
with stated limits (the online room). A system that does not exist (local hot-seat,
server-authoritative online, cloud economy) is not shown as a button. It may be mentioned in
the honest-status footnote or in the docs.

## 9. Implementation status (2026-10-29)

Implemented:
- `ui.css`, holding the tokens and components.
- The main menu and Play dialog (`index.html`, `src/ui/menu.js`).
- The lobby (`src/ui/systems.js`).
- Fonts under `fonts/`.
- The global restyle of buttons, tabs and headings.

Checked in headless Chromium against items 1–11 below; the results are in
docs/IMPLEMENTATION_LOG.md. Not done: the Decks, Shop, Library and Settings layouts keep their
existing structure (they inherit only tokens and type), and the battle HUD is unchanged apart
from button styling.

## 10. Acceptance (checked in a real browser before marking done)

1. The menu is the entry point; no match on load.
2. Play opens the dialog; every mode's action works.
3. Every visible destination opens its working screen.
4. Card Library is labelled browse-only; deck building lives in Deck Builder.
5. Solo Duel refuses an illegal or unowned deck and shows why.
6. The lobby shows real room and seat state only.
7. Settings and audio still work; the soundtrack follows the view mapping.
8. No horizontal overflow at 390px; the Play button is visible at 390×844.
9. Keyboard: Tab order is logical, the dialog traps focus, Esc closes it, and focus returns
   to Play.
10. Reduced motion disables the ambient motion.
11. No new console errors; asset paths are relative (the `/veylattice/` subpath).
12. `npm test` and `npm run check` pass.

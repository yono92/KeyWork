# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyWork is a Korean/English typing practice web app with two game modes: a standard typing practice mode and a falling-words arcade game mode. Deployed at keywork.store.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — TypeScript compile + Vite build (keeps console logs)
- `npm run build:prod` — Production build (terser strips console/debugger, no source maps, mangles `_`-prefixed properties)
- `npm run lint` — ESLint (flat config format, eslint.config.js)
- `npm run preview` — Preview production build locally

No test framework is configured.

## Tech Stack

- **React 18** + **TypeScript 5.5** + **Vite 5**
- **Zustand** (v5 RC — release candidate, not stable) for global state (`src/store/store.ts`)
- **Tailwind CSS** with class-based dark mode
- **React Router v7** for client-side routing
- **Web Audio API** for typing sounds (800Hz beep, 30ms, volume 0.2)
- Production served via PM2 (`ecosystem.config.js`, port 5173, SPA mode enabled for client-side routing)
- **Unused installed packages**: howler, styled-components, lucide-react — all installed but not imported anywhere

## Architecture

### Routing (App.tsx)

Two routes, both render `MainLayout` with different `gameMode` prop:
- `/practice` → Standard typing practice (TypingInput component)
- `/falling-words` → Arcade falling words game (FallingWordsGame component)
- `/` redirects to `/practice`

### State Management (src/store/store.ts)

Single Zustand store (`useTypingStore`) holds all global state. **Only `darkMode` and `language` persist to localStorage** — gameMode, isMuted, progress, text, and input are all ephemeral (reset on reload).

### Korean Language Processing (src/utils/)

This is the most domain-specific part of the codebase:
- **hangulUtils.ts** — Decomposes Hangul syllables into jamo (초성/중성/종성) for character-level accuracy comparison. Keystroke counting uses weighted multipliers per jamo position (초성 1.2 / 중성 1.5 / 종성 1.3) plus a 0.5 base per character.
- **levenshtein.ts** — Space-optimized Levenshtein distance (two-array swap) used on decomposed jamo arrays to calculate typing accuracy.
- Accuracy for Korean is computed at the jamo level (not syllable level). English accuracy uses character-level comparison.

### Key Components

- **TypingInput.tsx** (~450 lines) — Core typing practice UI. Handles real-time input validation, WPM calculation, accuracy tracking, and session averages. WPM has a 500ms delay compensation and 1000 WPM cap during first 12 seconds. Korean gets a 1.2x WPM multiplier. **Maintains its own local language state** (does not use Zustand's language for this).
- **FallingWordsGame.tsx** (~470 lines) — Arcade mode with falling words, combo system (up to 2x multiplier), power-ups (life/slow/clear/shield/score with 2-5% spawn rates), 3-life system, and level progression (spawn interval, fall speed, words per spawn all scale with level). **Uses Zustand's global language state** (different pattern from TypingInput).
- **Keyboard.tsx** — Visual keyboard with English/Korean layouts. Maps Korean jamo to QWERTY positions for display.
- **MainLayout.tsx** — Shared layout wrapper rendering the appropriate game mode component.

### Fixed-Position UI Buttons

Bottom-right corner buttons are positioned to avoid overlap:
- DarkModeToggle: `bottom-4 right-4`
- LanguageToggle: `bottom-4 right-20`
- MuteToggle: `bottom-4 right-36`

### Data

- `src/data/quotes.json` — 97 Korean + 97 English quotes for practice mode
- `src/data/word.json` — 282 Korean + 270 English words for falling words mode

## Notes

- The codebase uses Korean comments throughout
- There is a space in the filename `src/hooks/useMediaQuery .ts` (known issue)
- RightSidebar ad code (Coupang affiliate) is currently commented out; hidden on mobile and screens < 1535px
- Audio requires user interaction (click/keydown) before AudioContext can be created (browser policy)
- TypingInput detects wrong keyboard layout mid-session and prompts user to switch language

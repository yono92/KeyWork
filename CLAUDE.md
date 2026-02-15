# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyWork is a Korean/English typing practice web app with six game modes: typing practice (proverbs/Wikipedia long text), falling words, word chain, typing race, typing defense, and dictation. Deployed on Vercel.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Next.js production build
- `npm run build:prod` — Production build with NODE_ENV=production
- `npm run lint` — ESLint (flat config format, eslint.config.js)
- `npm run preview` — Preview production build (`next start`)
- `npm run reset:cache` — Clear `.next` cache

No test framework is configured (vitest installed but no tests).

## Tech Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript 5.5**
- **Zustand** (v5 RC) for global state (`src/store/store.ts`)
- **Tailwind CSS** with class-based dark mode
- **Web Audio API** for typing sounds (800Hz beep, 30ms, volume 0.2)
- Deployed on **Vercel** (serverless functions for API routes)
- **Unused installed packages**: howler, styled-components, lucide-react

## Architecture

### Routing (Next.js App Router)

Routes defined in `app/(game)/` route group with shared layout:
- `/` — Redirects to `/practice`
- `/practice` — Typing practice (proverbs + Wikipedia long text)
- `/falling-words` — Arcade falling words game
- `/word-chain` — Korean word chain game (uses krdict API)
- `/typing-race` — Typing race against AI
- `/typing-defense` — Typing defense game
- `/dictation` — Dictation practice

### API Routes (`app/api/`)

- **`/api/krdict/validate`** — Validates Korean words via krdict API (nouns only, `pos=1`). Caches 1 hour.
- **`/api/krdict/candidates`** — Returns word candidates starting with given Hangul characters via krdict API (`method=start`). Caches 10 minutes.
- **`/api/wikipedia`** — Proxies Wikipedia random article API. Supports `?lang=ko` and `?lang=en`. Returns title + plain text (50-500 chars). Retries up to 3 times.

All krdict routes require `KRDICT_API_KEY` environment variable (set in Vercel).

### State Management (src/store/store.ts)

Single Zustand store (`useTypingStore`) holds all global state. **Only `darkMode` and `language` persist to localStorage** — gameMode, isMuted, progress, text, and input are all ephemeral (reset on reload).

### Korean Language Processing (src/utils/)

- **hangulUtils.ts** — Decomposes Hangul syllables into jamo for character-level accuracy comparison. Keystroke counting uses weighted multipliers per jamo position.
- **levenshtein.ts** — Space-optimized Levenshtein distance used on decomposed jamo arrays to calculate typing accuracy.
- Accuracy for Korean is computed at the jamo level (not syllable level). English accuracy uses character-level comparison.

### Key Components

- **TypingInput.tsx** — Typing practice with text source tabs (proverbs / long text from Wikipedia). Handles WPM calculation, accuracy tracking, session averages. 700 WPM cap during first 12 seconds.
- **FallingWordsGame.tsx** — Arcade mode with falling words, combo system, power-ups, 3-life system, level progression.
- **WordChainGame.tsx** — Korean word chain game against AI. Uses krdict API for word validation and candidate fetching. Timer pauses during API validation and AI turns.
- **TypingRaceGame.tsx** — Race against AI with difficulty selection (easy 20 WPM / normal 35 WPM / hard 55 WPM).
- **TypingDefenseGame.tsx** — Typing defense game with waves and boss encounters.
- **DictationGame.tsx** — Dictation practice with TTS playback.
- **Keyboard.tsx** — Visual keyboard with English/Korean layouts.

### Data

- `src/data/proverbs.json` — 100 Korean proverbs (from opendict-korean-proverb) + 100 English proverbs. Used by TypingInput, TypingRaceGame, TypingDefenseGame, DictationGame.
- `src/data/word.json` — 282 Korean + 270 English words for FallingWordsGame and TypingDefenseGame.

## Notes

- The codebase uses Korean comments throughout
- Audio requires user interaction (click/keydown) before AudioContext can be created (browser policy)
- TypingInput detects wrong keyboard layout mid-session and prompts user to switch language
- Word chain timer pauses during API validation (`isValidatingWord`) and AI turns (`isAiTurn`) to account for Vercel API latency

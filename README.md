# Blackjack Trainer

A polished blackjack training application built with Next.js, TypeScript, React, and Tailwind CSS. The repository is structured around a coaching-first blackjack experience rather than a simple card game: it includes a full strategy engine, probability analysis helpers, configurable casino rules, local progress persistence, and premium casino-inspired UI components. The visual language leans dark, elegant, and table-driven, with a London Hippodrome-style palette and typography.

## Key Features

- Complete blackjack domain model with typed game state, rules, actions, outcomes, and decision records.
- Basic strategy engine covering hard totals, soft totals, pairs, doubling, splitting, and surrender fallbacks.
- Probability panel support for bust risk, dealer bust chance, recommendation strength, and plain-English reasoning.
- Coaching UI components for action feedback, strategy explanations, and confidence badges.
- Casino-style table presentation with animated card dealing, dealer hole-card handling, split-hand rendering, and end-of-hand overlays.
- Configurable blackjack rules for deck count, H17/S17, payout, double-after-split, resplitting, and surrender.
- Browser persistence for rules, aggregate stats, and recent decision history via `localStorage`.
- App mode model for `play`, `coach`, `drill`, `review`, and `stats`.

## Screens and Modes

The repository currently contains the following implemented UI building blocks and mode definitions:

- `Play`: standard hand flow and action selection are represented by the core table and action components.
- `Coach`: supported by the strategy engine and UI affordances that highlight the recommended move before the player acts.
- `Drill`, `Review`, `Stats`: modeled in the shared types and storage layer, with persistence designed to support mistake review and progress tracking.

Current state:
The root route in [`app/page.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/app/page.tsx) is still the default Next.js starter page. The trainer UI components and game logic are present in the codebase, but they are not yet wired into the main route.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- `next/font` for Playfair Display and Inter
- ESLint 9 with `eslint-config-next`

## Project Structure

```text
.
├── app/
│   ├── layout.tsx        # Root layout, metadata, font setup
│   ├── page.tsx          # Current root route (still starter content)
│   └── globals.css       # Tailwind v4 import, theme tokens, animations
├── components/
│   ├── BlackjackTable.tsx
│   ├── ActionPanel.tsx
│   ├── CoachPanel.tsx
│   ├── ProbabilityPanel.tsx
│   ├── ModeSelector.tsx
│   └── Card.tsx
├── lib/
│   ├── blackjack.ts      # Core blackjack rules and hand logic
│   ├── strategy.ts       # Basic strategy lookup engine + explanations
│   ├── probability.ts    # Probability helpers for coaching UI
│   ├── rules.ts          # Default rules and rule descriptions
│   ├── storage.ts        # localStorage persistence helpers
│   └── types.ts          # Shared domain types
├── public/               # Static assets
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Local Development Setup

### Prerequisites

- Node.js 20+ recommended
- npm

### Install and run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Available Scripts

- `npm run dev` - start the Next.js development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint

## How Rules and Configuration Work

Blackjack rule configuration is defined in [`lib/types.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/types.ts) and [`lib/rules.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/rules.ts).

Supported rule fields:

- `numDecks`: `1 | 2 | 4 | 6 | 8`
- `dealerHitsSoft17`
- `blackjackPayout`: `3:2` or `6:5`
- `doubleAfterSplit`
- `resplitAllowed`
- `surrenderAllowed`

Default rules are currently:

- 6 decks
- Dealer hits soft 17
- Blackjack pays 3:2
- Double after split enabled
- Resplitting enabled
- Surrender disabled

The strategy engine resolves recommendations against the current rules, including surrender and double fallback behavior.

## How Progress and Stats Are Stored

Persistence is client-side only and lives in [`lib/storage.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/storage.ts).

The app stores data in browser `localStorage` under three keys:

- `bj_trainer_stats`
- `bj_trainer_rules`
- `bj_trainer_decisions`

Stored data includes:

- aggregate performance stats
- mistakes by hand category
- recent decision history
- weak scenario tracking
- saved rules/preferences

The storage helpers are SSR-safe and return defaults when browser storage is unavailable.

## Future Improvements

- Wire the trainer shell into [`app/page.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/app/page.tsx) so the implemented game and coaching components become the live homepage.
- Add dedicated route-level screens or sections for drills, mistake review, stats, and rule editing.
- Expand test coverage for the strategy tables and core game logic.
- Add keyboard shortcuts and accessibility refinements for training workflows.
- Consider optional server-side sync for progress across devices.

## Notes for Deployment

- This is a standard Next.js App Router project and can be deployed to platforms that support Node-based Next.js builds.
- Current persistence is browser-only. Deployments do not require a database, but user progress will remain device/browser specific.
- Before production deployment, the main trainer UI still needs to replace or wrap the starter page in [`app/page.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/app/page.tsx).
- Fonts are loaded with `next/font`, and the design system is driven through Tailwind CSS v4 plus custom theme tokens in [`app/globals.css`](/Users/devdeepak/Desktop/blackjack-trainer/app/globals.css).

## License

License to be added.

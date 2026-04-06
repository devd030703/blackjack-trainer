# Blackjack Trainer

A polished blackjack basic-strategy trainer built with Next.js, React, TypeScript, and Tailwind CSS. The app is no longer a starter scaffold: the homepage now runs the full training experience with live gameplay, coaching, drills, timed benchmarking, mistake replay, persistent stats, and configurable table rules.

## Product Overview

The trainer is built around a learning loop instead of a single game screen:

- `Play`: full-hand blackjack with realistic pacing and post-hand review.
- `Coach`: live recommendation, explanation, confidence, and probability context before you act.
- `Drill`: fast isolated reps generated from weak spots, unresolved misses, and category coverage.
- `Exam`: timed no-hint benchmark with score, category breakdown, timeouts, and average response time.
- `Review`: replay missed scenarios until they are cleared from the unresolved review queue.

Persistent stats remain visible below the mode rail so progress is always in view without becoming a separate destination.

## Implemented Features

- Typed blackjack engine for deck creation, dealing, hand evaluation, dealer play, splitting, and doubling.
- Basic strategy engine with hard, soft, and pair decisions that adapt to selected rules.
- Probability panel for hit bust risk, dealer bust chance, recommendation strength, and short reasoning.
- Guided training session builder that prioritizes unresolved mistakes and repeated weak spots.
- Learning-event pipeline that records response time, hint usage, exposure count, repeated mistakes, and scenario identity.
- Mistake review queue keyed by scenario and rules snapshot so replay stays tied to the original spot.
- Persistent stats dashboard with accuracy, mistake distribution, repeated mistakes, hint-assisted decisions, recent timeline, and top missed scenarios.
- Rule settings drawer for deck count, H17/S17, payout, double-after-split, and resplitting.
- Premium casino-inspired UI with animated cards, dark felt surfaces, gold accents, and responsive layout.
- Browser-only persistence with SSR-safe `localStorage` helpers and backward-compatible saved-data normalization.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript with `strict: true`
- Tailwind CSS v4
- `next/font/google` for Playfair Display and Inter
- ESLint 9 with `eslint-config-next`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

- `npm run lint`
- `npm run build`
- `npm run start`

## Project Structure

```text
.
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── BlackjackTable.tsx
│   ├── ActionPanel.tsx
│   ├── CoachPanel.tsx
│   ├── ProbabilityPanel.tsx
│   ├── ModeSelector.tsx
│   ├── RulesSettings.tsx
│   ├── ScenarioDrill.tsx
│   ├── ExamSession.tsx
│   ├── MistakeReview.tsx
│   ├── StatsDashboard.tsx
│   └── Card.tsx
├── lib/
│   ├── blackjack.ts
│   ├── strategy.ts
│   ├── probability.ts
│   ├── rules.ts
│   ├── modes.ts
│   ├── learning-events.ts
│   ├── decision-records.ts
│   ├── adaptive-training.ts
│   ├── storage.ts
│   └── types.ts
└── README.md
```

## Architecture Notes

- [`app/page.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/app/page.tsx) is the live app shell. It hydrates saved data, controls mode switching, owns top-level stats state, and wires the modes together.
- [`components/BlackjackTable.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/components/BlackjackTable.tsx) handles the full hand loop for `play` and `coach`.
- [`components/ScenarioDrill.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/components/ScenarioDrill.tsx), [`components/ExamSession.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/components/ExamSession.tsx), and [`components/MistakeReview.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/components/MistakeReview.tsx) provide the targeted training flows.
- [`components/StatsDashboard.tsx`](/Users/devdeepak/Desktop/blackjack-trainer/components/StatsDashboard.tsx) summarizes ongoing performance across every mode.
- [`lib/blackjack.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/blackjack.ts), [`lib/strategy.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/strategy.ts), and [`lib/probability.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/probability.ts) keep the game and decision logic pure and UI-free.
- [`lib/learning-events.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/learning-events.ts), [`lib/decision-records.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/decision-records.ts), and [`lib/adaptive-training.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/adaptive-training.ts) power the training analytics and adaptive scenario generation.

## Persistence

The app stores progress in browser `localStorage` using SSR-safe helpers in [`lib/storage.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/storage.ts).

Current keys:

- `blackjack-trainer-stats`
- `blackjack-trainer-rules`
- `blackjack-trainer-decisions`

Saved data includes:

- aggregate hand and decision counts
- correctness and mistake distribution
- recent decisions and weak scenarios
- response times, hint usage, and repeated-mistake metadata
- unresolved review scenarios through decision history
- selected table rules

## Development Guidance

- Keep core blackjack logic in `lib/`, not in React components.
- Prefer updating shared types in [`lib/types.ts`](/Users/devdeepak/Desktop/blackjack-trainer/lib/types.ts) instead of redefining local shapes.
- Preserve the dark casino aesthetic and existing motion language in [`app/globals.css`](/Users/devdeepak/Desktop/blackjack-trainer/app/globals.css).
- Keep persistence browser-only unless a backend is explicitly requested.

## Verification

Before shipping meaningful changes:

- run `npm run lint`
- run `npm run build`
- manually sanity-check the affected training flow in the browser

## License

License to be added.

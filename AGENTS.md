<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Before changing routing, layouts, rendering boundaries, metadata, or build conventions, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## 1. Project overview

- This repository is a blackjack training web app built for a polished, portfolio-quality experience.
- The intended product includes gameplay, coaching, drills, stats, mistake review, configurable rules, and probability guidance.
- Today, the repository contains the foundation for that app:
  - `lib/` already holds the core blackjack, strategy, rules, probability, and storage logic.
  - `components/` already holds presentational UI for the blackjack table and related panels.
  - `app/page.tsx` is still the default starter page and does not yet wire the blackjack experience together.
- When contributing, treat the existing domain logic and UI components as the real source of architectural intent.

## 2. Main tech stack

- Next.js 16 App Router
- React 19
- TypeScript with `strict: true`
- Tailwind CSS v4 via `@import "tailwindcss"` in `app/globals.css`
- `next/font/google` for typography
- ESLint 9 with `eslint-config-next`
- Browser `localStorage` for persistence

## 3. How to run the project locally

- Install dependencies: `npm install`
- Start the dev server: `npm run dev`
- Open `http://localhost:3000`
- Production build: `npm run build`
- Run the production server after building: `npm run start`

## 4. Important npm scripts

- `npm run dev`: start local development server
- `npm run build`: create a production build; use this before finishing meaningful changes
- `npm run start`: run the built app locally
- `npm run lint`: run ESLint across the repo

## 5. Repository structure and where major logic lives

- `app/layout.tsx`
  - Root layout, metadata, global fonts, and app shell.
  - Server Component by default.
- `app/page.tsx`
  - Current entry page.
  - At the moment this is scaffold content and not the real blackjack UI yet.
- `app/globals.css`
  - Tailwind v4 import, theme tokens, custom utility classes, and shared animations.
  - This file defines the casino-inspired palette and table/card visual language.
- `components/`
  - Presentational client components for the future app UI.
  - `BlackjackTable.tsx`: main game table shell and layout
  - `ActionPanel.tsx`: action buttons
  - `CoachPanel.tsx`: decision feedback
  - `ProbabilityPanel.tsx`: probability summary
  - `ModeSelector.tsx`: top-level mode tabs
  - `Card.tsx`: visual card rendering and reveal animation
- `lib/types.ts`
  - Central source of truth for domain types. Prefer adding shared types here.
- `lib/blackjack.ts`
  - Core blackjack rules and hand/deck mechanics.
  - Keep this pure and UI-free.
- `lib/strategy.ts`
  - Basic strategy lookup tables and explanation generation.
- `lib/probability.ts`
  - Probability display calculations using lookup values and readable reasoning.
- `lib/rules.ts`
  - Default rules and rule descriptions.
- `lib/storage.ts`
  - SSR-safe `localStorage` helpers for rules, stats, and decision history.

## 6. Coding conventions to follow

- Keep TypeScript types explicit and readable.
- Prefer named interfaces and clear return types for shared domain logic.
- Import shared domain types from `lib/types.ts` instead of redefining shapes locally.
- Use the `@/*` path alias where it improves clarity.
- Preserve the current style: small modules, direct code, readable comments, minimal indirection.
- Favor pure functions in `lib/` and keep side effects at the React boundary.
- Avoid clever abstractions for simple flows. This codebase should stay easy to audit.
- Match existing formatting and naming in the touched file instead of restyling unrelated areas.

## 7. UI/style conventions to preserve

- Preserve the premium dark, casino-inspired look.
- Reuse the theme tokens and utility classes defined in `app/globals.css`.
- Maintain the established palette:
  - dark green felt backgrounds
  - warm gold accents
  - cream/off-white text and card surfaces
- Preserve the typography split:
  - `Playfair Display` for decorative/display text
  - `Inter` for UI/body text
- Keep the table/card/panel look consistent with existing components.
- Preserve existing motion patterns and keyframes instead of adding unrelated animation styles.
- Ensure mobile and desktop responsiveness remain intact.
- Prefer extending existing component patterns over introducing a separate visual system.

## 8. Rules for modifying game logic

- Preserve separation between UI components and core blackjack logic.
- Put blackjack mechanics in `lib/blackjack.ts`, not inside React components.
- Keep game logic functions deterministic and side-effect free where possible.
- Do not couple game rules to presentation concerns.
- When changing hand evaluation, dealing, dealer play, split handling, or action eligibility:
  - verify the behavior still aligns with the `GameRules` model in `lib/types.ts`
  - check that advice/probability/stat flows still receive compatible inputs
  - avoid hidden mutations of card arrays or hand arrays
- If a rule change requires new state, add the smallest possible surface area and document it clearly in types.

## 9. Rules for modifying training/strategy/probability logic

- Keep training logic separate from rendering.
- Strategy decisions belong in `lib/strategy.ts`.
- Probability calculations and explanatory summaries belong in `lib/probability.ts`.
- If you update strategy tables, do so carefully and keep the tables easy to inspect.
- Do not mix estimated probability messaging with actual gameplay state mutations.
- Keep explanations concise, factual, and consistent with the actual recommendation returned.
- Do not add card counting, betting systems, bankroll advice, or advantage-play functionality unless explicitly requested.
- Do not introduce pseudo-scientific or unexplained probability values. If values change, keep the source/intent obvious in code comments.

## 10. Guidance for persistence/storage changes

- Current persistence is browser-only and lives in `lib/storage.ts`.
- Keep storage access SSR-safe by guarding browser APIs with `typeof window !== 'undefined'`.
- Prefer evolving existing `localStorage` helpers over scattering direct `localStorage` calls through components.
- Maintain backward compatibility when adding fields:
  - merge saved data with defaults
  - tolerate missing fields from older saved payloads
- Keep stored payloads small and serializable.
- Do not add backend, auth, remote databases, or syncing unless explicitly requested.

## 11. Guidance for keeping the architecture simple and modular

- Keep domain logic in `lib/` and UI in `components/` or `app/`.
- Favor composition over large monolithic components.
- Prefer small, focused edits over broad rewrites.
- Reuse existing helpers before adding new modules.
- Add a new abstraction only when it reduces real duplication or meaningfully clarifies ownership.
- Avoid state duplication between components when one source of truth is enough.
- Keep the page-level orchestration straightforward. `app/page.tsx` should coordinate the experience, not reimplement domain rules.

## 12. What to avoid

- Do not invent frameworks, libraries, or architectural layers that are not already in the repo.
- Do not add backend/auth unless explicitly requested.
- Do not add card counting, betting systems, team play, hole-carding, shuffle tracking, or other advantage-play features.
- Do not weaken the visual identity by replacing the dark casino aesthetic with generic default UI.
- Do not move core blackjack decisions into JSX event handlers if they can live in pure helpers.
- Do not introduce large-scale rewrites when a targeted fix will do.
- Do not hide business rules behind unnecessary hooks, context layers, or generic utility wrappers.
- Do not break responsiveness while optimizing for only one viewport.

## 13. Expectations for testing and verification before finishing changes

- Run `npm run lint` after meaningful code changes.
- Run `npm run build` before finalizing substantial work.
- Manually sanity-check the affected flows in local dev when UI or state behavior changes.
- For game-flow changes, verify the relevant basics still work:
  - page renders without runtime errors
  - key controls respond correctly
  - gameplay state transitions still make sense
  - coaching/probability/stats inputs remain coherent
  - persistence still loads and saves without breaking SSR
- If you could not run a verification step, say so explicitly in your final handoff.

## Extra notes for future agents

- `CLAUDE.md` points back to this file, so keep this document current when repository conventions change.
- Because this is a Next.js App Router project on a newer Next version, do not assume older Next.js patterns are still valid. Check `node_modules/next/dist/docs/` before making framework-level changes.

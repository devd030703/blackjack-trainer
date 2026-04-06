import type { GameMode } from "@/lib/types";

export interface ModeDefinition {
  mode: GameMode;
  title: string;
  eyebrow: string;
  description: string;
  purpose: string;
  cadence: string;
  assistance: string;
}

export const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    mode: "play",
    title: "Play",
    eyebrow: "Realistic table feel",
    description: "Play full hands with the table mostly silent and review your decisions only after the round settles.",
    purpose: "Play naturally and see whether your instincts hold up without live coaching.",
    cadence: "Best when you want table rhythm, not study mode.",
    assistance: "Limited assistance. Post-hand review only.",
  },
  {
    mode: "coach",
    title: "Coach",
    eyebrow: "Live instruction",
    description: "Get the recommended move, supporting explanation, confidence, and probability context before you act.",
    purpose: "Learn the reasoning while the decision is still live.",
    cadence: "Best when you want active guidance and immediate correction.",
    assistance: "Highest assistance. Recommendation, explanation, confidence, and odds.",
  },
  {
    mode: "drill",
    title: "Drill",
    eyebrow: "Fast targeted reps",
    description: "Run dense scenario sessions tuned to weak spots, category coverage, and repetition speed.",
    purpose: "Lock patterns in through volume instead of full-hand pacing.",
    cadence: "Best for warm-ups and focused category work.",
    assistance: "Isolated scenarios with rapid turnover and feedback.",
  },
  {
    mode: "exam",
    title: "Exam",
    eyebrow: "Timed benchmark",
    description: "Take a no-hint assessment with a running clock, clean scoring, and benchmark-style results.",
    purpose: "Measure what you know under pressure.",
    cadence: "Best when you want a performance check instead of practice.",
    assistance: "No hints. Timed decisions. Results at the end.",
  },
  {
    mode: "review",
    title: "Review",
    eyebrow: "Recover mistakes",
    description: "Revisit missed spots, retry them cleanly, and inspect why the earlier decision broke down.",
    purpose: "Turn mistakes into deliberate correction loops.",
    cadence: "Best right after a rough session or failed exam.",
    assistance: "Replay-first workflow with explanation after retry.",
  },
];

export const MODE_DEFINITION_BY_ID: Record<GameMode, ModeDefinition> = MODE_DEFINITIONS.reduce(
  (definitions, definition) => ({
    ...definitions,
    [definition.mode]: definition,
  }),
  {} as Record<GameMode, ModeDefinition>,
);

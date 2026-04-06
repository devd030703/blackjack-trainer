// This file builds guided training sessions from the user's saved decision history.

import { getDecisionScenarioKey, getOutstandingReviewDecisions } from "@/lib/decision-records";
import { createHand, getRankBucket } from "@/lib/blackjack";
import type { Card, DecisionRecord, GameRules, Hand, HandCategory, Rank } from "@/lib/types";

export interface GuidedTrainingScenario {
  id: string;
  hand: Hand;
  dealerUpcard: Card;
  handLabel: string;
  focusLabel: string;
  source: "review" | "weak-spot" | "warm-up" | "coverage";
  note: string;
}

export interface GuidedTrainingSession {
  title: string;
  description: string;
  scenarios: GuidedTrainingScenario[];
}

interface ScenarioBlueprint {
  id: string;
  handCategory: HandCategory;
  playerTotal?: number;
  pairRank?: Rank;
  dealerRank: Rank;
  source: GuidedTrainingScenario["source"];
  note: string;
  weight: number;
}

const STARTER_BLUEPRINTS: ScenarioBlueprint[] = [
  { id: "starter-hard-16-vs-10", handCategory: "hard", playerTotal: 16, dealerRank: "10", source: "warm-up", note: "Classic discomfort spot. Learn to trust the chart.", weight: 1 },
  { id: "starter-hard-12-vs-3", handCategory: "hard", playerTotal: 12, dealerRank: "3", source: "warm-up", note: "A thin decision where hesitation is common.", weight: 1 },
  { id: "starter-hard-11-vs-a", handCategory: "hard", playerTotal: 11, dealerRank: "A", source: "warm-up", note: "Strong doubling pattern worth locking in early.", weight: 1 },
  { id: "starter-soft-18-vs-9", handCategory: "soft", playerTotal: 18, dealerRank: "9", source: "warm-up", note: "Soft 18 creates many avoidable mistakes.", weight: 1 },
  { id: "starter-soft-17-vs-6", handCategory: "soft", playerTotal: 17, dealerRank: "6", source: "warm-up", note: "Good entry point for soft doubles.", weight: 1 },
  { id: "starter-pair-8-vs-10", handCategory: "pair", pairRank: "8", dealerRank: "10", source: "warm-up", note: "The split that feels wrong until it becomes automatic.", weight: 1 },
  { id: "starter-pair-9-vs-7", handCategory: "pair", pairRank: "9", dealerRank: "7", source: "warm-up", note: "A close pair decision that sharpens recognition.", weight: 1 },
  { id: "starter-pair-a-vs-6", handCategory: "pair", pairRank: "A", dealerRank: "6", source: "warm-up", note: "A high-confidence pattern every player should know cold.", weight: 1 },
];

const COVERAGE_BLUEPRINTS: ScenarioBlueprint[] = [
  { id: "coverage-hard-15-vs-10", handCategory: "hard", playerTotal: 15, dealerRank: "10", source: "coverage", note: "Keeps hard total pressure spots in rotation.", weight: 1 },
  { id: "coverage-hard-10-vs-9", handCategory: "hard", playerTotal: 10, dealerRank: "9", source: "coverage", note: "Reinforces the line between hit and double.", weight: 1 },
  { id: "coverage-soft-18-vs-a", handCategory: "soft", playerTotal: 18, dealerRank: "A", source: "coverage", note: "Soft hands need repetition against strong dealer cards.", weight: 1 },
  { id: "coverage-soft-19-vs-6", handCategory: "soft", playerTotal: 19, dealerRank: "6", source: "coverage", note: "Rule-sensitive soft total that builds nuance.", weight: 1 },
  { id: "coverage-pair-6-vs-2", handCategory: "pair", pairRank: "6", dealerRank: "2", source: "coverage", note: "Borderline pair spots expose shallow pattern memory.", weight: 1 },
  { id: "coverage-pair-4-vs-5", handCategory: "pair", pairRank: "4", dealerRank: "5", source: "coverage", note: "Useful for rule-aware pair practice.", weight: 1 },
];

// This function creates a guided drill session from saved decisions and fallback curriculum.
export function buildGuidedTrainingSession(
  decisions: DecisionRecord[],
  rules: GameRules,
): GuidedTrainingSession {
  const adaptiveBlueprints = getAdaptiveBlueprints(decisions, rules);

  if (adaptiveBlueprints.length === 0) {
    return {
      title: "Starter Session",
      description: "A guided warm-up covering high-value basic strategy patterns before you have enough history for adaptive drills.",
      scenarios: STARTER_BLUEPRINTS.map(buildScenarioFromBlueprint),
    };
  }

  return {
    title: "Guided Session",
    description: "A focused drill built from unresolved mistakes, repeated leaks, and a small amount of coverage to keep your pattern recognition broad.",
    scenarios: adaptiveBlueprints.map(buildScenarioFromBlueprint),
  };
}

// This function summarizes how much guidance is coming from review versus general coverage.
function getAdaptiveBlueprints(decisions: DecisionRecord[], rules: GameRules): ScenarioBlueprint[] {
  const unresolvedDecisions = getOutstandingReviewDecisions(decisions, rules);
  const blueprintByKey = new Map<string, ScenarioBlueprint>();

  for (const decision of unresolvedDecisions.slice(0, 4)) {
    const blueprint = createBlueprintFromDecision(decision, "review", 6, "Unresolved miss. Repeat it until the choice feels obvious.");
    blueprintByKey.set(blueprint.id, blueprint);
  }

  const mistakeCounts = new Map<string, { count: number; latest: DecisionRecord }>();

  for (const decision of decisions) {
    if (decision.wasCorrect) {
      continue;
    }

    const key = getDecisionScenarioKey(decision, rules);
    const existingValue = mistakeCounts.get(key);

    if (!existingValue) {
      mistakeCounts.set(key, { count: 1, latest: decision });
      continue;
    }

    mistakeCounts.set(key, {
      count: existingValue.count + 1,
      latest: existingValue.latest.timestamp > decision.timestamp ? existingValue.latest : decision,
    });
  }

  for (const { count, latest } of Array.from(mistakeCounts.values()).sort((leftItem, rightItem) => rightItem.count - leftItem.count)) {
    const blueprint = createBlueprintFromDecision(
      latest,
      "weak-spot",
      Math.min(5, count + 1),
      count > 1 ? `You have missed this shape ${count} times recently.` : "Recent miss worth revisiting before it becomes a habit.",
    );

    if (!blueprintByKey.has(blueprint.id)) {
      blueprintByKey.set(blueprint.id, blueprint);
    }
  }

  const selectedBlueprints = Array.from(blueprintByKey.values())
    .sort((leftItem, rightItem) => rightItem.weight - leftItem.weight)
    .slice(0, 6);

  const coveredCategories = new Set(selectedBlueprints.map((blueprint) => blueprint.handCategory));

  for (const coverageBlueprint of COVERAGE_BLUEPRINTS) {
    if (selectedBlueprints.length >= 8) {
      break;
    }

    const needsCategoryCoverage = !coveredCategories.has(coverageBlueprint.handCategory);
    const isDuplicate = selectedBlueprints.some((blueprint) => blueprint.id === coverageBlueprint.id);

    if (isDuplicate) {
      continue;
    }

    if (needsCategoryCoverage || selectedBlueprints.length < 7) {
      selectedBlueprints.push(coverageBlueprint);
      coveredCategories.add(coverageBlueprint.handCategory);
    }
  }

  if (selectedBlueprints.length === 0) {
    return [];
  }

  return selectedBlueprints.slice(0, 8);
}

// This function converts a saved decision into a reusable guided scenario blueprint.
function createBlueprintFromDecision(
  decision: DecisionRecord,
  source: GuidedTrainingScenario["source"],
  weight: number,
  note: string,
): ScenarioBlueprint {
  const pairRank =
    decision.handCategory === "pair" && decision.playerHand[0]
      ? normalizeRankBucket(getRankBucket(decision.playerHand[0].rank))
      : undefined;

  return {
    id: getDecisionScenarioKey(decision, decision.rulesSnapshot),
    handCategory: decision.handCategory,
    playerTotal: decision.handCategory === "pair" ? undefined : decision.playerTotal,
    pairRank,
    dealerRank: normalizeRankBucket(getRankBucket(decision.dealerUpcard.rank)),
    source,
    note,
    weight,
  };
}

// This function materializes a guided blueprint into concrete cards and display metadata.
function buildScenarioFromBlueprint(blueprint: ScenarioBlueprint): GuidedTrainingScenario {
  const playerCards = buildPlayerCards(blueprint);
  const dealerUpcard = makeCard(blueprint.dealerRank, "spades");

  return {
    id: blueprint.id,
    hand: createHand(playerCards),
    dealerUpcard,
    handLabel: getScenarioHandLabel(blueprint),
    focusLabel: getFocusLabel(blueprint.source),
    source: blueprint.source,
    note: blueprint.note,
  };
}

// This function returns the display copy used for the current scenario tag.
function getFocusLabel(source: GuidedTrainingScenario["source"]): string {
  if (source === "review") {
    return "Needs review";
  }

  if (source === "weak-spot") {
    return "Weak spot";
  }

  if (source === "coverage") {
    return "Coverage";
  }

  return "Warm-up";
}

// This function formats a compact hand label for the guided drill UI.
function getScenarioHandLabel(blueprint: ScenarioBlueprint): string {
  if (blueprint.handCategory === "pair") {
    return `Pair ${blueprint.pairRank} vs ${blueprint.dealerRank}`;
  }

  return `${capitalize(blueprint.handCategory)} ${blueprint.playerTotal} vs ${blueprint.dealerRank}`;
}

// This function builds representative cards for hard, soft, and pair scenarios.
function buildPlayerCards(blueprint: ScenarioBlueprint): Card[] {
  if (blueprint.handCategory === "pair" && blueprint.pairRank) {
    return [makeCard(blueprint.pairRank, "hearts"), makeCard(blueprint.pairRank, "diamonds")];
  }

  if (blueprint.handCategory === "soft" && blueprint.playerTotal) {
    const secondRank = getRankForValue(blueprint.playerTotal - 11);
    return [makeCard("A", "hearts"), makeCard(secondRank, "diamonds")];
  }

  if (!blueprint.playerTotal) {
    return [makeCard("10", "hearts"), makeCard("2", "diamonds")];
  }

  return buildHardTotalCards(blueprint.playerTotal);
}

// This function creates representative hard totals without accidentally generating pairs or soft hands.
function buildHardTotalCards(total: number): Card[] {
  const hardTotalTemplates: Record<number, Rank[]> = {
    5: ["2", "3"],
    6: ["2", "4"],
    7: ["2", "5"],
    8: ["2", "6"],
    9: ["2", "7"],
    10: ["2", "8"],
    11: ["2", "9"],
    12: ["10", "2"],
    13: ["10", "3"],
    14: ["10", "4"],
    15: ["10", "5"],
    16: ["10", "6"],
    17: ["10", "7"],
    18: ["10", "8"],
    19: ["10", "9"],
    20: ["10", "6", "4"],
    21: ["10", "6", "5"],
  };

  const ranks = hardTotalTemplates[total] ?? ["10", "2"];

  return ranks.map((rank, index) => makeCard(rank, index % 2 === 0 ? "hearts" : "diamonds"));
}

// This function converts a value back into a non-face rank for soft-hand templates.
function getRankForValue(value: number): Rank {
  const rankByValue: Record<number, Rank> = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
  };

  return rankByValue[value] ?? "9";
}

// This function creates a simple card object without any presentation-specific state.
function makeCard(rank: Rank, suit: Card["suit"]): Card {
  return { rank, suit };
}

// This function normalizes rank buckets such as "10" into the Rank type.
function normalizeRankBucket(rankBucket: string): Rank {
  if (rankBucket === "A") {
    return "A";
  }

  return rankBucket as Rank;
}

// This function capitalizes category copy for UI labels.
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// This file stores blackjack rule defaults, descriptions, and simple validation helpers.

import type { GameRules } from "@/lib/types";

export const DEFAULT_RULES: GameRules = {
  numDecks: 6,
  dealerHitsSoft17: true,
  blackjackPayout: "3:2",
  doubleAfterSplit: true,
  resplitAllowed: true,
};

export const RULE_DESCRIPTIONS: Record<keyof GameRules, string> = {
  numDecks:
    "More decks usually help the house slightly. Six decks is common in casinos and a realistic training baseline.",
  dealerHitsSoft17:
    "Hitting soft 17 is worse for the player. Prefer tables where the dealer stands on soft 17 when you can.",
  blackjackPayout:
    "Always play 3:2 tables when possible. A 6:5 payout meaningfully increases the house edge.",
  doubleAfterSplit:
    "Double after split is better for the player and changes some pair-splitting recommendations.",
  resplitAllowed:
    "Resplitting gives you more flexibility when pairs appear again after a split, which is slightly better for the player.",
};

const ALLOWED_DECK_COUNTS = new Set([1, 2, 4, 6, 8]);

// This function checks whether a rules object is valid enough for the app to use safely.
export function isValidRules(candidate: unknown): candidate is GameRules {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const rules = candidate as GameRules;

  return (
    ALLOWED_DECK_COUNTS.has(rules.numDecks) &&
    typeof rules.dealerHitsSoft17 === "boolean" &&
    (rules.blackjackPayout === "3:2" || rules.blackjackPayout === "6:5") &&
    typeof rules.doubleAfterSplit === "boolean" &&
    typeof rules.resplitAllowed === "boolean"
  );
}

// This function returns a safe rules object, falling back to defaults when input is invalid.
export function sanitizeRules(candidate: unknown): GameRules {
  if (!isValidRules(candidate)) {
    return DEFAULT_RULES;
  }

  return {
    numDecks: candidate.numDecks,
    dealerHitsSoft17: candidate.dealerHitsSoft17,
    blackjackPayout: candidate.blackjackPayout,
    doubleAfterSplit: candidate.doubleAfterSplit,
    resplitAllowed: candidate.resplitAllowed,
  };
}

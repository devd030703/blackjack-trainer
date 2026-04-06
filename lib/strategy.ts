// This file contains a lookup-table basic strategy engine and user-facing explanations.

import type {
  Card,
  GameRules,
  Hand,
  HandCategory,
  PlayerAction,
  StrategyAdvice,
} from "@/lib/types";
import {
  canDouble,
  getHandCategory,
  getRankBucket,
  isPair,
} from "@/lib/blackjack";
import { getRecommendationStrength } from "@/lib/probability";

type DealerKey = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";
type PairKey = "A" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";
type HardTotalKey = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;
type SoftTotalKey = 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

const HARD_TABLE: Record<HardTotalKey, Record<DealerKey, PlayerAction>> = {
  5: makeActionRow("hit"),
  6: makeActionRow("hit"),
  7: makeActionRow("hit"),
  8: makeActionRow("hit"),
  9: { "2": "hit", "3": "double", "4": "double", "5": "double", "6": "double", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  10: { "2": "double", "3": "double", "4": "double", "5": "double", "6": "double", "7": "double", "8": "double", "9": "double", "10": "hit", A: "hit" },
  11: { "2": "double", "3": "double", "4": "double", "5": "double", "6": "double", "7": "double", "8": "double", "9": "double", "10": "double", A: "double" },
  12: { "2": "hit", "3": "hit", "4": "stand", "5": "stand", "6": "stand", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  13: { "2": "stand", "3": "stand", "4": "stand", "5": "stand", "6": "stand", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  14: { "2": "stand", "3": "stand", "4": "stand", "5": "stand", "6": "stand", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  15: { "2": "stand", "3": "stand", "4": "stand", "5": "stand", "6": "stand", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  16: { "2": "stand", "3": "stand", "4": "stand", "5": "stand", "6": "stand", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  17: makeStandRow(),
  18: makeStandRow(),
  19: makeStandRow(),
  20: makeStandRow(),
  21: makeStandRow(),
};

const SOFT_TABLE_H17: Record<SoftTotalKey, Record<DealerKey, PlayerAction>> = {
  13: { "2": "hit", "3": "hit", "4": "double", "5": "double", "6": "double", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  14: { "2": "hit", "3": "hit", "4": "double", "5": "double", "6": "double", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  15: { "2": "hit", "3": "hit", "4": "double", "5": "double", "6": "double", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  16: { "2": "hit", "3": "hit", "4": "double", "5": "double", "6": "double", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  17: { "2": "hit", "3": "double", "4": "double", "5": "double", "6": "double", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  18: { "2": "double", "3": "double", "4": "double", "5": "double", "6": "double", "7": "stand", "8": "stand", "9": "hit", "10": "hit", A: "hit" },
  19: { "2": "stand", "3": "stand", "4": "stand", "5": "stand", "6": "double", "7": "stand", "8": "stand", "9": "stand", "10": "stand", A: "stand" },
  20: makeStandRow(),
};

const SOFT_TABLE_S17: Record<SoftTotalKey, Record<DealerKey, PlayerAction>> = {
  ...SOFT_TABLE_H17,
  18: { "2": "stand", "3": "double", "4": "double", "5": "double", "6": "double", "7": "stand", "8": "stand", "9": "hit", "10": "hit", A: "hit" },
  19: { "2": "stand", "3": "stand", "4": "stand", "5": "stand", "6": "stand", "7": "stand", "8": "stand", "9": "stand", "10": "stand", A: "stand" },
};

const PAIR_TABLE_DAS: Record<PairKey, Record<DealerKey, PlayerAction>> = {
  A: makeActionRow("split"),
  10: makeActionRow("stand"),
  9: { "2": "split", "3": "split", "4": "split", "5": "split", "6": "split", "7": "stand", "8": "split", "9": "split", "10": "stand", A: "stand" },
  8: makeActionRow("split"),
  7: { "2": "split", "3": "split", "4": "split", "5": "split", "6": "split", "7": "split", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  6: { "2": "split", "3": "split", "4": "split", "5": "split", "6": "split", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  5: { "2": "double", "3": "double", "4": "double", "5": "double", "6": "double", "7": "double", "8": "double", "9": "double", "10": "hit", A: "hit" },
  4: { "2": "hit", "3": "hit", "4": "hit", "5": "split", "6": "split", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  3: { "2": "split", "3": "split", "4": "split", "5": "split", "6": "split", "7": "split", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  2: { "2": "split", "3": "split", "4": "split", "5": "split", "6": "split", "7": "split", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
};

const PAIR_TABLE_NO_DAS: Record<PairKey, Record<DealerKey, PlayerAction>> = {
  ...PAIR_TABLE_DAS,
  6: { "2": "hit", "3": "split", "4": "split", "5": "split", "6": "split", "7": "hit", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  4: makeActionRow("hit"),
  3: { "2": "hit", "3": "hit", "4": "split", "5": "split", "6": "split", "7": "split", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
  2: { "2": "hit", "3": "hit", "4": "split", "5": "split", "6": "split", "7": "split", "8": "hit", "9": "hit", "10": "hit", A: "hit" },
};

// This function returns the best move for the given hand, dealer upcard, and rules.
export function getOptimalAction(
  playerHand: Hand,
  dealerUpcard: Card,
  rules: GameRules,
  isAfterSplit = false,
): StrategyAdvice {
  const dealerKey = normalizeDealerKey(dealerUpcard);
  const handCategory = getHandCategory(playerHand.cards);
  const rawAction = getLookupAction(playerHand, dealerKey, rules);
  const adjustedAction = applyTableConstraints(rawAction, playerHand, rules, isAfterSplit);

  return {
    optimalAction: adjustedAction,
    explanation: buildShortExplanation(playerHand, dealerKey, adjustedAction, handCategory),
    detailedExplanation: buildDetailedExplanation(
      playerHand,
      dealerKey,
      adjustedAction,
      handCategory,
      rules,
    ),
    confidence: getConfidenceLabel(getRecommendationStrength(playerHand, dealerUpcard, adjustedAction)),
    handCategory,
  };
}

// This function returns the pair, soft, or hard strategy action directly from the lookup tables.
function getLookupAction(
  playerHand: Hand,
  dealerKey: DealerKey,
  rules: GameRules,
): PlayerAction {
  if (isPair(playerHand.cards)) {
    const pairKey = getPairKey(playerHand.cards);
    const pairTable = rules.doubleAfterSplit ? PAIR_TABLE_DAS : PAIR_TABLE_NO_DAS;

    return pairTable[pairKey][dealerKey];
  }

  if (playerHand.isSoft && playerHand.cards.length === 2) {
    const softTotal = playerHand.value as SoftTotalKey;
    const softTable = rules.dealerHitsSoft17 ? SOFT_TABLE_H17 : SOFT_TABLE_S17;

    return softTable[softTotal]?.[dealerKey] ?? "stand";
  }

  const hardTotal = clampHardTotal(playerHand.value);
  return HARD_TABLE[hardTotal][dealerKey];
}

// This function applies rule-based fallbacks when the table says double or split but the move is unavailable.
function applyTableConstraints(
  action: PlayerAction,
  playerHand: Hand,
  rules: GameRules,
  isAfterSplit: boolean,
): PlayerAction {
  if (action === "double" && !canDouble(playerHand.cards, rules, isAfterSplit)) {
    return playerHand.isSoft ? "hit" : playerHand.value >= 17 ? "stand" : "hit";
  }

  if (action === "split" && (!isPair(playerHand.cards) || (isAfterSplit && !rules.resplitAllowed))) {
    return playerHand.value >= 17 ? "stand" : "hit";
  }

  return action;
}

// This function converts the recommendation strength number into a readable confidence label.
function getConfidenceLabel(strength: number): StrategyAdvice["confidence"] {
  if (strength >= 80) {
    return "strong";
  }

  if (strength >= 65) {
    return "moderate";
  }

  return "marginal";
}

// This function builds the short one-line coaching explanation shown in the UI.
function buildShortExplanation(
  playerHand: Hand,
  dealerKey: DealerKey,
  action: PlayerAction,
  handCategory: HandCategory,
): string {
  const total = playerHand.value;

  if (handCategory === "pair" && playerHand.cards[0] && playerHand.cards[1]) {
    const pairValue = getPairKey(playerHand.cards);

    if (pairValue === "A" || pairValue === "8") {
      return `Always split ${pairValue === "A" ? "aces" : "eights"} in this spot.`;
    }

    return `${capitalize(action)} this pair against dealer ${dealerKey}.`;
  }

  if (action === "double") {
    return `Double ${total} vs dealer ${dealerKey} to press your edge while you still can.`;
  }

  if (action === "stand" && total >= 17) {
    return `Stand on ${handCategory} ${total} because hitting creates more risk than value.`;
  }

  if (handCategory === "soft" && action === "hit") {
    return `Hit soft ${total} because you still have room to improve safely.`;
  }

  return `${capitalize(action)} ${handCategory} ${total} against dealer ${dealerKey}.`;
}

// This function builds a longer coaching explanation that teaches the theory behind the move.
function buildDetailedExplanation(
  playerHand: Hand,
  dealerKey: DealerKey,
  action: PlayerAction,
  handCategory: HandCategory,
  rules: GameRules,
): string {
  const total = playerHand.value;

  if (handCategory === "pair") {
    const pairValue = getPairKey(playerHand.cards);

    if (pairValue === "A") {
      return "Splitting aces gives each ace a fresh start and turns one awkward hand into two strong chances to make 19, 20, or 21. Keeping them together wastes the flexibility of the ace.";
    }

    if (pairValue === "8") {
      return "A hard 16 is one of the weakest totals in blackjack, so splitting eights breaks a bad hand into two better starting points. Even against strong dealer cards, two hands starting from 8 are usually better than one stuck on 16.";
    }

    if (pairValue === "10") {
      return "A pair of tens already makes 20, which is one of the strongest hands you can hold. Splitting throws away a made hand to chase variance you do not need.";
    }

    return `${capitalize(action)} is best for this pair because the dealer's ${dealerKey} changes whether splitting creates extra value. This recommendation also respects your current table rules, including whether double after split is allowed: ${rules.doubleAfterSplit ? "it is allowed here" : "it is not allowed here"}.`;
  }

  if (action === "double") {
    return `Doubling works best when your ${handCategory} ${total} is likely ahead or easy to improve with exactly one card. Dealer ${dealerKey} is weak enough that increasing your bet before the dealer finishes the hand captures more value than a normal hit.`;
  }

  if (action === "stand") {
    return `Standing protects a total that is already competitive or too fragile to improve safely. Against dealer ${dealerKey}, letting the dealer complete their hand is better than taking a card that often lowers your expectation.`;
  }

  if (action === "hit") {
    return `Hitting is best because your current ${handCategory} ${total} is not strong enough to coast to showdown. Taking another card improves your average outcome more often than standing still, even if the spot feels uncomfortable.`;
  }

  return "Splitting creates two separate hands, which can convert one mediocre position into two better scoring opportunities. In basic strategy, this move is chosen only when the long-run value beats hitting or standing.";
}

// This function creates a row where every dealer upcard maps to the same action.
function makeActionRow(action: PlayerAction): Record<DealerKey, PlayerAction> {
  return {
    "2": action,
    "3": action,
    "4": action,
    "5": action,
    "6": action,
    "7": action,
    "8": action,
    "9": action,
    "10": action,
    A: action,
  };
}

// This function creates a row where every dealer upcard maps to stand.
function makeStandRow(): Record<DealerKey, PlayerAction> {
  return makeActionRow("stand");
}

// This function converts the dealer upcard into the strategy table key.
function normalizeDealerKey(dealerUpcard: Card): DealerKey {
  return getRankBucket(dealerUpcard.rank) as DealerKey;
}

// This function returns the normalized pair label used in the pair lookup table.
function getPairKey(cards: Card[]): PairKey {
  const cardRank = getRankBucket(cards[0].rank);

  if (cardRank === "A") {
    return "A";
  }

  return cardRank as PairKey;
}

// This function keeps hard totals inside the explicit range of the lookup table.
function clampHardTotal(total: number): HardTotalKey {
  if (total <= 5) {
    return 5;
  }

  if (total >= 21) {
    return 21;
  }

  return total as HardTotalKey;
}

// This function capitalizes the first letter of an action for display text.
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// This file contains approachable blackjack probability helpers for coaching panels.

import type { Card, Hand, PlayerAction } from "@/lib/types";
import { getHandCategory, getHandValue, getRankBucket } from "@/lib/blackjack";

const BUST_PROBABILITIES: Record<number, number> = {
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 31,
  13: 39,
  14: 46,
  15: 54,
  16: 62,
  17: 69,
  18: 77,
  19: 85,
  20: 92,
  21: 100,
};

const DEALER_BUST_PROBABILITIES: Record<string, number> = {
  "2": 35,
  "3": 37,
  "4": 40,
  "5": 42,
  "6": 42,
  "7": 26,
  "8": 24,
  "9": 23,
  "10": 21,
  A: 17,
};

// This function returns the chance of busting if the player takes one more card.
export function getBustProbability(handValue: number): number {
  if (handValue <= 11) {
    return 0;
  }

  if (handValue >= 21) {
    return 100;
  }

  return BUST_PROBABILITIES[handValue] ?? 0;
}

// This function returns a practical dealer bust estimate based on the upcard only.
export function getDealerBustProbability(dealerUpcard: Card): number {
  return DEALER_BUST_PROBABILITIES[getRankBucket(dealerUpcard.rank)] ?? 0;
}

// This function returns a 0-100 score showing how clear-cut the recommended move is.
export function getRecommendationStrength(
  playerHand: Hand,
  dealerUpcard: Card,
  optimalAction: PlayerAction,
): number {
  const dealerKey = getRankBucket(dealerUpcard.rank);
  const handCategory = getHandCategory(playerHand.cards);
  const playerTotal = getHandValue(playerHand.cards).value;

  // These special spots are famous because the right move is thin or emotionally uncomfortable.
  const marginalScenarioKeys = new Set([
    "hard-12-2",
    "hard-12-3",
    "hard-16-10",
    "hard-15-10",
    "soft-18-9",
    "soft-18-A",
    "pair-9-7",
  ]);

  const strongScenarioKeys = new Set([
    "pair-A-A",
    "pair-8-10",
    "pair-8-A",
    "hard-11-6",
    "hard-10-6",
    "hard-17-10",
    "soft-17-6",
  ]);

  let scenarioValue: string | number = playerTotal;

  if (handCategory === "pair") {
    scenarioValue = getRankBucket(playerHand.cards[0].rank);
  }

  const scenarioKey = `${handCategory}-${scenarioValue}-${dealerKey}`;

  if (strongScenarioKeys.has(scenarioKey)) {
    return 92;
  }

  if (marginalScenarioKeys.has(scenarioKey)) {
    return 58;
  }

  if (optimalAction === "split" || optimalAction === "double") {
    return 82;
  }

  if (optimalAction === "stand" && playerTotal >= 17) {
    return 88;
  }

  return 72;
}

// This function returns a plain-English explanation for the probability panel.
export function getProbabilityReasoning(
  playerHand: Hand,
  dealerUpcard: Card,
  optimalAction: PlayerAction,
): string {
  const dealerKey = getRankBucket(dealerUpcard.rank);
  const handValue = getHandValue(playerHand.cards).value;
  const handCategory = getHandCategory(playerHand.cards);

  if (handCategory === "soft" && handValue <= 18) {
    return "You cannot bust as easily from this soft hand, so improving has real upside.";
  }

  if (dealerKey === "5" || dealerKey === "6") {
    return "Dealer showing a weak upcard is under heavy bust pressure, so forcing them to play can be valuable.";
  }

  if (handValue >= 17 && optimalAction === "stand") {
    return "Your total is already strong enough that taking another card usually creates more risk than reward.";
  }

  if (handValue === 16 && dealerKey === "10") {
    return "Hard 16 versus 10 is one of blackjack's toughest spots, and the edge between options is thin.";
  }

  if (optimalAction === "double") {
    return "This is a high-leverage spot where one more card often gives you the best chance to finish ahead.";
  }

  return "The recommendation balances your bust risk against the dealer's pressure and likely finishing range.";
}

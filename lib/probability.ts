/**
 * lib/probability.ts
 *
 * Probability calculations displayed in the ProbabilityPanel.
 * These are pre-computed approximations based on standard blackjack mathematics.
 *
 * We use lookup tables (not runtime Monte Carlo simulation) to keep the app
 * fast and the code readable. The values are well-established in blackjack theory.
 */

import type { Card, Hand, StrategyAdvice, ProbabilityInfo } from './types'
import { getHandValue } from './blackjack'

// ─── Bust probability if player hits ─────────────────────────────────────────

/**
 * Pre-computed probability (%) of busting if the player hits,
 * indexed by current hand total.
 *
 * For example: if you have hard 16, there are 5 card values (6,7,8,9,10/J/Q/K)
 * that would make you bust out of 13 possible ranks. But 10-value cards appear
 * 4x as often (10,J,Q,K), so the actual bust probability is much higher.
 *
 * These are approximate values for a multi-deck shoe:
 */
const BUST_PROBABILITIES: Record<number, number> = {
  // Totals ≤11 can never bust on a single hit (max card = 10, giving 21)
  4:  0,
  5:  0,
  6:  0,
  7:  0,
  8:  0,
  9:  0,
  10: 0,
  11: 0,
  // At 12, only a 10-value card (J,Q,K,10) busts you: ~31%
  12: 31,
  // 13: 10,J,Q,K,A(as11→bust if already 13 with hard ace scenario)... ~38%
  13: 38,
  14: 46,
  15: 54,
  16: 62,
  17: 69,
  18: 77,
  19: 85,
  20: 92,
  21: 100,  // Already at 21 — any hit busts (well, you'd never hit 21)
}

/**
 * Returns the probability (0–100) of busting if the player hits.
 * Clamps to the range [0, 100].
 *
 * @param handValue - The player's current hand total
 * @returns Bust probability as a percentage (0–100)
 */
export function getBustProbability(handValue: number): number {
  if (handValue <= 11) return 0
  if (handValue >= 21) return 100
  return BUST_PROBABILITIES[handValue] ?? 0
}

// ─── Dealer bust probability by upcard ───────────────────────────────────────

/**
 * Estimated probability (%) that the dealer will bust, given their upcard.
 * These are computed assuming the dealer follows standard H17 rules and
 * basic strategy for completing their hand.
 *
 * The dealer shows bust tendencies strongly with 4, 5, 6 upcards (their
 * "bust cards") and much less with 7+ and especially 10/A (their "power cards").
 *
 * Source: standard blackjack simulation data for multi-deck H17 game
 */
const DEALER_BUST_BY_UPCARD: Record<string, number> = {
  '2': 35,   // Dealer with 2 is moderately likely to bust
  '3': 37,
  '4': 40,   // 4, 5, 6 are the "dealer bust cards" — best time to stand/double
  '5': 42,
  '6': 42,
  '7': 26,   // 7+ dealer is in solid shape; bust rate drops significantly
  '8': 24,
  '9': 23,
  '10': 21,  // 10/J/Q/K — dealer has strong starting position
  'J': 21,
  'Q': 21,
  'K': 21,
  'A': 17,   // Ace is dealer's strongest card; low bust rate + blackjack threat
}

/**
 * Returns the estimated probability (0–100) that the dealer will bust.
 *
 * @param upcard - The dealer's visible card
 * @returns Dealer bust probability as a percentage
 */
export function getDealerBustProbability(upcard: Card): number {
  return DEALER_BUST_BY_UPCARD[upcard.rank] ?? 25
}

// ─── Recommendation strength ──────────────────────────────────────────────────

/**
 * Maps strategy advice confidence to a numeric score (0–100).
 * Used for the progress bar in ProbabilityPanel.
 *
 * - strong (85–100):  Clear, well-established basic strategy
 * - moderate (60–80): Correct, but with some situational nuance
 * - marginal (30–55): Very close call — experts may debate this
 */
export function getRecommendationStrength(advice: StrategyAdvice): number {
  switch (advice.confidence) {
    case 'strong':   return 88
    case 'moderate': return 68
    case 'marginal': return 42
    default:         return 60
  }
}

// ─── Plain English reasoning ──────────────────────────────────────────────────

/**
 * Generates a context-sensitive reasoning sentence for the ProbabilityPanel.
 * This explains the situation in plain English before the player acts.
 *
 * @param playerTotal - Player's current hand value
 * @param isSoft - Whether the player has a soft hand
 * @param dealerUpcard - The dealer's visible card
 * @param bustIfHit - Probability of busting if player hits
 * @param dealerBust - Probability of dealer busting
 * @returns A human-readable explanation of the situation
 */
function buildReasoning(
  playerTotal: number,
  isSoft: boolean,
  dealerUpcard: Card,
  bustIfHit: number,
  dealerBust: number
): string {
  const dealerRank = dealerUpcard.rank
  const isBustCard = ['4', '5', '6'].includes(dealerRank)
  const isPowerCard = ['10', 'J', 'Q', 'K', 'A'].includes(dealerRank)

  // Soft hand reasoning
  if (isSoft) {
    return `You can't bust hitting a soft hand — the ace drops from 11 to 1, giving you a free improvement shot.`
  }

  // Very safe hand
  if (playerTotal >= 18) {
    return `Hard ${playerTotal} is a strong hand. Any hit risks a bust — let the dealer play out.`
  }

  // Dealer bust card + standing hand
  if (isBustCard && playerTotal >= 13) {
    return `Dealer showing ${dealerRank} is under heavy bust pressure (${dealerBust}% bust rate) — stand and let them self-destruct.`
  }

  // Classic tough spot
  if (playerTotal === 16 && isPowerCard) {
    return `Hard 16 vs ${dealerRank} is one of the toughest spots — hitting is marginally better despite the ${bustIfHit}% bust risk.`
  }

  if (playerTotal === 15 && isPowerCard) {
    return `Hard 15 vs ${dealerRank} is painful. Bust risk is ${bustIfHit}% but the dealer's ${dealerRank} means you're likely losing either way.`
  }

  // Good doubling spot
  if (playerTotal <= 11 && bustIfHit === 0) {
    return `You can't bust! Hard ${playerTotal} — maximise by hitting or doubling if the spot is right.`
  }

  // Strong dealer + medium hand
  if (isPowerCard && playerTotal >= 13) {
    return `Dealer's ${dealerRank} is powerful. Bust risk is ${bustIfHit}% — hit to avoid standing on a total that loses to the dealer's likely 20.`
  }

  // Default
  return `Bust risk: ${bustIfHit}%. Dealer bust chance: ${dealerBust}%. Choose wisely.`
}

// ─── Combined probability info ────────────────────────────────────────────────

/**
 * Computes all probability information needed for the ProbabilityPanel
 * in one convenient call.
 *
 * @param playerHand - The player's current hand
 * @param dealerUpcard - The dealer's visible card
 * @param advice - The strategy advice (for recommendation strength)
 * @returns ProbabilityInfo object ready to pass to ProbabilityPanel
 */
export function getProbabilityInfo(
  playerHand: Hand,
  dealerUpcard: Card,
  advice: StrategyAdvice
): ProbabilityInfo {
  const { value: playerTotal, isSoft } = getHandValue(playerHand)

  const bustIfHit = getBustProbability(playerTotal)
  const dealerBustProbability = getDealerBustProbability(dealerUpcard)
  const recommendationStrength = getRecommendationStrength(advice)

  const reasoning = buildReasoning(
    playerTotal,
    isSoft,
    dealerUpcard,
    bustIfHit,
    dealerBustProbability
  )

  return {
    bustIfHit,
    dealerBustProbability,
    recommendationStrength,
    reasoning,
  }
}

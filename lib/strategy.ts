/**
 * lib/strategy.ts
 *
 * Complete basic strategy engine for blackjack.
 *
 * "Basic strategy" is the mathematically optimal way to play every possible
 * blackjack hand, computed from millions of simulations. Following it reduces
 * the house edge to around 0.5%.
 *
 * HOW IT WORKS:
 * We use three nested lookup tables (objects):
 *   - HARD_STRATEGY:  player hard total → dealer upcard → action
 *   - SOFT_STRATEGY:  player soft total → dealer upcard → action
 *   - PAIR_STRATEGY:  player pair rank  → dealer upcard → action
 *
 * Action codes used in the tables (single characters for compactness):
 *   H  = Hit
 *   S  = Stand
 *   D  = Double (if allowed; otherwise Hit)
 *   Ds = Double (if allowed; otherwise Stand)
 *   SP = Split
 *   Su = Surrender (if allowed; otherwise Hit)
 *   Ss = Surrender (if allowed; otherwise Stand)
 */

import type { Card, Hand, GameRules, PlayerAction, HandCategory, StrategyAdvice } from './types'
import { getHandValue, getHandCategory, isPair, isSoftHand, canDouble, canSplit } from './blackjack'

// ─── Strategy table action codes ─────────────────────────────────────────────

/**
 * Internal action codes used in the lookup tables.
 * These get resolved to actual PlayerAction values in getOptimalAction()
 * based on what the current rules allow.
 */
type RawAction = 'H' | 'S' | 'D' | 'Ds' | 'SP' | 'Su' | 'Ss'

// Dealer upcard columns (Tens, Jacks, Queens, Kings all map to '10')
// prettier-ignore
const UPCARDS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const
type Upcard = typeof UPCARDS[number]

// ─── Hard totals strategy table ───────────────────────────────────────────────

/**
 * Hard totals strategy.
 * Rows = player hard total (5 through 21)
 * Cols = dealer upcard (2 through A)
 *
 * Source: standard multi-deck basic strategy (suitable for 4-8 decks, H17/S17)
 */
// prettier-ignore
const HARD_STRATEGY: Record<number, Record<Upcard, RawAction>> = {
  //          2     3     4     5     6     7     8     9    10     A
  5:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  6:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  7:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  8:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  9:  { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  10: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  11: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'D','A':'D' },
  12: { '2':'H','3':'H','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  13: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  14: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'Su','A':'Su' },
  16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'Su','10':'Su','A':'Su' },
  17: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'Ss' },
  18: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  19: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
}

// ─── Soft totals strategy table ───────────────────────────────────────────────

/**
 * Soft totals strategy.
 * Rows = player soft total (13 = A+2 through 21 = A+10)
 * Cols = dealer upcard
 *
 * Note: soft 20 (A+9) and soft 21 (A+10/blackjack) always stand.
 */
// prettier-ignore
const SOFT_STRATEGY: Record<number, Record<Upcard, RawAction>> = {
  //          2     3     4     5     6     7     8     9    10     A
  13: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' }, // A+2
  14: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' }, // A+3
  15: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' }, // A+4
  16: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' }, // A+5
  17: { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' }, // A+6
  18: { '2':'Ds','3':'Ds','4':'Ds','5':'Ds','6':'Ds','7':'S','8':'S','9':'H','10':'H','A':'H' }, // A+7 (soft 18)
  19: { '2':'S','3':'S','4':'S','5':'S','6':'Ds','7':'S','8':'S','9':'S','10':'S','A':'S' }, // A+8
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' }, // A+9
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' }, // A+10 (blackjack)
}

// ─── Pair splitting strategy table ───────────────────────────────────────────

/**
 * Pair splitting strategy.
 * Rows = the rank of one of the two cards (e.g., '8' for a pair of 8s)
 * Cols = dealer upcard
 *
 * SP = split, H = don't split (hit), S = don't split (stand),
 * D = don't split (double), SPDs = split if DAS (double after split) allowed
 */
// prettier-ignore
const PAIR_STRATEGY: Record<string, Record<Upcard, RawAction>> = {
  //          2     3     4     5     6     7     8     9    10     A
  'A': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'SP','8':'SP','9':'SP','10':'SP','A':'SP' },
  '2': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'SP','8':'H', '9':'H', '10':'H', 'A':'H'  },
  '3': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'SP','8':'H', '9':'H', '10':'H', 'A':'H'  },
  '4': { '2':'H', '3':'H', '4':'H', '5':'SP','6':'SP','7':'H', '8':'H', '9':'H', '10':'H', 'A':'H'  },
  '5': { '2':'D', '3':'D', '4':'D', '5':'D', '6':'D', '7':'D', '8':'D', '9':'D', '10':'H', 'A':'H'  }, // Pair of 5s = hard 10, don't split
  '6': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'H', '8':'H', '9':'H', '10':'H', 'A':'H'  },
  '7': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'SP','8':'H', '9':'H', '10':'H', 'A':'H'  },
  '8': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'SP','8':'SP','9':'SP','10':'SP','A':'SP' },
  '9': { '2':'SP','3':'SP','4':'SP','5':'SP','6':'SP','7':'S', '8':'SP','9':'SP','10':'S', 'A':'S'  },
  '10':{ '2':'S', '3':'S', '4':'S', '5':'S', '6':'S', '7':'S', '8':'S', '9':'S', '10':'S', 'A':'S'  }, // 10/J/Q/K pair
  'J': { '2':'S', '3':'S', '4':'S', '5':'S', '6':'S', '7':'S', '8':'S', '9':'S', '10':'S', 'A':'S'  },
  'Q': { '2':'S', '3':'S', '4':'S', '5':'S', '6':'S', '7':'S', '8':'S', '9':'S', '10':'S', 'A':'S'  },
  'K': { '2':'S', '3':'S', '4':'S', '5':'S', '6':'S', '7':'S', '8':'S', '9':'S', '10':'S', 'A':'S'  },
}

// ─── Strategy explanations ────────────────────────────────────────────────────

/**
 * Short one-liner explanations for various strategy decisions.
 * These are keyed by scenario type for easy lookup.
 */

interface Explanation {
  explanation: string
  detailedExplanation: string
  confidence: 'strong' | 'moderate' | 'marginal'
}

/**
 * Generates a human-readable explanation for a strategy decision.
 * These are the messages shown in the CoachPanel.
 */
function buildExplanation(
  action: PlayerAction,
  handCategory: HandCategory,
  playerTotal: number,
  dealerUpcard: string,
  pairRank?: string
): Explanation {
  const dealerStr = dealerUpcard === 'A' ? 'Ace' : `${dealerUpcard}`

  // ── Pair explanations ─────────────────────────────────────────────────────
  if (handCategory === 'pair') {
    if (action === 'split') {
      if (pairRank === 'A') {
        return {
          explanation: 'Always split Aces — each ace is the start of a potential 21.',
          detailedExplanation:
            'Splitting aces gives you two chances to draw a 10-value card and make 21. The alternative (soft 12) is a weak hand. This is one of the strongest splits in blackjack regardless of dealer upcard.',
          confidence: 'strong',
        }
      }
      if (pairRank === '8') {
        return {
          explanation: 'Always split 8s — hard 16 is the worst hand in blackjack.',
          detailedExplanation:
            'A pair of 8s totalling 16 is the most miserable hand to play. Splitting gives you two chances to start fresh with 8 as your base. Even vs a dealer 10 or Ace, splitting is correct because hard 16 loses so often.',
          confidence: 'strong',
        }
      }
      if (pairRank === '5') {
        return {
          explanation: `Split 5s? Never — treat them as hard 10 and double vs ${dealerStr}.`,
          detailedExplanation:
            'Splitting 5s gives you two weak starting hands. Hard 10 is one of the best doubling hands in the game — you should capitalise on that instead of splitting.',
          confidence: 'strong',
        }
      }
      return {
        explanation: `Split ${pairRank}s vs dealer ${dealerStr} — dealer is under pressure.`,
        detailedExplanation:
          `Splitting here turns a mediocre hand into two potentially strong ones while the dealer is in a weak position. The split equity is higher than playing the original hand.`,
        confidence: 'moderate',
      }
    }
    // Don't split
    return {
      explanation: `Don't split ${pairRank}s vs ${dealerStr} — play as a ${playerTotal}.`,
      detailedExplanation:
        `Splitting ${pairRank}s here gives up equity compared to playing the hand as a normal ${playerTotal}. The dealer's upcard makes this the wrong spot for a split.`,
      confidence: 'moderate',
    }
  }

  // ── Soft hand explanations ────────────────────────────────────────────────
  if (handCategory === 'soft') {
    if (action === 'stand') {
      if (playerTotal >= 19) {
        return {
          explanation: `Stand on soft ${playerTotal} — this is a strong hand.`,
          detailedExplanation:
            `Soft 19+ is a winning hand in nearly all situations. There's no need to risk improving and accidentally ending up worse off. The ace acting as 11 already gives you a great total.`,
          confidence: 'strong',
        }
      }
      return {
        explanation: `Stand on soft ${playerTotal} vs ${dealerStr} — good enough here.`,
        detailedExplanation:
          `The dealer's upcard puts them in a moderate position and your soft ${playerTotal} is strong enough to stand on. Hitting risks turning this into a hard hand without sufficient gain.`,
        confidence: 'moderate',
      }
    }
    if (action === 'double') {
      return {
        explanation: `Double soft ${playerTotal} vs ${dealerStr} — dealer bust pressure is high.`,
        detailedExplanation:
          `With a soft hand, you cannot bust on your next card (an ace will convert from 11 to 1). Doubling down maximises profit when the dealer's ${dealerStr} puts them at high risk of busting. This is a textbook doubling opportunity.`,
        confidence: playerTotal <= 15 || playerTotal >= 19 ? 'moderate' : 'strong',
      }
    }
    // Hit
    return {
      explanation: `Hit soft ${playerTotal} — you can't bust and may improve significantly.`,
      detailedExplanation:
        `A soft hand cannot bust on the next card because the ace will simply drop from 11 to 1. Hitting gives you a free shot at improving to a stronger total. Soft ${playerTotal} is not strong enough to stand on here.`,
      confidence: 'strong',
    }
  }

  // ── Hard hand explanations ────────────────────────────────────────────────
  if (action === 'stand') {
    if (playerTotal >= 17) {
      return {
        explanation: `Stand on hard ${playerTotal} — any hit risks a bust.`,
        detailedExplanation:
          `Hard ${playerTotal} is strong enough that the bust risk of hitting outweighs the expected improvement. The strategy is to stand and hope the dealer busts or falls short of your total.`,
        confidence: 'strong',
      }
    }
    if (playerTotal >= 13 && parseInt(dealerUpcard) >= 2 && parseInt(dealerUpcard) <= 6) {
      return {
        explanation: `Stand on ${playerTotal} vs ${dealerStr} — let the dealer bust.`,
        detailedExplanation:
          `The dealer's ${dealerStr} is a bust card. With dealer upcards of 2–6, the dealer will bust roughly 35–42% of the time. Standing and letting the dealer bust is more profitable than risking your hand.`,
        confidence: 'strong',
      }
    }
    return {
      explanation: `Stand on hard ${playerTotal} vs ${dealerStr}.`,
      detailedExplanation:
        `Given the dealer's upcard and your total, standing produces better long-term results than hitting. The risk of busting is too high relative to the benefit.`,
      confidence: 'moderate',
    }
  }

  if (action === 'double') {
    if (playerTotal === 11) {
      return {
        explanation: `Double 11 vs ${dealerStr} — best doubling hand in the game.`,
        detailedExplanation:
          `Hard 11 is the strongest doubling hand. Any 10-value card (which makes up ~30% of the deck) gives you 21. Doubling maximises your profit in this high-expectation spot. Even vs an Ace, doubling is correct in multi-deck games.`,
        confidence: 'strong',
      }
    }
    if (playerTotal === 10) {
      return {
        explanation: `Double 10 vs ${dealerStr} — great doubling spot.`,
        detailedExplanation:
          `Hard 10 is one of the best doubling opportunities. You have a high probability of reaching 20 with one more card. The dealer's ${dealerStr} is weak enough to make this a profitable double.`,
        confidence: playerTotal === 10 && (dealerUpcard === '10' || dealerUpcard === 'A') ? 'moderate' : 'strong',
      }
    }
    return {
      explanation: `Double ${playerTotal} vs ${dealerStr} — dealer is under pressure.`,
      detailedExplanation:
        `Doubling here is profitable because the dealer's ${dealerStr} creates bust risk for them, and your ${playerTotal} is in a good spot to improve with one card. Getting extra money in now is the right play.`,
      confidence: 'moderate',
    }
  }

  if (action === 'surrender') {
    return {
      explanation: `Surrender hard ${playerTotal} vs ${dealerStr} — salvage half your bet.`,
      detailedExplanation:
        `Hard ${playerTotal} vs dealer ${dealerStr} is one of the worst spots in blackjack. The expected loss of playing is greater than 50%, so surrendering (losing only half your bet) is actually mathematically correct. This is called "late surrender."`,
      confidence: 'strong',
    }
  }

  // Hit (fallthrough)
  if (playerTotal <= 11) {
    return {
      explanation: `Hit ${playerTotal} — you can't bust with one card.`,
      detailedExplanation:
        `Any hand of 11 or less cannot bust from a single hit (the highest possible card value is 10, giving you 21). Always hit hands 11 or below.`,
      confidence: 'strong',
    }
  }
  return {
    explanation: `Hit hard ${playerTotal} vs ${dealerStr} — risk it for improvement.`,
    detailedExplanation:
      `Against the dealer's ${dealerStr}, standing on ${playerTotal} loses often enough that hitting is the better play despite the bust risk. The math favours taking another card here.`,
    confidence: playerTotal >= 15 && (dealerUpcard === '9' || dealerUpcard === '10' || dealerUpcard === 'A') ? 'moderate' : 'marginal',
  }
}

// ─── Helper: normalise dealer upcard ─────────────────────────────────────────

/**
 * Converts a card rank to the upcard key used in our strategy tables.
 * J, Q, K all count as 10 for strategy purposes.
 */
function normaliseDealerUpcard(rank: string): Upcard {
  if (['J', 'Q', 'K'].includes(rank)) return '10'
  return rank as Upcard
}

// ─── Helper: resolve raw action ───────────────────────────────────────────────

/**
 * Converts a raw table action code into a concrete PlayerAction
 * based on what the rules currently allow.
 *
 * @param raw - The raw action from the lookup table
 * @param cards - The player's current hand
 * @param rules - Current game rules
 * @returns A concrete PlayerAction
 */
function resolveAction(
  raw: RawAction,
  cards: Card[],
  rules: GameRules
): PlayerAction {
  switch (raw) {
    case 'H':
      return 'hit'
    case 'S':
      return 'stand'
    case 'D':
      // Double if allowed; otherwise hit
      return canDouble(cards, rules) ? 'double' : 'hit'
    case 'Ds':
      // Double if allowed; otherwise stand
      return canDouble(cards, rules) ? 'double' : 'stand'
    case 'SP':
      // Split if allowed; otherwise hit (caller should pass pair cards)
      return canSplit(cards, rules) ? 'split' : 'hit'
    case 'Su':
      // Surrender if allowed; otherwise hit
      return rules.surrenderAllowed ? 'surrender' : 'hit'
    case 'Ss':
      // Surrender if allowed; otherwise stand
      return rules.surrenderAllowed ? 'surrender' : 'stand'
    default:
      return 'hit'
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns the optimal strategy advice for a given player hand + dealer upcard.
 *
 * This is the primary function used throughout the app — by CoachPanel,
 * ScenarioDrill, MistakeReview, and ActionPanel (for the coach mode highlight).
 *
 * @param playerHand - Array of the player's current cards
 * @param dealerUpcard - The dealer's single visible card
 * @param rules - Current game rules (affects what actions are available)
 * @returns Full strategy advice including the optimal action and explanations
 */
export function getOptimalAction(
  playerHand: Hand,
  dealerUpcard: Card,
  rules: GameRules
): StrategyAdvice {
  const { value: playerTotal } = getHandValue(playerHand)
  const dealerKey = normaliseDealerUpcard(dealerUpcard.rank)
  const category = getHandCategory(playerHand)

  let rawAction: RawAction
  let pairRank: string | undefined

  // ── Pair lookup ─────────────────────────────────────────────────────────────
  if (category === 'pair') {
    pairRank = playerHand[0].rank
    const pairKey = ['J', 'Q', 'K'].includes(pairRank) ? '10' : pairRank
    const pairRow = PAIR_STRATEGY[pairKey]

    if (pairRow && pairRow[dealerKey]) {
      rawAction = pairRow[dealerKey]

      // If doubleAfterSplit is false and we'd split into a situation
      // requiring a double, we need to reconsider.
      // (This is handled at the hand level; the table already accounts for no-DAS
      // by using standard split decisions.)
    } else {
      // Fallback: treat as hard hand
      rawAction = HARD_STRATEGY[Math.min(playerTotal, 21)]?.[dealerKey] ?? 'H'
    }
  }
  // ── Soft lookup ─────────────────────────────────────────────────────────────
  else if (category === 'soft') {
    const softRow = SOFT_STRATEGY[Math.min(playerTotal, 21)]
    rawAction = softRow?.[dealerKey] ?? 'S'
  }
  // ── Hard lookup ─────────────────────────────────────────────────────────────
  else {
    const hardTotal = Math.min(playerTotal, 21)
    // Clamp to our table range (5–21); very low totals always hit
    const tableTotal = hardTotal < 5 ? 5 : hardTotal
    rawAction = HARD_STRATEGY[tableTotal]?.[dealerKey] ?? 'H'
  }

  // Resolve the raw action code into a concrete action given current rules
  const optimalAction = resolveAction(rawAction, playerHand, rules)

  // Build the explanation
  const expl = buildExplanation(
    optimalAction,
    category,
    playerTotal,
    dealerUpcard.rank,
    pairRank
  )

  return {
    optimalAction,
    explanation: expl.explanation,
    detailedExplanation: expl.detailedExplanation,
    confidence: expl.confidence,
    handCategory: category,
  }
}

/**
 * lib/blackjack.ts
 *
 * Core blackjack game logic — pure functions with no side effects.
 * "Pure" means these functions only look at their inputs and always
 * return the same output for the same input. No global state, no mutations.
 *
 * All hand arrays are treated as immutable: functions return new arrays
 * rather than modifying existing ones.
 */

import type { Card, Hand, Rank, Suit, HandCategory, GameRules } from './types'

// ─── Deck creation ────────────────────────────────────────────────────────────

/** All four suits */
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

/** All thirteen ranks */
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/**
 * Creates a shuffled deck (or shoe of multiple decks).
 *
 * @param numDecks - How many standard 52-card decks to combine (1, 2, 4, 6, or 8)
 * @returns A shuffled array of Card objects, ready to deal from
 */
export function createDeck(numDecks: number): Card[] {
  const cards: Card[] = []

  // Build numDecks worth of 52-card decks
  for (let deckIndex = 0; deckIndex < numDecks; deckIndex++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          suit,
          rank,
          faceUp: true,
          // Each card gets a unique ID so React can tell identical cards apart
          id: `${rank}_${suit}_${deckIndex}_${Math.random().toString(36).slice(2, 7)}`,
        })
      }
    }
  }

  // Fisher-Yates shuffle: walk backwards through the array, swapping each
  // card with a randomly chosen card at or before its position.
  // This gives a perfectly uniform random shuffle.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    // Swap cards[i] and cards[j]
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }

  return cards
}

// ─── Dealing ──────────────────────────────────────────────────────────────────

/**
 * Deals one card from the top of the deck.
 * Returns the card and the remaining deck as a new array (immutable approach).
 *
 * @param deck - Current deck array
 * @param faceUp - Whether the card should be dealt face-up (default: true)
 * @returns The dealt card and the remaining deck
 */
export function dealCard(
  deck: Card[],
  faceUp: boolean = true
): { card: Card; remainingDeck: Card[] } {
  if (deck.length === 0) {
    throw new Error('Cannot deal from an empty deck')
  }

  // Take from the end of the array (like taking from the top of a physical deck)
  const card = { ...deck[deck.length - 1], faceUp }
  const remainingDeck = deck.slice(0, deck.length - 1)

  return { card, remainingDeck }
}

// ─── Hand value calculation ───────────────────────────────────────────────────

/**
 * Returns the numeric value of a single card rank.
 * Aces return 11 initially; we'll adjust down to 1 if needed in getHandValue().
 * Face cards (J, Q, K) are worth 10.
 *
 * @param rank - The card rank
 * @returns The point value of the card
 */
function getCardValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  // For number cards, parse the string to an integer
  return parseInt(rank, 10)
}

/**
 * Calculates the best total for a hand, handling aces correctly.
 *
 * Aces start at 11. If the total would bust (>21) and there's an ace
 * counted as 11, we convert it to 1 (subtract 10) to avoid the bust.
 * We keep doing this until we're under 21 or there are no more 11-aces left.
 *
 * @param cards - Array of cards (only face-up cards count, but we calculate all)
 * @returns Object with the best total and whether an ace is counted as 11
 */
export function getHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  // Only consider face-up cards for value calculation
  // (the dealer's hole card is face-down and shouldn't be counted yet)
  const faceUpCards = cards.filter((card) => card.faceUp)

  let value = 0
  let aceCount = 0  // Track how many aces are currently counted as 11

  for (const card of faceUpCards) {
    value += getCardValue(card.rank)
    if (card.rank === 'A') {
      aceCount++
    }
  }

  // Convert aces from 11 to 1 (subtract 10) as needed to avoid busting
  while (value > 21 && aceCount > 0) {
    value -= 10   // Convert one ace from 11 to 1
    aceCount--    // One fewer ace counted as 11
  }

  // A "soft" hand has an ace counted as 11.
  // If aceCount > 0 here, at least one ace is still worth 11.
  return { value, isSoft: aceCount > 0 }
}

// ─── Hand checks ──────────────────────────────────────────────────────────────

/**
 * Returns true if the hand's total exceeds 21.
 *
 * @param cards - Array of cards in the hand
 * @returns True if the hand is a bust
 */
export function isBust(cards: Card[]): boolean {
  return getHandValue(cards).value > 21
}

/**
 * Returns true if this is a natural blackjack — exactly 2 cards totalling 21.
 * A blackjack after a split does NOT count as a natural blackjack.
 *
 * @param cards - Array of cards in the hand
 * @returns True if this is a natural blackjack
 */
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && getHandValue(cards).value === 21
}

/**
 * Returns true if the hand is "soft" — has an ace counted as 11.
 * Soft hands are important because you can hit without risk of busting
 * (the ace will just convert from 11 to 1).
 *
 * @param cards - Array of cards in the hand
 * @returns True if at least one ace is counted as 11
 */
export function isSoftHand(cards: Card[]): boolean {
  return getHandValue(cards).isSoft
}

/**
 * Returns true if the first two cards have the same rank.
 * Note: for strategy purposes, all 10-value cards (10, J, Q, K) can be
 * treated as a pair. However, strict pair splitting only allows same-rank splits
 * at many casinos. We check exact rank match here.
 *
 * @param cards - Array of cards in the hand
 * @returns True if the hand is a pair (first two cards match)
 */
export function isPair(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  return cards[0].rank === cards[1].rank
}

/**
 * Returns true if the hand consists of two 10-value cards (10/J/Q/K).
 * Some strategy charts treat any two 10-value cards as a "pair of tens."
 *
 * @param cards - Array of cards in the hand
 * @returns True if both cards are worth 10
 */
export function isTenValuePair(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const tenValues: Rank[] = ['10', 'J', 'Q', 'K']
  return tenValues.includes(cards[0].rank) && tenValues.includes(cards[1].rank)
}

/**
 * Determines which category a hand falls into for strategy lookup.
 * Check order matters: pairs first, then soft, then hard.
 *
 * @param cards - Array of cards in the hand
 * @returns 'pair', 'soft', or 'hard'
 */
export function getHandCategory(cards: Card[]): HandCategory {
  // Pair check: only on the initial two cards
  if (isPair(cards)) return 'pair'
  // Soft check: any hand with an ace counted as 11
  if (isSoftHand(cards)) return 'soft'
  // Everything else is a hard hand
  return 'hard'
}

// ─── Action eligibility ───────────────────────────────────────────────────────

/**
 * Returns true if the player is allowed to double down.
 * Standard rule: you can double on any two-card hand.
 * Some casinos restrict doubling to totals of 9, 10, or 11 only.
 * We implement the permissive rule (double on any two cards).
 *
 * @param cards - The player's current cards
 * @param rules - Current game rules
 * @returns True if doubling is allowed
 */
export function canDouble(cards: Card[], rules: GameRules): boolean {
  // Can only double on the initial two-card hand
  // (not after already hitting)
  return cards.length === 2
}

/**
 * Returns true if the player is allowed to split their hand.
 * Requirements:
 * - Exactly two cards of the same rank
 * - Rules allow it (resplitAllowed for subsequent splits)
 *
 * @param cards - The player's current cards
 * @param rules - Current game rules
 * @returns True if splitting is allowed
 */
export function canSplit(cards: Card[], rules: GameRules): boolean {
  return isPair(cards)
}

/**
 * Returns true if the dealer must take another card.
 * Implements both H17 (dealer hits soft 17) and S17 (dealer stands on all 17s).
 *
 * Standard rules: dealer hits on 16 or less, stands on hard 17+.
 * H17 rule: dealer also hits soft 17 (e.g., Ace+6).
 *
 * @param cards - The dealer's current cards
 * @param rules - Current game rules (specifically dealerHitsSoft17)
 * @returns True if the dealer must hit
 */
export function dealerShouldHit(cards: Card[], rules: GameRules): boolean {
  const { value, isSoft } = getHandValue(cards)

  // Dealer always hits on 16 or less
  if (value < 17) return true

  // At exactly 17: depends on H17/S17 rule
  if (value === 17) {
    // H17: dealer hits soft 17 (Ace counted as 11 in a 17)
    if (rules.dealerHitsSoft17 && isSoft) return true
    // S17: dealer stands on all 17s (both hard and soft)
    return false
  }

  // Dealer always stands on 18+
  return false
}

// ─── Scenario key generation ──────────────────────────────────────────────────

/**
 * Generates a short string key that uniquely identifies a scenario.
 * Used to track which specific situations the user gets wrong most.
 *
 * Examples: "H16v10" (Hard 16 vs dealer 10), "SA8v6" (Soft 18 vs dealer 6),
 * "P8v8" (Pair of 8s vs dealer 8)
 *
 * @param playerTotal - Numeric total of player's hand
 * @param category - hard, soft, or pair
 * @param dealerRank - The dealer's visible card rank
 * @param pairRank - The rank of the pair (only for pair hands)
 * @returns A short scenario key string
 */
export function getScenarioKey(
  playerTotal: number,
  category: HandCategory,
  dealerRank: string,
  pairRank?: string
): string {
  const dealerKey = dealerRank === '10' || dealerRank === 'J' || dealerRank === 'Q' || dealerRank === 'K'
    ? '10'
    : dealerRank

  if (category === 'pair' && pairRank) {
    return `P${pairRank}v${dealerKey}`
  }
  if (category === 'soft') {
    return `S${playerTotal}v${dealerKey}`
  }
  return `H${playerTotal}v${dealerKey}`
}

/**
 * lib/rules.ts
 *
 * Default game rules and human-readable descriptions for each rule.
 * The RulesSettings component uses RULE_DESCRIPTIONS to display explanations
 * in the settings panel so players understand what each rule means.
 */

import type { GameRules } from './types'

// ─── Default rules ────────────────────────────────────────────────────────────

/**
 * The most common casino rules you'll encounter.
 * These are used when the user hasn't configured anything yet.
 * 6-deck shoe with H17 is the most widespread Vegas configuration.
 */
export const DEFAULT_RULES: GameRules = {
  numDecks: 6,
  dealerHitsSoft17: true,     // H17 — slightly worse for player but very common
  blackjackPayout: '3:2',     // Always play 3:2 tables
  doubleAfterSplit: true,     // DAS — generally allowed in modern casinos
  resplitAllowed: true,       // Usually allowed
  surrenderAllowed: false,    // Late surrender not always offered
}

// ─── Rule descriptions ────────────────────────────────────────────────────────

/**
 * Human-readable info for each rule, displayed in the RulesSettings panel.
 * Each entry has:
 * - label: short display name
 * - effect: what this rule actually does
 * - playerImpact: whether this is good, bad, or neutral for the player
 */
export const RULE_DESCRIPTIONS: Record<
  keyof GameRules,
  { label: string; effect: string; playerImpact: 'better' | 'worse' | 'neutral' }
> = {
  numDecks: {
    label: 'Number of Decks',
    effect:
      'Fewer decks give the player a slight edge because there are more natural blackjacks relative to total cards. A single-deck game is best for the player; an 8-deck shoe is worst.',
    playerImpact: 'neutral', // depends on direction of change
  },
  dealerHitsSoft17: {
    label: 'Dealer Hits Soft 17 (H17)',
    effect:
      'When the dealer hits soft 17, they have more chances to improve a weak hand. This adds about 0.2% to the house edge compared to standing on soft 17 (S17). Look for tables that say "Dealer stands on all 17s".',
    playerImpact: 'worse',
  },
  blackjackPayout: {
    label: 'Blackjack Payout',
    effect:
      '3:2 pays $15 on a $10 bet. 6:5 pays only $12 on a $10 bet. The difference is enormous: 6:5 tables add ~1.4% to the house edge. Always play 3:2.',
    playerImpact: 'worse', // if 6:5 is selected
  },
  doubleAfterSplit: {
    label: 'Double After Split (DAS)',
    effect:
      'Allows you to double down on a hand that resulted from splitting a pair. This is a significant player advantage because it opens up more profitable spots, especially when splitting low pairs vs a dealer bust card.',
    playerImpact: 'better',
  },
  resplitAllowed: {
    label: 'Resplit Allowed',
    effect:
      'If you split a pair and then get another card of the same rank, you can split again. This is a small player advantage. Most casinos allow resplitting up to 3 or 4 hands.',
    playerImpact: 'better',
  },
  surrenderAllowed: {
    label: 'Late Surrender',
    effect:
      'Allows you to forfeit your hand after seeing the dealer\'s upcard and receive half your bet back. Best used on hard 15-16 vs dealer 9/10/A. Reduces the house edge by about 0.07% when used correctly.',
    playerImpact: 'better',
  },
}

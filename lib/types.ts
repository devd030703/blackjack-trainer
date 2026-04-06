/**
 * lib/types.ts
 *
 * Central type definitions for the entire app.
 * All other files import their types from here.
 * Having everything in one place makes it easy to understand the data shapes.
 */

// ─── Card primitives ────────────────────────────────────────────────────────

/** The four suits of a standard deck */
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'

/**
 * All possible card ranks.
 * Face cards (J, Q, K) are all worth 10 in blackjack.
 * Aces (A) are worth 1 or 11 depending on the hand.
 */
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

/** A single playing card */
export interface Card {
  suit: Suit
  rank: Rank
  /** Whether the card is face-up (visible) or face-down (hidden) */
  faceUp: boolean
  /**
   * Unique identifier for this specific card instance.
   * We need this so React can identify each card in a list without
   * confusing two cards that happen to have the same rank and suit.
   * Format: `${rank}_${suit}_${randomNumber}`
   */
  id: string
}

// ─── Hand ────────────────────────────────────────────────────────────────────

/**
 * A hand is simply an array of cards.
 * We compute hand value, bust status, etc. using the functions in blackjack.ts
 * rather than storing them directly on the hand.
 */
export type Hand = Card[]

// ─── Actions and categories ──────────────────────────────────────────────────

/**
 * The moves a player can make during their turn.
 * - hit: take another card
 * - stand: keep current hand, end turn
 * - double: double the bet, take exactly one more card, then stand
 * - split: split a pair into two separate hands
 * - surrender: give up half the bet and end the round (if rules allow)
 */
export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender'

/**
 * Which type of blackjack hand this is.
 * This determines which strategy table to look up.
 * - hard: no ace, or ace counted as 1
 * - soft: ace counted as 11
 * - pair: two cards of the same rank (eligible for splitting)
 */
export type HandCategory = 'hard' | 'soft' | 'pair'

// ─── App modes ───────────────────────────────────────────────────────────────

/**
 * The five modes of the app.
 * - play: standard game with coaching shown after each decision
 * - coach: like play, but the recommended move is highlighted BEFORE you decide
 * - drill: rapid-fire scenarios to practice without a full game loop
 * - review: replay your past mistakes
 * - stats: view your performance dashboard
 */
export type GameMode = 'play' | 'coach' | 'drill' | 'review' | 'stats'

/**
 * Which phase of the current hand we're in.
 * - idle: no hand in progress, waiting for user to start
 * - dealing: cards are being animated onto the table
 * - playerTurn: player is choosing their action
 * - dealerTurn: dealer is playing out their hand automatically
 * - result: hand is over, showing win/lose/push
 */
export type GamePhase = 'idle' | 'dealing' | 'playerTurn' | 'dealerTurn' | 'result'

// ─── Rules ───────────────────────────────────────────────────────────────────

/**
 * Configurable game rules.
 * These settings are saved to localStorage so they persist between sessions.
 * Different casinos use different rules, and they affect the optimal strategy.
 */
export interface GameRules {
  /** Number of decks in the shoe. More decks slightly favour the house. */
  numDecks: 1 | 2 | 4 | 6 | 8
  /**
   * H17 (true) = dealer hits soft 17. Slightly worse for the player.
   * S17 (false) = dealer stands on all 17s. Better for the player.
   */
  dealerHitsSoft17: boolean
  /**
   * Blackjack payout ratio.
   * Always play 3:2 tables. 6:5 significantly increases the house edge.
   */
  blackjackPayout: '3:2' | '6:5'
  /** Whether the player can double down after splitting a pair. */
  doubleAfterSplit: boolean
  /** Whether the player can split again after already splitting once. */
  resplitAllowed: boolean
  /** Whether the player can surrender (give up half the bet) on their first two cards. */
  surrenderAllowed: boolean
}

// ─── Strategy ────────────────────────────────────────────────────────────────

/**
 * The advice returned by the strategy engine for a given hand + dealer upcard.
 * This is what gets shown in the CoachPanel.
 */
export interface StrategyAdvice {
  /** The mathematically optimal action to take */
  optimalAction: PlayerAction
  /** Short one-liner explanation (always visible in CoachPanel) */
  explanation: string
  /** 2-3 sentence theory explanation (shown when user expands "Learn more") */
  detailedExplanation: string
  /**
   * How clear-cut this decision is.
   * - strong: basic strategy strongly recommends this, very low variance
   * - moderate: correct choice, but alternatives are not terrible
   * - marginal: extremely close call; even experts debate this spot
   */
  confidence: 'strong' | 'moderate' | 'marginal'
  /** Whether this was a hard, soft, or pair hand */
  handCategory: HandCategory
}

// ─── Probability ─────────────────────────────────────────────────────────────

/**
 * Probability information displayed in the ProbabilityPanel during the player's turn.
 */
export interface ProbabilityInfo {
  /** Percentage chance (0–100) that hitting will result in a bust */
  bustIfHit: number
  /** Percentage chance (0–100) that the dealer will bust */
  dealerBustProbability: number
  /** 0–100 score indicating how clear-cut the recommended action is */
  recommendationStrength: number
  /** Plain English sentence explaining the situation */
  reasoning: string
}

// ─── Decision records ────────────────────────────────────────────────────────

/**
 * A record of one player decision during a hand.
 * These are saved to localStorage so the user can review mistakes later.
 */
export interface DecisionRecord {
  /** Unique ID for this record (used as React key and for deduplication) */
  id: string
  /** Unix timestamp (ms) when the decision was made */
  timestamp: number
  /** The player's cards at the time of the decision */
  playerHand: Card[]
  /** The dealer's face-up card */
  dealerUpcard: Card
  /** What action the player actually took */
  playerAction: PlayerAction
  /** What the strategy engine says was optimal */
  optimalAction: PlayerAction
  /** True if playerAction === optimalAction */
  wasCorrect: boolean
  /** hard / soft / pair — which strategy table applies */
  handCategory: HandCategory
  /** The numeric total of the player's hand at decision time */
  playerTotal: number
}

// ─── Stats ───────────────────────────────────────────────────────────────────

/**
 * Aggregate performance statistics, saved to localStorage.
 */
export interface GameStats {
  /** Total completed hands (a hand = one round of blackjack) */
  totalHands: number
  /** Total individual decisions made (can be multiple per hand: hit, hit, stand) */
  totalDecisions: number
  /** How many decisions matched the optimal strategy */
  correctDecisions: number
  /** Breakdown of mistakes by hand category, for targeted practice */
  mistakesByCategory: {
    hard: number
    soft: number
    pair: number
  }
  /**
   * The last 200 decisions (trimmed on save).
   * Used for the recent performance timeline and mistake review.
   */
  recentDecisions: DecisionRecord[]
  /**
   * Keys of scenarios the user gets wrong most often.
   * Format: "H16v10" (Hard 16 vs dealer 10), "SA8v6", "P8v8", etc.
   * Used to surface targeted practice suggestions.
   */
  weakScenarios: string[]
}

// ─── Game state ───────────────────────────────────────────────────────────────

/**
 * The full state of an active blackjack hand.
 * This is the single source of truth managed in app/page.tsx.
 * All components read from this and call back up via handlers.
 */
export interface GameState {
  /** Which phase of the hand we're currently in */
  phase: GamePhase
  /** The player's current main hand (null when no hand is active) */
  playerHand: Hand | null
  /** The dealer's hand (null when no hand is active) */
  dealerHand: Hand | null
  /** The remaining cards in the shoe */
  deck: Card[]
  /** Current game rules (copied from user settings at hand start) */
  rules: GameRules
  /**
   * The strategy advice for the most recent decision.
   * Shown in CoachPanel after each player action, and used in
   * Coach mode to highlight the recommended button before the player acts.
   */
  lastAdvice: StrategyAdvice | null
  /** The most recently recorded decision (used to show ✅/❌ in CoachPanel) */
  lastDecision: DecisionRecord | null
  /**
   * Additional hands created after a split.
   * Index 0 is always the first split hand; the player plays through each
   * one sequentially before the dealer plays out.
   */
  splitHands: Hand[]
  /** Which split hand is currently being played (0-based index into splitHands) */
  currentSplitIndex: number
  /**
   * The outcome of the last completed hand.
   * Used to show the result overlay and determine payout.
   */
  result: 'win' | 'lose' | 'push' | 'blackjack' | 'bust' | null
}

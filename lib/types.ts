// This file defines the shared TypeScript types used across the blackjack trainer.

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
}

export interface Hand {
  cards: Card[];
  value: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export type PlayerAction = "hit" | "stand" | "double" | "split";
export type HandCategory = "hard" | "soft" | "pair";
export type GameMode = "play" | "coach" | "drill" | "exam" | "review";
export type DecisionMode = GameMode;
export type DecisionScenarioType = "hard-total" | "soft-total" | "pair";
export type GamePhase =
  | "idle"
  | "dealing"
  | "playerTurn"
  | "dealerTurn"
  | "result";

export interface GameRules {
  numDecks: number;
  dealerHitsSoft17: boolean;
  blackjackPayout: "3:2" | "6:5";
  doubleAfterSplit: boolean;
  resplitAllowed: boolean;
}

export interface StrategyAdvice {
  optimalAction: PlayerAction;
  explanation: string;
  detailedExplanation: string;
  confidence: "strong" | "moderate" | "marginal";
  handCategory: HandCategory;
}

export interface ProbabilityInfo {
  bustIfHit: number;
  dealerBustProbability: number;
  recommendationStrength: number;
  reasoning: string;
}

export interface DecisionRecord {
  id: string;
  timestamp: number;
  mode: DecisionMode;
  scenarioKey: string;
  scenarioType: DecisionScenarioType;
  playerHand: Card[];
  dealerUpcard: Card;
  playerAction: PlayerAction;
  optimalAction: PlayerAction;
  wasCorrect: boolean;
  responseTimeMs: number;
  usedHint: boolean;
  attemptNumber: number;
  isFirstExposure: boolean;
  isRepeatedMistake: boolean;
  previousExposureCount: number;
  previousMistakeCount: number;
  handCategory: HandCategory;
  playerTotal: number;
  isAfterSplit?: boolean;
  rulesSnapshot?: GameRules;
}

export interface GameStats {
  totalHands: number;
  totalDecisions: number;
  correctDecisions: number;
  mistakesByCategory: {
    hard: number;
    soft: number;
    pair: number;
  };
  recentDecisions: DecisionRecord[];
  weakScenarios: string[];
}

export interface GameState {
  phase: GamePhase;
  playerHand: Hand | null;
  dealerHand: Hand | null;
  deck: Card[];
  rules: GameRules;
  lastAdvice: StrategyAdvice | null;
  lastDecision: DecisionRecord | null;
  splitHands: Hand[];
  currentSplitIndex: number;
}

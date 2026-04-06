// This file contains reusable blackjack game logic for cards, hand values, and rule checks.

import type { Card, GameRules, Hand, HandCategory, Rank, Suit } from "@/lib/types";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// This function converts a card rank into its blackjack point value before ace adjustment.
export function getCardValue(rank: Rank): number {
  if (rank === "A") {
    return 11;
  }

  if (rank === "J" || rank === "Q" || rank === "K") {
    return 10;
  }

  return Number(rank);
}

// This function normalizes a rank into the value bucket used by strategy tables.
export function getRankBucket(rank: Rank): string {
  if (rank === "J" || rank === "Q" || rank === "K") {
    return "10";
  }

  return rank;
}

// This function shuffles a deck in place using the Fisher-Yates algorithm and returns it.
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffledDeck = [...deck];

  for (let currentIndex = shuffledDeck.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    const currentCard = shuffledDeck[currentIndex];

    shuffledDeck[currentIndex] = shuffledDeck[randomIndex];
    shuffledDeck[randomIndex] = currentCard;
  }

  return shuffledDeck;
}

// This function creates and shuffles a blackjack shoe using the requested number of decks.
export function createDeck(numDecks: number): Card[] {
  const freshDeck: Card[] = [];

  for (let deckIndex = 0; deckIndex < numDecks; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        freshDeck.push({ suit, rank });
      }
    }
  }

  return shuffleDeck(freshDeck);
}

// This function deals one card and returns both the card and the remaining deck.
export function dealCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  const nextCard = deck[0];

  if (!nextCard) {
    throw new Error("Cannot deal from an empty deck.");
  }

  return {
    card: nextCard,
    remainingDeck: deck.slice(1),
  };
}

// This function calculates a hand total and whether an ace is still being counted as 11.
export function getHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  let totalValue = 0;
  let acesCountedAsEleven = 0;

  for (const card of cards) {
    totalValue += getCardValue(card.rank);

    if (card.rank === "A") {
      acesCountedAsEleven += 1;
    }
  }

  // If the total is too high, convert aces from 11 down to 1 until the hand is safe or no soft ace remains.
  while (totalValue > 21 && acesCountedAsEleven > 0) {
    totalValue -= 10;
    acesCountedAsEleven -= 1;
  }

  return {
    value: totalValue,
    isSoft: acesCountedAsEleven > 0,
  };
}

// This function returns true when a hand total is above 21.
export function isBust(cards: Card[]): boolean {
  return getHandValue(cards).value > 21;
}

// This function returns true when the first two cards make a natural blackjack.
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && getHandValue(cards).value === 21;
}

// This function returns true when the hand contains an ace still counted as 11.
export function isSoftHand(cards: Card[]): boolean {
  return getHandValue(cards).isSoft;
}

// This function returns true when the first two cards have the same split value.
export function isPair(cards: Card[]): boolean {
  if (cards.length !== 2) {
    return false;
  }

  return getRankBucket(cards[0].rank) === getRankBucket(cards[1].rank);
}

// This function returns true when doubling is allowed for the current hand and rule set.
export function canDouble(cards: Card[], rules: GameRules, isAfterSplit = false): boolean {
  if (cards.length !== 2) {
    return false;
  }

  if (isAfterSplit && !rules.doubleAfterSplit) {
    return false;
  }

  return !isBlackjack(cards);
}

// This function returns true when splitting is allowed for the current hand and rule set.
export function canSplit(cards: Card[], rules: GameRules, splitCount = 0): boolean {
  if (!isPair(cards)) {
    return false;
  }

  if (splitCount === 0) {
    return true;
  }

  return rules.resplitAllowed;
}

// This function returns a label describing whether the hand is hard, soft, or a pair.
export function getHandCategory(cards: Card[]): HandCategory {
  if (isPair(cards)) {
    return "pair";
  }

  if (isSoftHand(cards)) {
    return "soft";
  }

  return "hard";
}

// This function returns true when the dealer must hit again under the current rules.
export function dealerShouldHit(cards: Card[], rules: GameRules): boolean {
  const handSummary = getHandValue(cards);

  if (handSummary.value < 17) {
    return true;
  }

  if (handSummary.value === 17 && handSummary.isSoft) {
    return rules.dealerHitsSoft17;
  }

  return false;
}

// This function builds the full Hand object used by the UI from a raw card array.
export function createHand(cards: Card[]): Hand {
  const handValue = getHandValue(cards);

  return {
    cards,
    value: handValue.value,
    isSoft: handValue.isSoft,
    isBust: handValue.value > 21,
    isBlackjack: isBlackjack(cards),
  };
}


"use client";

// This file renders the main blackjack table and owns the full play/coach hand loop.

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { Card } from "@/components/Card";
import { CoachPanel } from "@/components/CoachPanel";
import { ProbabilityPanel } from "@/components/ProbabilityPanel";
import {
  canDouble,
  canSplit,
  createDeck,
  createHand,
  dealCard,
  dealerShouldHit,
  getHandCategory,
  getHandValue,
} from "@/lib/blackjack";
import {
  getBustProbability,
  getDealerBustProbability,
  getProbabilityReasoning,
  getRecommendationStrength,
} from "@/lib/probability";
import { getOptimalAction } from "@/lib/strategy";
import type {
  Card as PlayingCard,
  DecisionRecord,
  GamePhase,
  GameRules,
  Hand,
  PlayerAction,
  ProbabilityInfo,
  StrategyAdvice,
} from "@/lib/types";

interface BlackjackTableProps {
  mode: "play" | "coach";
  rules: GameRules;
  onDecisionRecorded: (decision: DecisionRecord) => void;
  onHandCompleted: () => void;
}

interface PlayerSpot {
  cards: PlayingCard[];
  doubled: boolean;
  isAfterSplit: boolean;
  finished: boolean;
}

interface CoachFeedbackState {
  advice: StrategyAdvice;
  wasCorrect: boolean;
  handLabel: string;
}

interface HandOutcome {
  title: string;
  detail: string;
  tone: "win" | "loss" | "push" | "blackjack";
}

// This function takes one card from the shoe and reshuffles automatically when the shoe is empty.
function drawCardFromShoe(deck: PlayingCard[], rules: GameRules): { card: PlayingCard; remainingDeck: PlayingCard[] } {
  const safeDeck = deck.length === 0 ? createDeck(rules.numDecks) : deck;
  return dealCard(safeDeck);
}

// This function converts a player spot into the Hand shape used by the strategy and probability helpers.
function getSpotHand(spot: PlayerSpot): Hand {
  return createHand(spot.cards);
}

// This function creates the label shown in the coach panel for a specific hand.
function getHandLabel(cards: PlayingCard[]): string {
  const handCategory = getHandCategory(cards);
  const handValue = getHandValue(cards).value;

  if (handCategory === "pair") {
    return `Pair of ${cards[0].rank}s`;
  }

  return `${handCategory.charAt(0).toUpperCase() + handCategory.slice(1)} ${handValue}`;
}

// This function evaluates the final result for one player hand after the dealer finishes.
function evaluateHandOutcome(
  playerSpot: PlayerSpot,
  dealerCards: PlayingCard[],
  rules: GameRules,
): HandOutcome {
  const playerHand = getSpotHand(playerSpot);
  const dealerHand = createHand(dealerCards);
  const doubleText = playerSpot.doubled ? " Double-down stake applies." : "";
  const playerHasNaturalBlackjack = playerHand.isBlackjack && !playerSpot.isAfterSplit;

  if (playerHasNaturalBlackjack && dealerHand.isBlackjack) {
    return {
      title: "Push",
      detail: "Both sides have blackjack. Nobody wins this hand.",
      tone: "push",
    };
  }

  if (playerHasNaturalBlackjack) {
    return {
      title: "Blackjack",
      detail: `Natural blackjack pays ${rules.blackjackPayout}.${doubleText}`,
      tone: "blackjack",
    };
  }

  if (dealerHand.isBlackjack) {
    return {
      title: "Dealer blackjack",
      detail: `The dealer made a natural. This hand loses.${doubleText}`,
      tone: "loss",
    };
  }

  if (playerHand.isBust) {
    return {
      title: "Bust",
      detail: `You went over 21, so the hand is lost.${doubleText}`,
      tone: "loss",
    };
  }

  if (dealerHand.isBust) {
    return {
      title: "Win",
      detail: `Dealer busted, so your hand wins.${doubleText}`,
      tone: "win",
    };
  }

  if (playerHand.value > dealerHand.value) {
    return {
      title: "Win",
      detail: `Your ${playerHand.value} beats the dealer's ${dealerHand.value}.${doubleText}`,
      tone: "win",
    };
  }

  if (playerHand.value < dealerHand.value) {
    return {
      title: "Loss",
      detail: `Dealer ${dealerHand.value} beats your ${playerHand.value}.${doubleText}`,
      tone: "loss",
    };
  }

  return {
    title: "Push",
    detail: `Both sides finished on ${playerHand.value}.${doubleText}`,
    tone: "push",
  };
}

// This function builds the probability panel payload for the current player decision.
function buildProbabilityInfo(
  playerHand: Hand,
  dealerUpcard: PlayingCard,
  advice: StrategyAdvice,
): ProbabilityInfo {
  return {
    bustIfHit: playerHand.isSoft ? 0 : getBustProbability(playerHand.value),
    dealerBustProbability: getDealerBustProbability(dealerUpcard),
    recommendationStrength: getRecommendationStrength(playerHand, dealerUpcard, advice.optimalAction),
    reasoning: getProbabilityReasoning(playerHand, dealerUpcard, advice.optimalAction),
  };
}

// This function creates the DecisionRecord stored for stats and review mode.
function createDecisionRecord(
  playerHand: Hand,
  dealerUpcard: PlayingCard,
  playerAction: PlayerAction,
  advice: StrategyAdvice,
  rules: GameRules,
  isAfterSplit: boolean,
): DecisionRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    playerHand: playerHand.cards,
    dealerUpcard,
    playerAction,
    optimalAction: advice.optimalAction,
    wasCorrect: playerAction === advice.optimalAction,
    handCategory: advice.handCategory,
    playerTotal: playerHand.value,
    isAfterSplit,
    rulesSnapshot: rules,
  };
}

// This function finds the next unfinished player hand after the current split hand.
function getNextPlayableIndex(playerSpots: PlayerSpot[], currentIndex: number): number {
  for (let nextIndex = currentIndex + 1; nextIndex < playerSpots.length; nextIndex += 1) {
    if (!playerSpots[nextIndex].finished) {
      return nextIndex;
    }
  }

  return -1;
}

// This function renders the main table for play mode and coach mode.
export function BlackjackTable({
  mode,
  rules,
  onDecisionRecorded,
  onHandCompleted,
}: BlackjackTableProps) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [dealerCards, setDealerCards] = useState<PlayingCard[]>([]);
  const [playerSpots, setPlayerSpots] = useState<PlayerSpot[]>([]);
  const [activeSpotIndex, setActiveSpotIndex] = useState(0);
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedbackState | null>(null);
  const [flashState, setFlashState] = useState<"correct" | "incorrect" | null>(null);
  const [roundOutcomes, setRoundOutcomes] = useState<HandOutcome[]>([]);
  const [roundCounter, setRoundCounter] = useState(0);
  const [restartCounter, setRestartCounter] = useState(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const activeSpot = playerSpots[activeSpotIndex] ?? null;
  const activeHand = activeSpot ? getSpotHand(activeSpot) : null;
  const dealerUpcard = dealerCards[0] ?? null;

  const currentAdvice = useMemo(() => {
    if (!activeHand || !dealerUpcard) {
      return null;
    }

    return getOptimalAction(activeHand, dealerUpcard, rules, activeSpot?.isAfterSplit ?? false);
  }, [activeHand, dealerUpcard, rules, activeSpot?.isAfterSplit]);

  const probabilityInfo = useMemo(() => {
    if (!activeHand || !dealerUpcard || !currentAdvice) {
      return null;
    }

    return buildProbabilityInfo(activeHand, dealerUpcard, currentAdvice);
  }, [activeHand, dealerUpcard, currentAdvice]);

  // This effect clears any outstanding timeouts if the component unmounts.
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
    };
  }, []);

  // This effect starts a fresh hand when the table first appears, when rules change, or when the user requests one.
  useEffect(() => {
    startNewHand();
    // The new hand should intentionally restart when the rules change or when the user advances the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, restartCounter]);

  // This function stores a timeout id so we can clean it up later.
  function schedule(callback: () => void, delay: number) {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  // This function starts a brand-new blackjack round and deals two cards to each side.
  function startNewHand() {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }

    timersRef.current = [];
    setPhase("dealing");
    setCoachFeedback(null);
    setFlashState(null);
    setRoundOutcomes([]);
    setActiveSpotIndex(0);
    setRoundCounter((currentValue) => currentValue + 1);

    const workingDeck = deck.length < rules.numDecks * 13 ? createDeck(rules.numDecks) : deck;

    const firstPlayerDraw = drawCardFromShoe(workingDeck, rules);
    const firstDealerDraw = drawCardFromShoe(firstPlayerDraw.remainingDeck, rules);
    const secondPlayerDraw = drawCardFromShoe(firstDealerDraw.remainingDeck, rules);
    const secondDealerDraw = drawCardFromShoe(secondPlayerDraw.remainingDeck, rules);

    const nextPlayerSpots: PlayerSpot[] = [
      {
        cards: [firstPlayerDraw.card, secondPlayerDraw.card],
        doubled: false,
        isAfterSplit: false,
        finished: false,
      },
    ];

    const nextDealerCards = [firstDealerDraw.card, secondDealerDraw.card];

    setDeck(secondDealerDraw.remainingDeck);
    setPlayerSpots(nextPlayerSpots);
    setDealerCards(nextDealerCards);
    setPhase("playerTurn");

    const playerHand = getSpotHand(nextPlayerSpots[0]);
    const dealerHand = createHand(nextDealerCards);

    if (playerHand.isBlackjack || dealerHand.isBlackjack) {
      schedule(() => finalizeRound(nextPlayerSpots, nextDealerCards, secondDealerDraw.remainingDeck), 500);
    }
  }

  // This function exits the result overlay and immediately deals the next round.
  function handleNextHand() {
    setRestartCounter((currentValue) => currentValue + 1);
  }

  // This function records the coach feedback state after a player decision.
  function showDecisionFeedback(advice: StrategyAdvice, wasCorrect: boolean, cards: PlayingCard[]) {
    setCoachFeedback({
      advice,
      wasCorrect,
      handLabel: getHandLabel(cards),
    });

    setFlashState(wasCorrect ? "correct" : "incorrect");
    schedule(() => setFlashState(null), 650);
  }

  // This function hands control to the next split hand or to the dealer when the player is finished.
  function advanceTurn(nextPlayerSpots: PlayerSpot[], nextDeck: PlayingCard[]) {
    const nextPlayableIndex = getNextPlayableIndex(nextPlayerSpots, activeSpotIndex);

    setPlayerSpots(nextPlayerSpots);
    setDeck(nextDeck);

    if (nextPlayableIndex !== -1) {
      setActiveSpotIndex(nextPlayableIndex);
      setPhase("playerTurn");
      return;
    }

    startDealerTurn(nextPlayerSpots, dealerCards, nextDeck);
  }

  // This function lets the dealer reveal the hole card and draw until the rules say to stand.
  function startDealerTurn(
    finalPlayerSpots: PlayerSpot[],
    startingDealerCards: PlayingCard[],
    startingDeck: PlayingCard[],
  ) {
    setPhase("dealerTurn");

    const playDealer = (currentDealerCards: PlayingCard[], currentDeck: PlayingCard[]) => {
      if (!dealerShouldHit(currentDealerCards, rules)) {
        finalizeRound(finalPlayerSpots, currentDealerCards, currentDeck);
        return;
      }

      const nextDraw = drawCardFromShoe(currentDeck, rules);
      const nextDealerCards = [...currentDealerCards, nextDraw.card];

      setDealerCards(nextDealerCards);
      setDeck(nextDraw.remainingDeck);

      schedule(() => playDealer(nextDealerCards, nextDraw.remainingDeck), 420);
    };

    schedule(() => playDealer(startingDealerCards, startingDeck), 520);
  }

  // This function evaluates all hands, shows the result overlay, and records one completed round.
  function finalizeRound(
    finalPlayerSpots: PlayerSpot[],
    finalDealerCards: PlayingCard[],
    finalDeck: PlayingCard[],
  ) {
    setDealerCards(finalDealerCards);
    setDeck(finalDeck);
    setPlayerSpots(finalPlayerSpots.map((spot) => ({ ...spot, finished: true })));
    setRoundOutcomes(finalPlayerSpots.map((spot) => evaluateHandOutcome(spot, finalDealerCards, rules)));
    setPhase("result");
    onHandCompleted();
  }

  // This function applies one player action to the active hand and moves the round forward.
  function handleAction(action: PlayerAction) {
    if (phase !== "playerTurn" || !activeSpot || !activeHand || !dealerUpcard || !currentAdvice) {
      return;
    }

    const decisionRecord = createDecisionRecord(
      activeHand,
      dealerUpcard,
      action,
      currentAdvice,
      rules,
      activeSpot.isAfterSplit,
    );
    const nextPlayerSpots = [...playerSpots];
    const currentSpotCopy = { ...nextPlayerSpots[activeSpotIndex] };

    showDecisionFeedback(currentAdvice, decisionRecord.wasCorrect, currentSpotCopy.cards);
    onDecisionRecorded(decisionRecord);

    if (action === "stand") {
      currentSpotCopy.finished = true;
      nextPlayerSpots[activeSpotIndex] = currentSpotCopy;
      advanceTurn(nextPlayerSpots, deck);
      return;
    }

    if (action === "hit") {
      const nextDraw = drawCardFromShoe(deck, rules);
      currentSpotCopy.cards = [...currentSpotCopy.cards, nextDraw.card];
      nextPlayerSpots[activeSpotIndex] = currentSpotCopy;

      const updatedHand = getSpotHand(currentSpotCopy);
      setPlayerSpots(nextPlayerSpots);
      setDeck(nextDraw.remainingDeck);

      if (updatedHand.isBust || updatedHand.value === 21) {
        currentSpotCopy.finished = true;
        nextPlayerSpots[activeSpotIndex] = currentSpotCopy;
        schedule(() => advanceTurn(nextPlayerSpots, nextDraw.remainingDeck), 420);
      }

      return;
    }

    if (action === "double" && canDouble(currentSpotCopy.cards, rules, currentSpotCopy.isAfterSplit)) {
      const nextDraw = drawCardFromShoe(deck, rules);
      currentSpotCopy.cards = [...currentSpotCopy.cards, nextDraw.card];
      currentSpotCopy.doubled = true;
      currentSpotCopy.finished = true;
      nextPlayerSpots[activeSpotIndex] = currentSpotCopy;

      setPlayerSpots(nextPlayerSpots);
      setDeck(nextDraw.remainingDeck);
      schedule(() => advanceTurn(nextPlayerSpots, nextDraw.remainingDeck), 420);
      return;
    }

    if (action === "split" && canSplit(currentSpotCopy.cards, rules, playerSpots.length - 1)) {
      const leftCard = currentSpotCopy.cards[0];
      const rightCard = currentSpotCopy.cards[1];
      const leftDraw = drawCardFromShoe(deck, rules);
      const rightDraw = drawCardFromShoe(leftDraw.remainingDeck, rules);

      const replacementSpots: PlayerSpot[] = [
        {
          cards: [leftCard, leftDraw.card],
          doubled: false,
          isAfterSplit: true,
          finished: false,
        },
        {
          cards: [rightCard, rightDraw.card],
          doubled: false,
          isAfterSplit: true,
          finished: false,
        },
      ];

      nextPlayerSpots.splice(activeSpotIndex, 1, ...replacementSpots);
      setPlayerSpots(nextPlayerSpots);
      setDeck(rightDraw.remainingDeck);
      return;
    }
  }

  const dealerVisibleValue =
    phase === "playerTurn" && dealerCards.length >= 2 ? `${getHandValue([dealerCards[0]]).value}+` : createHand(dealerCards).value;

  return (
    <section className="space-y-6">
      {mode === "coach" ? (
        <div className="panel-shell border-[color:rgba(232,199,106,0.24)] bg-[linear-gradient(135deg,rgba(201,168,76,0.12),rgba(12,28,20,0.92))]">
          <p className="text-sm text-[var(--gold-light)]">
            Coach mode: recommended moves are highlighted before you act.
          </p>
        </div>
      ) : null}

      <div className="table-surface relative overflow-hidden rounded-[2.5rem] border border-[color:rgba(232,199,106,0.2)] p-5 sm:p-8">
        <div className="absolute inset-x-8 top-8 h-px bg-[linear-gradient(90deg,transparent,rgba(232,199,106,0.35),transparent)]" />
        <div className="absolute inset-x-8 bottom-8 h-px bg-[linear-gradient(90deg,transparent,rgba(232,199,106,0.22),transparent)]" />

        <div className="relative z-10 space-y-5 sm:space-y-8">
          <section className="table-zone">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Dealer</p>
                <h2 className="font-display text-xl text-[var(--text-primary)] sm:text-3xl">House hand</h2>
              </div>
              <HandValuePill label="Dealer total" value={String(dealerVisibleValue)} />
            </div>

            <div className="mt-5 flex min-h-24 flex-wrap gap-2 sm:min-h-36 sm:gap-3">
              {dealerCards.map((card, index) => (
                <Card
                  key={`dealer-${roundCounter}-${index}-${card.rank}-${card.suit}`}
                  card={card}
                  hidden={phase === "playerTurn" && index === 1}
                  animateFrom="dealer"
                />
              ))}
            </div>
          </section>

          <section className="table-zone border-t border-[color:rgba(255,255,255,0.08)] pt-5 sm:pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Player</p>
                <h2 className="font-display text-xl text-[var(--text-primary)] sm:text-3xl">Your seat</h2>
              </div>
              <span className="rounded-full border border-[color:rgba(255,255,255,0.1)] px-4 py-2 text-xs uppercase tracking-[0.28em] text-[var(--text-secondary)]">
                {phase === "playerTurn"
                  ? `Player turn${playerSpots.length > 1 ? ` • hand ${activeSpotIndex + 1} of ${playerSpots.length}` : ""}`
                  : phase === "dealerTurn"
                    ? "Dealer resolving"
                    : phase === "result"
                      ? "Round complete"
                      : "Dealing"}
              </span>
            </div>

            <div className={`mt-6 grid gap-4 ${playerSpots.length > 1 ? "lg:grid-cols-2" : ""}`}>
              {playerSpots.map((spot, index) => {
                const spotHand = getSpotHand(spot);
                const isActive = index === activeSpotIndex && phase === "playerTurn";

                return (
                  <div
                    key={`player-${roundCounter}-${index}`}
                    className={`rounded-[2rem] border p-4 transition ${isActive ? "border-[color:rgba(232,199,106,0.4)] bg-[color:rgba(255,255,255,0.05)] shadow-[0_0_0_1px_rgba(232,199,106,0.18),0_18px_40px_rgba(0,0,0,0.18)]" : "border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.025)]"} ${spot.finished ? "opacity-90" : ""}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {playerSpots.length > 1 ? `Hand ${index + 1}` : "Primary hand"}
                        </p>
                        <p className="text-lg font-medium text-[var(--text-primary)]">{getHandLabel(spot.cards)}</p>
                      </div>
                      <div className="flex gap-2">
                        <HandValuePill label="Total" value={String(spotHand.value)} />
                        {spot.doubled ? <StateBadge label="Doubled" /> : null}
                        {spot.isAfterSplit ? <StateBadge label="Split" /> : null}
                      </div>
                    </div>

                    <div className="mt-4 flex min-h-24 flex-wrap gap-2 sm:min-h-36 sm:gap-3">
                      {spot.cards.map((card, cardIndex) => (
                        <Card
                          key={`player-${roundCounter}-${index}-${cardIndex}-${card.rank}-${card.suit}`}
                          card={card}
                          animateFrom="player"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {phase === "result" ? (
          <div className="result-overlay">
            <div className="result-card">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Round Result</p>
              <h3 className="mt-3 font-display text-2xl text-[var(--text-primary)] sm:text-4xl">Settle the table</h3>
              <div className="mt-4 space-y-3 sm:mt-6">
                {roundOutcomes.map((outcome, index) => (
                  <div key={`${outcome.title}-${index}`} className="rounded-[1.5rem] border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.04)] p-3 text-left sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`font-display text-xl sm:text-2xl ${getOutcomeToneClass(outcome.tone)}`}>{outcome.title}</span>
                      <span className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                        Hand {index + 1}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{outcome.detail}</p>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleNextHand} className="luxury-button mt-5 w-full px-5 py-3 sm:mt-6 sm:w-auto">
                Next hand
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <ActionPanel
            onAction={handleAction}
            canDouble={activeSpot ? canDouble(activeSpot.cards, rules, activeSpot.isAfterSplit) : false}
            canSplit={activeSpot ? canSplit(activeSpot.cards, rules, playerSpots.length - 1) : false}
            recommendedAction={mode === "coach" ? currentAdvice?.optimalAction ?? null : null}
            feedbackState={flashState}
            disabled={phase !== "playerTurn"}
          />
          <CoachPanel
            advice={coachFeedback?.advice ?? null}
            wasCorrect={coachFeedback?.wasCorrect ?? null}
            handLabel={coachFeedback?.handLabel ?? ""}
          />
        </div>

        <div>
          {probabilityInfo && phase === "playerTurn" ? (
            <ProbabilityPanel probabilityInfo={probabilityInfo} />
          ) : (
            <div className="panel-shell">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Probability</p>
              <h3 className="mt-2 font-display text-xl text-[var(--text-primary)]">Waiting for the next decision</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                The probability panel becomes active during your turn and updates as each hand changes.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface HandValuePillProps {
  label: string;
  value: string;
}

// This function renders a compact total badge for dealer and player hands.
function HandValuePill({ label, value }: HandValuePillProps) {
  return (
    <div className="rounded-full border border-[color:rgba(232,199,106,0.18)] bg-[color:rgba(11,25,19,0.66)] px-4 py-2">
      <span className="text-[0.65rem] uppercase tracking-[0.22em] text-[var(--text-secondary)]">{label}</span>
      <span className="ml-2 font-display text-xl text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

interface StateBadgeProps {
  label: string;
}

// This function renders a small status badge for split and doubled hands.
function StateBadge({ label }: StateBadgeProps) {
  return (
    <span className="rounded-full bg-[color:rgba(201,168,76,0.12)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--gold-light)]">
      {label}
    </span>
  );
}

// This function maps a result tone to the correct text color.
function getOutcomeToneClass(tone: HandOutcome["tone"]): string {
  if (tone === "win") {
    return "text-[var(--correct-green)]";
  }

  if (tone === "loss") {
    return "text-[var(--incorrect-red)]";
  }

  if (tone === "blackjack") {
    return "text-[var(--gold-light)]";
  }

  return "text-[var(--text-primary)]";
}

"use client";

// This file renders rapid-fire blackjack scenarios for focused basic strategy practice.

import { useState } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { Card } from "@/components/Card";
import { CoachPanel } from "@/components/CoachPanel";
import { canDouble, canSplit, createDeck, createHand, dealCard, getHandCategory } from "@/lib/blackjack";
import { getOptimalAction } from "@/lib/strategy";
import type { Card as PlayingCard, DecisionRecord, GameRules, Hand, PlayerAction } from "@/lib/types";

interface ScenarioDrillProps {
  rules: GameRules;
  onDecisionRecorded: (decision: DecisionRecord) => void;
}

interface DrillScenario {
  playerHand: Hand;
  dealerUpcard: PlayingCard;
}

// This function creates one random two-card practice scenario with a dealer upcard.
function generateScenario(rules: GameRules): DrillScenario {
  let deck = createDeck(rules.numDecks);

  while (deck.length > 10) {
    const firstDraw = dealCard(deck);
    const secondDraw = dealCard(firstDraw.remainingDeck);
    const dealerDraw = dealCard(secondDraw.remainingDeck);

    deck = dealerDraw.remainingDeck;

    const playerHand = createHand([firstDraw.card, secondDraw.card]);

    // Naturals end immediately in real blackjack, so they are poor drill material.
    if (playerHand.isBlackjack) {
      continue;
    }

    return {
      playerHand,
      dealerUpcard: dealerDraw.card,
    };
  }

  throw new Error("Unable to generate a drill scenario.");
}

// This function builds a human-readable label for the current hand category.
function getHandLabel(playerHand: Hand): string {
  const handCategory = getHandCategory(playerHand.cards);

  if (handCategory === "pair") {
    return `Pair of ${playerHand.cards[0].rank}s`;
  }

  return `${handCategory.charAt(0).toUpperCase() + handCategory.slice(1)} ${playerHand.value}`;
}

// This function creates a DecisionRecord from a drill answer so it can feed stats and review mode.
function createDecisionRecord(
  playerHand: Hand,
  dealerUpcard: PlayingCard,
  playerAction: PlayerAction,
  optimalAction: PlayerAction,
): DecisionRecord {
  const handCategory = getHandCategory(playerHand.cards);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    playerHand: playerHand.cards,
    dealerUpcard,
    playerAction,
    optimalAction,
    wasCorrect: playerAction === optimalAction,
    handCategory,
    playerTotal: playerHand.value,
  };
}

// This function renders the scenario drill mode.
export function ScenarioDrill({ rules, onDecisionRecorded }: ScenarioDrillProps) {
  const [scenario, setScenario] = useState<DrillScenario>(() => generateScenario(rules));
  const [lastAction, setLastAction] = useState<PlayerAction | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  // This function moves the drill forward to the next random scenario.
  function nextScenario() {
    setScenario(generateScenario(rules));
    setLastAction(null);
  }

  // This function checks the user's chosen action and records the result.
  function handleAction(action: PlayerAction) {
    if (!scenario || lastAction) {
      return;
    }

    const advice = getOptimalAction(scenario.playerHand, scenario.dealerUpcard, rules);
    const decisionRecord = createDecisionRecord(
      scenario.playerHand,
      scenario.dealerUpcard,
      action,
      advice.optimalAction,
    );

    setLastAction(action);
    setSessionTotal((currentValue) => currentValue + 1);

    if (decisionRecord.wasCorrect) {
      setSessionCorrect((currentValue) => currentValue + 1);
    }

    onDecisionRecorded(decisionRecord);
  }

  const advice = getOptimalAction(scenario.playerHand, scenario.dealerUpcard, rules);
  const wasCorrect = lastAction ? lastAction === advice.optimalAction : null;

  return (
    <section className="space-y-6">
      <div className="panel-shell flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Scenario Drill</p>
          <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">Rapid-fire repetition</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Answer the spot quickly. The goal is recognition speed, not table theatrics.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:rgba(232,199,106,0.16)] bg-[color:rgba(255,255,255,0.03)] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Session score</p>
          <p className="mt-2 font-display text-4xl text-[var(--text-primary)]">
            {sessionCorrect}/{sessionTotal}
          </p>
        </div>
      </div>

      <div className="panel-shell space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[color:rgba(255,255,255,0.04)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            {getHandLabel(scenario.playerHand)}
          </span>
          <span className="rounded-full bg-[color:rgba(201,168,76,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--gold-light)]">
            Dealer {scenario.dealerUpcard.rank}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">Your hand</p>
            <div className="flex gap-3">
              {scenario.playerHand.cards.map((card) => (
                <Card key={`${card.rank}-${card.suit}`} card={card} animateFrom="player" />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">Dealer upcard</p>
            <div className="flex gap-3">
              <Card card={scenario.dealerUpcard} animateFrom="dealer" />
            </div>
          </div>
        </div>
      </div>

      <ActionPanel
        onAction={handleAction}
        canDouble={canDouble(scenario.playerHand.cards, rules)}
        canSplit={canSplit(scenario.playerHand.cards, rules)}
        disabled={Boolean(lastAction)}
      />

      <CoachPanel advice={lastAction ? advice : null} wasCorrect={wasCorrect} handLabel={getHandLabel(scenario.playerHand)} />

      <button type="button" onClick={nextScenario} className="luxury-button px-5 py-3">
        Next scenario
      </button>
    </section>
  );
}

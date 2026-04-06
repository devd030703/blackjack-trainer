"use client";

// This file lets the user revisit and replay only the decisions they previously missed.

import { useMemo, useState } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { Card } from "@/components/Card";
import { CoachPanel } from "@/components/CoachPanel";
import { canDouble, canSplit, createHand } from "@/lib/blackjack";
import { getOptimalAction } from "@/lib/strategy";
import type { DecisionRecord, GameRules, HandCategory, PlayerAction } from "@/lib/types";

interface MistakeReviewProps {
  decisions: DecisionRecord[];
  rules: GameRules;
  onDecisionRecorded: (decision: DecisionRecord) => void;
}

// This function converts a stored mistake into the display label used in the UI.
function getScenarioLabel(decision: DecisionRecord): string {
  if (decision.handCategory === "pair") {
    return `Pair review: ${decision.playerHand[0].rank}s vs dealer ${decision.dealerUpcard.rank}`;
  }

  return `${decision.handCategory} ${decision.playerTotal} vs dealer ${decision.dealerUpcard.rank}`;
}

// This function renders the grouped mistake review mode.
export function MistakeReview({ decisions, rules, onDecisionRecorded }: MistakeReviewProps) {
  const wrongDecisions = useMemo(
    () => decisions.filter((decision) => !decision.wasCorrect),
    [decisions],
  );
  const [activeCategory, setActiveCategory] = useState<HandCategory>("hard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewAction, setReviewAction] = useState<PlayerAction | null>(null);

  const groupedMistakes = useMemo(
    () => ({
      hard: wrongDecisions.filter((decision) => decision.handCategory === "hard"),
      soft: wrongDecisions.filter((decision) => decision.handCategory === "soft"),
      pair: wrongDecisions.filter((decision) => decision.handCategory === "pair"),
    }),
    [wrongDecisions],
  );

  const activeGroup = groupedMistakes[activeCategory];
  const activeScenario = activeGroup[activeIndex] ?? activeGroup[0] ?? null;

  // This function changes the active mistake category and resets replay state.
  function selectCategory(category: HandCategory) {
    setActiveCategory(category);
    setActiveIndex(0);
    setReviewAction(null);
  }

  // This function moves to the next mistake inside the active group.
  function nextMistake() {
    if (activeGroup.length === 0) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex + 1) % activeGroup.length);
    setReviewAction(null);
  }

  // This function records the user's replay answer against the selected mistake.
  function handleAction(action: PlayerAction) {
    if (!activeScenario || reviewAction) {
      return;
    }

    const reviewHand = createHand(activeScenario.playerHand);
    const advice = getOptimalAction(reviewHand, activeScenario.dealerUpcard, rules);
    const reviewDecision: DecisionRecord = {
      ...activeScenario,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      playerAction: action,
      optimalAction: advice.optimalAction,
      wasCorrect: action === advice.optimalAction,
    };

    setReviewAction(action);
    onDecisionRecorded(reviewDecision);
  }

  if (wrongDecisions.length === 0) {
    return (
      <section className="panel-shell">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Mistake Review</p>
        <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">No mistakes saved yet</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Once you miss a decision in play, coach, or drill mode, it will appear here for targeted review.
        </p>
      </section>
    );
  }

  if (!activeScenario) {
    return null;
  }

  const activeHand = createHand(activeScenario.playerHand);
  const advice = getOptimalAction(activeHand, activeScenario.dealerUpcard, rules);
  const wasCorrect = reviewAction ? reviewAction === advice.optimalAction : null;

  return (
    <section className="space-y-6">
      <div className="panel-shell">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Mistake Review</p>
        <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">Target your weak spots</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {(["hard", "soft", "pair"] as HandCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => selectCategory(category)}
              className={`rounded-full px-4 py-2 text-sm transition ${activeCategory === category ? "bg-[color:rgba(201,168,76,0.18)] text-[var(--gold-light)]" : "bg-[color:rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              {category} ({groupedMistakes[category].length})
            </button>
          ))}
        </div>
      </div>

      <div className="panel-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Replay scenario</p>
            <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">
              {getScenarioLabel(activeScenario)}
            </h3>
          </div>
          <button type="button" onClick={nextMistake} className="luxury-button px-4 py-3">
            Next mistake
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">Your original hand</p>
            <div className="flex gap-3">
              {activeScenario.playerHand.map((card, index) => (
                <Card key={`${card.rank}-${card.suit}-${index}`} card={card} animateFrom="player" />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">Dealer upcard</p>
            <div className="flex gap-3">
              <Card card={activeScenario.dealerUpcard} animateFrom="dealer" />
            </div>
          </div>
        </div>
      </div>

      <ActionPanel
        onAction={handleAction}
        canDouble={canDouble(activeScenario.playerHand, rules)}
        canSplit={canSplit(activeScenario.playerHand, rules)}
        disabled={Boolean(reviewAction)}
      />

      <CoachPanel advice={reviewAction ? advice : null} wasCorrect={wasCorrect} handLabel={getScenarioLabel(activeScenario)} />
    </section>
  );
}

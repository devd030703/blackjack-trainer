"use client";

// This file renders rapid-fire blackjack scenarios for focused basic strategy practice.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { Card } from "@/components/Card";
import { CoachPanel } from "@/components/CoachPanel";
import { buildGuidedTrainingSession, type GuidedTrainingSession } from "@/lib/adaptive-training";
import { canDouble, canSplit, getHandCategory } from "@/lib/blackjack";
import { createLearningEvent } from "@/lib/learning-events";
import { getOptimalAction } from "@/lib/strategy";
import type { DecisionRecord, GameRules, Hand, PlayerAction } from "@/lib/types";

interface ScenarioDrillProps {
  rules: GameRules;
  decisions: DecisionRecord[];
  onDecisionRecorded: (decision: DecisionRecord) => void;
}

function getCurrentTimestamp(): number {
  return Date.now();
}

// This function builds a human-readable label for the current hand category.
function getHandLabel(playerHand: Hand): string {
  const handCategory = getHandCategory(playerHand.cards);

  if (handCategory === "pair") {
    return `Pair of ${playerHand.cards[0].rank}s`;
  }

  return `${handCategory.charAt(0).toUpperCase() + handCategory.slice(1)} ${playerHand.value}`;
}

// This function renders the scenario drill mode.
export function ScenarioDrill({ rules, decisions, onDecisionRecorded }: ScenarioDrillProps) {
  const isHydrated = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  if (!isHydrated) {
    return (
      <section className="space-y-6">
        <div className="panel-shell flex min-h-[20rem] items-center justify-center">
          <p className="text-sm text-[var(--text-secondary)]">Preparing next scenario...</p>
        </div>
      </section>
    );
  }

  return <HydratedScenarioDrill rules={rules} decisions={decisions} onDecisionRecorded={onDecisionRecorded} />;
}

function HydratedScenarioDrill({ rules, decisions, onDecisionRecorded }: ScenarioDrillProps) {
  const [session, setSession] = useState<GuidedTrainingSession>(() => buildGuidedTrainingSession(decisions, rules));
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [lastAction, setLastAction] = useState<PlayerAction | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const scenarioPresentedAtRef = useRef(0);
  const scenario = session.scenarios[scenarioIndex] ?? null;

  const sessionProgress = useMemo(() => {
    if (session.scenarios.length === 0) {
      return 0;
    }

    return Math.round((Math.min(scenarioIndex + 1, session.scenarios.length) / session.scenarios.length) * 100);
  }, [scenarioIndex, session.scenarios.length]);

  // This function rebuilds the guided session from the latest saved history.
  function rebuildSession() {
    const nextSession = buildGuidedTrainingSession(decisions, rules);
    setSession(nextSession);
    setScenarioIndex(0);
    setLastAction(null);
    setSessionCorrect(0);
    setSessionTotal(0);
    scenarioPresentedAtRef.current = getCurrentTimestamp();
  }

  // This function moves the drill forward to the next guided scenario.
  function nextScenario() {
    if (scenarioIndex >= session.scenarios.length - 1) {
      rebuildSession();
      return;
    }

    setScenarioIndex((currentValue) => currentValue + 1);
    setLastAction(null);
    scenarioPresentedAtRef.current = getCurrentTimestamp();
  }

  // This effect restarts the response timer whenever the displayed drill scenario changes.
  useEffect(() => {
    if (!scenario) {
      return;
    }

    scenarioPresentedAtRef.current = getCurrentTimestamp();
  }, [scenario]);

  // This function checks the user's chosen action and records the result.
  function handleAction(action: PlayerAction) {
    if (!scenario || lastAction) {
      return;
    }

    const advice = getOptimalAction(scenario.hand, scenario.dealerUpcard, rules);
    const decisionRecord = createLearningEvent({
      playerHand: scenario.hand.cards,
      dealerUpcard: scenario.dealerUpcard,
      playerAction: action,
      optimalAction: advice.optimalAction,
      handCategory: getHandCategory(scenario.hand.cards),
      playerTotal: scenario.hand.value,
      rules,
      isAfterSplit: false,
      mode: "drill",
      priorDecisions: decisions,
      responseTimeMs: getCurrentTimestamp() - scenarioPresentedAtRef.current,
      usedHint: false,
    });

    setLastAction(action);
    setSessionTotal((currentValue) => currentValue + 1);

    if (decisionRecord.wasCorrect) {
      setSessionCorrect((currentValue) => currentValue + 1);
    }

    onDecisionRecorded(decisionRecord);
  }

  if (!scenario) {
    return null;
  }

  const advice = getOptimalAction(scenario.hand, scenario.dealerUpcard, rules);
  const wasCorrect = lastAction ? lastAction === advice.optimalAction : null;
  const isLastScenario = scenarioIndex === session.scenarios.length - 1;

  return (
    <section className="space-y-6">
      <div className="panel-shell flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Guided Drill</p>
          <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">{session.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {session.description} Drill mode strips away full-hand pacing so you can stack fast, isolated reps on the
            exact shapes that still slow you down.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:rgba(232,199,106,0.16)] bg-[color:rgba(255,255,255,0.03)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Session score</p>
            <p className="mt-2 font-display text-4xl text-[var(--text-primary)]">
              {sessionCorrect}/{sessionTotal}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[color:rgba(232,199,106,0.16)] bg-[color:rgba(255,255,255,0.03)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Progress</p>
            <p className="mt-2 font-display text-4xl text-[var(--text-primary)]">
              {scenarioIndex + 1}/{session.scenarios.length}
            </p>
          </div>
        </div>
      </div>

      <div className="panel-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[color:rgba(201,168,76,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--gold-light)]">
              {scenario.focusLabel}
            </span>
            <span className="rounded-full bg-[color:rgba(255,255,255,0.04)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              Spot {scenarioIndex + 1} of {session.scenarios.length}
            </span>
          </div>

          <button
            type="button"
            onClick={rebuildSession}
            className="rounded-full border border-[color:rgba(255,255,255,0.12)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Rebuild session
          </button>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.08)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-light))]"
            style={{ width: `${sessionProgress}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[color:rgba(255,255,255,0.04)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            {scenario.handLabel}
          </span>
          <span className="rounded-full bg-[color:rgba(201,168,76,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--gold-light)]">
            Dealer {scenario.dealerUpcard.rank}
          </span>
          <span className="rounded-full bg-[color:rgba(46,204,113,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--correct-green)]">
            High-density reps
          </span>
        </div>

        <p className="text-sm leading-6 text-[var(--text-secondary)]">{scenario.note}</p>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">Your hand</p>
            <div className="flex gap-3">
              {scenario.hand.cards.map((card, index) => (
                <Card key={`${card.rank}-${card.suit}-${index}`} card={card} animateFrom="player" />
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
        canDouble={canDouble(scenario.hand.cards, rules)}
        canSplit={canSplit(scenario.hand.cards, rules)}
        disabled={Boolean(lastAction)}
      />

      <CoachPanel advice={lastAction ? advice : null} wasCorrect={wasCorrect} handLabel={getHandLabel(scenario.hand)} />

      <button type="button" onClick={nextScenario} className="luxury-button px-5 py-3">
        {isLastScenario ? "Finish session" : "Next scenario"}
      </button>
    </section>
  );
}

function subscribeToNothing() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

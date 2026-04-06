"use client";

// This file renders the timed benchmark mode with no live hints and end-of-session scoring.

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { Card } from "@/components/Card";
import { buildBenchmarkSession } from "@/lib/adaptive-training";
import { canDouble, canSplit, getHandCategory } from "@/lib/blackjack";
import { createLearningEvent } from "@/lib/learning-events";
import { getOptimalAction } from "@/lib/strategy";
import type { DecisionRecord, GameRules, HandCategory, PlayerAction } from "@/lib/types";

interface ExamSessionProps {
  rules: GameRules;
  decisions: DecisionRecord[];
  onDecisionRecorded: (decision: DecisionRecord) => void;
}

interface ExamOutcome {
  handCategory: HandCategory;
  wasCorrect: boolean;
  timedOut: boolean;
  responseTimeMs: number;
}

const DECISION_TIME_LIMIT_MS = 8000;
const AUTO_ADVANCE_DELAY_MS = 850;

function getCurrentTimestamp(): number {
  return Date.now();
}

function getBenchmarkLabel(score: number): string {
  if (score >= 90) {
    return "Casino ready";
  }

  if (score >= 75) {
    return "Table solid";
  }

  if (score >= 60) {
    return "Still leaking";
  }

  return "Needs more reps";
}

// This function renders the benchmark exam flow.
export function ExamSession({ rules, decisions, onDecisionRecorded }: ExamSessionProps) {
  const [session, setSession] = useState(() => buildBenchmarkSession(decisions, rules));
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<ExamOutcome[]>([]);
  const [lastResolution, setLastResolution] = useState<"correct" | "incorrect" | "timeout" | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState(DECISION_TIME_LIMIT_MS);
  const scenarioPresentedAtRef = useRef(getCurrentTimestamp());
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenario = session.scenarios[scenarioIndex] ?? null;
  const isComplete = scenarioIndex >= session.scenarios.length;

  const score = outcomes.length === 0 ? 0 : Math.round((outcomes.filter((outcome) => outcome.wasCorrect).length / outcomes.length) * 100);
  const averageResponseMs =
    outcomes.length === 0
      ? 0
      : Math.round(outcomes.reduce((total, outcome) => total + outcome.responseTimeMs, 0) / outcomes.length);
  const timeoutCount = outcomes.filter((outcome) => outcome.timedOut).length;

  const categoryBreakdown = useMemo(() => {
    return {
      hard: getCategoryScore(outcomes, "hard"),
      soft: getCategoryScore(outcomes, "soft"),
      pair: getCategoryScore(outcomes, "pair"),
    };
  }, [outcomes]);

  function queueNextScenario() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }

    advanceTimerRef.current = setTimeout(() => {
      setLastResolution(null);
      setTimeRemainingMs(DECISION_TIME_LIMIT_MS);
      setScenarioIndex((currentValue) => currentValue + 1);
    }, AUTO_ADVANCE_DELAY_MS);
  }

  const resolveTimeout = useEffectEvent(() => {
    if (!scenario || lastResolution) {
      return;
    }

    const nextOutcome: ExamOutcome = {
      handCategory: getHandCategory(scenario.hand.cards),
      wasCorrect: false,
      timedOut: true,
      responseTimeMs: DECISION_TIME_LIMIT_MS,
    };

    setLastResolution("timeout");
    setOutcomes((currentOutcomes) => [...currentOutcomes, nextOutcome]);
    queueNextScenario();
  });

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scenario || isComplete) {
      return;
    }

    scenarioPresentedAtRef.current = getCurrentTimestamp();

    const interval = setInterval(() => {
      const nextRemainingMs = Math.max(0, DECISION_TIME_LIMIT_MS - (getCurrentTimestamp() - scenarioPresentedAtRef.current));
      setTimeRemainingMs(nextRemainingMs);

      if (nextRemainingMs === 0) {
        clearInterval(interval);
        resolveTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [scenarioIndex, scenario, isComplete]);

  function restartExam() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }

    setSession(buildBenchmarkSession(decisions, rules));
    setScenarioIndex(0);
    setOutcomes([]);
    setLastResolution(null);
    setTimeRemainingMs(DECISION_TIME_LIMIT_MS);
  }

  function handleAction(action: PlayerAction) {
    if (!scenario || lastResolution) {
      return;
    }

    const advice = getOptimalAction(scenario.hand, scenario.dealerUpcard, rules);
    const responseTimeMs = getCurrentTimestamp() - scenarioPresentedAtRef.current;
    const decisionRecord = createLearningEvent({
      playerHand: scenario.hand.cards,
      dealerUpcard: scenario.dealerUpcard,
      playerAction: action,
      optimalAction: advice.optimalAction,
      handCategory: getHandCategory(scenario.hand.cards),
      playerTotal: scenario.hand.value,
      rules,
      isAfterSplit: false,
      mode: "exam",
      priorDecisions: decisions,
      responseTimeMs,
      usedHint: false,
    });

    onDecisionRecorded(decisionRecord);
    setLastResolution(decisionRecord.wasCorrect ? "correct" : "incorrect");
    setOutcomes((currentOutcomes) => [
      ...currentOutcomes,
      {
        handCategory: decisionRecord.handCategory,
        wasCorrect: decisionRecord.wasCorrect,
        timedOut: false,
        responseTimeMs: decisionRecord.responseTimeMs,
      },
    ]);
    queueNextScenario();
  }

  if (isComplete) {
    return (
      <section className="space-y-6">
        <div className="panel-shell grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Exam complete</p>
            <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">Benchmark result: {getBenchmarkLabel(score)}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              The exam stays silent while you work. Use this score to decide whether you should go back to Coach, Drill,
              or Review before another timed run.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Score" value={`${score}%`} />
            <MetricTile label="Avg response" value={`${(averageResponseMs / 1000).toFixed(1)}s`} />
            <MetricTile label="Timeouts" value={String(timeoutCount)} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="panel-shell space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Section scores</p>
              <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Where the benchmark held</h3>
            </div>
            <CategoryRow label="Hard totals" stat={categoryBreakdown.hard} />
            <CategoryRow label="Soft totals" stat={categoryBreakdown.soft} />
            <CategoryRow label="Pairs" stat={categoryBreakdown.pair} />
          </div>

          <div className="panel-shell space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Recommended next move</p>
              <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Use the result, do not admire it</h3>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Low score or many timeouts means return to Drill for density, then Coach for explanation. If pairs or soft
              totals dragged the result down, go straight into Review and clean those leaks up before re-testing.
            </p>
            <button type="button" onClick={restartExam} className="luxury-button px-5 py-3">
              Run benchmark again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!scenario) {
    return null;
  }

  const progress = Math.round((scenarioIndex / session.scenarios.length) * 100);
  const clockProgress = Math.max(0, Math.round((timeRemainingMs / DECISION_TIME_LIMIT_MS) * 100));

  return (
    <section className="space-y-6">
      <div className="panel-shell grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Timed benchmark</p>
          <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">{session.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{session.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <MetricTile label="Question" value={`${scenarioIndex + 1}/${session.scenarios.length}`} />
          <MetricTile label="Score" value={`${score}%`} />
          <MetricTile label="Clock" value={`${(timeRemainingMs / 1000).toFixed(1)}s`} />
        </div>
      </div>

      <div className="panel-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[color:rgba(231,76,60,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[color:#ffb2a6]">
              No hints
            </span>
            <span className="rounded-full bg-[color:rgba(255,255,255,0.04)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {scenario.handLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={restartExam}
            className="rounded-full border border-[color:rgba(255,255,255,0.12)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Restart exam
          </button>
        </div>

        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.08)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(231,76,60,0.8),rgba(232,199,106,0.95))] transition-[width] duration-100"
              style={{ width: `${clockProgress}%` }}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-light))]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

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

        <div className="rounded-[1.5rem] border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {lastResolution === "timeout"
            ? "Clock expired. Missed spots count against the benchmark and are best cleaned up in Review."
            : "Answer on instinct. The benchmark stays silent until the session ends."}
        </div>
      </div>

      <ActionPanel
        onAction={handleAction}
        canDouble={canDouble(scenario.hand.cards, rules)}
        canSplit={canSplit(scenario.hand.cards, rules)}
        disabled={Boolean(lastResolution)}
      />
    </section>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="rounded-[1.5rem] border border-[color:rgba(232,199,106,0.16)] bg-[color:rgba(255,255,255,0.03)] px-5 py-4">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 font-display text-4xl text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

interface CategoryRowProps {
  label: string;
  stat: { correct: number; total: number; score: number };
}

function CategoryRow({ label, stat }: CategoryRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-primary)]">{label}</span>
        <span className="text-[var(--text-secondary)]">
          {stat.correct}/{stat.total} • {stat.score}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-light))]"
          style={{ width: `${stat.score}%` }}
        />
      </div>
    </div>
  );
}

function getCategoryScore(outcomes: ExamOutcome[], handCategory: HandCategory) {
  const categoryOutcomes = outcomes.filter((outcome) => outcome.handCategory === handCategory);

  if (categoryOutcomes.length === 0) {
    return { correct: 0, total: 0, score: 0 };
  }

  const correct = categoryOutcomes.filter((outcome) => outcome.wasCorrect).length;

  return {
    correct,
    total: categoryOutcomes.length,
    score: Math.round((correct / categoryOutcomes.length) * 100),
  };
}

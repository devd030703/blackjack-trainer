"use client";

// This file renders the main app shell, mode routing, persistence, and top-level trainer state.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BlackjackTable } from "@/components/BlackjackTable";
import { MistakeReview } from "@/components/MistakeReview";
import { ModeSelector } from "@/components/ModeSelector";
import { RulesSettings } from "@/components/RulesSettings";
import { ScenarioDrill } from "@/components/ScenarioDrill";
import { StatsDashboard } from "@/components/StatsDashboard";
import { getOutstandingReviewDecisions } from "@/lib/decision-records";
import { DEFAULT_RULES } from "@/lib/rules";
import {
  clearAll,
  createEmptyStats,
  loadDecisions,
  loadRules,
  loadStats,
  saveDecision,
  saveRules,
  saveStats,
} from "@/lib/storage";
import type { DecisionRecord, GameMode, GameRules, GameStats } from "@/lib/types";

// This function creates a scenario key used to track which spots the user misses most often.
function getScenarioKey(decision: DecisionRecord): string {
  return `${decision.handCategory}-${decision.playerTotal}-${decision.dealerUpcard.rank}`;
}

// This function calculates the top weak scenarios from recent decision history.
function getWeakScenarios(decisions: DecisionRecord[]): string[] {
  const mistakeCounts = new Map<string, number>();

  for (const decision of decisions) {
    if (decision.wasCorrect) {
      continue;
    }

    const scenarioKey = getScenarioKey(decision);
    const existingCount = mistakeCounts.get(scenarioKey) ?? 0;
    mistakeCounts.set(scenarioKey, existingCount + 1);
  }

  return Array.from(mistakeCounts.entries())
    .sort((leftItem, rightItem) => rightItem[1] - leftItem[1])
    .slice(0, 5)
    .map(([scenarioKey]) => scenarioKey);
}

// This function applies a new decision to the aggregate stats object.
function applyDecisionToStats(
  previousStats: GameStats,
  decision: DecisionRecord,
  allDecisions: DecisionRecord[],
): GameStats {
  const nextStats: GameStats = {
    ...previousStats,
    totalDecisions: previousStats.totalDecisions + 1,
    correctDecisions: previousStats.correctDecisions + (decision.wasCorrect ? 1 : 0),
    mistakesByCategory: {
      ...previousStats.mistakesByCategory,
    },
    recentDecisions: [decision, ...previousStats.recentDecisions].slice(0, 40),
    weakScenarios: getWeakScenarios(allDecisions),
  };

  if (!decision.wasCorrect) {
    nextStats.mistakesByCategory[decision.handCategory] += 1;
  }

  return nextStats;
}

// This function renders the trainer shell and swaps between the five app modes.
export default function Home() {
  const isHydrated = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#173b27_0%,#0d1b14_55%,#09120d_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] items-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="panel-shell w-full text-center">
            <p className="text-xs uppercase tracking-[0.45em] text-[var(--gold-light)]">Blackjack Trainer</p>
            <h1 className="mt-4 font-display text-5xl leading-tight text-[var(--text-primary)] sm:text-6xl">
              Train the decision, not just the hand.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Loading your table settings, coaching history, and saved progress.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <HydratedHome />;
}

function HydratedHome() {
  const [initialData] = useState(() => {
    const initialRules = loadRules();

    return {
      rules: initialRules,
      stats: loadStats(),
      decisions: loadDecisions(initialRules),
    };
  });
  const [activeMode, setActiveMode] = useState<GameMode>("play");
  const [rules, setRules] = useState<GameRules>(initialData.rules);
  const [stats, setStats] = useState<GameStats>(initialData.stats);
  const [decisions, setDecisions] = useState<DecisionRecord[]>(initialData.decisions);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  const accuracy =
    stats.totalDecisions === 0 ? 0 : Math.round((stats.correctDecisions / stats.totalDecisions) * 100);

  const pendingReviewCount = useMemo(() => getOutstandingReviewDecisions(decisions, rules).length, [decisions, rules]);

  // This function stores one decision, updates history, and updates aggregate stats.
  function handleDecisionRecorded(decision: DecisionRecord) {
    saveDecision(decision);

    setDecisions((previousDecisions) => {
      const nextDecisions = [decision, ...previousDecisions].slice(0, 200);

      setStats((previousStats) => applyDecisionToStats(previousStats, decision, nextDecisions));

      return nextDecisions;
    });
  }

  // This function increments the completed-hand count after a round settles.
  function handleHandCompleted() {
    setStats((previousStats) => ({
      ...previousStats,
      totalHands: previousStats.totalHands + 1,
    }));
  }

  // This function resets all local trainer data after a confirmation prompt.
  function handleResetAll() {
    if (!window.confirm("Reset all saved blackjack trainer data?")) {
      return;
    }

    clearAll();
    setRules(DEFAULT_RULES);
    setStats(createEmptyStats());
    setDecisions([]);
    setActiveMode("play");
    setIsSettingsOpen(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#173b27_0%,#0d1b14_55%,#09120d_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="panel-shell overflow-hidden">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-[var(--gold-light)]">Blackjack Trainer</p>
                <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight text-[var(--text-primary)] sm:text-6xl">
                  Train the decision, not just the hand.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Built for repetition, coaching, and post-hand review. Practice basic strategy, pressure-test tough
                  spots, and turn mistakes into targeted drills.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <HeroMetric label="Correct rate" value={`${accuracy}%`} />
                <HeroMetric label="Hands played" value={String(stats.totalHands)} />
                <HeroMetric label="Mistakes to review" value={String(pendingReviewCount)} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setIsSettingsOpen(true)} className="luxury-button px-5 py-3">
                Table settings
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("review")}
                className="rounded-full border border-[color:rgba(255,255,255,0.1)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Review mistakes
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <ModeSelector activeMode={activeMode} onChange={setActiveMode} />

          {activeMode === "play" ? (
            <BlackjackTable
              mode="play"
              rules={rules}
              onDecisionRecorded={handleDecisionRecorded}
              onHandCompleted={handleHandCompleted}
            />
          ) : null}

          {activeMode === "coach" ? (
            <BlackjackTable
              mode="coach"
              rules={rules}
              onDecisionRecorded={handleDecisionRecorded}
              onHandCompleted={handleHandCompleted}
            />
          ) : null}

          {activeMode === "drill" ? (
            <ScenarioDrill
              key={JSON.stringify(rules)}
              rules={rules}
              onDecisionRecorded={handleDecisionRecorded}
            />
          ) : null}

          {activeMode === "review" ? (
            <MistakeReview
              decisions={decisions}
              rules={rules}
              onDecisionRecorded={handleDecisionRecorded}
            />
          ) : null}

          {activeMode === "stats" ? (
            <StatsDashboard stats={stats} decisions={decisions} onReset={handleResetAll} />
          ) : null}
        </div>
      </div>

      <RulesSettings
        rules={rules}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onChange={setRules}
        onReset={() => setRules(DEFAULT_RULES)}
      />
    </main>
  );
}

function subscribeToNothing() {
  return () => {};
}

// This function tells React that the client has mounted and browser APIs are available.
function getClientSnapshot() {
  return true;
}

// This function keeps the server render in a safe pre-hydration state.
function getServerSnapshot() {
  return false;
}

interface HeroMetricProps {
  label: string;
  value: string;
}

// This function renders one compact headline metric in the app header.
function HeroMetric({ label, value }: HeroMetricProps) {
  return (
    <div className="rounded-[1.75rem] border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

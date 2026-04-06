// This file renders persistent performance stats, weak spots, and a recent accuracy timeline.

import type { DecisionRecord, GameStats } from "@/lib/types";

interface StatsDashboardProps {
  stats: GameStats;
  decisions: DecisionRecord[];
  onReset: () => void;
}

// This function converts the decision history into the top five most-missed scenarios.
function getTopMistakes(decisions: DecisionRecord[]): Array<{ key: string; misses: number }> {
  const mistakeCounts = new Map<string, number>();

  for (const decision of decisions) {
    if (decision.wasCorrect) {
      continue;
    }

    const scenarioKey = `${decision.handCategory} ${decision.playerTotal} vs ${decision.dealerUpcard.rank}`;
    const existingCount = mistakeCounts.get(scenarioKey) ?? 0;
    mistakeCounts.set(scenarioKey, existingCount + 1);
  }

  return Array.from(mistakeCounts.entries())
    .map(([key, misses]) => ({ key, misses }))
    .sort((leftItem, rightItem) => rightItem.misses - leftItem.misses)
    .slice(0, 5);
}

// This function renders the stats dashboard view.
export function StatsDashboard({ stats, decisions, onReset }: StatsDashboardProps) {
  const accuracyPercentage =
    stats.totalDecisions === 0 ? 0 : Math.round((stats.correctDecisions / stats.totalDecisions) * 100);
  const recentTimeline = decisions.slice(0, 20);
  const topMistakes = getTopMistakes(decisions);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total hands" value={String(stats.totalHands)} />
        <MetricCard label="Total decisions" value={String(stats.totalDecisions)} />
        <MetricCard label="Correct rate" value={`${accuracyPercentage}%`} />
        <MetricCard label="Tracked mistakes" value={String(stats.totalDecisions - stats.correctDecisions)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-shell">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Category breakdown</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Mistakes by hand type</h2>
          <div className="mt-6 space-y-4">
            <BreakdownRow
              label="Hard totals"
              value={stats.mistakesByCategory.hard}
              total={Math.max(1, stats.totalDecisions)}
            />
            <BreakdownRow
              label="Soft totals"
              value={stats.mistakesByCategory.soft}
              total={Math.max(1, stats.totalDecisions)}
            />
            <BreakdownRow
              label="Pairs"
              value={stats.mistakesByCategory.pair}
              total={Math.max(1, stats.totalDecisions)}
            />
          </div>
        </div>

        <div className="panel-shell">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Trend</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Recent performance</h2>
          <div className="mt-6 grid grid-cols-10 gap-2">
            {recentTimeline.length === 0 ? (
              <p className="col-span-10 text-sm text-[var(--text-secondary)]">
                Play a few hands to start building your timeline.
              </p>
            ) : (
              recentTimeline.map((decision) => (
                <div
                  key={decision.id}
                  title={`${decision.wasCorrect ? "Correct" : "Incorrect"}: ${decision.handCategory} ${decision.playerTotal} vs ${decision.dealerUpcard.rank}`}
                  className={`h-10 rounded-xl ${decision.wasCorrect ? "bg-[color:rgba(46,204,113,0.85)]" : "bg-[color:rgba(231,76,60,0.85)]"}`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-shell">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Weak spots</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Most common mistakes</h2>
          <div className="mt-5 space-y-3">
            {topMistakes.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                No repeated mistakes yet. Once you miss a few spots, your weakest scenarios will show up here.
              </p>
            ) : (
              topMistakes.map((mistakeItem) => (
                <div
                  key={mistakeItem.key}
                  className="flex items-center justify-between rounded-2xl border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] px-4 py-3"
                >
                  <span className="text-sm text-[var(--text-primary)]">{mistakeItem.key}</span>
                  <span className="rounded-full bg-[color:rgba(231,76,60,0.12)] px-3 py-1 text-xs text-[var(--incorrect-red)]">
                    {mistakeItem.misses} misses
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel-shell space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Reset</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Start over clean</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This removes saved rules, decision history, and progress from localStorage.
            </p>
          </div>
          <button type="button" onClick={onReset} className="luxury-button px-5 py-3">
            Reset all data
          </button>
        </div>
      </div>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

// This function renders one headline metric card in the stats dashboard.
function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="panel-shell">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-4 font-display text-4xl text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

interface BreakdownRowProps {
  label: string;
  value: number;
  total: number;
}

// This function renders a simple horizontal bar for one mistake category.
function BreakdownRow({ label, value, total }: BreakdownRowProps) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-primary)]">{label}</span>
        <span className="text-[var(--text-secondary)]">{percentage}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-light))]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

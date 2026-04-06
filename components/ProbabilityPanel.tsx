// This file renders compact probability and pressure stats for the current player decision.

import type { ProbabilityInfo } from "@/lib/types";

interface ProbabilityPanelProps {
  probabilityInfo: ProbabilityInfo;
}

// This function renders the probability coaching grid for the active decision.
export function ProbabilityPanel({ probabilityInfo }: ProbabilityPanelProps) {
  return (
    <div className="panel-shell space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Probability</p>
        <h3 className="mt-2 font-display text-xl text-[var(--text-primary)]">Pressure snapshot</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCell label="Bust if hit" value={`${probabilityInfo.bustIfHit}%`} />
        <StatCell
          label="Dealer bust chance"
          value={`${probabilityInfo.dealerBustProbability}%`}
        />
      </div>

      <div className="rounded-2xl border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Recommendation strength</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {probabilityInfo.recommendationStrength}/100
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.08)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-light))] transition-[width] duration-300"
            style={{ width: `${probabilityInfo.recommendationStrength}%` }}
          />
        </div>
      </div>

      <p className="text-sm leading-6 text-[var(--text-secondary)]">{probabilityInfo.reasoning}</p>
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: string;
}

// This function renders one compact metric cell inside the probability grid.
function StatCell({ label, value }: StatCellProps) {
  return (
    <div className="rounded-2xl border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 font-display text-2xl text-[var(--text-primary)]">{value}</p>
    </div>
  );
}


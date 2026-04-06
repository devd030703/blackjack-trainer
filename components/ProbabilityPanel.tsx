/**
 * components/ProbabilityPanel.tsx
 *
 * Displays live probability information during the player's turn.
 * Shows a compact 2×2 grid with:
 *  - Bust if Hit %
 *  - Dealer Bust Chance %
 *  - Recommendation strength bar (0–100)
 *  - Plain-English reasoning sentence
 *
 * This panel is visible whenever the game phase is 'playerTurn'.
 * It gives players the statistical context behind their decisions.
 */

'use client'

import type { ProbabilityInfo } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProbabilityPanelProps {
  /** Probability data computed by lib/probability.ts */
  probInfo: ProbabilityInfo | null
}

// ─── Sub-component: stat tile ─────────────────────────────────────────────────

/**
 * A single stat tile with a label and a big numeric value.
 * Used for bust% and dealer bust% cells.
 */
function StatTile({
  label,
  value,
  valueColour = 'text-text-primary',
}: {
  label: string
  value: string
  valueColour?: string
}) {
  return (
    <div className="bg-bg-dark/40 rounded-lg p-3 text-center">
      <p className="text-text-secondary text-xs mb-1">{label}</p>
      <p className={`text-xl font-bold font-display ${valueColour}`}>{value}</p>
    </div>
  )
}

// ─── Helper: colour for bust probability ─────────────────────────────────────

/**
 * Returns a text colour class based on how dangerous a bust% is.
 * Low bust% = green (safe to hit), high bust% = red (dangerous).
 */
function bustColour(bustPct: number): string {
  if (bustPct === 0)   return 'text-correct-green'
  if (bustPct < 40)    return 'text-correct-green'
  if (bustPct < 65)    return 'text-accent-amber'
  return 'text-incorrect-red'
}

/**
 * Returns a colour for the dealer bust %.
 * High dealer bust = green (good for player), low = red.
 */
function dealerBustColour(bustPct: number): string {
  if (bustPct >= 38)   return 'text-correct-green'
  if (bustPct >= 28)   return 'text-accent-amber'
  return 'text-incorrect-red'
}

/**
 * Returns a CSS gradient colour for the recommendation strength bar.
 * Strong = gold/green, weak = gray.
 */
function strengthBarColour(strength: number): string {
  if (strength >= 80)  return 'bg-gold'
  if (strength >= 60)  return 'bg-accent-amber'
  return 'bg-text-secondary'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProbabilityPanel({ probInfo }: ProbabilityPanelProps) {
  // Don't render if probability info hasn't been computed yet
  if (!probInfo) return null

  const { bustIfHit, dealerBustProbability, recommendationStrength, reasoning } = probInfo

  return (
    <div className="bg-bg-panel panel-border rounded-xl p-4 mt-3 animate-[slide-up_200ms_ease-out]">
      {/* Panel header */}
      <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
        Probability Analysis
      </p>

      {/* ── Stats grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Bust if Hit */}
        <StatTile
          label="Bust if Hit"
          value={bustIfHit === 0 ? '0%' : `${bustIfHit}%`}
          valueColour={bustColour(bustIfHit)}
        />

        {/* Dealer Bust Chance */}
        <StatTile
          label="Dealer Bust Chance"
          value={`${dealerBustProbability}%`}
          valueColour={dealerBustColour(dealerBustProbability)}
        />
      </div>

      {/* ── Recommendation strength bar ───────────────────────────────────── */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <p className="text-text-secondary text-xs">Recommendation Strength</p>
          <p className="text-text-secondary text-xs">{recommendationStrength}/100</p>
        </div>
        {/* Bar container */}
        <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
          {/*
            The filled portion. Width is set inline because Tailwind doesn't
            generate dynamic width classes for arbitrary percentages.
          */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${strengthBarColour(recommendationStrength)}`}
            style={{ width: `${recommendationStrength}%` }}
          />
        </div>
      </div>

      {/* ── Reasoning text ────────────────────────────────────────────────── */}
      <p className="text-text-secondary text-xs leading-relaxed italic">
        {reasoning}
      </p>
    </div>
  )
}

/**
 * components/CoachPanel.tsx
 *
 * Feedback panel shown after every player decision.
 * Slides up from below the action buttons and shows:
 *  - ✅ or ❌ indicating whether the move was correct
 *  - The optimal action ("Best move: Stand")
 *  - A one-line explanation (always visible)
 *  - A "Learn more" toggle for the 2-3 sentence theory explanation
 *  - Hand category badge ("Hard 16", "Soft 18", "Pair of 8s")
 *  - Confidence badge ("Strong recommendation" / "Moderate" / "Marginal call")
 */

'use client'

import type { StrategyAdvice, DecisionRecord } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoachPanelProps {
  /** Strategy advice — what the optimal move was and why */
  advice: StrategyAdvice | null
  /** The player's actual decision — used to show ✅/❌ */
  decision: DecisionRecord | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a PlayerAction as a readable label */
function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    hit:       'Hit',
    stand:     'Stand',
    double:    'Double Down',
    split:     'Split',
    surrender: 'Surrender',
  }
  return labels[action] ?? action
}

/** Returns a human-friendly hand category label */
function categoryLabel(advice: StrategyAdvice, decision: DecisionRecord): string {
  const category = advice.handCategory
  const total = decision.playerTotal

  if (category === 'pair') {
    const pairRank = decision.playerHand[0]?.rank ?? '?'
    const label = pairRank === 'A' ? 'Aces' : `${pairRank}s`
    return `Pair of ${label}`
  }
  if (category === 'soft') {
    return `Soft ${total}`
  }
  return `Hard ${total}`
}

/** Confidence badge styles */
function confidenceStyle(confidence: StrategyAdvice['confidence']): string {
  switch (confidence) {
    case 'strong':   return 'bg-gold/20 text-gold border border-gold/30'
    case 'moderate': return 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30'
    case 'marginal': return 'bg-text-secondary/20 text-text-secondary border border-text-secondary/30'
  }
}

function confidenceLabel(confidence: StrategyAdvice['confidence']): string {
  switch (confidence) {
    case 'strong':   return 'Strong recommendation'
    case 'moderate': return 'Moderate'
    case 'marginal': return 'Marginal call'
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoachPanel({ advice, decision }: CoachPanelProps) {
  // Don't render if there's no advice yet (beginning of hand, before first action)
  if (!advice || !decision) return null

  const wasCorrect = decision.wasCorrect

  return (
    /*
      The panel slides up from the bottom using our CSS animation.
      animate-[slide-up_250ms_ease-out] references the @keyframes slide-up
      defined in globals.css.
      key={decision.id} forces React to remount (re-animate) on each new decision.
    */
    <div
      key={decision.id}
      className="animate-[slide-up_250ms_ease-out] bg-bg-panel panel-border rounded-xl p-4 mt-3"
    >
      {/* ── Header row: correct/incorrect + action label ──────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Big checkmark or X */}
          <span className={`text-2xl ${wasCorrect ? 'text-correct-green' : 'text-incorrect-red'}`}>
            {wasCorrect ? '✓' : '✗'}
          </span>

          <div>
            <p className={`text-sm font-semibold ${wasCorrect ? 'text-correct-green' : 'text-incorrect-red'}`}>
              {wasCorrect ? 'Correct!' : 'Not optimal'}
            </p>
            {/* Show what the optimal move was (always, even if correct) */}
            <p className="text-text-secondary text-xs">
              Best move:{' '}
              <span className="text-text-primary font-semibold">
                {actionLabel(advice.optimalAction)}
              </span>
            </p>
          </div>
        </div>

        {/* Right side: category badge + confidence badge */}
        <div className="flex flex-col items-end gap-1">
          {/* Hand category badge e.g. "Hard 16", "Soft 18", "Pair of 8s" */}
          <span className="text-xs px-2 py-0.5 rounded-full bg-felt-green/60 text-gold border border-gold/20">
            {categoryLabel(advice, decision)}
          </span>

          {/* Confidence badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceStyle(advice.confidence)}`}>
            {confidenceLabel(advice.confidence)}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="gold-separator mb-3" />

      {/* ── One-line explanation ──────────────────────────────────────────── */}
      <p className="text-text-primary text-sm leading-relaxed">
        {advice.explanation}
      </p>

      {/* ── Expandable theory section ─────────────────────────────────────── */}
      {/*
        <details> is a native HTML element that toggles open/closed.
        No JavaScript needed — the browser handles it.
      */}
      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-gold hover:text-gold-light transition-colors select-none flex items-center gap-1">
          {/* Rotate the chevron when open — CSS-only via group-open */}
          <span className="inline-block transition-transform group-open:rotate-90">▶</span>
          Learn more
        </summary>

        {/* Expanded theory text */}
        <p className="mt-2 text-text-secondary text-sm leading-relaxed border-l-2 border-gold/30 pl-3">
          {advice.detailedExplanation}
        </p>
      </details>
    </div>
  )
}

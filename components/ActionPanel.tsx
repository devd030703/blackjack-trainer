/**
 * components/ActionPanel.tsx
 *
 * The four action buttons: Hit, Stand, Double, Split (and Surrender if enabled).
 *
 * Features:
 * - Disables Double and Split when they're not applicable
 * - In Coach mode, highlights the recommended action with a gold glow
 * - Briefly flashes green (correct) or red (incorrect) after the player acts
 * - Satisfying press animation on all buttons (scale-down on click)
 * - Mobile-friendly: large tap targets
 */

'use client'

import { useState, useEffect } from 'react'
import type { GameState, PlayerAction, GameMode, StrategyAdvice } from '@/lib/types'
import { canDouble, canSplit } from '@/lib/blackjack'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActionPanelProps {
  gameState: GameState
  onAction: (action: PlayerAction) => void
  gameMode: GameMode
  /** Strategy advice — used to highlight the recommended button in Coach mode */
  advice: StrategyAdvice | null
  /** Whether the player just made a decision (triggers flash animation) */
  lastActionResult?: 'correct' | 'incorrect' | null
}

// ─── Button config ────────────────────────────────────────────────────────────

interface ActionButton {
  action: PlayerAction
  label: string
  /** Short key hint shown below label */
  hint?: string
}

// The four main buttons in display order
const BUTTONS: ActionButton[] = [
  { action: 'hit',       label: 'Hit',         hint: 'H' },
  { action: 'stand',     label: 'Stand',        hint: 'S' },
  { action: 'double',    label: 'Double',       hint: 'D' },
  { action: 'split',     label: 'Split',        hint: 'P' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionPanel({
  gameState,
  onAction,
  gameMode,
  advice,
  lastActionResult,
}: ActionPanelProps) {
  /**
   * flashAction: which button to flash after the player acts.
   * We show a green flash for correct moves, red for incorrect.
   */
  const [flashAction, setFlashAction] = useState<PlayerAction | null>(null)
  const [flashType, setFlashType] = useState<'correct' | 'incorrect' | null>(null)

  /**
   * When lastActionResult changes, trigger a brief flash on the button
   * that was just pressed, then clear it after 800ms.
   */
  useEffect(() => {
    if (lastActionResult && gameState.lastDecision) {
      setFlashAction(gameState.lastDecision.playerAction)
      setFlashType(lastActionResult)

      const timer = setTimeout(() => {
        setFlashAction(null)
        setFlashType(null)
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [lastActionResult, gameState.lastDecision])

  // ── Determine which actions are available ─────────────────────────────────
  const playerCards = gameState.playerHand ?? []
  const phase = gameState.phase

  // Only show buttons during the player's turn
  const isPlayerTurn = phase === 'playerTurn'

  // Check which special actions are eligible
  const doubleAllowed  = isPlayerTurn && canDouble(playerCards, gameState.rules)
  const splitAllowed   = isPlayerTurn && canSplit(playerCards, gameState.rules)
  const surrenderAllowed = gameState.rules.surrenderAllowed && playerCards.length === 2 && isPlayerTurn

  // Determine which action the strategy recommends (for coach mode highlight)
  const recommendedAction = advice?.optimalAction ?? null

  // ── Build button list including optional surrender ─────────────────────────
  const allButtons = surrenderAllowed
    ? [...BUTTONS, { action: 'surrender' as PlayerAction, label: 'Surrender', hint: 'R' }]
    : BUTTONS

  // ── Button style builder ───────────────────────────────────────────────────

  /**
   * Returns the complete className string for a given action button.
   * Factors in: disabled state, coach highlight, flash state.
   */
  function getButtonStyle(action: PlayerAction, disabled: boolean): string {
    const base = `
      relative flex-1 min-w-0
      py-4 px-2
      rounded-xl
      text-sm font-semibold
      transition-all duration-75
      active:scale-95
      focus:outline-none focus:ring-2 focus:ring-gold/50
      select-none
    `

    // Flash state overrides everything else for 800ms after an action
    if (flashAction === action && flashType === 'correct') {
      return base + ' bg-correct-green/20 border-2 border-correct-green text-correct-green scale-95'
    }
    if (flashAction === action && flashType === 'incorrect') {
      return base + ' bg-incorrect-red/20 border-2 border-incorrect-red text-incorrect-red scale-95'
    }

    // Disabled button
    if (disabled) {
      return base + ' bg-bg-dark/40 border border-text-secondary/20 text-text-secondary/40 cursor-not-allowed'
    }

    // Coach mode: highlight the recommended action with a gold glow/ring
    if (gameMode === 'coach' && action === recommendedAction) {
      return base + ' bg-gold/20 border-2 border-gold text-gold font-bold' +
             ' shadow-[0_0_12px_rgba(201,168,76,0.5)]' +
             ' animate-[coach-pulse_2s_ease-in-out_infinite]'
    }

    // Normal enabled button
    return base + ' bg-felt-green-light/60 border border-gold/20 text-text-primary hover:bg-felt-green-light hover:border-gold/40 hover:text-gold-light'
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isPlayerTurn) {
    // Don't show buttons outside of player turn (could show a disabled state)
    return null
  }

  return (
    <div className="w-full">
      {/* Coach mode banner */}
      {gameMode === 'coach' && recommendedAction && (
        <p className="text-center text-xs text-gold/70 mb-2 animate-[fade-scale_200ms_ease-out]">
          Coach suggests:{' '}
          <span className="font-semibold text-gold">
            {recommendedAction.charAt(0).toUpperCase() + recommendedAction.slice(1)}
          </span>
        </p>
      )}

      {/* Button grid */}
      <div className="flex gap-2">
        {allButtons.map(({ action, label }) => {
          // Determine if this specific button should be disabled
          let disabled = !isPlayerTurn
          if (action === 'double')    disabled = !doubleAllowed
          if (action === 'split')     disabled = !splitAllowed
          if (action === 'surrender') disabled = !surrenderAllowed

          return (
            <button
              key={action}
              onClick={() => !disabled && onAction(action)}
              disabled={disabled}
              className={getButtonStyle(action, disabled)}
              aria-label={label}
            >
              {label}

              {/* Small coach indicator dot on the recommended button */}
              {gameMode === 'coach' && action === recommendedAction && !disabled && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

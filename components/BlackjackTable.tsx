/**
 * components/BlackjackTable.tsx
 *
 * The centrepiece of the app — the casino blackjack table.
 *
 * This component renders:
 * - The felt green table with gold trim
 * - Dealer's hand at the top (hole card face-down during player turn)
 * - Player's hand at the bottom (or split hands side-by-side)
 * - Hand value badges for both sides
 * - The result overlay (WIN / LOSE / PUSH / BLACKJACK) at hand end
 * - ActionPanel (Hit/Stand/Double/Split buttons)
 * - CoachPanel (feedback after each decision)
 * - ProbabilityPanel (bust% and dealer pressure)
 *
 * It receives all game state as props and calls back to page.tsx
 * via the onAction handler when the player makes a move.
 */

'use client'

import { useState, useEffect } from 'react'
import type { GameState, PlayerAction, GameMode, StrategyAdvice, ProbabilityInfo, DecisionRecord } from '@/lib/types'
import { getHandValue, isBust, isBlackjack } from '@/lib/blackjack'
import Card from './Card'
import ActionPanel from './ActionPanel'
import CoachPanel from './CoachPanel'
import ProbabilityPanel from './ProbabilityPanel'

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlackjackTableProps {
  gameState: GameState
  onAction: (action: PlayerAction) => void
  onStartHand: () => void
  onNextHand: () => void
  gameMode: GameMode
  advice: StrategyAdvice | null
  probInfo: ProbabilityInfo | null
  lastActionResult?: 'correct' | 'incorrect' | null
}

// ─── Sub-component: hand value badge ─────────────────────────────────────────

/**
 * Shows the numeric total of a hand in a styled badge.
 * Turns red if busted, gold if blackjack.
 */
function HandValueBadge({
  cards,
  label,
  hideValue = false,
}: {
  cards: ReturnType<typeof Array.prototype.filter>
  label: string
  hideValue?: boolean
}) {
  if (!cards || cards.length === 0) return null

  // Calculate value of face-up cards only
  const faceUpCards = cards.filter((c: { faceUp: boolean }) => c.faceUp)
  if (faceUpCards.length === 0) return null

  const { value, isSoft } = getHandValue(faceUpCards)
  const busted = faceUpCards.length === cards.length && value > 21
  const bj = cards.length === 2 && isBlackjack(faceUpCards)

  if (hideValue) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-panel/80 border border-gold/20">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs text-text-secondary">?</span>
      </div>
    )
  }

  const textColour = busted ? 'text-incorrect-red' : bj ? 'text-gold-light' : 'text-text-primary'
  const label2 = bj ? 'Blackjack!' : busted ? 'Bust!' : isSoft ? `Soft ${value}` : `${value}`

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-panel/80 border border-gold/20">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={`text-sm font-bold font-display ${textColour}`}>{label2}</span>
    </div>
  )
}

// ─── Sub-component: card row ──────────────────────────────────────────────────

/**
 * Renders a row of cards for one hand.
 * Cards animate in from `animateDir` when first rendered.
 */
function CardRow({
  cards,
  animateDir,
  label,
  isActive = true,
}: {
  cards: Array<{ id: string; faceUp: boolean; suit: string; rank: string }>
  animateDir: 'top' | 'bottom'
  label: string
  isActive?: boolean
}) {
  if (!cards || cards.length === 0) return null

  return (
    <div className={`flex flex-col items-center gap-2 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap justify-center gap-2">
        {cards.map((card, index) => (
          <Card
            key={card.id}
            card={card as Parameters<typeof Card>[0]['card']}
            animateIn={animateDir}
            // Stagger the animation: each card arrives slightly after the previous
            className=""
            // The animation delay is handled via inline style
          />
        ))}
      </div>
    </div>
  )
}

// ─── Result overlay ───────────────────────────────────────────────────────────

/**
 * Full-screen overlay shown at the end of a hand.
 * Fades in and shows WIN / LOSE / PUSH / BLACKJACK.
 */
function ResultOverlay({
  result,
  onNext,
}: {
  result: GameState['result']
  onNext: () => void
}) {
  if (!result) return null

  const config = {
    win:       { text: 'Win!',       colour: 'text-correct-green',  bg: 'bg-correct-green/10',  border: 'border-correct-green/40' },
    blackjack: { text: 'Blackjack!', colour: 'text-gold-light',      bg: 'bg-gold/10',            border: 'border-gold/40' },
    push:      { text: 'Push',       colour: 'text-accent-amber',    bg: 'bg-accent-amber/10',   border: 'border-accent-amber/40' },
    lose:      { text: 'Lose',       colour: 'text-incorrect-red',   bg: 'bg-incorrect-red/10',  border: 'border-incorrect-red/40' },
    bust:      { text: 'Bust!',      colour: 'text-incorrect-red',   bg: 'bg-incorrect-red/10',  border: 'border-incorrect-red/40' },
  }

  const { text, colour, bg, border } = config[result]

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div
        className={`
          animate-[fade-scale_200ms_ease-out]
          ${bg} ${border} border-2
          rounded-2xl px-8 py-5 text-center
          backdrop-blur-sm
          pointer-events-auto
        `}
      >
        <p className={`text-4xl font-bold font-display ${colour} mb-3`}>{text}</p>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold rounded-lg text-sm font-semibold transition-colors"
        >
          Next Hand →
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BlackjackTable({
  gameState,
  onAction,
  onStartHand,
  onNextHand,
  gameMode,
  advice,
  probInfo,
  lastActionResult,
}: BlackjackTableProps) {
  const { phase, playerHand, dealerHand, splitHands, currentSplitIndex, result } = gameState

  // Determine the active player hand (main hand or current split hand)
  const activeHand = splitHands.length > 0 ? splitHands[currentSplitIndex] : playerHand

  // Whether to hide the dealer's second card (hole card is face-down during player turn)
  const hideDealerTotal = phase === 'playerTurn' || phase === 'dealing'

  return (
    /*
      The outer wrapper fills the available space and adds the felt texture.
      position: relative is needed for the ResultOverlay to be positioned within it.
    */
    <div className="felt-texture table-border rounded-2xl w-full overflow-hidden relative flex flex-col min-h-[520px] sm:min-h-[580px]">

      {/* ── Mode indicator banner ─────────────────────────────────────────── */}
      {gameMode === 'coach' && (
        <div className="bg-gold/10 border-b border-gold/20 px-4 py-1.5 text-center">
          <p className="text-xs text-gold">
            Coach Mode — recommended moves are highlighted
          </p>
        </div>
      )}

      {/* ── Dealer zone ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center pt-6 pb-3 px-4">
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
          Dealer
        </p>

        {/* Dealer's cards */}
        {dealerHand && dealerHand.length > 0 ? (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-2">
              {dealerHand.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  animateIn="top"
                />
              ))}
            </div>
            {/* Dealer hand value — hide total when hole card is face-down */}
            <HandValueBadge
              cards={dealerHand}
              label="Dealer:"
              hideValue={hideDealerTotal}
            />
          </>
        ) : (
          /* Placeholder shown before cards are dealt */
          <div className="flex gap-2 opacity-20">
            <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-gold/40" />
            <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-gold/40" />
          </div>
        )}
      </div>

      {/* ── Felt divider line ─────────────────────────────────────────────── */}
      <div className="gold-separator mx-6" />

      {/* ── Player zone ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center pt-3 pb-4 px-4">
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
          You
        </p>

        {/* Split hands: show side by side with active hand highlighted */}
        {splitHands.length > 0 ? (
          <div className="flex gap-4 mb-2">
            {splitHands.map((hand, index) => (
              <div
                key={index}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                  index === currentSplitIndex
                    ? 'ring-2 ring-gold/60 bg-gold/5'
                    : 'opacity-50'
                }`}
              >
                <div className="flex gap-1.5">
                  {hand.map((card) => (
                    <Card key={card.id} card={card} animateIn="bottom" />
                  ))}
                </div>
                <HandValueBadge
                  cards={hand}
                  label={`Hand ${index + 1}:`}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Main hand */
          <>
            {playerHand && playerHand.length > 0 ? (
              <>
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {playerHand.map((card) => (
                    <Card key={card.id} card={card} animateIn="bottom" />
                  ))}
                </div>
                <HandValueBadge cards={playerHand} label="You:" />
              </>
            ) : (
              /* Placeholder */
              <div className="flex gap-2 opacity-20">
                <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-gold/40" />
                <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-gold/40" />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Result overlay (shown when hand is over) ──────────────────────── */}
      {phase === 'result' && result && (
        <ResultOverlay result={result} onNext={onNextHand} />
      )}

      {/* ── Action / coaching zone ────────────────────────────────────────── */}
      {phase !== 'result' && (
        <div className="bg-bg-dark/40 border-t border-gold/10 px-4 pb-4 pt-3">
          {/* Start hand button (when idle) */}
          {phase === 'idle' && (
            <button
              onClick={onStartHand}
              className="w-full py-4 bg-gold/20 hover:bg-gold/30 border border-gold/40 hover:border-gold text-gold font-bold rounded-xl transition-all active:scale-95 font-display text-lg"
            >
              Deal Cards
            </button>
          )}

          {/* Action buttons (during player turn) */}
          {phase === 'playerTurn' && (
            <>
              <ActionPanel
                gameState={gameState}
                onAction={onAction}
                gameMode={gameMode}
                advice={advice}
                lastActionResult={lastActionResult}
              />

              {/* Probability panel below the buttons */}
              <ProbabilityPanel probInfo={probInfo} />

              {/* Coach panel (feedback on last decision) */}
              {gameState.lastAdvice && gameState.lastDecision && (
                <CoachPanel
                  advice={gameState.lastAdvice}
                  decision={gameState.lastDecision}
                />
              )}
            </>
          )}

          {/* Waiting indicator during dealer's turn */}
          {phase === 'dealerTurn' && (
            <div className="text-center py-3">
              <p className="text-text-secondary text-sm animate-pulse">
                Dealer is playing…
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

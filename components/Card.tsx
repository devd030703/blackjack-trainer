/**
 * components/Card.tsx
 *
 * Renders a single playing card.
 *
 * Cards can be:
 * - Face-up: shows the rank and suit symbol
 * - Face-down: shows a decorative card back pattern
 *
 * Supports two deal animations:
 * - 'top':    card slides in from above (for dealer cards)
 * - 'bottom': card slides in from below (for player cards)
 *
 * The flip animation plays when a face-down card is revealed
 * (e.g. dealer's hole card at the start of the dealer's turn).
 */

'use client'  // This component uses animation state, so it must be a Client Component

import { useEffect, useState } from 'react'
import type { Card as CardType } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardProps {
  /** The card data (rank, suit, faceUp, id) */
  card: CardType
  /** Which direction the deal-in animation comes from */
  animateIn?: 'top' | 'bottom'
  /** Additional CSS classes (e.g. for positioning offsets) */
  className?: string
}

// ─── Suit helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the Unicode symbol for a suit.
 * ♠ ♥ ♦ ♣
 */
function getSuitSymbol(suit: CardType['suit']): string {
  const symbols = {
    spades:   '♠',
    hearts:   '♥',
    diamonds: '♦',
    clubs:    '♣',
  }
  return symbols[suit]
}

/**
 * Returns true if the suit should be displayed in red.
 * Hearts and diamonds are red; clubs and spades are dark/black.
 */
function isRedSuit(suit: CardType['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

/**
 * Returns a display label for the rank.
 * All ranks display as-is (A, 2–10, J, Q, K).
 */
function getRankDisplay(rank: CardType['rank']): string {
  return rank
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Card({ card, animateIn, className = '' }: CardProps) {
  /**
   * `isFlipping` tracks whether the flip animation is currently playing.
   * We trigger it when a face-down card becomes face-up (hole card reveal).
   */
  const [isFlipping, setIsFlipping] = useState(false)

  /**
   * `wasFlippedFrom` remembers the previous faceUp state so we know
   * when a face-down → face-up transition happens.
   */
  const [prevFaceUp, setPrevFaceUp] = useState(card.faceUp)

  /**
   * Watch for changes in faceUp status.
   * If the card transitions from face-down to face-up, play the flip animation.
   */
  useEffect(() => {
    if (!prevFaceUp && card.faceUp) {
      // Card was just revealed — trigger flip animation
      setIsFlipping(true)
      // Clear the flip class after the animation completes (600ms)
      const timer = setTimeout(() => setIsFlipping(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevFaceUp(card.faceUp)
  }, [card.faceUp, prevFaceUp])

  // ── Deal-in animation class ────────────────────────────────────────────────
  // Tailwind v4 supports arbitrary animation values with this syntax:
  // animate-[keyframe-name_duration_easing]
  const dealAnimation =
    animateIn === 'top'    ? 'animate-[deal-in-top_350ms_ease-out]' :
    animateIn === 'bottom' ? 'animate-[deal-in-bottom_350ms_ease-out]' :
    ''

  // ── Flip animation class ───────────────────────────────────────────────────
  const flipAnimation = isFlipping ? 'animate-[flip-reveal_600ms_ease-in-out]' : ''

  // ── Suit colour ───────────────────────────────────────────────────────────
  const suitColour = isRedSuit(card.suit) ? 'text-red-500' : 'text-gray-900'

  // ── Render face-down card ──────────────────────────────────────────────────
  if (!card.faceUp) {
    return (
      <div
        className={`
          card-back
          relative w-16 h-24 sm:w-20 sm:h-28
          rounded-lg
          flex items-center justify-center
          select-none
          ${dealAnimation}
          ${flipAnimation}
          ${className}
        `}
        style={{
          boxShadow: '3px 3px 8px rgba(0,0,0,0.5)',
        }}
      >
        {/* Decorative suit symbol watermark on back */}
        <span className="text-3xl text-white/10 font-display select-none">♠</span>
      </div>
    )
  }

  // ── Render face-up card ────────────────────────────────────────────────────
  const rankDisplay = getRankDisplay(card.rank)
  const suitSymbol = getSuitSymbol(card.suit)

  return (
    <div
      className={`
        relative w-16 h-24 sm:w-20 sm:h-28
        rounded-lg
        bg-card-white
        flex items-center justify-center
        select-none
        ${dealAnimation}
        ${flipAnimation}
        ${className}
      `}
      style={{
        boxShadow: '3px 3px 8px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top-left rank + suit */}
      <div className={`absolute top-1 left-1.5 flex flex-col items-center leading-none ${suitColour}`}>
        <span className="text-xs sm:text-sm font-bold font-display">{rankDisplay}</span>
        <span className="text-xs">{suitSymbol}</span>
      </div>

      {/* Centre suit symbol — large, decorative */}
      <span className={`text-2xl sm:text-3xl ${suitColour} opacity-30 select-none`}>
        {suitSymbol}
      </span>

      {/* Bottom-right rank + suit, rotated 180° to mirror the top-left */}
      <div
        className={`
          absolute bottom-1 right-1.5
          flex flex-col items-center leading-none
          rotate-180
          ${suitColour}
        `}
      >
        <span className="text-xs sm:text-sm font-bold font-display">{rankDisplay}</span>
        <span className="text-xs">{suitSymbol}</span>
      </div>
    </div>
  )
}

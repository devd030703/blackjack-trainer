/**
 * components/ModeSelector.tsx
 *
 * Navigation tabs at the top of the app.
 * Lets the user switch between the five modes:
 *   Play | Coach | Drill | Review | Stats
 *
 * The active tab has a gold underline.
 * On mobile, the tab bar scrolls horizontally if needed.
 */

'use client'

import type { GameMode } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ModeSelectorProps {
  activeMode: GameMode
  onModeChange: (mode: GameMode) => void
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { mode: GameMode; label: string; description: string }[] = [
  { mode: 'play',   label: 'Play',   description: 'Standard game with coaching' },
  { mode: 'coach',  label: 'Coach',  description: 'Moves highlighted before you decide' },
  { mode: 'drill',  label: 'Drill',  description: 'Rapid-fire scenario practice' },
  { mode: 'review', label: 'Review', description: 'Replay your past mistakes' },
  { mode: 'stats',  label: 'Stats',  description: 'Performance dashboard' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <nav
      className="border-b border-gold/20 bg-bg-panel"
      aria-label="App modes"
    >
      {/*
        overflow-x-auto makes the tab bar scrollable on mobile.
        scrollbar-hide would need a plugin; instead we use overflow styling.
        flex-nowrap prevents tabs from wrapping to a new line.
      */}
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(({ mode, label }) => {
          const isActive = mode === activeMode

          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex-shrink-0
                px-5 py-3.5
                text-sm font-semibold
                border-b-2
                transition-all duration-150
                focus:outline-none
                ${isActive
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gold/30'
                }
              `}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

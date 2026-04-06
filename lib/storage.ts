/**
 * lib/storage.ts
 *
 * localStorage persistence helpers for the blackjack trainer.
 *
 * All functions are SSR-safe: they check `typeof window !== 'undefined'`
 * before accessing localStorage. This prevents errors during Next.js
 * server-side rendering, where the browser APIs don't exist.
 *
 * Errors are caught silently so localStorage failures (e.g. private browsing
 * mode, quota exceeded) don't crash the app.
 */

import type { GameStats, GameRules, DecisionRecord } from './types'
import { DEFAULT_RULES } from './rules'

// ─── Storage keys ─────────────────────────────────────────────────────────────

/** Namespace all keys so we don't clash with other apps on the same origin */
const KEYS = {
  stats:     'bj_trainer_stats',
  rules:     'bj_trainer_rules',
  decisions: 'bj_trainer_decisions',
} as const

// ─── Default empty stats ──────────────────────────────────────────────────────

/**
 * Returns a fresh, empty GameStats object.
 * Used when no saved data exists yet (first visit) or after a reset.
 */
export function createEmptyStats(): GameStats {
  return {
    totalHands: 0,
    totalDecisions: 0,
    correctDecisions: 0,
    mistakesByCategory: {
      hard: 0,
      soft: 0,
      pair: 0,
    },
    recentDecisions: [],
    weakScenarios: [],
  }
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Safely reads a JSON value from localStorage.
 * Returns null if localStorage is unavailable or the key doesn't exist.
 *
 * @param key - The localStorage key to read
 * @returns Parsed value, or null on any failure
 */
function readStorage<T>(key: string): T | null {
  // Guard: localStorage doesn't exist on the server (Next.js SSR)
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    // JSON.parse failure, quota issues, or security errors in private mode
    return null
  }
}

/**
 * Safely writes a JSON value to localStorage.
 * Silently fails if localStorage is unavailable.
 *
 * @param key - The localStorage key to write
 * @param value - The value to serialise and store
 */
function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // QuotaExceededError or SecurityError — just skip
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Saves the full stats object to localStorage.
 * Called in a useEffect in page.tsx whenever stats change.
 *
 * @param stats - The current GameStats to persist
 */
export function saveStats(stats: GameStats): void {
  writeStorage(KEYS.stats, stats)
}

/**
 * Loads stats from localStorage.
 * Returns empty default stats if nothing has been saved yet.
 *
 * @returns The saved GameStats, or fresh empty stats
 */
export function loadStats(): GameStats {
  const saved = readStorage<GameStats>(KEYS.stats)
  if (!saved) return createEmptyStats()

  // Merge with defaults to handle any new fields added in future app versions
  return {
    ...createEmptyStats(),
    ...saved,
    // Ensure nested objects are also merged safely
    mistakesByCategory: {
      hard: 0,
      soft: 0,
      pair: 0,
      ...(saved.mistakesByCategory ?? {}),
    },
  }
}

// ─── Rules ────────────────────────────────────────────────────────────────────

/**
 * Saves the user's preferred game rules to localStorage.
 * Called whenever the user changes a setting in RulesSettings.
 *
 * @param rules - The GameRules to persist
 */
export function saveRules(rules: GameRules): void {
  writeStorage(KEYS.rules, rules)
}

/**
 * Loads saved rules from localStorage.
 * Returns DEFAULT_RULES if nothing has been saved yet.
 *
 * @returns The saved GameRules, or the defaults
 */
export function loadRules(): GameRules {
  const saved = readStorage<GameRules>(KEYS.rules)
  if (!saved) return DEFAULT_RULES

  // Merge with defaults so new rule fields added in updates don't break
  return { ...DEFAULT_RULES, ...saved }
}

// ─── Decision history ─────────────────────────────────────────────────────────

/**
 * Saves a new decision record, appended to the stored history.
 * Automatically trims to the last 200 decisions to prevent unbounded growth.
 *
 * @param decision - The decision record to append
 */
export function saveDecision(decision: DecisionRecord): void {
  const existing = loadDecisions()
  // Add new decision to the end, then keep only the last 200
  const updated = [...existing, decision].slice(-200)
  writeStorage(KEYS.decisions, updated)
}

/**
 * Loads all stored decision records.
 * Returns an empty array if nothing has been saved yet.
 *
 * @returns Array of DecisionRecord objects, oldest first
 */
export function loadDecisions(): DecisionRecord[] {
  return readStorage<DecisionRecord[]>(KEYS.decisions) ?? []
}

// ─── Reset ────────────────────────────────────────────────────────────────────

/**
 * Clears all saved app data from localStorage.
 * Called when the user clicks "Reset all data" in the Stats Dashboard.
 */
export function clearAll(): void {
  if (typeof window === 'undefined') return

  try {
    Object.values(KEYS).forEach((key) => {
      window.localStorage.removeItem(key)
    })
  } catch {
    // Ignore errors
  }
}

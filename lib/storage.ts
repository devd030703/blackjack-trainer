// This file provides browser-safe localStorage helpers for rules, stats, and decision history.

import { getDecisionScenarioKey } from "@/lib/decision-records";
import { getDecisionScenarioType } from "@/lib/learning-events";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/rules";
import type { DecisionRecord, GameRules, GameStats } from "@/lib/types";

const STATS_KEY = "blackjack-trainer-stats";
const RULES_KEY = "blackjack-trainer-rules";
const DECISIONS_KEY = "blackjack-trainer-decisions";
const MAX_DECISIONS = 200;

// This function returns an empty stats object for first-time users or failed reads.
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
  };
}

// This function safely reads a localStorage item and returns null when storage is unavailable.
function readStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}".`, error);
    return null;
  }
}

// This function safely writes a value to localStorage and ignores failures gracefully.
function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}".`, error);
  }
}

// This function saves the full stats object for later sessions.
export function saveStats(stats: GameStats): void {
  writeStorage(STATS_KEY, JSON.stringify(stats));
}

// This function loads saved stats or returns a clean default object.
export function loadStats(): GameStats {
  const rawStats = readStorage(STATS_KEY);

  if (!rawStats) {
    return createEmptyStats();
  }

  try {
    const parsedStats = JSON.parse(rawStats) as GameStats;

    return {
      ...createEmptyStats(),
      ...parsedStats,
      mistakesByCategory: {
        ...createEmptyStats().mistakesByCategory,
        ...parsedStats.mistakesByCategory,
      },
      recentDecisions: Array.isArray(parsedStats.recentDecisions)
        ? parsedStats.recentDecisions
            .slice(0, MAX_DECISIONS)
            .map((decision) => normalizeDecisionRecord(decision, DEFAULT_RULES))
        : [],
      weakScenarios: Array.isArray(parsedStats.weakScenarios)
        ? parsedStats.weakScenarios
        : [],
    };
  } catch (error) {
    console.error("Failed to parse saved stats.", error);
    return createEmptyStats();
  }
}

// This function saves the user's preferred table rules.
export function saveRules(rules: GameRules): void {
  writeStorage(RULES_KEY, JSON.stringify(rules));
}

// This function loads saved rules or returns the default configuration.
export function loadRules(): GameRules {
  const rawRules = readStorage(RULES_KEY);

  if (!rawRules) {
    return DEFAULT_RULES;
  }

  try {
    return sanitizeRules(JSON.parse(rawRules));
  } catch (error) {
    console.error("Failed to parse saved rules.", error);
    return DEFAULT_RULES;
  }
}

// This function appends one decision to history and trims the list to the newest 200 records.
export function saveDecision(decision: DecisionRecord): void {
  const decisions = loadDecisions(decision.rulesSnapshot);
  const nextDecisions = [decision, ...decisions].slice(0, MAX_DECISIONS);
  writeStorage(DECISIONS_KEY, JSON.stringify(nextDecisions));
}

// This function returns saved decision history, capped to the most recent 200 entries.
export function loadDecisions(fallbackRules?: GameRules): DecisionRecord[] {
  const rawDecisions = readStorage(DECISIONS_KEY);

  if (!rawDecisions) {
    return [];
  }

  try {
    const parsedDecisions = JSON.parse(rawDecisions) as DecisionRecord[];
    return Array.isArray(parsedDecisions)
      ? parsedDecisions.slice(0, MAX_DECISIONS).map((decision) => normalizeDecisionRecord(decision, fallbackRules))
      : [];
  } catch (error) {
    console.error("Failed to parse saved decisions.", error);
    return [];
  }
}

// This function clears all persisted trainer data from localStorage.
export function clearAll(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STATS_KEY);
    window.localStorage.removeItem(RULES_KEY);
    window.localStorage.removeItem(DECISIONS_KEY);
  } catch (error) {
    console.error("Failed to clear trainer data.", error);
  }
}

// This function backfills newer decision fields when older localStorage payloads are loaded.
function normalizeDecisionRecord(
  decision: DecisionRecord,
  fallbackRules?: GameRules,
): DecisionRecord {
  const rulesSnapshot = decision.rulesSnapshot ? sanitizeRules(decision.rulesSnapshot) : fallbackRules;
  const normalizedMode = decision.mode ?? "play";
  const normalizedDecision: DecisionRecord = {
    ...decision,
    mode: normalizedMode,
    scenarioKey: decision.scenarioKey ?? "",
    scenarioType: decision.scenarioType ?? getDecisionScenarioType(decision.handCategory),
    responseTimeMs: Math.max(0, decision.responseTimeMs ?? 0),
    usedHint: decision.usedHint ?? normalizedMode === "coach",
    attemptNumber: Math.max(1, decision.attemptNumber ?? 1),
    isFirstExposure: decision.isFirstExposure ?? (decision.attemptNumber ?? 1) <= 1,
    isRepeatedMistake: decision.isRepeatedMistake ?? false,
    previousExposureCount: Math.max(0, decision.previousExposureCount ?? 0),
    previousMistakeCount: Math.max(0, decision.previousMistakeCount ?? 0),
    isAfterSplit: decision.isAfterSplit ?? false,
    rulesSnapshot,
  };

  return {
    ...normalizedDecision,
    scenarioKey:
      normalizedDecision.scenarioKey || getDecisionScenarioKey(normalizedDecision, normalizedDecision.rulesSnapshot),
  };
}

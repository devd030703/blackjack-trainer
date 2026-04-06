// This file builds rich learning-event records from player decisions across all training modes.

import { getDecisionScenarioKey } from "@/lib/decision-records";
import type {
  Card,
  DecisionMode,
  DecisionRecord,
  DecisionScenarioType,
  GameRules,
  HandCategory,
  PlayerAction,
} from "@/lib/types";

interface LearningEventInput {
  playerHand: Card[];
  dealerUpcard: Card;
  playerAction: PlayerAction;
  optimalAction: PlayerAction;
  handCategory: HandCategory;
  playerTotal: number;
  rules: GameRules;
  isAfterSplit: boolean;
  mode: DecisionMode;
  priorDecisions: DecisionRecord[];
  responseTimeMs: number;
  usedHint: boolean;
}

// This function maps a blackjack hand category to a broader scenario type for learning analytics.
export function getDecisionScenarioType(handCategory: HandCategory): DecisionScenarioType {
  if (handCategory === "soft") {
    return "soft-total";
  }

  if (handCategory === "pair") {
    return "pair";
  }

  return "hard-total";
}

// This function builds one normalized learning event with exposure and repeated-mistake metadata.
export function createLearningEvent(input: LearningEventInput): DecisionRecord {
  const timestamp = Date.now();
  const wasCorrect = input.playerAction === input.optimalAction;
  const baseRecord: DecisionRecord = {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    mode: input.mode,
    scenarioKey: "",
    scenarioType: getDecisionScenarioType(input.handCategory),
    playerHand: input.playerHand,
    dealerUpcard: input.dealerUpcard,
    playerAction: input.playerAction,
    optimalAction: input.optimalAction,
    wasCorrect,
    responseTimeMs: Math.max(0, Math.round(input.responseTimeMs)),
    usedHint: input.usedHint,
    attemptNumber: 1,
    isFirstExposure: true,
    isRepeatedMistake: false,
    previousExposureCount: 0,
    previousMistakeCount: 0,
    handCategory: input.handCategory,
    playerTotal: input.playerTotal,
    isAfterSplit: input.isAfterSplit,
    rulesSnapshot: input.rules,
  };
  const scenarioKey = getDecisionScenarioKey(baseRecord, input.rules);
  const { previousExposureCount, previousMistakeCount } = getScenarioHistory(
    input.priorDecisions,
    scenarioKey,
    input.rules,
  );

  return {
    ...baseRecord,
    scenarioKey,
    attemptNumber: previousExposureCount + 1,
    isFirstExposure: previousExposureCount === 0,
    isRepeatedMistake: !wasCorrect && previousMistakeCount > 0,
    previousExposureCount,
    previousMistakeCount,
  };
}

// This function summarizes how often the same scenario has appeared and been missed before this event.
function getScenarioHistory(
  decisions: DecisionRecord[],
  scenarioKey: string,
  rules: GameRules,
): Pick<DecisionRecord, "previousExposureCount" | "previousMistakeCount"> {
  let previousExposureCount = 0;
  let previousMistakeCount = 0;

  for (const decision of decisions) {
    if (getDecisionScenarioKey(decision, rules) !== scenarioKey) {
      continue;
    }

    previousExposureCount += 1;

    if (!decision.wasCorrect) {
      previousMistakeCount += 1;
    }
  }

  return { previousExposureCount, previousMistakeCount };
}

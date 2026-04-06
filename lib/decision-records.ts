// This file provides shared helpers for identifying and resolving saved decision scenarios.

import { getRankBucket } from "@/lib/blackjack";
import type { DecisionRecord, GameRules } from "@/lib/types";

interface RuleKeySource {
  dealerHitsSoft17: boolean;
  doubleAfterSplit: boolean;
  resplitAllowed: boolean;
}

// This function returns the rule snapshot attached to a decision, or a fallback when loading older data.
export function getDecisionRules(
  decision: DecisionRecord,
  fallbackRules?: GameRules,
): GameRules | undefined {
  return decision.rulesSnapshot ?? fallbackRules;
}

// This function returns a stable display label for a saved decision scenario.
export function getDecisionScenarioLabel(decision: DecisionRecord): string {
  const dealerKey = getRankBucket(decision.dealerUpcard.rank);

  if (decision.handCategory === "pair" && decision.playerHand[0]) {
    return `Pair ${getRankBucket(decision.playerHand[0].rank)} vs ${dealerKey}`;
  }

  return `${decision.handCategory} ${decision.playerTotal} vs ${dealerKey}`;
}

// This function returns a scenario key that stays stable across replay attempts for the same spot.
export function getDecisionScenarioKey(
  decision: DecisionRecord,
  fallbackRules?: GameRules,
): string {
  const dealerKey = getRankBucket(decision.dealerUpcard.rank);
  const scenarioValue =
    decision.handCategory === "pair" && decision.playerHand[0]
      ? getRankBucket(decision.playerHand[0].rank)
      : String(decision.playerTotal);
  const ruleKey = buildRuleKey(getDecisionRules(decision, fallbackRules));
  const splitKey = decision.isAfterSplit ? "after-split" : "initial";

  return `${decision.handCategory}-${scenarioValue}-${dealerKey}-${splitKey}-${ruleKey}`;
}

// This function returns the latest unresolved review scenarios from saved decision history.
export function getOutstandingReviewDecisions(
  decisions: DecisionRecord[],
  fallbackRules?: GameRules,
): DecisionRecord[] {
  const latestByScenario = new Map<string, DecisionRecord>();

  for (let index = decisions.length - 1; index >= 0; index -= 1) {
    const decision = decisions[index];
    latestByScenario.set(getDecisionScenarioKey(decision, fallbackRules), decision);
  }

  return Array.from(latestByScenario.values())
    .filter((decision) => !decision.wasCorrect)
    .sort((leftItem, rightItem) => rightItem.timestamp - leftItem.timestamp);
}

// This function creates the compact rule key used in scenario identity strings.
function buildRuleKey(rules?: RuleKeySource): string {
  if (!rules) {
    return "rules-unknown";
  }

  return [
    rules.dealerHitsSoft17 ? "h17" : "s17",
    rules.doubleAfterSplit ? "das" : "no-das",
    rules.resplitAllowed ? "rsa" : "no-rsa",
  ].join("-");
}

"use client";

// This file shows post-decision coaching feedback with expandable theory notes.

import { useState } from "react";
import type { StrategyAdvice } from "@/lib/types";

interface CoachPanelProps {
  advice: StrategyAdvice | null;
  wasCorrect: boolean | null;
  handLabel: string;
}

// This function converts the confidence enum into a readable label.
function getConfidenceLabel(confidence: StrategyAdvice["confidence"]): string {
  if (confidence === "strong") {
    return "Strong recommendation";
  }

  if (confidence === "moderate") {
    return "Moderate edge";
  }

  return "Marginal call";
}

// This function renders the expandable coach feedback panel after a player decision.
export function CoachPanel({ advice, wasCorrect, handLabel }: CoachPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!advice || wasCorrect === null) {
    return (
      <div className="panel-shell coach-slide min-h-44">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Coach</p>
        <h3 className="mt-2 font-display text-xl text-[var(--text-primary)]">Decision feedback appears here</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Take an action and the coach will explain whether your move matched basic strategy.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-shell coach-slide space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Coach</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`text-2xl ${wasCorrect ? "text-[var(--correct-green)]" : "text-[var(--incorrect-red)]"}`}>
              {wasCorrect ? "✓" : "✕"}
            </span>
            <div>
              <h3 className="font-display text-xl text-[var(--text-primary)]">
                Best move: {advice.optimalAction}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{advice.explanation}</p>
            </div>
          </div>
        </div>
        <span className="rounded-full border border-[color:rgba(232,199,106,0.2)] px-3 py-1 text-xs text-[var(--gold-light)]">
          {getConfidenceLabel(advice.confidence)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[color:rgba(255,255,255,0.05)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          {handLabel}
        </span>
        <span className="rounded-full bg-[color:rgba(201,168,76,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--gold-light)]">
          {advice.handCategory}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded((currentState) => !currentState)}
        className="text-sm font-medium text-[var(--gold-light)] transition hover:text-[var(--text-primary)]"
      >
        {isExpanded ? "Hide theory" : "Learn more"}
      </button>

      <div className={`expandable-grid ${isExpanded ? "is-open" : ""}`}>
        <div className="overflow-hidden text-sm leading-6 text-[var(--text-secondary)]">
          {advice.detailedExplanation}
        </div>
      </div>
    </div>
  );
}


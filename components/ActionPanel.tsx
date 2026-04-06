// This file renders the player action buttons used in play, coach, drill, and review modes.

import type { PlayerAction } from "@/lib/types";

interface ActionPanelProps {
  onAction: (action: PlayerAction) => void;
  canDouble: boolean;
  canSplit: boolean;
  recommendedAction?: PlayerAction | null;
  feedbackState?: "correct" | "incorrect" | null;
  disabled?: boolean;
}

interface ActionButtonConfig {
  action: PlayerAction;
  label: string;
  description: string;
  enabled: boolean;
}

// This function returns the label shown under a highlighted recommendation.
function getRecommendationText(action: PlayerAction): string {
  return `Coach recommends ${action}.`;
}

// This function renders the four blackjack action buttons with state-aware styling.
export function ActionPanel({
  onAction,
  canDouble,
  canSplit,
  recommendedAction = null,
  feedbackState = null,
  disabled = false,
}: ActionPanelProps) {
  const actions: ActionButtonConfig[] = [
    { action: "hit", label: "Hit", description: "Take one more card", enabled: true },
    { action: "stand", label: "Stand", description: "Keep your total", enabled: true },
    { action: "double", label: "Double", description: "One card only, bigger edge", enabled: canDouble },
    { action: "split", label: "Split", description: "Turn a pair into two hands", enabled: canSplit },
  ];

  return (
    <div className="panel-shell space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Action Panel</p>
          <h3 className="font-display text-xl text-[var(--text-primary)]">Make your move</h3>
        </div>
        {recommendedAction ? (
          <p className="rounded-full border border-[color:rgba(232,199,106,0.35)] bg-[color:rgba(201,168,76,0.14)] px-3 py-1 text-xs font-medium text-[var(--gold-light)]">
            {getRecommendationText(recommendedAction)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((actionItem) => {
          const isRecommended = recommendedAction === actionItem.action;
          const isDisabled = disabled || !actionItem.enabled;
          const feedbackClass =
            feedbackState === "correct"
              ? "ring-2 ring-[color:rgba(46,204,113,0.7)]"
              : feedbackState === "incorrect"
                ? "ring-2 ring-[color:rgba(231,76,60,0.7)]"
                : "";

          return (
            <button
              key={actionItem.action}
              type="button"
              onClick={() => onAction(actionItem.action)}
              disabled={isDisabled}
              className={`luxury-button min-h-[4.75rem] p-4 text-left ${feedbackClass} ${isRecommended ? "luxury-button-highlight" : ""} ${isDisabled ? "opacity-45 grayscale-[0.15]" : ""}`}
            >
              <span className="block text-base font-semibold text-[var(--text-primary)]">{actionItem.label}</span>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">{actionItem.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

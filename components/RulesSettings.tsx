// This file renders the rule configuration panel and explains how each rule affects play.

import type { ReactNode } from "react";
import { DEFAULT_RULES, RULE_DESCRIPTIONS } from "@/lib/rules";
import type { GameRules } from "@/lib/types";

interface RulesSettingsProps {
  rules: GameRules;
  isOpen: boolean;
  onClose: () => void;
  onChange: (rules: GameRules) => void;
  onReset: () => void;
}

// This function updates one rule field while preserving the rest of the rule object.
function updateRule<K extends keyof GameRules>(
  rules: GameRules,
  key: K,
  value: GameRules[K],
): GameRules {
  return {
    ...rules,
    [key]: value,
  };
}

// This function renders the slide-over settings panel used to edit rule preferences.
export function RulesSettings({
  rules,
  isOpen,
  onClose,
  onChange,
  onReset,
}: RulesSettingsProps) {
  return (
    <aside className={`settings-drawer ${isOpen ? "is-open" : ""}`}>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-panel panel-shell h-full overflow-y-auto rounded-none border-l border-[color:rgba(232,199,106,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Table Rules</p>
            <h2 className="mt-2 font-display text-3xl text-[var(--text-primary)]">Configure your practice table</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:rgba(255,255,255,0.1)] px-3 py-1 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <RuleBlock
            label="Number of decks"
            description={RULE_DESCRIPTIONS.numDecks}
            control={
              <select
                value={rules.numDecks}
                onChange={(event) => onChange(updateRule(rules, "numDecks", Number(event.target.value)))}
                className="settings-select"
              >
                {[1, 2, 4, 6, 8].map((deckCount) => (
                  <option key={deckCount} value={deckCount}>
                    {deckCount} decks
                  </option>
                ))}
              </select>
            }
          />

          <RuleBlock
            label="Dealer hits soft 17"
            description={RULE_DESCRIPTIONS.dealerHitsSoft17}
            control={
              <Toggle
                checked={rules.dealerHitsSoft17}
                onChange={(checked) => onChange(updateRule(rules, "dealerHitsSoft17", checked))}
              />
            }
          />

          <RuleBlock
            label="Blackjack payout"
            description={RULE_DESCRIPTIONS.blackjackPayout}
            control={
              <select
                value={rules.blackjackPayout}
                onChange={(event) =>
                  onChange(updateRule(rules, "blackjackPayout", event.target.value as GameRules["blackjackPayout"]))
                }
                className="settings-select"
              >
                <option value="3:2">3:2</option>
                <option value="6:5">6:5</option>
              </select>
            }
          />

          <RuleBlock
            label="Double after split"
            description={RULE_DESCRIPTIONS.doubleAfterSplit}
            control={
              <Toggle
                checked={rules.doubleAfterSplit}
                onChange={(checked) => onChange(updateRule(rules, "doubleAfterSplit", checked))}
              />
            }
          />

          <RuleBlock
            label="Resplit allowed"
            description={RULE_DESCRIPTIONS.resplitAllowed}
            control={
              <Toggle
                checked={rules.resplitAllowed}
                onChange={(checked) => onChange(updateRule(rules, "resplitAllowed", checked))}
              />
            }
          />

          <RuleBlock
            label="Surrender allowed"
            description={RULE_DESCRIPTIONS.surrenderAllowed}
            control={
              <Toggle
                checked={rules.surrenderAllowed}
                onChange={(checked) => onChange(updateRule(rules, "surrenderAllowed", checked))}
              />
            }
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={onReset} className="luxury-button px-4 py-3">
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_RULES)}
            className="rounded-full border border-[color:rgba(255,255,255,0.12)] px-4 py-3 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Use house-style practice
          </button>
        </div>
      </div>
    </aside>
  );
}

interface RuleBlockProps {
  label: string;
  description: string;
  control: ReactNode;
}

// This function renders one labeled rules row with explanation text and a control.
function RuleBlock({ label, description, control }: RuleBlockProps) {
  return (
    <div className="rounded-[1.5rem] border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <h3 className="font-display text-xl text-[var(--text-primary)]">{label}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div>{control}</div>
      </div>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// This function renders a reusable toggle switch for boolean rule options.
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative flex h-10 w-18 items-center rounded-full border transition ${checked ? "border-[color:rgba(232,199,106,0.45)] bg-[linear-gradient(135deg,rgba(201,168,76,0.3),rgba(35,92,57,0.9))]" : "border-[color:rgba(255,255,255,0.12)] bg-[color:rgba(255,255,255,0.04)]"}`}
    >
      <span
        className={`h-8 w-8 rounded-full bg-[var(--card-white)] shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition ${checked ? "translate-x-8" : "translate-x-1"}`}
      />
    </button>
  );
}

// This file renders the top navigation used to switch between app training modes.

import type { GameMode } from "@/lib/types";

interface ModeSelectorProps {
  activeMode: GameMode;
  onChange: (mode: GameMode) => void;
}

const MODE_LABELS: Record<GameMode, { title: string; description: string }> = {
  play: { title: "Play", description: "Full hands with silent stat tracking" },
  coach: { title: "Coach", description: "Guided play with highlighted moves" },
  drill: { title: "Drill", description: "Adaptive sessions built from your leaks" },
  review: { title: "Review", description: "Revisit missed decisions" },
  stats: { title: "Stats", description: "Measure progress and weak spots" },
};

// This function renders the mode selector tabs for the trainer shell.
export function ModeSelector({ activeMode, onChange }: ModeSelectorProps) {
  return (
    <nav className="rounded-[2rem] border border-[color:rgba(232,199,106,0.16)] bg-[color:rgba(11,25,19,0.82)] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur">
      <div className="flex gap-2 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-5 sm:overflow-x-visible sm:pb-0">
        {Object.entries(MODE_LABELS).map(([modeKey, modeValue]) => {
          const mode = modeKey as GameMode;
          const isActive = mode === activeMode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={`shrink-0 rounded-[1.35rem] px-4 py-3 text-left transition duration-200 sm:shrink sm:w-auto ${isActive ? "bg-[linear-gradient(135deg,rgba(201,168,76,0.24),rgba(26,74,46,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_20px_rgba(0,0,0,0.18)]" : "hover:bg-[color:rgba(255,255,255,0.04)]"}`}
            >
              <span className="block font-display text-base text-[var(--text-primary)] sm:text-lg">{modeValue.title}</span>
              <span className="hidden sm:mt-1 sm:block text-xs leading-5 text-[var(--text-secondary)]">
                {modeValue.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

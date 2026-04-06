// This file renders a single playing card, including face-up and face-down states.

import type { Card as PlayingCard } from "@/lib/types";

interface CardProps {
  card: PlayingCard;
  hidden?: boolean;
  animateFrom?: "dealer" | "player";
  compact?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: Record<PlayingCard["suit"], string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

// This function returns the color class used for the card suit.
function getSuitTone(suit: PlayingCard["suit"]): string {
  return suit === "hearts" || suit === "diamonds" ? "text-[var(--incorrect-red)]" : "text-slate-900";
}

// This function returns the animation class based on where the card is being dealt from.
function getAnimationClass(animateFrom?: "dealer" | "player"): string {
  if (animateFrom === "dealer") {
    return "card-enter-top";
  }

  if (animateFrom === "player") {
    return "card-enter-bottom";
  }

  return "";
}

// This function renders a card face or card back for blackjack hands.
export function Card({
  card,
  hidden = false,
  animateFrom,
  compact = false,
  className = "",
}: CardProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitTone = getSuitTone(card.suit);
  const sizeClasses = compact
    ? "h-20 w-14 rounded-[1rem] text-xs sm:h-28 sm:w-20 sm:rounded-2xl sm:text-sm"
    : "h-24 w-[4.25rem] rounded-[1.15rem] text-sm sm:h-36 sm:w-24 sm:rounded-[1.35rem] sm:text-base";

  return (
    <div className={`card-flip-scene ${sizeClasses} ${getAnimationClass(animateFrom)} ${className}`}>
      <div className={`card-flip-inner ${hidden ? "is-revealed" : ""}`}>
        <div className="card-face bg-[var(--card-white)] text-slate-900 shadow-[0_16px_30px_var(--card-shadow)]">
          <div className={`flex h-full flex-col justify-between p-2 sm:p-3 ${suitTone}`}>
            <div className="flex flex-col leading-none">
              <span className="font-semibold">{card.rank}</span>
              <span className="text-base sm:text-xl">{suitSymbol}</span>
            </div>
            <div className="flex justify-center text-[1.65rem] sm:text-4xl">{suitSymbol}</div>
            <div className="flex rotate-180 flex-col items-end leading-none">
              <span className="font-semibold">{card.rank}</span>
              <span className="text-base sm:text-xl">{suitSymbol}</span>
            </div>
          </div>
        </div>
        <div className="card-face card-back shadow-[0_16px_30px_var(--card-shadow)]">
          <div className="h-full w-full rounded-[inherit] border border-[color:rgba(255,232,176,0.28)] bg-[radial-gradient(circle_at_center,rgba(255,236,182,0.2),transparent_58%),linear-gradient(135deg,#193d2a,#0f261b_60%,#245238)] p-1.5">
            <div className="flex h-full items-center justify-center rounded-[calc(1.35rem-6px)] border border-[color:rgba(232,199,106,0.3)] bg-[linear-gradient(135deg,rgba(201,168,76,0.08),rgba(17,31,24,0.35))]">
              <div className="h-4/5 w-4/5 rounded-[1rem] border border-dashed border-[color:rgba(232,199,106,0.35)] bg-[radial-gradient(circle_at_top,rgba(232,199,106,0.25),transparent_40%),repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0_6px,transparent_6px_12px)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

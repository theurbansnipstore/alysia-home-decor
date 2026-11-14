"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  max?: number;
  onChange?: (quantity: number) => void;
}

export default function QuantitySelector({ max = 10, onChange }: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(1);

  function update(next: number) {
    const clamped = Math.min(max, Math.max(1, next));
    setQuantity(clamped);
    onChange?.(clamped);
  }

  return (
    <div className="inline-flex items-center border border-ink-100">
      <button
        type="button"
        onClick={() => update(quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className="flex h-11 w-11 items-center justify-center text-ink-700 transition-colors hover:text-brass-600 disabled:pointer-events-none disabled:text-ink-300"
      >
        <Minus size={15} />
      </button>
      <span className="w-10 text-center text-sm text-charcoal" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => update(quantity + 1)}
        disabled={quantity >= max}
        aria-label="Increase quantity"
        className="flex h-11 w-11 items-center justify-center text-ink-700 transition-colors hover:text-brass-600 disabled:pointer-events-none disabled:text-ink-300"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

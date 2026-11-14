"use client";

import { checkoutContent } from "@/lib/content/checkout";

interface CustomerNotesProps {
  deliveryInstructions: string;
  onChangeDeliveryInstructions: (value: string) => void;
  giftMessage: string;
  onChangeGiftMessage: (value: string) => void;
  enableOrderNotes: boolean;
  enableGiftMessage: boolean;
}

export default function CustomerNotes({
  deliveryInstructions,
  onChangeDeliveryInstructions,
  giftMessage,
  onChangeGiftMessage,
  enableOrderNotes,
  enableGiftMessage,
}: CustomerNotesProps) {
  if (!enableOrderNotes && !enableGiftMessage) return null;

  return (
    <section className="border border-ink-100 bg-bone-100 p-5 sm:p-6">
      <div className="space-y-4">
        {enableOrderNotes && (
          <div>
            <label className="mb-1 block text-sm text-ink-700">{checkoutContent.deliveryInstructionsLabel}</label>
            <textarea
              value={deliveryInstructions}
              onChange={(e) => onChangeDeliveryInstructions(e.target.value)}
              placeholder={checkoutContent.deliveryInstructionsPlaceholder}
              rows={2}
              className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
        )}
        {enableGiftMessage && (
          <div>
            <label className="mb-1 block text-sm text-ink-700">{checkoutContent.giftMessageLabel}</label>
            <textarea
              value={giftMessage}
              onChange={(e) => onChangeGiftMessage(e.target.value)}
              placeholder={checkoutContent.giftMessagePlaceholder}
              rows={2}
              className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
        )}
      </div>
    </section>
  );
}

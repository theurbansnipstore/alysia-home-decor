import type { PaymentProvider, PaymentInitResult } from "./types";

/** Cash on Delivery — no external call, settles at delivery time (Module 11+ territory). */
export class CodPaymentProvider implements PaymentProvider {
  key = "COD";

  async initiate(_params: { orderId: string; amount: number }): Promise<PaymentInitResult> {
    return { status: "PENDING" };
  }
}

export const codPaymentProvider: PaymentProvider = new CodPaymentProvider();

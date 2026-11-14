/**
 * Payment provider interface. Business logic (order-service.ts) only ever
 * calls a provider through this shape — it never knows or cares whether
 * it's talking to COD, Razorpay, Stripe, or PayPal. Adding a real gateway
 * later (Module 10) means writing a new class here and registering it in
 * the payment method config, not touching checkout's business logic.
 */
export interface PaymentInitResult {
  /** PENDING for COD (settled on delivery); providers with an online step would return their own status. */
  status: "PENDING" | "PAID" | "FAILED";
  providerReference?: string;
}

export interface PaymentProvider {
  key: string;
  initiate(params: { orderId: string; amount: number }): Promise<PaymentInitResult>;
}

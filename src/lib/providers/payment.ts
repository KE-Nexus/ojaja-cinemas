import { nanoid } from "nanoid";

export type ChargeResult = {
  status: "SUCCESS" | "FAILED";
  reference: string;
  raw: Record<string, unknown>;
};

export interface PaymentProvider {
  name: string;
  charge(input: { amount: number; method: string; email: string }): Promise<ChargeResult>;
}

/**
 * Simulates a Nigerian payment gateway (stand-in for Paystack/Flutterwave).
 * No real account is available for this build, so the "gateway" is a same-shape
 * mock: swap this class for a real Paystack/Flutterwave client behind the same
 * PaymentProvider interface to go live.
 */
export class MockPaymentProvider implements PaymentProvider {
  name = "mock-gateway";

  async charge(input: { amount: number; method: string; email: string }): Promise<ChargeResult> {
    const reference = `PAY-${nanoid(10).toUpperCase()}`;
    return {
      status: "SUCCESS",
      reference,
      raw: { ...input, simulated: true, processedAt: new Date().toISOString() },
    };
  }

  async fail(input: { amount: number; method: string; email: string }): Promise<ChargeResult> {
    const reference = `PAY-${nanoid(10).toUpperCase()}`;
    return {
      status: "FAILED",
      reference,
      raw: { ...input, simulated: true, reason: "Card declined (simulated)", processedAt: new Date().toISOString() },
    };
  }
}

export const paymentProvider = new MockPaymentProvider();

"use server";

import { prisma } from "@/lib/db";

type SyncCreditInput = {
  customerId: string;
  tx?: any;
  overrides?: Record<string, unknown>;
};

/**
 * Keep CustomerCredit fields derived from the canonical Customer.balance.
 */
export async function syncCustomerCreditFromBalance(input: SyncCreditInput) {
  const db: any = input.tx ?? prisma;

  const [customer, credit] = await Promise.all([
    db.customer.findUnique({
      where: { id: input.customerId },
      select: { balance: true },
    }),
    db.customerCredit.findUnique({
      where: { customerId: input.customerId },
      select: { creditLimit: true },
    }),
  ]);

  if (!customer || !credit) return null;

  const currentBalance = Number(customer.balance ?? 0);
  const creditLimit = Number(credit.creditLimit ?? 0);
  const availableCredit = Number((creditLimit - currentBalance).toFixed(2));

  return db.customerCredit.update({
    where: { customerId: input.customerId },
    data: {
      currentBalance,
      availableCredit,
      ...(input.overrides || {}),
    },
  });
}

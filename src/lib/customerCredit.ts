"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type SyncCreditInput = {
  customerId: string;
  tx?: Prisma.TransactionClient;
  overrides?: Record<string, unknown>;
};

/**
 * Keep CustomerCredit fields derived from the canonical Customer.balance.
 */
export async function syncCustomerCreditFromBalance(input: SyncCreditInput) {
  const db = input.tx ?? prisma;

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

  const currentBalance = Number(customer.balance || 0);
  const availableCredit = Number((credit.creditLimit - currentBalance).toFixed(2));

  return db.customerCredit.update({
    where: { customerId: input.customerId },
    data: {
      currentBalance,
      availableCredit,
      ...(input.overrides || {}),
    },
  });
}

"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Customer } from "@prisma/client";

export interface CreateCustomerData {
    id?: string;
    name: string;
    address: string;
    state: string;
    gstin?: string;
    phone?: string;
    email?: string;
    lastInvoiceNo?: string;
    companyName?: string;
    lat?: number;
    lng?: number;
}

export async function saveCustomerAction(data: CreateCustomerData) {
    try {
        let existingCustomer = null;

        // 1. Try to find by ID if provided (explicit update)
        if (data.id) {
            existingCustomer = await prisma.customer.findUnique({ where: { id: data.id } });
        }

        // 2. If not found by ID (or no ID), try GSTIN
        if (!existingCustomer && data.gstin) {
            existingCustomer = await prisma.customer.findUnique({
                where: { gstin: data.gstin }
            });
        }

        // 3. If still not found, try Name + Company
        if (!existingCustomer) {
            existingCustomer = await prisma.customer.findFirst({
                where: { name: data.name, companyName: data.companyName || "Sai Associates" }
            });
        }

        let result;
        if (existingCustomer) {
            // Update
            result = await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: {
                    ...data,
                }
            });
        } else {
            // Create
            result = await prisma.customer.create({
                data: {
                    ...data,
                    lat: data.lat,
                    lng: data.lng,
                    // Ensure empty string GSTIN becomes undefined/null to avoid unique constraint error
                    gstin: data.gstin || undefined,
                }
            });
        }

        revalidatePath("/dashboard/invoices");
        return { success: true, customer: result };
    } catch (error) {
        console.error("Failed to save customer:", error);
        return { success: false, error: "Database Error" };
    }
}

export async function getCustomersAction(companyName: string = "Sai Associates"): Promise<{ success: boolean; customers?: Customer[]; error?: string }> {
    try {
        const customers = await prisma.customer.findMany({
            where: { companyName },
            orderBy: { name: 'asc' }
        });
        return { success: true, customers };
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return { success: false, customers: [] };
    }
}

export async function getCustomerDetails(id: string) {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                invoices: {
                    orderBy: { date: 'desc' },
                }
            }
        });

        if (!customer) return { success: false, error: "Customer not found" };

        return { success: true, customer };
    } catch (error) {
        console.error("Failed to fetch customer details:", error);
        return { success: false, error: "Database Error" };
    }
}

export async function addCustomerPayment(customerId: string, amount: number, mode: string) {
    try {
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                balance: { decrement: amount },
            }
        });

        revalidatePath(`/dashboard/customers/${customerId}`);
        revalidatePath("/dashboard/customers");
        return { success: true };
    } catch (error) {
        console.error("Failed to add payment:", error);
        return { success: false, error: "Database Error" };
    }
}

import { getCustomersAction, saveCustomerAction, CreateCustomerData } from "@/actions/customer";
import { Customer } from "@prisma/client";
export type { Customer };

export interface AppCustomer {
    id: string;
    name: string;
    address: string;
    state: string;
    gstin: string | null;
    phone?: string | null;
    email?: string | null;
    lastInvoiceNo?: string | null;
    createdAt: Date | number;
}

export const CustomerService = {
    // Now Async
    getAll: async (): Promise<Customer[]> => {
        try {
            const result = await getCustomersAction();
            if (result.success && result.customers) {
                return result.customers.map((c: any) => ({
                    ...c,
                    createdAt: new Date(c.createdAt),
                    updatedAt: new Date(c.updatedAt) // Ensure dates are objects
                })) as Customer[];
            }
            return [];
        } catch (e) {
            console.error("Failed to fetch customers", e);
            return [];
        }
    },

    save: async (customer: CreateCustomerData) => {
        try {
            const result = await saveCustomerAction(customer);
            if (result.success && result.customer) {
                return result.customer;
            }
            throw new Error(result.error || "Failed to save");
        } catch (e) {
            console.error("Failed to save customer", e);
            throw e;
        }
    },

    search: async (query: string): Promise<Customer[]> => {
        const all = await CustomerService.getAll();
        const lowerQuery = query.toLowerCase();
        return all.filter(c =>
            c.name.toLowerCase().includes(lowerQuery) ||
            (c.gstin && c.gstin.toLowerCase().includes(lowerQuery))
        );
    }
};

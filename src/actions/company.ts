"use server";

import { prisma } from "@/lib/db";
import { Company } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getCompaniesAction() {
    try {
        const companies = await prisma.company.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, companies };
    } catch (e) {
        console.error("Error fetching companies:", e);
        return { success: false, error: "Failed to fetch companies" };
    }
}

export interface UpdateCompanyData extends Partial<Company> {
    whatsappApiKey?: string | null;
    whatsappPhoneId?: string | null;
    invoiceTemplateId?: string | null;
    emailSmtpHost?: string | null;
    emailUser?: string | null;
    emailPassword?: string | null;
}

export async function upsertCompanyAction(data: UpdateCompanyData) {
    try {
        if (!data.name) return { success: false, error: "Company Name is required" };

        // Check if updating or creating
        if (data.id) {
            await prisma.company.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    address: data.address || "",
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    phone: data.phone,
                    email: data.email,
                    gstin: data.gstin,
                    bankName: data.bankName,
                    accountNo: data.accountNo,
                    ifscCode: data.ifscCode,
                    branch: data.branch,
                    logoUrl: data.logoUrl,
                    signatureUrl: data.signatureUrl,
                    whatsappApiKey: data.whatsappApiKey,
                    whatsappPhoneId: data.whatsappPhoneId,
                    invoiceTemplateId: data.invoiceTemplateId,
                    emailSmtpHost: data.emailSmtpHost,
                    emailUser: data.emailUser,
                    emailPassword: data.emailPassword
                }
            });
        } else {
            // Create
            await prisma.company.create({
                data: {
                    name: data.name,
                    address: data.address || "",
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    phone: data.phone,
                    email: data.email,
                    gstin: data.gstin,
                    bankName: data.bankName,
                    accountNo: data.accountNo,
                    ifscCode: data.ifscCode,
                    branch: data.branch,
                    logoUrl: data.logoUrl,
                    signatureUrl: data.signatureUrl,
                    whatsappApiKey: data.whatsappApiKey,
                    whatsappPhoneId: data.whatsappPhoneId,
                    invoiceTemplateId: data.invoiceTemplateId,
                    emailSmtpHost: data.emailSmtpHost,
                    emailUser: data.emailUser,
                    emailPassword: data.emailPassword
                }
            });
        }

        revalidatePath("/dashboard/settings/firms");
        return { success: true };
    } catch (e) {
        console.error("Error saving company:", e);
        return { success: false, error: "Failed to save company details" };
    }
}

export async function getCompanyByNameAction(name: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { name }
        });
        return { success: true, company };
    } catch (e) {
        console.error("Error fetching company by name:", e);
        return { success: false, error: "Failed to fetch company" };
    }
}


export async function deleteCompanyAction(id: string) {
    try {
        await prisma.company.delete({ where: { id } });
        revalidatePath("/dashboard/settings/firms");
        return { success: true };
    } catch (e) {
        console.error("Error deleting company:", e);
        return { success: false, error: "Failed to delete company" };
    }
}

export async function getCompanyDetails(name: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { name }
        });
        return company;
    } catch (e) {
        console.error("Error fetching company details:", e);
        return null;
    }
}

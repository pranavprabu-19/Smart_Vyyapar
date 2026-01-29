import { Sidebar } from "@/components/dashboard/sidebar";
import { AiAssistant } from "@/components/dashboard/ai-assistant";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { CompanyProvider } from "@/lib/company-context";
import { InvoiceProvider } from "@/lib/invoice-context";
import { ProductProvider } from "@/lib/product-context";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CompanyProvider>
            <InvoiceProvider>
                <ProductProvider>
                    <div className="flex min-h-screen bg-background text-foreground">
                        <Sidebar />
                        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-8 pb-24 md:pb-8">
                            <div className="mx-auto max-w-6xl">{children}</div>
                        </main>
                        <MobileNav />
                        <AiAssistant />
                    </div>
                </ProductProvider>
            </InvoiceProvider>
        </CompanyProvider>
    );
}

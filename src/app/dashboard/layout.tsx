import { Sidebar } from "@/components/dashboard/sidebar";
import { AiAssistant } from "@/components/dashboard/ai-assistant";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { DashboardSearchBar } from "@/components/dashboard/dashboard-search-bar";
import { CommandPaletteProvider } from "@/lib/command-palette-context";
import { CompanyProvider } from "@/lib/company-context";
import { InvoiceProvider } from "@/lib/invoice-context";
import { ProductProvider } from "@/lib/product-context";

import { CommandMenu } from "@/components/command-menu";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CompanyProvider>
            <InvoiceProvider>
                <ProductProvider>
                    <CommandPaletteProvider>
                        <div className="flex min-h-screen bg-background text-foreground">
                            <Sidebar />
                            <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-8 pb-24 md:pb-8">
                                <div className="mx-auto max-w-6xl space-y-4">
                                    <div className="sticky top-0 z-20 border-b bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                                        <DashboardSearchBar />
                                    </div>
                                    <CommandMenu />
                                    {children}
                                </div>
                            </main>
                            <MobileNav />
                            <AiAssistant />
                            <CommandPalette />
                        </div>
                    </CommandPaletteProvider>
                </ProductProvider>
            </InvoiceProvider>
        </CompanyProvider>
    );
}

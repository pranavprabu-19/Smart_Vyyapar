"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getCompaniesAction, upsertCompanyAction, deleteCompanyAction } from "@/actions/company";

export default function ManageFirmsPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCompany, setCurrentCompany] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        setIsLoading(true);
        const res = await getCompaniesAction();
        if (res.success && res.companies) {
            setCompanies(res.companies);
        }
        setIsLoading(false);
    };

    const handleEdit = (company: any) => {
        setCurrentCompany(company);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setCurrentCompany({});
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this firm?")) return;
        const res = await deleteCompanyAction(id);
        if (res.success) {
            toast({ title: "Company deleted" });
            loadCompanies();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        // Merge with current ID if editing
        const payload = { ...currentCompany, ...data };

        const res = await upsertCompanyAction(payload);
        if (res.success) {
            toast({ title: "Company saved successfully" });
            setIsDialogOpen(false);
            loadCompanies();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    };

    return (
        <PageShell
            title="Manage Firms"
            description="Add or edit company profiles for white-label invoicing."
            action={
                <Button onClick={handleAdd} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Firm
                </Button>
            }
        >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div>Loading...</div>
                ) : companies.length === 0 ? (
                    <div className="col-span-full text-center p-8 text-muted-foreground">
                        No firms added yet. Add one to start branded invoicing.
                    </div>
                ) : (
                    companies.map((company) => (
                        <Card key={company.id} className="relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-bl-lg">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(company)}>
                                    <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(company.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                            </div>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl overflow-hidden cursor-pointer" onClick={() => window.open(company.logoUrl, '_blank')}>
                                        {company.logoUrl ? <img src={company.logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <Building className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{company.name}</h3>
                                        <p className="text-sm text-muted-foreground">{company.gstin || "No GSTIN"}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p className="line-clamp-2 text-muted-foreground">{company.address}, {company.city}</p>
                                    <div className="flex justify-between border-t pt-2 mt-2">
                                        <span className="text-muted-foreground">Phone:</span>
                                        <span className="font-medium">{company.phone || "N/A"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentCompany?.id ? 'Edit Firm Details' : 'Add New Firm'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Company Name *</Label>
                                <Input name="name" defaultValue={currentCompany?.name} required placeholder="e.g. Acme Corp" />
                            </div>
                            <div className="space-y-2">
                                <Label>GSTIN</Label>
                                <Input name="gstin" defaultValue={currentCompany?.gstin} placeholder="GST Number" />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Address</Label>
                                <Textarea name="address" defaultValue={currentCompany?.address} placeholder="Full Address" />
                            </div>
                            <div className="space-y-2">
                                <Label>City</Label>
                                <Input name="city" defaultValue={currentCompany?.city} />
                            </div>
                            <div className="space-y-2">
                                <Label>State</Label>
                                <Input name="state" defaultValue={currentCompany?.state} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input name="phone" defaultValue={currentCompany?.phone} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input name="email" defaultValue={currentCompany?.email} />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Bank Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input name="bankName" defaultValue={currentCompany?.bankName} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account No</Label>
                                    <Input name="accountNo" defaultValue={currentCompany?.accountNo} />
                                </div>
                                <div className="space-y-2">
                                    <Label>IFSC Code</Label>
                                    <Input name="ifscCode" defaultValue={currentCompany?.ifscCode} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Branch</Label>
                                    <Input name="branch" defaultValue={currentCompany?.branch} />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Branding (URLs)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Logo URL</Label>
                                    <Input name="logoUrl" defaultValue={currentCompany?.logoUrl} placeholder="https://..." />
                                    <p className="text-xs text-muted-foreground">URL of your company logo (PNG/JPG)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Signature URL</Label>
                                    <Input name="signatureUrl" defaultValue={currentCompany?.signatureUrl} placeholder="https://..." />
                                    <p className="text-xs text-muted-foreground">URL of authorized signature image</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Firm</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </PageShell>
    );
}

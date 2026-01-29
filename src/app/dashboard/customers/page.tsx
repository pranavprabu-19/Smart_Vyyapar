"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, MapPin, Phone, Mail, FileText, User, Pencil, DollarSign, TrendingUp, AlertCircle, CreditCard } from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { getCustomersAction, saveCustomerAction } from "@/actions/customer";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapView = dynamic(() => import('@/components/ui/map-view'), {
    ssr: false,
    loading: () => <div className="h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center">Loading Map...</div>
});

export default function CustomersPage() {
    const { currentCompany } = useCompany();
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [viewLocation, setViewLocation] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState<{
        id?: string;
        name: string;
        phone: string;
        email: string;
        address: string;
        state: string;
        gstin: string;
        lat?: number;
        lng?: number;
    }>({
        name: "",
        phone: "",
        email: "",
        address: "",
        state: "Tamil Nadu",
        gstin: "",
    });

    const loadCustomers = async () => {
        setIsLoading(true);
        const res = await getCustomersAction(currentCompany);
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadCustomers();
    }, [currentCompany]);

    const handleAddNew = () => {
        setFormData({
            name: "",
            phone: "",
            email: "",
            address: "",
            state: "Tamil Nadu",
            gstin: "",
            lat: undefined,
            lng: undefined
        });
        setShowModal(true);
    };

    const handleEdit = (customer: any) => {
        setFormData({
            id: customer.id,
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
            address: customer.address || "",
            state: customer.state || "Tamil Nadu",
            gstin: customer.gstin || "",
            lat: customer.lat,
            lng: customer.lng
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Name is required");

        try {
            const res = await saveCustomerAction({
                ...formData,
                companyName: currentCompany
            });

            if (res.success) {
                setShowModal(false);
                setFormData({ name: "", phone: "", email: "", address: "", state: "Tamil Nadu", gstin: "" });
                loadCustomers();
            } else {
                alert("Failed to save customer");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving customer");
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    // Calculate payment statistics
    const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
    const customersWithDebt = customers.filter(c => (c.balance || 0) > 0).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const topDebtors = customers.filter(c => (c.balance || 0) > 0).sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 5);

    return (
        <PageShell title="Customer Directory" description="Manage customer profiles and payment tracking.">
            {/* Payment Statistics */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{customers.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active customers</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">₹{totalOutstanding.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">{customersWithDebt} customers with debt</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Lifetime revenue</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Debtors</CardTitle>
                        <CreditCard className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{topDebtors.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">High priority collections</p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Debtors Alert */}
            {topDebtors.length > 0 && (
                <Card variant="premium" className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 to-orange-500/5 mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Top Debtors - Immediate Attention Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topDebtors.map(customer => (
                                <div key={customer.id} className="flex justify-between items-center bg-card/50 p-3 rounded-lg border border-red-500/20 shadow-sm hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="text-sm font-medium">{customer.name}</div>
                                        <div className="text-xs text-muted-foreground">{customer.phone || 'No phone'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-red-600">₹{(customer.balance || 0).toLocaleString()}</div>
                                        {customer.phone && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs mt-1"
                                                onClick={() => {
                                                    const msg = `Hello ${customer.name},\nYour outstanding balance is ₹${customer.balance}. Please clear your dues at your earliest convenience.\n\n- ${currentCompany}`;
                                                    window.open(`https://wa.me/91${customer.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                }}
                                            >
                                                Remind
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between items-center mb-6">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-10">Loading Profiles...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCustomers.map(c => (
                        <Card key={c.id} variant="premium" className="hover:shadow-xl transition-all">
                            <CardHeader className="pb-2 flex flex-row items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center">
                                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {c.name}
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground flex items-center">
                                        <MapPin className="mr-1 h-3 w-3" /> {c.address}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {c.gstin && <span className="text-[10px] font-mono bg-secondary px-2 py-1 rounded">GST: {c.gstin}</span>}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-muted"
                                        onClick={() => handleEdit(c)}
                                        title="Edit Customer"
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2 pt-2">
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center">
                                        <Phone className="mr-1 h-3 w-3" /> {c.phone || "-"}
                                    </div>
                                    <div className="flex items-center truncate" title={c.email}>
                                        <Mail className="mr-1 h-3 w-3" /> {c.email || "-"}
                                    </div>
                                </div>
                                <div className="pt-2 border-t mt-2 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Outstanding Balance</span>
                                            <span className={`font-bold text-lg ${(c.balance || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                                                ₹{(c.balance || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        {(c.balance || 0) > 0 && (
                                            <Badge variant="destructive" className="text-xs">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Due
                                            </Badge>
                                        )}
                                    </div>
                                    {c.totalRevenue > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            Total Revenue: <span className="font-semibold text-emerald-600">₹{c.totalRevenue.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-1">
                                        {c.lat && c.lng && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                                                onClick={() => setViewLocation(c)}
                                            >
                                                <MapPin className="h-3 w-3" /> Map
                                            </Button>
                                        )}
                                        {(c.balance || 0) > 0 && c.phone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1 hover:bg-green-50 hover:text-green-700 border-green-200"
                                                onClick={() => {
                                                    const msg = `Hello ${c.name},\nYour outstanding balance is ₹${c.balance}. Please clear your dues at your earliest convenience.\n\n- ${currentCompany}`;
                                                    window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                }}
                                            >
                                                <Phone className="h-3 w-3" /> Remind
                                            </Button>
                                        )}
                                        <Link href={`/dashboard/customers/${c.id}`}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1"
                                            >
                                                <FileText className="h-3 w-3" /> View
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredCustomers.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            No customers found. Add one to get started.
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>{formData.id ? "Edit Customer" : "Add New Customer"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Customer Name *</label>
                                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Acme Corp" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Phone</label>
                                        <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="9876543210" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">GSTIN (Optional)</label>
                                        <Input value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} placeholder="33AAAAA..." />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Address</label>
                                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Street, Area" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">State</label>
                                        <Input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" />
                                    </div>
                                </div>

                                {/* Location Picker */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Location</label>
                                    <div className="h-64 w-full border rounded-md overflow-hidden relative">
                                        <MapView
                                            center={[formData.lat || 12.9716, formData.lng || 80.2530]}
                                            zoom={13}
                                            onMapClick={(lat, lng) => {
                                                setFormData({ ...formData, lat, lng });
                                            }}
                                            markers={formData.lat && formData.lng ? [{ lat: formData.lat, lng: formData.lng, title: "Selected Location" }] : []}
                                            className="h-full w-full"
                                        />
                                        {!formData.lat && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                                                <span className="bg-white px-2 py-1 rounded text-xs shadow">Tap to pick location</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex text-xs text-muted-foreground gap-4">
                                        <span>Lat: {formData.lat?.toFixed(4) || "Not set"}</span>
                                        <span>Lng: {formData.lng?.toFixed(4) || "Not set"}</span>
                                    </div>
                                </div>

                            </div >
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save Profile</Button>
                            </div>
                        </CardContent >
                    </Card >
                </div >
            )}

            {/* View Location Modal */}
            {
                viewLocation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewLocation(null)}>
                        <Card className="w-full max-w-2xl h-[500px]" onClick={e => e.stopPropagation()}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{viewLocation.name}'s Location</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setViewLocation(null)}>
                                    <span className="h-4 w-4">✕</span>
                                </Button>
                            </CardHeader>
                            <CardContent className="h-full p-0 relative">
                                <MapView
                                    center={[viewLocation.lat || 0, viewLocation.lng || 0]}
                                    zoom={15}
                                    markers={[
                                        {
                                            lat: viewLocation.lat || 0,
                                            lng: viewLocation.lng || 0,
                                            title: viewLocation.name
                                        }
                                    ]}
                                    className="h-full w-full"
                                />
                                <div className="absolute bottom-4 left-4 right-4 bg-white p-2 rounded shadow text-sm">
                                    <p className="font-semibold">{viewLocation.address}</p>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${viewLocation.lat},${viewLocation.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline text-xs"
                                    >
                                        Open in Google Maps App
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }
        </PageShell >
    );
}

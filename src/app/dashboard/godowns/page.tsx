"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Warehouse, Plus, Edit, Trash2, X, MapPin, User, Phone, Package, TrendingUp, AlertCircle } from "lucide-react";
import { getGodownsAction, createGodownAction, updateGodownAction, deleteGodownAction, getGodownStatsAction } from "@/actions/godown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function GodownsPage() {
    const [godowns, setGodowns] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingGodown, setEditingGodown] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        manager: "",
        contact: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [godownsRes, statsRes] = await Promise.all([
                getGodownsAction(),
                getGodownStatsAction()
            ]);

            if (godownsRes.success && godownsRes.godowns) {
                setGodowns(godownsRes.godowns);
            }

            if (statsRes.success && statsRes.stats) {
                setStats(statsRes.stats);
            }
        } catch (error) {
            console.error("Failed to load godowns:", error);
            toast.error("Failed to load godowns");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Godown name is required");
            return;
        }

        const res = await createGodownAction(formData);
        if (res.success) {
            toast.success("Godown created successfully");
            setIsAddModalOpen(false);
            setFormData({ name: "", location: "", manager: "", contact: "" });
            loadData();
        } else {
            toast.error(res.error || "Failed to create godown");
        }
    };

    const handleEdit = (godown: any) => {
        setEditingGodown(godown);
        setFormData({
            name: godown.name,
            location: godown.location || "",
            manager: godown.manager || "",
            contact: godown.contact || ""
        });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGodown) return;

        const res = await updateGodownAction(editingGodown.id, formData);
        if (res.success) {
            toast.success("Godown updated successfully");
            setIsEditModalOpen(false);
            setEditingGodown(null);
            setFormData({ name: "", location: "", manager: "", contact: "" });
            loadData();
        } else {
            toast.error(res.error || "Failed to update godown");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        const res = await deleteGodownAction(id);
        if (res.success) {
            toast.success("Godown deleted successfully");
            loadData();
        } else {
            toast.error(res.error || "Failed to delete godown");
        }
    };

    const getGodownStat = (godownId: string) => {
        return stats.find(s => s.id === godownId) || {
            totalItems: 0,
            totalQuantity: 0,
            totalValue: 0,
            lowStockItems: 0
        };
    };

    return (
        <PageShell
            title="Godown Management"
            description="Manage warehouses and storage locations"
            action={
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Godown
                </Button>
            }
        >
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Godowns</CardTitle>
                        <Warehouse className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{godowns.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active warehouses</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {stats.reduce((sum, s) => sum + s.totalItems, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Across all godowns</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">
                            ₹{stats.reduce((sum, s) => sum + s.totalValue, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Inventory value</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            {stats.reduce((sum, s) => sum + s.lowStockItems, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Items need attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Godowns List */}
            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Loading godowns...</div>
            ) : godowns.length === 0 ? (
                <Card variant="premium" className="text-center py-12">
                    <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Godowns Found</h3>
                    <p className="text-muted-foreground mb-6">Create your first godown to start managing inventory across locations.</p>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create First Godown
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {godowns.map((godown) => {
                        const stat = getGodownStat(godown.id);
                        return (
                            <Card key={godown.id} variant="premium" className="hover:shadow-xl transition-all">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-500/20">
                                                <Warehouse className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{godown.name}</CardTitle>
                                                {godown.location && (
                                                    <CardDescription className="flex items-center gap-1 mt-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {godown.location}
                                                    </CardDescription>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(godown)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(godown.id, godown.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {godown.manager && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Manager:</span>
                                            <span className="font-medium">{godown.manager}</span>
                                        </div>
                                    )}
                                    {godown.contact && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Contact:</span>
                                            <span className="font-medium">{godown.contact}</span>
                                        </div>
                                    )}
                                    <div className="pt-3 border-t space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Total Items</span>
                                            <span className="font-bold">{stat.totalItems}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Total Quantity</span>
                                            <span className="font-bold">{stat.totalQuantity.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Stock Value</span>
                                            <span className="font-bold text-emerald-600">₹{stat.totalValue.toLocaleString()}</span>
                                        </div>
                                        {stat.lowStockItems > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Low Stock</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {stat.lowStockItems} items
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Godown Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Add New Godown</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>Create a new warehouse or storage location</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Godown Name *</Label>
                                    <Input
                                        id="name"
                                        required
                                        placeholder="e.g. Main Warehouse, Branch 1"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        placeholder="e.g. Chennai, Tamil Nadu"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manager">Manager Name</Label>
                                    <Input
                                        id="manager"
                                        placeholder="e.g. John Doe"
                                        value={formData.manager}
                                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact">Contact Number</Label>
                                    <Input
                                        id="contact"
                                        placeholder="e.g. +91 9876543210"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        Create Godown
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Godown Modal */}
            {isEditModalOpen && editingGodown && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Edit Godown</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingGodown(null);
                                    setFormData({ name: "", location: "", manager: "", contact: "" });
                                }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>Update godown information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Godown Name *</Label>
                                    <Input
                                        id="edit-name"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-location">Location</Label>
                                    <Input
                                        id="edit-location"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-manager">Manager Name</Label>
                                    <Input
                                        id="edit-manager"
                                        value={formData.manager}
                                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-contact">Contact Number</Label>
                                    <Input
                                        id="edit-contact"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditingGodown(null);
                                        setFormData({ name: "", location: "", manager: "", contact: "" });
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        Update Godown
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </PageShell>
    );
}

"use client";

import { useEffect, useState } from "react";
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExportButton } from "@/components/dashboard/export-button";
import {
    createAssetAction,
    getAssetsAction,
    updateAssetAction,
    deleteAssetAction,
    calculateAssetDepreciationAction,
    getAssetStatsAction,
} from "@/actions/assets";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { StateBlock } from "@/components/dashboard/state-block";

interface Asset {
    id: string;
    assetType: string;
    name: string;
    description: string | null;
    serialNumber: string | null;
    purchaseValue: number;
    currentValue: number;
    purchaseDate: Date;
    depreciationRate: number;
    location: string | null;
    status: string;
    assignedTo: string | null;
    maintenanceNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const ASSET_TYPES = ["VEHICLE", "EQUIPMENT", "PROPERTY", "FURNITURE", "ELECTRONICS"];
const STATUSES = ["ACTIVE", "SOLD", "DISPOSED", "UNDER_REPAIR"];

export default function AssetsPage() {
    const { user } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    const [formData, setFormData] = useState({
        assetType: "VEHICLE",
        name: "",
        description: "",
        serialNumber: "",
        purchaseValue: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        depreciationRate: "10",
        location: "",
        assignedTo: "",
        status: "ACTIVE",
        maintenanceNotes: "",
    });

    const loadData = async () => {
        const companyName = user?.companyName || "Sai Associates";
        const [assetsRes, statsRes] = await Promise.all([
            getAssetsAction(companyName),
            getAssetStatsAction(companyName),
        ]);

        if (assetsRes.success) setAssets(assetsRes.assets || []);
        if (statsRes.success) setStats(statsRes.stats);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleSubmit = async () => {
        const companyName = user?.companyName || "Sai Associates";
        const data = {
            ...formData,
            companyName,
            purchaseValue: parseFloat(formData.purchaseValue),
            purchaseDate: new Date(formData.purchaseDate),
            depreciationRate: parseFloat(formData.depreciationRate),
        };

        let res;
        if (editingAsset) {
            res = await updateAssetAction(editingAsset.id, data);
        } else {
            res = await createAssetAction(data);
        }

        if (res.success) {
            toast.success(editingAsset ? "Asset updated" : "Asset created");
            setShowModal(false);
            resetForm();
            loadData();
        } else {
            toast.error(res.error || "Failed to save asset");
        }
    };

    const handleEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setFormData({
            assetType: asset.assetType,
            name: asset.name,
            description: asset.description || "",
            serialNumber: asset.serialNumber || "",
            purchaseValue: asset.purchaseValue.toString(),
            purchaseDate: new Date(asset.purchaseDate).toISOString().split("T")[0],
            depreciationRate: asset.depreciationRate.toString(),
            location: asset.location || "",
            assignedTo: asset.assignedTo || "",
            status: asset.status,
            maintenanceNotes: asset.maintenanceNotes || "",
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return;
        const res = await deleteAssetAction(id);
        if (res.success) {
            toast.success("Asset deleted");
            loadData();
        } else {
            toast.error(res.error || "Failed to delete asset");
        }
    };

    const handleCalculateDepreciation = async (id: string) => {
        const res = await calculateAssetDepreciationAction(id);
        if (res.success) {
            toast.success("Depreciation calculated");
            loadData();
        } else {
            toast.error(res.error || "Failed to calculate depreciation");
        }
    };

    const resetForm = () => {
        setEditingAsset(null);
        setFormData({
            assetType: "VEHICLE",
            name: "",
            description: "",
            serialNumber: "",
            purchaseValue: "",
            purchaseDate: new Date().toISOString().split("T")[0],
            depreciationRate: "10",
            location: "",
            assignedTo: "",
            status: "ACTIVE",
            maintenanceNotes: "",
        });
    };

    if (user?.role !== "ADMIN") {
        return (
            <PageShell
                title="Asset Management"
                description="Access restricted to administrators"
                icon={<Package className="h-6 w-6" />}
            >
                <StateBlock
                    icon={Package}
                    title="Administrator access required"
                    description="Switch to an admin account to manage assets."
                />
            </PageShell>
        );
    }

    return (
        <PageShell
            title="Asset Management"
            description="Track company assets and calculate depreciation"
            icon={<Package className="h-6 w-6" />}
            action={
                <div className="flex gap-2">
                    <ExportButton
                        data={assets.map(a => ({
                            Type: a.assetType,
                            Name: a.name,
                            Serial: a.serialNumber,
                            "Purchase Value": a.purchaseValue,
                            "Current Value": a.currentValue,
                            Status: a.status,
                            Location: a.location
                        }))}
                        filename="assets_report"
                        title="Company Assets Report"
                    />
                    <Button onClick={() => { resetForm(); setShowModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Asset
                    </Button>
                </div>
            }
        >
            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalAssets}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats.totalValue.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Asset Types</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.byType.length}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Assets Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 mb-4">
                                    <Skeleton width={100} />
                                    <Skeleton width={150} />
                                    <Skeleton width={80} />
                                    <div className="ml-auto">
                                        <Skeleton width={50} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="p-6">
                            <StateBlock
                                icon={Package}
                                title="No assets found"
                                description='Click "Add Asset" to start tracking fixed assets.'
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b">
                                    <tr>
                                        <th className="text-left p-4 font-medium">Type</th>
                                        <th className="text-left p-4 font-medium">Name</th>
                                        <th className="text-left p-4 font-medium">Serial</th>
                                        <th className="text-right p-4 font-medium">Purchase Value</th>
                                        <th className="text-right p-4 font-medium">Current Value</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-left p-4 font-medium">Location</th>
                                        <th className="text-right p-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map((asset) => (
                                        <tr key={asset.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4">{asset.assetType}</td>
                                            <td className="p-4 font-medium">{asset.name}</td>
                                            <td className="p-4 text-muted-foreground">{asset.serialNumber || "—"}</td>
                                            <td className="p-4 text-right">₹{asset.purchaseValue.toLocaleString()}</td>
                                            <td className="p-4 text-right">₹{asset.currentValue.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${asset.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-800"
                                                        : asset.status === "UNDER_REPAIR"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-muted-foreground">{asset.location || "—"}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(asset)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(asset.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Asset Type</Label>
                                <Select value={formData.assetType} onValueChange={(v) => setFormData({ ...formData, assetType: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ASSET_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Asset Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Toyota Hilux"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Serial Number</Label>
                                <Input
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <Label>Location</Label>
                                <Input
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g., Godown A"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Purchase Value *</Label>
                                <Input
                                    type="number"
                                    value={formData.purchaseValue}
                                    onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <Label>Purchase Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Depreciation Rate (%)</Label>
                                <Input
                                    type="number"
                                    value={formData.depreciationRate}
                                    onChange={(e) => setFormData({ ...formData, depreciationRate: e.target.value })}
                                    placeholder="10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Assigned To</Label>
                            <Input
                                value={formData.assignedTo}
                                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                placeholder="Employee name or ID"
                            />
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description"
                                rows={2}
                            />
                        </div>

                        {editingAsset && (
                            <div>
                                <Label>Maintenance Notes</Label>
                                <Textarea
                                    value={formData.maintenanceNotes}
                                    onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
                                    placeholder="Track repairs and servicing"
                                    rows={3}
                                />
                            </div>
                        )}

                        <div className="flex gap-2 justify-end mt-4">
                            <Button variant="outline" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={!formData.name || !formData.purchaseValue}>
                                {editingAsset ? "Update" : "Create"} Asset
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </PageShell>
    );
}

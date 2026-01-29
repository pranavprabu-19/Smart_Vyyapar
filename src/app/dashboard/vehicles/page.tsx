"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Truck, AlertTriangle, CheckCircle, Wrench, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createVehicleAction, getVehiclesAction, deleteVehicleAction } from "@/actions/vehicle";

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [newVehicle, setNewVehicle] = useState({
        regNo: "",
        model: "",
        type: "TRUCK",
        fuelType: "DIESEL",
        status: "ACTIVE"
    });

    const loadVehicles = async () => {
        setLoading(true);
        const res = await getVehiclesAction();
        if (res.success && res.vehicles) {
            setVehicles(res.vehicles);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadVehicles();
    }, []);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVehicle.regNo || !newVehicle.model) return;

        const res = await createVehicleAction(newVehicle);
        if (res.success) {
            alert("Vehicle Added Successfully!");
            setIsAddModalOpen(false);
            setNewVehicle({ regNo: "", model: "", type: "TRUCK", fuelType: "DIESEL", status: "ACTIVE" });
            loadVehicles();
        } else {
            alert(res.error || "Failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this vehicle? Actions cannot be undone.")) {
            await deleteVehicleAction(id);
            loadVehicles();
        }
    };

    const getStatusParams = (status: string) => {
        switch (status) {
            case "ACTIVE": return { 
                color: "text-emerald-600 bg-emerald-50 border-emerald-200", 
                icon: CheckCircle,
                gradient: "from-emerald-500/10 to-teal-500/10",
                borderGradient: "border-emerald-500/20"
            };
            case "MAINTENANCE": return { 
                color: "text-orange-600 bg-orange-50 border-orange-200", 
                icon: Wrench,
                gradient: "from-orange-500/10 to-amber-500/10",
                borderGradient: "border-orange-500/20"
            };
            default: return { 
                color: "text-gray-600 bg-gray-50 border-gray-200", 
                icon: AlertTriangle,
                gradient: "from-gray-500/10 to-slate-500/10",
                borderGradient: "border-gray-500/20"
            };
        }
    };

    return (
        <PageShell
            title="Vehicle Fleet Management"
            description="Manage your trucks, bikes and other delivery vehicles."
            action={
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                </Button>
            }
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v) => {
                    const status = getStatusParams(v.status);
                    const Icon = status.icon;
                    return (
                        <Card key={v.id} variant="metric" className={`bg-gradient-to-br ${status.gradient} border ${status.borderGradient} relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-12 -mt-12" />
                            <CardHeader className="pb-2 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${status.gradient} flex items-center justify-center border ${status.borderGradient}`}>
                                                <Truck className="h-4 w-4 text-primary" />
                                            </div>
                                            {v.regNo}
                                        </CardTitle>
                                        <CardDescription className="mt-1">{v.model}</CardDescription>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${status.color} shadow-sm`}>
                                        <Icon className="h-3.5 w-3.5" /> {v.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="grid grid-cols-2 gap-4 text-sm mt-2 mb-4">
                                    <div className="p-2 rounded-lg bg-card/50">
                                        <div className="text-muted-foreground text-xs mb-1">Total Mileage</div>
                                        <div className="font-mono font-bold text-lg">{v.totalDistance.toFixed(1)} km</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-card/50">
                                        <div className="text-muted-foreground text-xs mb-1">Fuel Type</div>
                                        <div className="font-semibold">{v.fuelType}</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end border-t pt-3">
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2" onClick={() => handleDelete(v.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {vehicles.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                        <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Vehicles Found</h3>
                        <p className="text-muted-foreground mb-4">Add your first vehicle to start tracking expenses.</p>
                        <Button onClick={() => setIsAddModalOpen(true)}>Add Vehicle</Button>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background w-full max-w-md rounded-lg shadow-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-lg">Add New Vehicle</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>✕</Button>
                        </div>
                        <form onSubmit={handleAddVehicle} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Registration Number</label>
                                <Input required placeholder="e.g. TN-09-CQ-8833" value={newVehicle.regNo} onChange={e => setNewVehicle({ ...newVehicle, regNo: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Model / Make</label>
                                <Input required placeholder="e.g. Tata Ace Gold" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newVehicle.type} onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value })}>
                                        <option value="TRUCK">Truck / LCV</option>
                                        <option value="BIKE">Bike</option>
                                        <option value="AUTO">Auto</option>
                                        <option value="VAN">Van</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fuel</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newVehicle.fuelType} onChange={e => setNewVehicle({ ...newVehicle, fuelType: e.target.value })}>
                                        <option value="DIESEL">Diesel</option>
                                        <option value="PETROL">Petrol</option>
                                        <option value="EV">Electric</option>
                                        <option value="CNG">CNG</option>
                                    </select>
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Save Vehicle</Button>
                        </form>
                    </div>
                </div>
            )}
        </PageShell>
    );
}

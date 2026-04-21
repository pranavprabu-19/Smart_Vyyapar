"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Package,
  IndianRupee,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  Square,
  MapPin,
  User,
  X,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";

// Mock data
const mockVanLoads = [
  {
    id: "1",
    loadNo: "VL-001",
    vehicleNo: "TN 01 AB 1234",
    driverName: "Ravi Kumar",
    date: new Date(),
    status: "IN_PROGRESS",
    loadedItems: 150,
    loadedValue: 45000,
    soldItems: 85,
    soldValue: 28500,
    collections: 25000,
    returns: 5,
  },
  {
    id: "2",
    loadNo: "VL-002",
    vehicleNo: "TN 02 CD 5678",
    driverName: "Senthil",
    date: new Date(),
    status: "PENDING",
    loadedItems: 200,
    loadedValue: 60000,
    soldItems: 0,
    soldValue: 0,
    collections: 0,
    returns: 0,
  },
  {
    id: "3",
    loadNo: "VL-003",
    vehicleNo: "TN 01 AB 1234",
    driverName: "Ravi Kumar",
    date: new Date(Date.now() - 86400000),
    status: "SETTLED",
    loadedItems: 180,
    loadedValue: 54000,
    soldItems: 165,
    soldValue: 49500,
    collections: 48000,
    returns: 8,
  },
];

export default function VanSalesPage() {
  const { currentCompany } = useCompany();
  const [vanLoads, setVanLoads] = useState(mockVanLoads);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLoad, setNewLoad] = useState({
    vehicleId: "",
    driverId: "",
    items: [] as { productId: string; name: string; qty: number }[],
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  // Filter loads
  const filteredLoads = vanLoads.filter((load) => {
    const matchesSearch = load.loadNo.toLowerCase().includes(search.toLowerCase()) ||
      load.driverName.toLowerCase().includes(search.toLowerCase()) ||
      load.vehicleNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || load.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SETTLED":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Settled</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-100 text-blue-700"><Play className="h-3 w-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const handleStartTrip = (id: string) => {
    setVanLoads(vanLoads.map(l => l.id === id ? { ...l, status: "IN_PROGRESS" } : l));
    toast.success("Van trip started!");
  };

  const handleEndTrip = (id: string) => {
    toast.success("Trip ended. Opening settlement...");
    // In real app, would open settlement modal
  };

  // Metrics
  const activeVans = vanLoads.filter(l => l.status === "IN_PROGRESS").length;
  const todayLoads = vanLoads.filter(l => new Date(l.date).toDateString() === new Date().toDateString()).length;
  const totalSales = vanLoads.reduce((sum, l) => sum + l.soldValue, 0);
  const totalCollections = vanLoads.reduce((sum, l) => sum + l.collections, 0);

  return (
    <PageShell
      title="Van Sales"
      description="Manage van loading, sales, and settlement"
      icon={<Truck className="h-6 w-6" />}
      action={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Load Van
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{activeVans}</div>
            <p className="text-xs text-muted-foreground">Active Vans</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{todayLoads}</div>
            <p className="text-xs text-muted-foreground">Today's Loads</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">Total Sales</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalCollections)}</div>
            <p className="text-xs text-muted-foreground">Collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search load number, driver, or vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="SETTLED">Settled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setLoading(true)}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Van Loads List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLoads.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No van loads found</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Load First Van
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredLoads.map((load) => {
            const sellThrough = load.loadedItems > 0 
              ? Math.round((load.soldItems / load.loadedItems) * 100) 
              : 0;

            return (
              <Card key={load.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        {load.loadNo}
                      </CardTitle>
                      <CardDescription className="mt-1">{formatDate(load.date)}</CardDescription>
                    </div>
                    {getStatusBadge(load.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{load.driverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>{load.vehicleNo}</span>
                  </div>

                  {/* Load Summary */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">Loaded</p>
                      <p className="font-medium">{load.loadedItems} items</p>
                      <p className="text-xs">{formatCurrency(load.loadedValue)}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-muted-foreground">Sold</p>
                      <p className="font-medium text-green-600">{load.soldItems} items</p>
                      <p className="text-xs text-green-600">{formatCurrency(load.soldValue)}</p>
                    </div>
                  </div>

                  {/* Sell-through Rate */}
                  {load.status !== "PENDING" && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Sell-through</span>
                        <span>{sellThrough}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${sellThrough}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Collections */}
                  {load.status !== "PENDING" && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Collections:</span>
                      <span className="font-bold text-green-600">{formatCurrency(load.collections)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {load.status === "PENDING" && (
                      <Button className="flex-1" onClick={() => handleStartTrip(load.id)}>
                        <Play className="h-4 w-4 mr-1" /> Start Trip
                      </Button>
                    )}
                    {load.status === "IN_PROGRESS" && (
                      <>
                        <Button variant="outline" className="flex-1">
                          <MapPin className="h-4 w-4 mr-1" /> Track
                        </Button>
                        <Button className="flex-1" onClick={() => handleEndTrip(load.id)}>
                          <Square className="h-4 w-4 mr-1" /> End Trip
                        </Button>
                      </>
                    )}
                    {load.status === "SETTLED" && (
                      <Button variant="outline" className="flex-1">
                        View Settlement
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Load Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Load Van</CardTitle>
                  <CardDescription>Prepare a van for sales trip</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Vehicle *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">TN 01 AB 1234</SelectItem>
                    <SelectItem value="2">TN 02 CD 5678</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assign Driver *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ravi Kumar</SelectItem>
                    <SelectItem value="2">Senthil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Select Beat/Route</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select beat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">North Zone - Monday</SelectItem>
                    <SelectItem value="2">South Zone - Tuesday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Package className="h-4 w-4 inline mr-1" />
                  After creating, add products to load into the van.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => { toast.success("Van load created!"); setShowCreateModal(false); }}>
                  Create Load
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

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
  Route,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  Play,
  Pause,
  Edit,
  Trash2,
  X,
  Target,
  TrendingUp,
  Navigation,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";

// Mock data for beats
const mockBeats = [
  {
    id: "1",
    name: "North Zone - Monday",
    dayOfWeek: "MONDAY",
    employeeName: "Rahul Kumar",
    customerCount: 12,
    expectedVisits: 12,
    completedVisits: 8,
    status: "IN_PROGRESS",
    route: ["Shop A", "Shop B", "Shop C", "..."],
  },
  {
    id: "2",
    name: "South Zone - Tuesday",
    dayOfWeek: "TUESDAY",
    employeeName: "Suresh Babu",
    customerCount: 15,
    expectedVisits: 15,
    completedVisits: 15,
    status: "COMPLETED",
    route: ["Outlet 1", "Outlet 2", "..."],
  },
  {
    id: "3",
    name: "West Zone - Wednesday",
    dayOfWeek: "WEDNESDAY",
    employeeName: "Amit Singh",
    customerCount: 10,
    expectedVisits: 10,
    completedVisits: 0,
    status: "PENDING",
    route: ["Store X", "Store Y", "..."],
  },
];

const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function BeatsPage() {
  const { currentCompany } = useCompany();
  const [beats, setBeats] = useState(mockBeats);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<string>("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBeat, setNewBeat] = useState({
    name: "",
    dayOfWeek: "MONDAY",
    employeeId: "",
    customers: [] as string[],
  });

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(date));

  // Filter beats
  const filteredBeats = beats.filter((beat) => {
    const matchesSearch = beat.name.toLowerCase().includes(search.toLowerCase()) ||
      beat.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesDay = dayFilter === "all" || beat.dayOfWeek === dayFilter;
    return matchesSearch && matchesDay;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleCreateBeat = () => {
    if (!newBeat.name) {
      toast.error("Please enter beat name");
      return;
    }
    toast.success("Beat created successfully!");
    setShowCreateModal(false);
    setNewBeat({ name: "", dayOfWeek: "MONDAY", employeeId: "", customers: [] });
  };

  // Metrics
  const totalBeats = beats.length;
  const todayBeats = beats.filter(b => b.dayOfWeek === daysOfWeek[new Date().getDay() - 1] || new Date().getDay() === 0).length;
  const completedToday = beats.filter(b => b.status === "COMPLETED").length;
  const totalCustomers = beats.reduce((sum, b) => sum + b.customerCount, 0);

  return (
    <PageShell
      title="Beat Planning"
      description="Plan and manage salesman routes and customer visits"
      icon={<Route className="h-6 w-6" />}
      action={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Beat
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalBeats}</div>
            <p className="text-xs text-muted-foreground">Total Beats</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{todayBeats}</div>
            <p className="text-xs text-muted-foreground">Today's Beats</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total Outlets</p>
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
                placeholder="Search beats or salesman..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setLoading(true)}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Beats List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBeats.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No beats found</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create First Beat
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredBeats.map((beat) => {
            const completionRate = beat.expectedVisits > 0 
              ? Math.round((beat.completedVisits / beat.expectedVisits) * 100) 
              : 0;

            return (
              <Card key={beat.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Route className="h-5 w-5 text-blue-600" />
                        {beat.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {beat.dayOfWeek.charAt(0) + beat.dayOfWeek.slice(1).toLowerCase()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(beat.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Salesman:</span>
                    <span className="font-medium">{beat.employeeName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Outlets:</span>
                    <span className="font-medium">{beat.customerCount}</span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Visits: {beat.completedVisits}/{beat.expectedVisits}</span>
                      <span>{completionRate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          completionRate === 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Navigation className="h-3 w-3 mr-1" /> View Route
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Beat Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Create New Beat</CardTitle>
                  <CardDescription>Define a route for salesman visits</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Beat Name *</Label>
                <Input
                  placeholder="e.g., North Zone - Monday"
                  value={newBeat.name}
                  onChange={(e) => setNewBeat({ ...newBeat, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Day of Week</Label>
                <Select value={newBeat.dayOfWeek} onValueChange={(v) => setNewBeat({ ...newBeat, dayOfWeek: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assign Salesman</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesman" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Rahul Kumar</SelectItem>
                    <SelectItem value="2">Suresh Babu</SelectItem>
                    <SelectItem value="3">Amit Singh</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Target className="h-4 w-4 inline mr-1" />
                  After creating the beat, you can add customers/outlets to the route.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreateBeat}>
                  Create Beat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

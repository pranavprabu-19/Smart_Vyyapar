"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardTitle, CardHeader, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, MapPin, CheckCircle, Clock, Navigation, AlertCircle, PlusCircle, Printer, IndianRupee } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-context";

import { getActiveTrip, createDailyTrip, startTrip, endTrip, updateStopStatus, getTripHistory } from "@/actions/trip";
import { getVehiclesAction } from "@/actions/vehicle";
import { getEmployeesAction } from "@/actions/employee";

// Local types adapted for UI (mapped from Prisma result)
type DeliveryStop = {
    id: string;
    customerName: string;
    address: string;
    items: string;
    status: string; // Prisma string
    coords: { lat: number; lng: number };
    timestamp?: string;
};

type Trip = {
    id: string;
    driverName: string;
    vehicleNo: string;
    status: string;
    startTime?: string;
    endTime?: string;
    totalDistance?: number;
    stops: DeliveryStop[];
};

export default function TripsPage() {
    const { user } = useAuth();
    const { currentCompany } = useCompany();

    // Mock Location (Starting near Padappai for realistic demo)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'CURRENT' | 'HISTORY'>('CURRENT');
    const [history, setHistory] = useState<any[]>([]);

    // Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [selectedDriverName, setSelectedDriverName] = useState("");
    const [lookbackDays, setLookbackDays] = useState(1);

    const refreshHistory = async () => {
        const hist = await getTripHistory();
        setHistory(hist);
    }
    const refreshTrip = async () => {
        try {
            const tripData = await getActiveTrip();
            if (tripData) {
                // Map Prisma data to simple UI objects
                const mappedTrip: Trip = {
                    id: tripData.id,
                    driverName: tripData.driverName,
                    vehicleNo: tripData.vehicleNo,
                    status: tripData.status, // "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
                    startTime: tripData.startTime?.toISOString(),
                    endTime: tripData.endTime?.toISOString(),
                    totalDistance: tripData.totalDistance,
                    stops: tripData.stops.map((s: any) => ({
                        id: s.id,
                        customerName: s.customerName,
                        address: s.address,
                        items: s.items,
                        status: s.status,
                        coords: { lat: s.lat, lng: s.lng },
                        timestamp: s.timestamp?.toISOString()
                    }))
                };
                setActiveTrip(mappedTrip);
            } else {
                setActiveTrip(null);
            }
        } catch (error) {
            console.error("Failed to load trip", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshTrip();
        if (view === 'HISTORY') refreshHistory();
    }, [view]);

    // Load Resources for Modal
    useEffect(() => {
        async function loadResources() {
            if (isCreateModalOpen) {
                const vRes = await getVehiclesAction();
                if (vRes.success) setVehicles(vRes.vehicles || []);

                const eRes = await getEmployeesAction(currentCompany);
                if (eRes.success) setDrivers(eRes.employees || []);
            }
        }
        loadResources();
    }, [isCreateModalOpen, currentCompany]);
    // Create a new trip
    const handleCreateSubmit = async () => {
        if (!selectedDriverName || !selectedVehicleId) {
            alert("Please select both a driver and a vehicle.");
            return;
        }

        setLoading(true);
        try {
            const vehicle = vehicles.find(v => v.id === selectedVehicleId);
            const vehicleNo = vehicle ? vehicle.regNo : "Unknown";

            await createDailyTrip(selectedDriverName, vehicleNo, selectedVehicleId, lookbackDays);
            await refreshTrip();
            setIsCreateModalOpen(false);
        } catch (e: any) {
            alert(e.message || "Failed to assign route");
        } finally {
            setLoading(false);
        }
    };

    const [locationStats, setLocationStats] = useState<{ speed: number; heading: number } | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    // Haversine Formula for Distance (km)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // Find nearest pending stop
    const getRecommendedStop = () => {
        if (!activeTrip || !currentLocation || activeTrip.status !== "IN_PROGRESS") return null;

        const pendingStops = activeTrip.stops.filter(s => s.status === "PENDING");
        if (pendingStops.length === 0) return null;

        // Sort by distance
        const sorted = pendingStops.sort((a, b) => {
            const distA = calculateDistance(currentLocation.lat, currentLocation.lng, a.coords.lat, a.coords.lng);
            const distB = calculateDistance(currentLocation.lat, currentLocation.lng, b.coords.lat, b.coords.lng);
            return distA - distB;
        });

        return sorted[0];
    };

    const recommendedStop = getRecommendedStop();

    // Real live tracking effect
    useEffect(() => {
        if (activeTrip?.status === "IN_PROGRESS" && "geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setCurrentLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });

                    // Update stats only if speed is available (not null)
                    if (pos.coords.speed !== null) {
                        setLocationStats({
                            speed: Math.round(pos.coords.speed * 3.6), // Convert m/s to km/h
                            heading: pos.coords.heading || 0
                        });
                    } else {
                        // If device doesn't provide speed (desktop), show 0 or keep last known? 
                        // Better to show 0 to confirm "Real" mode vs "Fake" mode.
                        setLocationStats(prev => ({ ...prev!, speed: 0, heading: prev?.heading || 0 }));
                    }
                },
                (err) => {
                    console.error(`GPS Error (${err.code}): ${err.message}`);
                    if (err.code === 1) { // PERMISSION_DENIED
                        alert("Please enable location permissions to use trip tracking.");
                    }
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 20000
                }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [activeTrip?.status]);

    const handleStartTrip = async () => {
        if (!activeTrip) return;
        setIsStarting(true);

        try {
            await startTrip(activeTrip.id);
            await refreshTrip();
        } catch (e) {
            alert("Failed to start trip");
        } finally {
            setIsStarting(false);
        }
    };

    const [showEndTripModal, setShowEndTripModal] = useState(false);
    const [tripExpenses, setTripExpenses] = useState({
        endReading: "",
        fuelCost: "",
        foodCost: "",
        otherExp: "",
        allowance: ""
    });

    const handleEndTripClick = () => {
        setShowEndTripModal(true);
    };

    const submitEndTrip = async () => {
        if (!activeTrip) return;

        const endReading = parseFloat(tripExpenses.endReading);
        const fuel = parseFloat(tripExpenses.fuelCost) || 0;
        const food = parseFloat(tripExpenses.foodCost) || 0;
        const other = parseFloat(tripExpenses.otherExp) || 0;
        const allowance = parseFloat(tripExpenses.allowance) || 0;

        if (isNaN(endReading) || endReading <= 0) {
            alert("Please enter a valid final odometer reading.");
            return;
        }

        // Calculate total distance (assuming we have start reading, or just use user input as distance for MVP if that's what notes implied. 
        // Notes said "Enter Total Distance".
        // Let's assume input is Total Distance for now to match previous logic, or Odometer.
        // The notes said "Fuel Cost, Food Allowances...". 
        // Previous prompt logic: "Enter total distance covered".
        // Let's keep "Total Distance" as the input for simplicity unless "End Reading" implies calc.
        // I'll assume standard Odometer End Reading is better, but MVP: Input Distance.
        // Wait, schema has `endReading`. I added it.
        // Let's use `endReading` as "Total Distance Covered" if that's easier, or actual reading.
        // Field name is `endReading`. Let's ask user for "Total Km" and store it as `totalDistance` and maybe `endReading` as derived or same?
        // Actually, user notes said "Add Expense Inputs".
        // The prompt implementation used "Total Distance".
        // Let's stick to "Total Km" as primary input for distance, and expenses as additions.

        const totalDist = endReading; // Using this field for distance input as per previous flow

        if (confirm(`End trip? Distance: ${totalDist} km, Expenses: ₹${fuel + food + other + allowance}`)) {
            try {
                await endTrip(activeTrip.id, totalDist, {
                    endReading: totalDist, // Store distance here too or actual reading if we had start.
                    fuelCost: fuel,
                    foodCost: food,
                    otherExp: other,
                    allowance: allowance
                });
                await refreshTrip();
                setShowEndTripModal(false);
            } catch (e) {
                alert("Failed to end trip");
            }
        }
    };

    const handleMarkDelivered = async (stopId: string) => {
        if (!activeTrip) return;
        try {
            await updateStopStatus(stopId, "DELIVERED");
            await refreshTrip();

            // Update local location for UX
            const stop = activeTrip.stops.find(s => s.id === stopId);
            if (stop) setCurrentLocation(stop.coords);
        } catch (e) {
            alert("Failed to update status");
        }
    };

    // Calculate progress
    const completedStops = activeTrip?.stops.filter(s => s.status === "DELIVERED").length || 0;
    const totalStops = activeTrip?.stops.length || 0;
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

    return (
        <PageShell
            title="Trip Sheets & Deliveries"
            description={`Manage daily delivery routes for ${currentCompany}.`}
            action={
                <div className="flex gap-2 bg-muted/20 p-1 rounded-lg">
                    <Button size="sm" variant={view === 'CURRENT' ? 'secondary' : 'ghost'} onClick={() => setView('CURRENT')}>Current Trip</Button>
                    <Button size="sm" variant={view === 'HISTORY' ? 'secondary' : 'ghost'} onClick={() => setView('HISTORY')}>History</Button>
                </div>
            }
        >
            {loading ? (
                <div className="text-center py-10">Loading Trip Data...</div>
            ) : view === 'HISTORY' ? (
                <Card variant="premium">
                    <CardHeader>
                        <CardTitle>Trip History (Last 20)</CardTitle>
                        <CardDescription>Past delivery trips and route performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground font-medium text-left">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Vehicle</th>
                                    <th className="p-3">Driver</th>
                                    <th className="p-3">Distance</th>
                                    <th className="p-3 text-right">Expenses</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {history.map(trip => (
                                    <tr key={trip.id} className="hover:bg-muted/10">
                                        <td className="p-3">{new Date(trip.createdAt).toLocaleDateString()}</td>
                                        <td className="p-3 font-medium">{trip.vehicleNo}</td>
                                        <td className="p-3">{trip.driverName}</td>
                                        <td className="p-3">{trip.totalDistance} km</td>
                                        <td className="p-3 text-right font-mono">₹{trip.fuelCost + trip.foodCost + trip.otherExp + trip.allowance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            ) : !activeTrip ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Active Trip Found</h3>
                    <p className="text-muted-foreground mb-6">Generate today's delivery route to get started.</p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Daily Trip
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column: Trip Overview */}
                    <Card variant="premium" className="lg:col-span-1 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20 h-max sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-lg flex justify-between items-center">
                                Current Trip
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => window.print()}>
                                        <Printer className="h-3 w-3" />
                                    </Button>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTrip.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                                        {activeTrip.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </CardTitle>
                            <CardDescription>Vehicle: {activeTrip.vehicleNo}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {activeTrip.status === "NOT_STARTED" && (
                                <div className="text-center py-6">
                                    <Truck className={`h-12 w-12 mx-auto text-muted-foreground mb-4 ${isStarting ? 'animate-bounce' : ''}`} />
                                    <Button size="lg" className="w-full" onClick={handleStartTrip} disabled={isStarting}>
                                        {isStarting ? "Starting..." : "Start Trip & Track"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {isStarting ? "Acquiring satellite lock..." : "Requires GPS Permission"}
                                    </p>
                                </div>
                            )}

                            {activeTrip.status === "IN_PROGRESS" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="p-3 bg-card rounded-lg border shadow-sm">
                                            <div className="text-xs text-muted-foreground">Start Time</div>
                                            <div className="font-bold">{activeTrip.startTime ? new Date(activeTrip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                                        </div>
                                        <div className="p-3 bg-card rounded-lg border shadow-sm">
                                            <div className="text-xs text-muted-foreground">Speed</div>
                                            <div className="font-bold text-primary">{locationStats?.speed || 0} km/h</div>
                                        </div>
                                    </div>

                                    {recommendedStop && (
                                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                            <div className="text-xs font-semibold text-primary uppercase mb-1">Recommended Next Stop</div>
                                            <div className="font-bold text-sm">{recommendedStop.customerName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {calculateDistance(currentLocation!.lat, currentLocation!.lng, recommendedStop.coords.lat, recommendedStop.coords.lng).toFixed(1)} km away
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Delivery Progress</span>
                                            <span className="text-primary font-bold">{completedStops}/{totalStops} Stops</span>
                                        </div>
                                        <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden border border-border/50">
                                            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">{progress.toFixed(0)}% Complete</p>
                                    </div>

                                    <Button variant="destructive" className="w-full mt-4" onClick={handleEndTripClick}>
                                        End Trip
                                    </Button>
                                </div>
                            )}

                            {activeTrip.status === "COMPLETED" && (
                                <div className="text-center py-6 space-y-4">
                                    <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                                    <div>
                                        <h3 className="font-bold text-xl">Trip Completed!</h3>
                                        <p className="text-muted-foreground">Total Distance: {activeTrip.totalDistance} km</p>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => setActiveTrip(null)}>
                                        Back to Trips
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right Column: Stops List */}
                    <Card variant="premium" className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Delivery Route</CardTitle>
                            <CardDescription> Optimized for {activeTrip.vehicleNo}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 relative">
                                {/* Vertical connecting line */}
                                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border -z-10" />

                                {activeTrip.stops.map((stop, index) => {
                                    const isRecommended = recommendedStop?.id === stop.id;
                                    const distanceInfo = currentLocation && stop.status === "PENDING"
                                        ? `${calculateDistance(currentLocation.lat, currentLocation.lng, stop.coords.lat, stop.coords.lng).toFixed(1)} km`
                                        : null;

                                    return (
                                        <div key={stop.id} className={`relative flex gap-4 p-4 rounded-lg border transition-all ${stop.status === 'DELIVERED' ? 'bg-muted/30 border-green-200' :
                                            isRecommended ? 'bg-primary/5 border-primary shadow-sm scale-[1.01]' : 'bg-card'
                                            }`}>
                                            {/* Status Icon */}
                                            <div className={`flex-none w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 ${stop.status === 'DELIVERED' ? 'bg-green-100 border-green-500 text-green-600' :
                                                isRecommended ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 animate-pulse' : 'bg-background border-muted-foreground/30 text-muted-foreground'
                                                }`}>
                                                {stop.status === 'DELIVERED' ? <CheckCircle className="h-5 w-5" /> : <span className="font-bold">{index + 1}</span>}
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold">{stop.customerName}</h4>
                                                        {isRecommended && <span className="text-[10px] h-4 px-1 bg-primary/80 hover:bg-primary text-primary-foreground rounded inline-flex items-center justify-center">Next Best Stop</span>}
                                                    </div>
                                                    {stop.status === 'DELIVERED' && stop.timestamp && (
                                                        <span className="text-xs text-green-600 flex items-center">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            {new Date(stop.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                    <div className="flex items-center">
                                                        <MapPin className="h-3 w-3 mr-1" /> {stop.address}
                                                    </div>
                                                    {distanceInfo && (
                                                        <span className="text-xs font-mono font-medium text-foreground">{distanceInfo}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-medium bg-secondary/50 inline-block px-2 py-1 rounded mt-1">
                                                    {stop.items}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2 justify-center">
                                                {activeTrip.status === "IN_PROGRESS" && stop.status === "PENDING" && (
                                                    <>
                                                        <Button size="sm" className="h-8" variant={isRecommended ? "default" : "outline"} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.coords.lat},${stop.coords.lng}`)}>
                                                            <Navigation className="h-3 w-3 sm:mr-1" />
                                                            <span className="hidden sm:inline">Nav</span>
                                                        </Button>
                                                        <Button size="sm" className="h-8" variant={isRecommended ? "secondary" : "default"} onClick={() => handleMarkDelivered(stop.id)}>
                                                            <CheckCircle className="h-3 w-3 sm:mr-1" />
                                                            <span className="hidden sm:inline">Done</span>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* End Trip Expense Modal */}
            {showEndTripModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>End Trip & Expenses</CardTitle>
                            <CardDescription>Enter trip details to close.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Total Distance Covered (km)</label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 45.5"
                                    value={tripExpenses.endReading}
                                    onChange={(e) => setTripExpenses({ ...tripExpenses, endReading: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fuel Cost</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            type="number"
                                            placeholder="0"
                                            value={tripExpenses.fuelCost}
                                            onChange={(e) => setTripExpenses({ ...tripExpenses, fuelCost: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Food Allowance</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            type="number"
                                            placeholder="0"
                                            value={tripExpenses.foodCost}
                                            onChange={(e) => setTripExpenses({ ...tripExpenses, foodCost: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Wages / Allowance</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            type="number"
                                            placeholder="0"
                                            value={tripExpenses.allowance}
                                            onChange={(e) => setTripExpenses({ ...tripExpenses, allowance: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Other Expenses</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            type="number"
                                            placeholder="0"
                                            value={tripExpenses.otherExp}
                                            onChange={(e) => setTripExpenses({ ...tripExpenses, otherExp: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEndTripModal(false)}>Cancel</Button>
                            <Button onClick={submitEndTrip}>Complete Trip</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
            {/* Create Trip Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background w-full max-w-md rounded-lg shadow-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-lg">Create Daily Trip</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>✕</Button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Driver</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedDriverName} onChange={e => setSelectedDriverName(e.target.value)}>
                                    <option value="">-- Select Driver --</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.name}>{d.name} ({d.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Vehicle</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}>
                                    <option value="">-- Select Vehicle --</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.regNo} - {v.model}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Include Invoices From</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={lookbackDays} onChange={e => setLookbackDays(parseInt(e.target.value))}>
                                    <option value={1}>Today Only</option>
                                    <option value={2}>Since Yesterday</option>
                                    <option value={3}>Last 3 Days</option>
                                    <option value={7}>Last 7 Days</option>
                                </select>
                            </div>
                            <Button className="w-full" onClick={handleCreateSubmit} disabled={loading}>
                                {loading ? "Creating..." : "Generate Route & Start"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}

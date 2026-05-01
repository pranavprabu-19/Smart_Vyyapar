"use server";

import { prisma } from "@/lib/db";
import { REAL_CUSTOMERS, REAL_PRODUCTS } from "@/lib/real-data";

// Type definitions (or import from Prisma)
import { Trip, TripStop } from "@prisma/client";

type RoutePoint = { lat: number; lng: number };

function haversineDistanceKm(from: RoutePoint, to: RoutePoint) {
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function getDistanceScoreKm(from: RoutePoint, to: RoutePoint): Promise<number> {
    const endpoint = process.env.ROUTE_DISTANCE_API_URL;
    if (!endpoint) return haversineDistanceKm(from, to);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from, to }),
            cache: "no-store",
        });
        if (!response.ok) return haversineDistanceKm(from, to);

        const payload = (await response.json()) as { distanceKm?: number; distanceMeters?: number };
        if (typeof payload.distanceKm === "number") return payload.distanceKm;
        if (typeof payload.distanceMeters === "number") return payload.distanceMeters / 1000;
    } catch (error) {
        console.warn("Distance scoring API failed. Falling back to geo distance.", error);
    }

    return haversineDistanceKm(from, to);
}

export async function getActiveTrip() {
    try {
        const trip = await prisma.trip.findFirst({
            where: {
                status: {
                    in: ["NOT_STARTED", "IN_PROGRESS"]
                }
            },
            include: {
                stops: {
                    orderBy: {
                        createdAt: 'asc' // Or optimize by route order later
                    }
                }
            }
        });
        return trip;
    } catch (error) {
        console.error("Error fetching active trip:", error);
        return null;
    }
}

export async function createDailyTrip(driverName: string, vehicleNo: string, vehicleId?: string, daysToLookBack: number = 1) {
    try {
        // 1. Get Invoices generated in the lookback period
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        // If lookback is > 1, subtract days. E.g. 1 means "Today", 2 means "Since Yesterday"
        if (daysToLookBack > 1) {
            startDate.setDate(startDate.getDate() - (daysToLookBack - 1));
        }

        const todayInvoices = await prisma.invoice.findMany({
            where: {
                createdAt: {
                    gte: startDate
                },
                status: {
                    not: "CANCELLED"
                }
            },
            include: {
                customer: true
            }
        });

        if (todayInvoices.length === 0) {
            return { error: `No invoices found in the last ${daysToLookBack} day(s) to create a trip.` };
        }

        // 2. Extract Unique Customers
        const uniqueCustomersMap = new Map<string, any>();
        todayInvoices.forEach(inv => {
            if (inv.customer) {
                if (!uniqueCustomersMap.has(inv.customerId as string)) {
                    uniqueCustomersMap.set(inv.customerId as string, {
                        ...inv.customer,
                        lat: inv.customer.lat || (12.8700 + (Math.random() * 0.1 - 0.05)),
                        lng: inv.customer.lng || (80.0200 + (Math.random() * 0.1 - 0.05)),
                        invoiceItems: []
                    });
                }
            } else if (inv.customerDetails) {
                // Fallback if no relation but has JSON details
                try {
                    const details = inv.customerDetails as any;
                    const key = String(inv.customerId || details.phone || details.name);
                    if (!uniqueCustomersMap.has(key)) {
                        uniqueCustomersMap.set(key, {
                            name: details.name,
                            address: details.address,
                            lat: details.lat || (12.8700 + (Math.random() * 0.1 - 0.05)),
                            lng: details.lng || (80.0200 + (Math.random() * 0.1 - 0.05)),
                        });
                    }
                } catch (e) {
                    console.warn("Failed to parse customerDetails for invoice", inv.invoiceNo);
                }
            }
        });

        const customers = Array.from(uniqueCustomersMap.values());

        if (customers.length === 0) {
            return { error: "No customers with valid location data found in today's invoices." };
        }

        // 3. Optimize Route (Greedy nearest-neighbor baseline, with optional API distance scoring)
        // Start from Office: Padappai (Approx)
        let currentLocation = { lat: 12.8700, lng: 80.0200 };
        const sortedCustomers = [];
        const pending = [...customers];

        while (pending.length > 0) {
            // Find nearest to currentLocation
            let nearestIdx = -1;
            let minDist = Infinity;

            for (let i = 0; i < pending.length; i++) {
                const c = pending[i];
                const d = await getDistanceScoreKm(currentLocation, { lat: c.lat, lng: c.lng });
                if (d < minDist) {
                    minDist = d;
                    nearestIdx = i;
                }
            }

            const nearest = pending.splice(nearestIdx, 1)[0];
            sortedCustomers.push(nearest);
            currentLocation = { lat: nearest.lat, lng: nearest.lng };
        }

        // 4. Create Trip
        const company = await prisma.company.findFirst({ where: { name: todayInvoices[0].companyName } });
        if (!company) return { error: "Company not found" };

        const trip = await prisma.trip.create({
            data: {
                companyId: company.id,
                companyName: company.name,
                driverName,
                vehicleNo,
                vehicleId: vehicleId, // Link to actual Vehicle record
                status: "NOT_STARTED",
                stops: {
                    create: sortedCustomers.map((cust, idx) => ({
                        customerName: cust.name,
                        address: cust.address,
                        items: "Bundled Orders", // Generic for now, or aggregate items from invoices
                        status: "PENDING",
                        lat: cust.lat,
                        lng: cust.lng
                    }))
                }
            },
            include: {
                stops: true
            }
        });
        return { success: true, trip };
    } catch (error: any) {
        console.error("Error creating trip:", error);
        return { error: error.message || "Failed to create trip due to an unknown server error." };
    }
}

export async function startTrip(tripId: string) {
    try {
        return await prisma.trip.update({
            where: { id: tripId },
            data: {
                status: "IN_PROGRESS",
                startTime: new Date()
            }
        });
    } catch (error) {
        console.error("Error starting trip:", error);
        throw error;
    }
}

export async function endTrip(tripId: string, totalDistance: number, expenses?: {
    fuelCost: number;
    foodCost: number;
    otherExp: number;
    allowance: number;
    endReading: number;
}) {
    try {
        const trip = await prisma.trip.update({
            where: { id: tripId },
            data: {
                status: "COMPLETED",
                endTime: new Date(),
                totalDistance: totalDistance,
                // Add Expenses
                fuelCost: expenses?.fuelCost || 0,
                foodCost: expenses?.foodCost || 0,
                otherExp: expenses?.otherExp || 0,
                allowance: expenses?.allowance || 0,
                endReading: expenses?.endReading || 0
            }
        });

        // Update Vehicle Stats if linked
        if (trip.vehicleId) {
            await prisma.vehicle.update({
                where: { id: trip.vehicleId },
                data: {
                    totalDistance: { increment: totalDistance },
                    // Optionally update lastServiceDate if logic needed
                }
            });
        }

        return trip;
    } catch (error) {
        console.error("Error ending trip:", error);
        throw error;
    }
}

export async function updateStopStatus(stopId: string, status: "DELIVERED" | "FAILED") {
    try {
        return await prisma.tripStop.update({
            where: { id: stopId },
            data: {
                status: status,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error("Error updating stop:", error);
        throw error;
    }
}

export async function getTripHistory() {
    try {
        const trips = await prisma.trip.findMany({
            where: {
                status: "COMPLETED"
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20, // Limit for MVP
            include: {
                vehicle: true // Include vehicle details
            }
        });
        return trips;
    } catch (error) {
        console.error("Error fetching trip history:", error);
        return [];
    }
}

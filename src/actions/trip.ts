"use server";

import { prisma } from "@/lib/db";
import { REAL_CUSTOMERS, REAL_PRODUCTS } from "@/lib/real-data";

// Type definitions (or import from Prisma)
import { Trip, TripStop } from "@prisma/client";

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
            throw new Error(`No invoices found in the last ${daysToLookBack} day(s) to create a trip.`);
        }

        // 2. Extract Unique Customers
        const uniqueCustomersMap = new Map();
        todayInvoices.forEach(inv => {
            if (inv.customer && inv.customer.lat && inv.customer.lng) {
                if (!uniqueCustomersMap.has(inv.customerId)) {
                    uniqueCustomersMap.set(inv.customerId, {
                        ...inv.customer,
                        invoiceItems: []
                    });
                }
            } else if (inv.customerDetails) {
                // Fallback if no relation but has JSON details
                try {
                    const details = JSON.parse(inv.customerDetails);
                    if (details.lat && details.lng) {
                        const key = inv.customerId || details.phone || details.name;
                        if (!uniqueCustomersMap.has(key)) {
                            uniqueCustomersMap.set(key, {
                                name: details.name,
                                address: details.address,
                                lat: details.lat,
                                lng: details.lng,
                                // Add other minimal fields if needed by Trip logic (Trip doesn't need much else)
                            });
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse customerDetails for invoice", inv.invoiceNo);
                }
            }
        });

        const customers = Array.from(uniqueCustomersMap.values());

        if (customers.length === 0) {
            throw new Error("No customers with valid location data found in today's invoices.");
        }

        // 3. Optimize Route (Greedy Nearest Neighbor)
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
                // Simple Euclidean approx is enough for sorting small routes, or Haversine
                const d = Math.sqrt(Math.pow(c.lat - currentLocation.lat, 2) + Math.pow(c.lng - currentLocation.lng, 2));
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
        const trip = await prisma.trip.create({
            data: {
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
        return trip;
    } catch (error) {
        console.error("Error creating trip:", error);
        throw error; // Re-throw to be caught by UI
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

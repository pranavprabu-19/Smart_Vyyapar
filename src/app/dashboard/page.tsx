import { CreditCard, DollarSign, Package, Users, TrendingUp, Warehouse, FileText, Truck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { getDashboardMetrics } from "@/actions/dashboard";
import { cookies } from "next/headers";
import { KPICard } from "@/components/dashboard/kpi-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const selectedCompany = cookieStore.get("selectedCompany")?.value || "Sai Associates";

    // Fetch Real Data from Server Action
    const metrics = await getDashboardMetrics(decodeURIComponent(selectedCompany));

    const kpiCards = [
        {
            title: "Total Revenue (Monthly)",
            value: metrics.currentMonthRevenue,
            change: metrics.growth,
            changeLabel: "from last month",
            icon: <DollarSign className="h-5 w-5 text-blue-600" />,
            gradient: "from-blue-500/10 to-indigo-500/10",
            borderColor: "border-blue-500/20"
        },
        {
            title: "Active Customers",
            value: metrics.customerCount,
            change: null,
            changeLabel: "Distribution network",
            icon: <Users className="h-5 w-5 text-purple-600" />,
            gradient: "from-purple-500/10 to-pink-500/10",
            borderColor: "border-purple-500/20"
        },
        {
            title: "Pending Payments",
            value: metrics.totalOutstanding,
            change: null,
            changeLabel: `Across ${metrics.customersWithDebt} customers`,
            icon: <CreditCard className="h-5 w-5 text-red-600" />,
            gradient: "from-red-500/10 to-orange-500/10",
            borderColor: "border-red-500/20"
        },
        {
            title: "Stock Value",
            value: metrics.totalStockValue,
            change: null,
            changeLabel: `${metrics.uniqueSkus} Unique SKUs`,
            icon: <Package className="h-5 w-5 text-emerald-600" />,
            gradient: "from-emerald-500/10 to-teal-500/10",
            borderColor: "border-emerald-500/20"
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Distribution overview and key metrics</p>
                </div>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Premium KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map((kpi, index) => (
                    <KPICard key={kpi.title} {...kpi} index={index} />
                ))}
            </div>

            {/* Daily Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                        <FileText className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{metrics.todaySales?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">{metrics.todayInvoiceCount || 0} invoices generated</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">₹{metrics.todayCollections?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Cash received today</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
                        <Truck className="h-5 w-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{metrics.activeTrips || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <Link href="/dashboard/trips" className="text-primary hover:underline">View trips →</Link>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Godown Status Overview */}
            {metrics.godownStats && metrics.godownStats.length > 0 && (
                <Card variant="premium">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <Warehouse className="h-5 w-5" />
                                Godown Status Overview
                            </CardTitle>
                            <Link href="/dashboard/godowns">
                                <Button variant="outline" size="sm">Manage Godowns</Button>
                            </Link>
                        </div>
                        <CardDescription>Stock levels across all warehouses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {metrics.godownStats.map((godown: any) => (
                                <div key={godown.id} className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold">{godown.name}</h4>
                                            {godown.location && (
                                                <p className="text-xs text-muted-foreground">{godown.location}</p>
                                            )}
                                        </div>
                                        {godown.lowStockItems > 0 && (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        )}
                                    </div>
                                    <div className="space-y-1 mt-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Items:</span>
                                            <span className="font-medium">{godown.totalItems}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Quantity:</span>
                                            <span className="font-medium">{godown.totalQuantity.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Value:</span>
                                            <span className="font-semibold text-emerald-600">₹{godown.totalValue.toLocaleString()}</span>
                                        </div>
                                        {godown.lowStockItems > 0 && (
                                            <div className="flex justify-between text-sm pt-1 border-t">
                                                <span className="text-red-600">Low Stock:</span>
                                                <span className="font-semibold text-red-600">{godown.lowStockItems} items</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Alerts Section */}
            {metrics.lowStockItems && metrics.lowStockItems.length > 0 && (
                <Card variant="premium" className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 to-orange-500/5">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Low Stock Alert
                            </CardTitle>
                            <Link href="/dashboard/inventory">
                                <Button variant="outline" size="sm">View Inventory</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {metrics.lowStockItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-card/50 p-3 rounded-lg border border-red-500/20 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="text-sm font-medium">{item.name}</div>
                                    <div className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                                        {item.stock} left
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Section */}
            <OverviewCharts graphData={metrics.weeklySales} recentSales={metrics.recentSales} />
        </div>
    );
}

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageShell } from "@/components/dashboard/page-shell"

export default function Loading() {
    return (
        <PageShell title="Dashboard" description="Overview of your business performance">
            {/* KPI Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton width={100} />
                            </CardTitle>
                            <Skeleton circle width={20} height={20} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                <Skeleton width={80} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                <Skeleton width={120} />
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts & Recent Sales Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
                <Card className="col-span-4">
                    <CardHeader>
                        <Skeleton width={150} height={24} />
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Skeleton height={300} />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <Skeleton width={120} height={24} />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center">
                                    <Skeleton circle width={40} height={40} />
                                    <div className="ml-4 space-y-1">
                                        <Skeleton width={120} />
                                        <Skeleton width={80} />
                                    </div>
                                    <div className="ml-auto">
                                        <Skeleton width={60} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    )
}

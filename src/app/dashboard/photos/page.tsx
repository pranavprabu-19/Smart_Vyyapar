"use client";

import { useState, useRef, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Save, RefreshCw, Upload, Crosshair, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { savePhotoAction, getPhotosAction } from "@/actions/photos";
import { getCustomersAction } from "@/actions/customer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateDistance } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/ui/map-view'), {
    ssr: false,
    loading: () => <div className="h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center">Loading Map...</div>
});

type PhotoRecord = {
    id: string;
    url: string;
    timestamp: string;
    location: { lat: number; lng: number; address?: string; accuracy?: number; isMock?: boolean };
    user: string;
    role: string;
    company: string;
};

type Customer = {
    id: string;
    name: string;
    lat?: number | null;
    lng?: number | null;
    address: string;
};

export default function SitePhotosPage() {
    const { user } = useAuth();
    const { currentCompany } = useCompany();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number; address?: string; accuracy?: number; isMock?: boolean } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [savedPhotos, setSavedPhotos] = useState<PhotoRecord[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Verification State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [distance, setDistance] = useState<number | null>(null);

    // Detailed View State
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);

    // Initial Load
    useEffect(() => {
        loadPhotos();
        loadCustomers();
        return () => stopCamera();
    }, [currentCompany]);

    // Calculate distance when location or customer changes
    useEffect(() => {
        if (location && selectedCustomerId) {
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer && customer.lat && customer.lng) {
                const dist = calculateDistance(location.lat, location.lng, customer.lat, customer.lng);
                setDistance(dist);
            } else {
                setDistance(null);
            }
        } else {
            setDistance(null);
        }
    }, [location, selectedCustomerId, customers]);

    const loadCustomers = async () => {
        const res = await getCustomersAction(currentCompany);
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }
    };

    const loadPhotos = async () => {
        const res = await getPhotosAction(currentCompany);
        if (res.success && res.photos) {
            const mapped = res.photos.map((p: any) => ({
                id: p.id,
                url: p.url,
                timestamp: p.timestamp,
                location: {
                    lat: p.lat,
                    lng: p.lng,
                    address: p.address,
                    accuracy: p.accuracy,
                    isMock: p.isMock
                },
                user: p.userName,
                role: p.userRole,
                company: p.companyName
            }));
            setSavedPhotos(mapped);
        }
    };

    const startCamera = async () => {
        setCapturedImage(null);
        setLocation(null);
        setDistance(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setStream(mediaStream);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play().catch(e => toast.error("Video error: " + e.message));
                }
            }, 100);
        } catch (err: any) {
            console.error("Camera error:", err);
            toast.error("Could not access camera.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                stopCamera();
                getLocation();
            }
        }
    };

    const resolveAddress = async (lat: number, lng: number, isMock: boolean) => {
        try {
            // Use Nominatim (OpenStreetMap)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();

            if (data && data.display_name) {
                setLocation(prev => prev ? { ...prev, address: data.display_name } : null);
            } else {
                setLocation(prev => prev ? { ...prev, address: "Address not found" } : null);
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            setLocation(prev => prev ? { ...prev, address: "Error fetching address" } : null);
        }
    };

    const getLocation = (retry = false) => {
        setLoadingLocation(true);
        if (!("geolocation" in navigator)) {
            setLoadingLocation(false);
            toast.error("Geolocation not supported.");
            return;
        }

        const handleSuccess = (position: GeolocationPosition) => {
            const { latitude, longitude, accuracy } = position.coords;
            setLocation({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                isMock: false,
                address: "Fetching address..."
            });
            resolveAddress(latitude, longitude, false);
            setLoadingLocation(false);
        };

        const handleFinalError = (error: GeolocationPositionError) => {
            setLoadingLocation(false);
            toast.warning("Using mock location (GPS failed).");
            const mockLat = 12.9716;
            const mockLng = 80.2530;
            setLocation({
                lat: mockLat,
                lng: mockLng,
                isMock: true,
                accuracy: 0,
                address: "Fetching mock address..."
            });
            resolveAddress(mockLat, mockLng, true);
        };

        navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (error) => {
                if (error.code !== 1) {
                    // Try low accuracy fallback
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        handleFinalError,
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    handleFinalError(error);
                }
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const savePhoto = async () => {
        if (!capturedImage || !location || !user) return;
        setIsSaving(true);
        const res = await savePhotoAction({
            url: capturedImage,
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            accuracy: location.accuracy,
            isMock: location.isMock || false,
            userName: user.name,
            userRole: user.role || "Unknown",
            companyName: currentCompany
        });

        if (res.success && res.photo) {
            toast.success("Photo saved to database!");
            loadPhotos();
            setCapturedImage(null);
            setLocation(null);
            setDistance(null);
            setSelectedCustomerId("");
        } else {
            toast.error("Failed to save: " + res.error);
        }
        setIsSaving(false);
    };

    const retake = () => {
        setCapturedImage(null);
        setLocation(null);
        setDistance(null);
        startCamera();
    };

    return (
        <PageShell title="Site Photos & Verification" description="Capture geotagged photos for proof of visit.">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    {/* Capture Card */}
                    <Card className="p-4 border-2 border-dashed">
                        {/* Video/Image Area */}
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            {!stream && !capturedImage && (
                                <div className="flex flex-col gap-4 items-center">
                                    <Button onClick={startCamera} variant="secondary">
                                        <Camera className="mr-2 h-4 w-4" /> Start Camera
                                    </Button>
                                    <div className="text-xs text-muted-foreground">- OR -</div>
                                    <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload Photo
                                    </Button>
                                    <input id="file-upload" type="file" accept="image/*" className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setCapturedImage(reader.result as string);
                                                reader.readAsDataURL(file);
                                                getLocation();
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {stream && <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => videoRef.current?.play()} className="w-full h-full object-cover" />}
                            {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black" />}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {/* Controls */}
                        <div className="mt-4 flex gap-2 justify-center">
                            {stream && (
                                <Button onClick={capturePhoto} variant="destructive">
                                    <div className="h-3 w-3 rounded-full bg-white mr-2" /> Capture
                                </Button>
                            )}
                            {capturedImage && (
                                <>
                                    <Button onClick={retake} variant="outline">
                                        <RefreshCw className="mr-2 h-4 w-4" /> Retake
                                    </Button>
                                    <Button onClick={savePhoto} disabled={loadingLocation || isSaving}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {loadingLocation ? "Locating..." : isSaving ? "Saving..." : "Save Photo"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Verification Section */}
                    {location && (
                        <Card className="p-4 space-y-4">
                            <CardTitle className="text-sm font-medium">Location Verification</CardTitle>

                            <div className="grid gap-2">
                                <Label>Verify against Customer:</Label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Customer to Verify..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} {c.lat && c.lng ? '📍' : '(No Location)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Map View */}
                            <div className="h-48 w-full rounded-lg overflow-hidden border">
                                <MapView
                                    center={[location.lat, location.lng]}
                                    zoom={15}
                                    markers={[
                                        { lat: location.lat, lng: location.lng, title: "Me", color: "blue" },
                                        ...(selectedCustomerId && customers.find(c => c.id === selectedCustomerId)?.lat
                                            ? [{
                                                lat: customers.find(c => c.id === selectedCustomerId)!.lat!,
                                                lng: customers.find(c => c.id === selectedCustomerId)!.lng!,
                                                title: "Customer",
                                                color: "red"
                                            }]
                                            : [])
                                    ]}
                                />
                            </div>

                            {/* Status Info */}
                            <div className="p-3 bg-muted rounded-md text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        My Location ({location.accuracy?.toFixed(0)}m acc)
                                    </span>
                                    {location.isMock ? <Badge variant="destructive" className="h-5 text-[10px]">MOCK</Badge> : <Badge variant="outline" className="h-5 text-[10px] text-green-600 bg-green-50">LIVE GPS</Badge>}
                                </div>
                                <div className="text-muted-foreground">{location.address}</div>

                                {distance !== null && (
                                    <div className={`mt-2 pt-2 border-t flex items-center gap-2 font-bold ${distance < 0.2 ? "text-green-600" : "text-amber-600"}`}>
                                        {distance < 0.2 ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                        {distance < 0.2 ? "ON SITE" : "OFF SITE"}
                                        <span className="text-muted-foreground font-normal ml-1">
                                            ({distance} km from customer)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column: List */}
                <Card className="h-[600px] overflow-hidden flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Recent Uploads</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                        {savedPhotos.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">No photos captured yet.</div>
                        ) : (
                            savedPhotos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="flex gap-4 p-3 border rounded-lg bg-card/50 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <img src={photo.url} className="w-20 h-20 object-cover rounded-md bg-muted" />
                                    <div className="flex-1 space-y-1">
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            {photo.user}
                                            <span className="text-xs font-normal text-muted-foreground">({photo.role})</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{new Date(photo.timestamp).toLocaleString()}</div>
                                        <div className="flex flex-col gap-1 text-xs mt-1">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {photo.location.address?.substring(0, 30)}...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open: boolean) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-3xl w-full h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Photo Details</DialogTitle>
                    </DialogHeader>
                    {selectedPhoto && (
                        <div className="flex-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 relative bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
                                <img src={selectedPhoto.url} alt="Detail" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground text-xs">User</div>
                                    <div className="font-medium">{selectedPhoto.user}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs">Distance / Address</div>
                                    <div className="font-medium truncate">{selectedPhoto.location.address}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </PageShell>
    );
}

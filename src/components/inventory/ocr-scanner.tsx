"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileScan, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { processInvoiceOCRAction, OcrExtractedItem } from "@/actions/ocr-action";
import { toast } from "sonner";
import { createProductAction } from "@/actions/inventory";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    currentCompany: string;
    selectedGodownId?: string;
}

export function OcrScanner({ open, onOpenChange, onSuccess, currentCompany, selectedGodownId }: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedData, setParsedData] = useState<OcrExtractedItem[] | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setParsedData(null);
        setIsLoading(false);
        setIsSaving(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
    };

    const handleFile = async (file: File) => {
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
            toast.error("Please upload an image or PDF.");
            return;
        }

        setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;
                const result = await processInvoiceOCRAction(base64, file.type);
                
                if (result.success && result.data) {
                    setParsedData(result.data);
                    toast.success(`Extracted ${result.data.length} items from invoice.`);
                } else {
                    toast.error(result.error || "Failed to read invoice.");
                }
                setIsLoading(false);
            };
        } catch (error) {
            console.error(error);
            toast.error("Unexpected error parsing file.");
            setIsLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleSaveToInventory = async () => {
        if (!parsedData) return;
        setIsSaving(true);
        
        let successCount = 0;
        for (const item of parsedData) {
            try {
                const res = await createProductAction({
                    sku: item.sku,
                    name: item.name,
                    price: item.price,
                    costPrice: item.costPrice,
                    stock: item.quantity,
                    category: "General",
                    companyName: currentCompany,
                    godownId: selectedGodownId
                });
                if (res.success) successCount++;
            } catch (err) {
                console.error("Error saving OCR item", err);
            }
        }
        
        setIsSaving(false);
        toast.success(`Successfully added ${successCount}/${parsedData.length} items to inventory.`);
        onSuccess();
        handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileScan className="w-5 h-5 text-indigo-500" />
                        AI Invoice Scanner
                    </DialogTitle>
                    <DialogDescription>
                        Upload a supplier invoice to instantly generate inventory records.
                    </DialogDescription>
                </DialogHeader>

                {!parsedData && !isLoading && (
                    <div 
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                            ${isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                        <div className="flex justify-center mb-4 text-slate-400">
                            <UploadCloud className="w-12 h-12" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800">Click or drag invoice to upload</h3>
                        <p className="text-sm text-slate-500 mt-2">Supports JPG, PNG, PDF formats</p>
                    </div>
                )}

                {isLoading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <h3 className="text-lg font-medium text-slate-800 animate-pulse">Gemini Vision is analyzing your invoice...</h3>
                        <p className="text-sm text-slate-500">Extracting quantities, SKUs, and prices.</p>
                    </div>
                )}

                {parsedData && !isLoading && (
                    <div className="space-y-4">
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center justify-between border border-emerald-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">Analysis Complete</span>
                            </div>
                            <span className="text-sm">{parsedData.length} items found</span>
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto border rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Item Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">SKU</th>
                                        <th className="px-4 py-2 text-right font-medium text-slate-500">Qty</th>
                                        <th className="px-4 py-2 text-right font-medium text-slate-500">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((item, idx) => (
                                        <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{item.name}</td>
                                            <td className="px-4 py-3 text-slate-500">{item.sku}</td>
                                            <td className="px-4 py-3 text-right bg-indigo-50/50 font-semibold">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600">₹{item.costPrice}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={resetState} disabled={isSaving}>Discard</Button>
                            <Button onClick={handleSaveToInventory} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileScan className="w-4 h-4 mr-2" />}
                                Import {parsedData.length} Items
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

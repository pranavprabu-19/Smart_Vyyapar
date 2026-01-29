"use client";

import React from "react";
import { QrCode } from "lucide-react";

interface UPIQRDisplayProps {
    upiId: string;
    payeeName: string;
    amount: string;
    invoiceNo: string;
    size?: number;
}

export const UPIQRDisplay: React.FC<UPIQRDisplayProps> = ({
    upiId,
    payeeName,
    amount,
    invoiceNo,
    size = 200,
}) => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        payeeName
    )}&am=${amount}&cu=INR&tr=${invoiceNo}&tn=${encodeURIComponent(
        "Pay " + invoiceNo
    )}`;

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
        upiUrl
    )}`;

    return (
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 border-blue-500 max-w-sm mx-auto">
            {/* Google Pay Style Top Bar */}
            <div className="w-full flex justify-between items-center px-4 py-2 border-b">
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 italic">
                    Google Pay
                </div>
            </div>

            <div className="p-8 flex flex-col items-center text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{payeeName}</h3>
                <p className="text-sm font-medium text-gray-500 mb-4">{upiId.split('@')[0].replace(/(\d{5})(\d{5})/, '$1 $2')}</p>

                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4">Scan & pay</p>

                <div className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-inner mb-4">
                    <img src={qrImageUrl} alt="UPI QR Code" width={size} height={size} className="rounded-lg" />
                </div>

                <p className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border mb-6 text-gray-600">
                    UPI ID: {upiId}
                </p>

                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center justify-center gap-6 w-full grayscale opacity-70">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/BHIM_Logo.png/1200px-BHIM_Logo.png" alt="BHIM" className="h-4" />
                        <div className="h-6 w-px bg-gray-200" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/UPI-Logo.png/640px-UPI-Logo.png" alt="UPI" className="h-4" />
                    </div>

                    <div className="flex justify-center gap-4 w-full opacity-80">
                        <div className="flex items-center gap-1 text-[8px] font-bold">
                            <span className="text-blue-500">G</span>
                            <span className="text-red-500">Pay</span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-bold italic">
                            <span className="text-blue-900">Pay</span>
                            <span className="text-blue-400">tm</span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-purple-700">
                            PhonePe
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full bg-gray-900 py-2 text-center">
                <p className="text-[10px] text-white/50 font-medium">SmartVyapar POS Integration</p>
            </div>
        </div>
    );
};

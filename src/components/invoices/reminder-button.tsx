"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, X, Clock, AlertTriangle } from "lucide-react";
import { generateReminderMessage, prepareReminderManualShare } from "@/actions/reminder";
import { downloadPdfFromUrl, shareReminderMessageViaWhatsApp } from "@/lib/share-utils";
import { toast } from "sonner";

interface InvoiceForReminder {
  id: string;
  invoiceNo: string;
  date: Date | string;
  totalAmount: number;
  paidAmount?: number;
  status: string;
  customerName: string;
  customerId?: string;
  customerPhone?: string;
  companyName: string;
  items?: { description: string; quantity: number; price: number }[];
}

interface InvoiceReminderButtonProps {
  invoice: InvoiceForReminder;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function InvoiceReminderButton({
  invoice,
  variant = "outline",
  size = "sm",
  showText = false,
}: InvoiceReminderButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState(invoice.customerPhone || "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [templateType, setTemplateType] = useState<
    "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE"
  >("FIRST_REMINDER");

  // Only show for PENDING invoices
  if (invoice.status === "PAID") {
    return null;
  }

  const handleOpenModal = async () => {
    setShowModal(true);
    setIsLoading(true);

    try {
      const res = await generateReminderMessage(invoice.id, templateType);
      if (res.success && res.message) {
        setMessage(res.message);
      } else {
        // Generate a simple message if the action fails
        const balance = invoice.totalAmount - (invoice.paidAmount || 0);
        setMessage(`Dear ${invoice.customerName},

This is a reminder regarding your pending payment.

Invoice No: ${invoice.invoiceNo}
Amount Due: ₹${balance.toLocaleString("en-IN")}

Please make the payment at your earliest convenience.

Regards,
${invoice.companyName}`);
      }
    } catch (error) {
      console.error("Failed to generate message:", error);
      toast.error("Failed to generate reminder message");
    }

    setIsLoading(false);
  };

  const handleTemplateChange = async (
    type: "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE"
  ) => {
    setTemplateType(type);
    setIsLoading(true);

    try {
      const res = await generateReminderMessage(invoice.id, type);
      if (res.success && res.message) {
        setMessage(res.message);
      }
    } catch (error) {
      console.error("Failed to generate message:", error);
    }

    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!phone) {
      toast.error("Please enter a phone number");
      return;
    }

    setIsLoading(true);
    try {
      const prep = await prepareReminderManualShare(invoice.id, phone, templateType);
      if (prep.success && prep.message && prep.pdfUrl) {
        shareReminderMessageViaWhatsApp(prep.message, phone);
        const safeNo = String(invoice.invoiceNo).replace(/[^\w.-]+/g, "_");
        await downloadPdfFromUrl(prep.pdfUrl, `reminder-${safeNo}.pdf`);
        setShowModal(false);
        toast.success("WhatsApp opened — invoice PDF downloaded; attach it from your Downloads folder");
      } else {
        shareReminderMessageViaWhatsApp(message, phone);
        setShowModal(false);
        toast.warning(prep.error || "Opened text reminder only");
      }
    } catch (error) {
      console.error("Reminder send failed:", error);
      shareReminderMessageViaWhatsApp(message, phone);
      setShowModal(false);
      toast.warning("Could not prepare PDF; opened text reminder in WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenModal}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
        title="Send payment reminder via WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
        {showText && <span className="ml-1">Remind</span>}
      </Button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  Send Payment Reminder
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {invoice.customerName} - {invoice.invoiceNo}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone Number */}
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Template Selection */}
              <div>
                <Label>Message Tone</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  <Button
                    variant={templateType === "PAYMENT_DUE" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTemplateChange("PAYMENT_DUE")}
                    disabled={isLoading}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Due Today
                  </Button>
                  <Button
                    variant={templateType === "FIRST_REMINDER" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTemplateChange("FIRST_REMINDER")}
                    disabled={isLoading}
                  >
                    Gentle
                  </Button>
                  <Button
                    variant={templateType === "SECOND_REMINDER" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTemplateChange("SECOND_REMINDER")}
                    disabled={isLoading}
                  >
                    Firm
                  </Button>
                  <Button
                    variant={templateType === "FINAL_NOTICE" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTemplateChange("FINAL_NOTICE")}
                    disabled={isLoading}
                    className="text-red-600"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Final
                  </Button>
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <Label>Message Preview</Label>
                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto mt-2">
                  {isLoading ? "Generating message..." : message}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleSend}
                  disabled={isLoading || !phone}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageCircle,
  Send,
  X,
  Users,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { generateReminderMessage, logReminder } from "@/actions/reminder";
import { shareReminderMessageViaWhatsApp } from "@/lib/share-utils";
import { toast } from "sonner";

interface InvoiceForReminder {
  id: string;
  invoiceNo: string;
  date: Date;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: Date;
  daysPastDue: number;
  isOverdue: boolean;
  customerName: string;
  customerId: string;
  customerPhone?: string | null;
}

interface BulkReminderDialogProps {
  invoices: InvoiceForReminder[];
  companyName: string;
  onClose: () => void;
}

type ReminderStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

interface InvoiceWithStatus extends InvoiceForReminder {
  selected: boolean;
  status: ReminderStatus;
}

export function BulkReminderDialog({
  invoices,
  companyName,
  onClose,
}: BulkReminderDialogProps) {
  const [invoicesWithStatus, setInvoicesWithStatus] = useState<InvoiceWithStatus[]>(
    invoices.map((inv) => ({
      ...inv,
      selected: inv.customerPhone ? true : false,
      status: "pending" as ReminderStatus,
    }))
  );
  const [isSending, setIsSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const selectedCount = invoicesWithStatus.filter((i) => i.selected).length;
  const withPhoneCount = invoicesWithStatus.filter((i) => i.customerPhone).length;

  const toggleSelect = (id: string) => {
    setInvoicesWithStatus((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, selected: !inv.selected } : inv
      )
    );
  };

  const selectAll = () => {
    setInvoicesWithStatus((prev) =>
      prev.map((inv) => ({
        ...inv,
        selected: inv.customerPhone ? true : false,
      }))
    );
  };

  const deselectAll = () => {
    setInvoicesWithStatus((prev) =>
      prev.map((inv) => ({ ...inv, selected: false }))
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTemplateType = (daysPastDue: number) => {
    if (daysPastDue > 30) return "FINAL_NOTICE" as const;
    if (daysPastDue > 15) return "SECOND_REMINDER" as const;
    if (daysPastDue > 0) return "FIRST_REMINDER" as const;
    return "PAYMENT_DUE" as const;
  };

  const handleSendAll = async () => {
    const selected = invoicesWithStatus.filter((i) => i.selected && i.customerPhone);
    if (selected.length === 0) {
      toast.error("No invoices selected or no phone numbers available");
      return;
    }

    setIsSending(true);

    for (let i = 0; i < selected.length; i++) {
      const invoice = selected[i];
      setCurrentIndex(i);

      // Update status to sending
      setInvoicesWithStatus((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, status: "sending" } : inv
        )
      );

      try {
        // Generate message
        const templateType = getTemplateType(invoice.daysPastDue);
        const res = await generateReminderMessage(invoice.id, templateType);

        if (res.success && res.message) {
          // Log the reminder
          await logReminder({
            companyName,
            customerId: invoice.customerId,
            invoiceId: invoice.id,
            dueAmount: invoice.balance,
            dueDate: invoice.dueDate,
            daysPastDue: invoice.daysPastDue,
            messageText: res.message,
            channel: "WHATSAPP",
            phoneNumber: invoice.customerPhone!,
            reminderType: templateType === "FINAL_NOTICE" ? "FINAL" : templateType === "SECOND_REMINDER" ? "SECOND" : "FIRST",
          });

          // Open WhatsApp (user needs to click send manually for each)
          shareReminderMessageViaWhatsApp(res.message, invoice.customerPhone!);

          // Update status to sent
          setInvoicesWithStatus((prev) =>
            prev.map((inv) =>
              inv.id === invoice.id ? { ...inv, status: "sent" } : inv
            )
          );

          // Wait a bit between messages to allow user to send
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          setInvoicesWithStatus((prev) =>
            prev.map((inv) =>
              inv.id === invoice.id ? { ...inv, status: "failed" } : inv
            )
          );
        }
      } catch (error) {
        console.error("Failed to send reminder:", error);
        setInvoicesWithStatus((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id ? { ...inv, status: "failed" } : inv
          )
        );
      }
    }

    setIsSending(false);
    setCurrentIndex(-1);
    toast.success(`Reminders sent for ${selected.length} invoices`);
  };

  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case "sending":
        return (
          <Badge className="bg-blue-500/20 text-blue-600">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Sending
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-green-500/20 text-green-600">
            <Check className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "skipped":
        return (
          <Badge variant="outline">
            Skipped
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Bulk WhatsApp Reminders
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Send payment reminders to multiple customers
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSending}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm">
                <strong>{selectedCount}</strong> of {invoicesWithStatus.length} selected
              </span>
              <span className="text-sm text-muted-foreground">
                ({withPhoneCount} have phone numbers)
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} disabled={isSending}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll} disabled={isSending}>
                Deselect All
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="divide-y">
            {invoicesWithStatus.map((invoice, idx) => (
              <div
                key={invoice.id}
                className={`p-4 flex items-center gap-4 ${
                  !invoice.customerPhone ? "opacity-50" : ""
                } ${currentIndex === idx ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
              >
                <Checkbox
                  checked={invoice.selected}
                  onCheckedChange={() => toggleSelect(invoice.id)}
                  disabled={!invoice.customerPhone || isSending}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{invoice.customerName}</span>
                    {invoice.daysPastDue > 30 && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{invoice.invoiceNo}</span>
                    <span>•</span>
                    <span className="text-red-600 font-medium">
                      {formatCurrency(invoice.balance)}
                    </span>
                    <span>•</span>
                    <span>{invoice.daysPastDue}d overdue</span>
                  </div>
                  {!invoice.customerPhone && (
                    <span className="text-xs text-orange-500">No phone number</span>
                  )}
                </div>
                <div className="text-right">
                  {invoice.customerPhone && (
                    <span className="text-xs text-muted-foreground block">
                      {invoice.customerPhone}
                    </span>
                  )}
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSending}>
              {isSending ? "Please wait..." : "Cancel"}
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSendAll}
              disabled={isSending || selectedCount === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending ({currentIndex + 1}/{selectedCount})
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {selectedCount} Reminder{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            WhatsApp will open for each reminder. You need to click Send manually.
          </p>
        </div>
      </Card>
    </div>
  );
}

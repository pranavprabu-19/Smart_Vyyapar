"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  FileText,
  Eye,
  MoreVertical,
  ArrowRight,
  AlertTriangle,
  X,
  Trash2,
  Send,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/lib/auth-context";
import {
  getOrdersAction,
  getOrderMetricsAction,
  createOrderAction,
  submitOrderForApproval,
  approveOrderAction,
  rejectOrderAction,
  dispatchOrderAction,
  deliverOrderAction,
  convertOrderToInvoice,
  type OrderWithDetails,
} from "@/actions/orders";
import { getCustomersAction } from "@/actions/customer";
import { getProductsAction } from "@/actions/inventory";
import { toast } from "sonner";
import Link from "next/link";
import { LoadingBlock, StateBlock } from "@/components/dashboard/state-block";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  PENDING_APPROVAL: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  DISPATCHED: { label: "Dispatched", color: "bg-blue-100 text-blue-700", icon: Truck },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-700", icon: Package },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function OrdersPage() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ totalOrders: 0, pendingApproval: 0, approved: 0, delivered: 0, monthlyValue: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState({
    customerId: "",
    items: [] as { productId: string; name: string; quantity: number; price: number }[],
    deliveryNotes: "",
  });
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productQty, setProductQty] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, metricsRes] = await Promise.all([
        getOrdersAction(currentCompany, statusFilter !== "all" ? { status: statusFilter } : undefined),
        getOrderMetricsAction(currentCompany),
      ]);

      if (ordersRes.success) setOrders(ordersRes.orders || []);
      if (metricsRes.success && metricsRes.metrics) setMetrics(metricsRes.metrics);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast.error("Failed to load orders");
    }
    setLoading(false);
  };

  const loadFormData = async () => {
    const [custRes, prodRes] = await Promise.all([
      getCustomersAction(currentCompany),
      getProductsAction(currentCompany),
    ]);
    if (custRes.success) setCustomers(custRes.customers || []);
    if (prodRes.success) setProducts(prodRes.products || []);
  };

  useEffect(() => {
    loadData();
  }, [currentCompany, statusFilter]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Add item to order
  const handleAddItem = () => {
    if (!selectedProduct || productQty < 1) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const existingIndex = newOrder.items.findIndex((i) => i.productId === selectedProduct);
    if (existingIndex >= 0) {
      const updatedItems = [...newOrder.items];
      updatedItems[existingIndex].quantity += productQty;
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      setNewOrder({
        ...newOrder,
        items: [
          ...newOrder.items,
          {
            productId: product.id,
            name: product.name,
            quantity: productQty,
            price: product.price || 0,
          },
        ],
      });
    }
    setSelectedProduct("");
    setProductQty(1);
  };

  // Remove item from order
  const handleRemoveItem = (productId: string) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter((i) => i.productId !== productId),
    });
  };

  // Create order
  const handleCreateOrder = async () => {
    if (!newOrder.customerId || newOrder.items.length === 0) {
      toast.error("Please select customer and add items");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createOrderAction({
        companyName: currentCompany,
        customerId: newOrder.customerId,
        employeeId: user?.employeeId || undefined,
        items: newOrder.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
        })),
        deliveryNotes: newOrder.deliveryNotes,
      });

      if (res.success) {
        toast.success("Order created successfully!");
        setShowCreateModal(false);
        setNewOrder({ customerId: "", items: [], deliveryNotes: "" });
        loadData();
      } else {
        toast.error(res.error || "Failed to create order");
      }
    } catch (error) {
      toast.error("Failed to create order");
    }
    setIsSaving(false);
  };

  // Order actions
  const handleSubmitForApproval = async (orderId: string) => {
    const res = await submitOrderForApproval(orderId);
    if (res.success) {
      toast.success("Order submitted for approval");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const handleApprove = async (orderId: string) => {
    const res = await approveOrderAction(orderId, user?.name || "Admin");
    if (res.success) {
      toast.success("Order approved");
      setShowDetailModal(false);
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectReason) {
      toast.error("Please provide rejection reason");
      return;
    }
    const res = await rejectOrderAction(orderId, user?.name || "Admin", rejectReason);
    if (res.success) {
      toast.success("Order rejected");
      setShowDetailModal(false);
      setRejectReason("");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const handleDispatch = async (orderId: string) => {
    const res = await dispatchOrderAction(orderId);
    if (res.success) {
      toast.success("Order dispatched");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const handleDeliver = async (orderId: string) => {
    const res = await deliverOrderAction(orderId);
    if (res.success) {
      toast.success("Order marked as delivered");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const handleConvertToInvoice = async (orderId: string) => {
    const res = await convertOrderToInvoice(orderId);
    if (res.success) {
      toast.success("Invoice created from order!");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const orderTotal = newOrder.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <PageShell
      title="Order Management"
      description="Create, approve, and track customer orders"
      icon={<ShoppingCart className="h-6 w-6" />}
      action={
        <Button onClick={() => { setShowCreateModal(true); loadFormData(); }}>
          <Plus className="h-4 w-4 mr-2" /> New Order
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingApproval}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{metrics.delivered}</div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.monthlyValue)}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search order number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingBlock label="Loading orders..." />
          ) : filteredOrders.length === 0 ? (
            <StateBlock
              icon={ShoppingCart}
              title="No orders found"
              description="Create your first order to start the approval workflow."
              actionLabel="Create First Order"
              onAction={() => {
                setShowCreateModal(true);
                loadFormData();
              }}
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.DRAFT;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={order.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{order.orderNo}</span>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>{order.customer.name}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="mx-2">•</span>
                          <span>{order.items.length} items</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(order.totalAmount)}</div>
                          <div className="text-xs text-muted-foreground">By: {order.employee.name}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "DRAFT" && (
                            <Button size="sm" onClick={() => handleSubmitForApproval(order.id)}>
                              <Send className="h-4 w-4 mr-1" /> Submit
                            </Button>
                          )}
                          {order.status === "APPROVED" && (
                            <Button size="sm" variant="outline" onClick={() => handleDispatch(order.id)}>
                              <Truck className="h-4 w-4 mr-1" /> Dispatch
                            </Button>
                          )}
                          {order.status === "DISPATCHED" && (
                            <Button size="sm" onClick={() => handleConvertToInvoice(order.id)}>
                              <FileText className="h-4 w-4 mr-1" /> Invoice
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Create New Order</CardTitle>
                  <CardDescription>Add products and submit for approval</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* Customer Selection */}
              <div>
                <Label>Customer *</Label>
                <Select value={newOrder.customerId} onValueChange={(v) => setNewOrder({ ...newOrder, customerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Product */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Add Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {formatCurrency(p.price || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={productQty}
                    onChange={(e) => setProductQty(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddItem} disabled={!selectedProduct}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Order Items */}
              {newOrder.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newOrder.items.map((item) => (
                        <tr key={item.productId} className="border-t">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(item.quantity * item.price)}</td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => handleRemoveItem(item.productId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted font-bold">
                        <td colSpan={3} className="p-2 text-right">Total:</td>
                        <td className="p-2 text-right">{formatCurrency(orderTotal)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Order notes..."
                  value={newOrder.deliveryNotes}
                  onChange={(e) => setNewOrder({ ...newOrder, deliveryNotes: e.target.value })}
                />
              </div>
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateOrder} disabled={isSaving || !newOrder.customerId || newOrder.items.length === 0}>
                {isSaving ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedOrder.orderNo}
                    <Badge className={statusConfig[selectedOrder.status]?.color}>
                      {statusConfig[selectedOrder.status]?.label}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{formatDate(selectedOrder.createdAt)}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowDetailModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* Customer Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{selectedOrder.customer.name}</p>
                {selectedOrder.customer.phone && <p className="text-sm">{selectedOrder.customer.phone}</p>}
              </div>

              {/* Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">{item.product.name}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                        <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Approval Actions */}
              {selectedOrder.status === "PENDING_APPROVAL" && (
                <div className="space-y-3 p-4 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-yellow-800">Approval Required</p>
                  <div>
                    <Label>Rejection Reason (if rejecting)</Label>
                    <Input
                      placeholder="Enter reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedOrder.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedOrder.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              {selectedOrder.approvedAt && (
                <div className="text-sm text-muted-foreground">
                  Approved by {selectedOrder.approvedBy} on {formatDate(selectedOrder.approvedAt)}
                </div>
              )}
              {selectedOrder.rejectedAt && (
                <div className="text-sm text-red-600">
                  Rejected by {selectedOrder.rejectedBy}: {selectedOrder.rejectionReason}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

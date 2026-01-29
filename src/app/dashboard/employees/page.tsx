"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { useCompany } from "@/lib/company-context";
import { createEmployeeAction, getEmployeesAction, createEmployeeLoginAction, updateEmployeeAction } from "@/actions/employee";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, User, Search, Key, Edit } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function EmployeesPage() {
    const { currentCompany } = useCompany();
    const [employees, setEmployees] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmp, setNewEmp] = useState({
        name: "",
        employeeId: "",
        role: "EMPLOYEE",
        baseSalary: "",
        phone: "",
        email: "",
        aadhaar: "",
        pan: ""
    });

    const loadEmployees = async () => {
        const res = await getEmployeesAction(currentCompany);
        if (res.success) {
            setEmployees(res.employees || []);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, [currentCompany]);

    const [editEmp, setEditEmp] = useState<any>(null); // For editing

    const handleCreate = async () => {
        // Validation: Phone mandatory, Either Aadhaar OR Pan mandatory
        if (!newEmp.name || !newEmp.baseSalary || !newEmp.phone) {
            toast.error("Name, Phone and Salary are required");
            return;
        }

        if (!newEmp.aadhaar && !newEmp.pan) {
            toast.error("Either Aadhaar OR PAN is required");
            return;
        }

        const res = await createEmployeeAction({
            ...newEmp,
            baseSalary: Number(newEmp.baseSalary),
            companyName: currentCompany
        });

        if (res.success) {
            toast.success("Employee Created");
            setShowAddModal(false);
            loadEmployees();
            setNewEmp({ name: "", employeeId: "", role: "EMPLOYEE", baseSalary: "", phone: "", email: "", aadhaar: "", pan: "" });
        } else {
            toast.error(res.error || "Failed to create");
        }
    };

    const handleUpdate = async () => {
        if (!editEmp || !editEmp.phone) {
            toast.error("Phone is required");
            return;
        }
        // Validation: Either Aadhaar OR Pan mandatory
        if (!editEmp.aadhaar && !editEmp.pan) {
            toast.error("Either Aadhaar OR PAN is required");
            return;
        }

        const res = await updateEmployeeAction({
            id: editEmp.id,
            name: editEmp.name,
            role: editEmp.role,
            email: editEmp.email,
            phone: editEmp.phone,
            aadhaar: editEmp.aadhaar,
            pan: editEmp.pan,
            baseSalary: editEmp.baseSalary
        });

        if (res.success) {
            toast.success("Employee Updated");
            setEditEmp(null);
            loadEmployees();
        } else {
            toast.error("Failed to update");
        }
    };

    return (
        <PageShell title="Employee Management" description="Manage staff profiles and access.">
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input className="w-full pl-8 p-2 border rounded bg-background" placeholder="Search employees..." />
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Employee
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {employees.map(emp => (
                    <Card key={emp.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                {emp.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">{emp.name}</h3>
                                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                            {emp.phone && <p>📞 {emp.phone}</p>}
                                            {emp.email && <p>✉️ {emp.email}</p>}
                                            {emp.aadhaar && <p>🆔 {emp.aadhaar}</p>}
                                            {emp.pan && <p>💳 {emp.pan}</p>}
                                        </div>
                                    </div>
                                    <Badge variant="outline">{emp.employeeId}</Badge>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    Salary: ₹{emp.baseSalary} / {emp.salaryType}
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
                                        // Email is now optional, so if they don't have one, we can't create login easily
                                        if (!emp.email) { toast.error("Please add email to create login"); return; }
                                        const res = await createEmployeeLoginAction(emp.id, emp.email, emp.role);
                                        if (res.success) alert(`Login Created! Password: ${res.tempPassword}`);
                                        else toast.error(res.error);
                                    }}>
                                        <Key className="h-3 w-3 mr-1" /> Access
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditEmp(emp)}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-md p-6 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold mb-4">Add New Employee</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Full Name (Required)</label>
                                <input className="w-full p-2 border rounded" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Phone (Required)</label>
                                <input className="w-full p-2 border rounded" value={newEmp.phone} onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email (Optional)</label>
                                <input className="w-full p-2 border rounded" value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-sm font-medium">Aadhaar No.</label>
                                    <input className="w-full p-2 border rounded" placeholder="Mandatory if no PAN" value={newEmp.aadhaar} onChange={e => setNewEmp({ ...newEmp, aadhaar: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">PAN No.</label>
                                    <input className="w-full p-2 border rounded" placeholder="Mandatory if no Aadhaar" value={newEmp.pan} onChange={e => setNewEmp({ ...newEmp, pan: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Role</label>
                                <select className="w-full p-2 border rounded" value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })}>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="DRIVER">Driver</option>
                                    <option value="FIELD_WORKER">Field Worker</option>
                                    <option value="SO_OFFICIER">SO Officer</option>
                                    <option value="MANAGER">Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Base Salary (₹)</label>
                                <input type="number" className="w-full p-2 border rounded" value={newEmp.baseSalary} onChange={e => setNewEmp({ ...newEmp, baseSalary: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                                <Button onClick={handleCreate}>Create Employee</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-md p-6 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold mb-4">Edit Employee</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Full Name</label>
                                <input className="w-full p-2 border rounded" value={editEmp.name} onChange={e => setEditEmp({ ...editEmp, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Phone</label>
                                <input className="w-full p-2 border rounded" value={editEmp.phone} onChange={e => setEditEmp({ ...editEmp, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <input className="w-full p-2 border rounded" value={editEmp.email || ""} onChange={e => setEditEmp({ ...editEmp, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-sm font-medium">Aadhaar No.</label>
                                    <input className="w-full p-2 border rounded" value={editEmp.aadhaar || ""} onChange={e => setEditEmp({ ...editEmp, aadhaar: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">PAN No.</label>
                                    <input className="w-full p-2 border rounded" value={editEmp.pan || ""} onChange={e => setEditEmp({ ...editEmp, pan: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Role</label>
                                <select className="w-full p-2 border rounded" value={editEmp.role} onChange={e => setEditEmp({ ...editEmp, role: e.target.value })}>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="DRIVER">Driver</option>
                                    <option value="FIELD_WORKER">Field Worker</option>
                                    <option value="SO_OFFICIER">SO Officer</option>
                                    <option value="MANAGER">Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Base Salary (₹)</label>
                                <input type="number" className="w-full p-2 border rounded" value={editEmp.baseSalary} onChange={e => setEditEmp({ ...editEmp, baseSalary: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setEditEmp(null)}>Cancel</Button>
                                <Button onClick={handleUpdate}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}

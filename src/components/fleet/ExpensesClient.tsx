"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import { createExpense, updateExpense, setExpensePaymentStatus } from "@/app/actions/expenses";
import { Plus } from "lucide-react";
import type { ExpenseWithUnit, Truck, Trailer } from "@/types/models";
import { Modal, Field, ModalActions, money } from "@/components/ui/profile";

const CATEGORIES = ["MAINTENANCE", "REPAIR", "PARTS", "SERVICE", "PARKING", "WASH", "EQUIPMENT", "REGISTRATION", "PERMITS", "OTHER"];

export function ExpensesClient({ initialExpenses, trucks, trailers }: { initialExpenses: ExpenseWithUnit[], trucks: Truck[], trailers: Trailer[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithUnit | null>(null);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({ date: "", category: "MAINTENANCE", vendor: "", amount: "", paymentMethod: "", description: "" });

  // Analitika filtrlari (PRD 4.6): sana oralig'i, kategoriya, to'lov statusi.
  const [filters, setFilters] = useState({ from: "", to: "", category: "ALL", status: "ALL" });

  const visible = expenses.filter((x) => {
    const d = new Date(x.date);
    if (filters.from && d < new Date(filters.from)) return false;
    if (filters.to && d > new Date(`${filters.to}T23:59:59`)) return false;
    if (filters.category !== "ALL" && x.category !== filters.category) return false;
    if (filters.status !== "ALL" && x.paymentStatus !== filters.status) return false;
    return true;
  });

  const totalSum = visible.reduce((s, x) => s + x.amount, 0);
  const paidSum = visible.filter((x) => x.paymentStatus === "PAID").reduce((s, x) => s + x.amount, 0);
  const pendingSum = totalSum - paidSum;

  const replaceInList = (updated: ExpenseWithUnit) =>
    setExpenses((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

  const openEdit = (expense: ExpenseWithUnit) => {
    setEditForm({
      date: new Date(expense.date).toISOString().split("T")[0],
      category: expense.category,
      vendor: expense.vendor,
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod ?? "",
      description: expense.description ?? "",
    });
    setEditing(expense);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    try {
      const updated = await updateExpense(editing.id, editForm);
      replaceInList(updated);
      setEditing(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  const togglePaid = async (expense: ExpenseWithUnit) => {
    const next = expense.paymentStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const updated = await setExpensePaymentStatus(expense.id, next);
      replaceInList(updated);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    }
  };
  
  const [formData, setFormData] = useState({
    entityType: "TRUCK",
    unitId: "",
    date: new Date().toISOString().split('T')[0],
    category: "MAINTENANCE",
    vendor: "",
    amount: "",
    paymentMethod: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newExpense = await createExpense(formData);
      // Server allaqachon truck/trailer relation'larini qaytaradi.
      setExpenses([newExpense, ...expenses]);
      setIsModalOpen(false);
      setFormData({
        entityType: "TRUCK",
        unitId: "",
        date: new Date().toISOString().split('T')[0],
        category: "MAINTENANCE",
        vendor: "",
        amount: "",
        paymentMethod: "",
        description: "",
      });
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Expenses</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Filtrlar + jamlamalar (PRD 4.6) */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">From</label>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">To</label>
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Category</label>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="ALL">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Payment</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="ALL">All</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          <div className="rounded-lg bg-surface border border-border px-4 py-2">
            <span className="text-muted">Total: </span><span className="font-bold text-fg">{money(totalSum)}</span>
          </div>
          <div className="rounded-lg bg-surface border border-border px-4 py-2">
            <span className="text-muted">Paid: </span><span className="font-bold text-green-600">{money(paidSum)}</span>
          </div>
          <div className="rounded-lg bg-surface border border-border px-4 py-2">
            <span className="text-muted">Pending: </span><span className="font-bold text-yellow-600">{money(pendingSum)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Type/Unit</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Vendor</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
                    No expenses found.
                  </td>
                </tr>
              ) : (
                visible.map((expense) => (
                  <tr key={expense.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 font-medium text-fg">
                      {expense.entityType === "FLEET" ? "General Fleet" : 
                       expense.entityType === "TRUCK" ? `Truck: ${expense.truck?.unitNumber}` : 
                       `Trailer: ${expense.trailer?.trailerNumber}`}
                    </td>
                    <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{expense.category}</td>
                    <td className="px-6 py-4">{expense.vendor}</td>
                    <td className="px-6 py-4 font-medium text-fg">${expense.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        expense.paymentStatus === "PAID" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                      }`}>
                        {expense.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-sm font-medium">
                        <button onClick={() => openEdit(expense)} className="text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => togglePaid(expense)} className={expense.paymentStatus === "PAID" ? "text-yellow-600 hover:underline" : "text-green-600 hover:underline"}>
                          {expense.paymentStatus === "PAID" ? "Mark Pending" : "Mark Paid"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title="Edit Expense" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input required type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Category">
                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="modal-input">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Vendor">
                <input required value={editForm.vendor} onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Amount ($)">
                <input required type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Payment Method">
                <input value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <Field label="Description">
              <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setEditing(null)} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Applies To</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.entityType} onChange={(e) => setFormData({...formData, entityType: e.target.value, unitId: ""})}>
                    <option value="TRUCK">Truck</option>
                    <option value="TRAILER">Trailer</option>
                    <option value="FLEET">General Fleet</option>
                  </select>
                </div>
                
                {formData.entityType !== "FLEET" && (
                  <div>
                    <label className="block text-sm font-medium text-fg">Unit</label>
                    <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={formData.unitId} onChange={(e) => setFormData({...formData, unitId: e.target.value})}>
                      <option value="">Select Unit</option>
                      {formData.entityType === "TRUCK" ? (
                        trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)
                      ) : (
                        trailers.map(t => <option key={t.id} value={t.id}>{t.trailerNumber}</option>)
                      )}
                    </select>
                  </div>
                )}
                
                <div className={formData.entityType === "FLEET" ? "col-span-2" : ""}>
                  <label className="block text-sm font-medium text-fg">Category</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="REPAIR">Repair</option>
                    <option value="PARTS">Parts</option>
                    <option value="SERVICE">Service</option>
                    <option value="PARKING">Parking</option>
                    <option value="WASH">Wash</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="REGISTRATION">Registration</option>
                    <option value="PERMITS">Permits</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-fg">Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Vendor</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Amount ($)</label>
                  <input required type="number" step="0.01" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Payment Method</label>
                  <input className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Description</label>
                  <input className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

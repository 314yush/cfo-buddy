"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/snapshot";

type Transaction = {
  id: string;
  date: string;
  description: string;
  amountPaise: number;
  direction: "INFLOW" | "OUTFLOW";
  category: string;
};

type Props = {
  initialTransactions: Transaction[];
};

const CATEGORIES = [
  "Uncategorized",
  "Employees",
  "Software",
  "Marketing",
  "Office",
  "Travel",
  "Utilities",
  "Professional Services",
  "Equipment",
  "Taxes",
  "Sales",
  "Investment",
  "Other Income",
];

export function TransactionsList({ initialTransactions }: Props) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    direction: "OUTFLOW" as "INFLOW" | "OUTFLOW",
    category: "Uncategorized",
  });

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Generate mock data
  const handleGenerateMock = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 25 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Generated ${data.imported} mock transactions (${data.skipped} duplicates skipped)`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Clear all transactions
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL transactions? This cannot be undone.")) {
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Deleted ${data.deleted} transactions`);
      setTransactions([]);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Delete single transaction
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    clearMessages();
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransactions(transactions.filter((t) => t.id !== id));
      setSuccess("Transaction deleted");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Start editing
  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({
      date: tx.date.split("T")[0],
      description: tx.description,
      amountPaise: tx.amountPaise,
      direction: tx.direction,
      category: tx.category,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Save edit
  const handleSaveEdit = async (id: string) => {
    clearMessages();
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransactions(
        transactions.map((t) =>
          t.id === id
            ? {
                ...t,
                date: editForm.date || t.date,
                description: editForm.description || t.description,
                amountPaise: editForm.amountPaise || t.amountPaise,
                direction: editForm.direction || t.direction,
                category: editForm.category || t.category,
              }
            : t
        )
      );
      setEditingId(null);
      setEditForm({});
      setSuccess("Transaction updated");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Add new transaction
  const handleAddTransaction = async () => {
    clearMessages();
    if (!newTx.date || !newTx.description || !newTx.amount) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newTx.date,
          description: newTx.description,
          amountPaise: Math.round(parseFloat(newTx.amount) * 100),
          direction: newTx.direction,
          category: newTx.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Transaction added");
      setNewTx({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        direction: "OUTFLOW",
        category: "Uncategorized",
      });
      setShowAddForm(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          {showAddForm ? "Cancel" : "+ Add Transaction"}
        </button>
        <button
          onClick={handleGenerateMock}
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Generating..." : "🎲 Generate Mock Data"}
        </button>
        {transactions.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={loading}
            className="px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all"
          >
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-emerald-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Add transaction form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-slate-800 font-bold mb-4">Add New Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <input
              type="date"
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Description"
              value={newTx.description}
              onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
              className="lg:col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newTx.amount}
              onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <select
              value={newTx.direction}
              onChange={(e) => setNewTx({ ...newTx, direction: e.target.value as "INFLOW" | "OUTFLOW" })}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            >
              <option value="OUTFLOW">Expense</option>
              <option value="INFLOW">Income</option>
            </select>
            <select
              value={newTx.category}
              onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleAddTransaction}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Add Transaction
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transactions table */}
      {transactions.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Date</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Description</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Category</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Amount</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {editingId === t.id ? (
                      // Edit mode
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="date"
                            value={editForm.date || ""}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editForm.description || ""}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={editForm.category || "Uncategorized"}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 justify-end">
                            <select
                              value={editForm.direction || "OUTFLOW"}
                              onChange={(e) => setEditForm({ ...editForm, direction: e.target.value as "INFLOW" | "OUTFLOW" })}
                              className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            >
                              <option value="OUTFLOW">-</option>
                              <option value="INFLOW">+</option>
                            </select>
                            <input
                              type="number"
                              value={(editForm.amountPaise || 0) / 100}
                              onChange={(e) => setEditForm({ ...editForm, amountPaise: Math.round(parseFloat(e.target.value || "0") * 100) })}
                              className="w-24 px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(t.id)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View mode
                      <>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(t.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-800 font-medium">
                          {t.description}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {t.category}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${
                          t.direction === "INFLOW" ? "text-emerald-600" : "text-slate-800"
                        }`}>
                          {t.direction === "INFLOW" ? "+" : "-"}{formatINR(t.amountPaise)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(t)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm transition-colors"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-slate-800 font-semibold text-lg mb-2">No transactions yet</h3>
          <p className="text-slate-500 mb-4">Upload a bank statement or add transactions manually</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              + Add Transaction
            </button>
            <button
              onClick={handleGenerateMock}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              🎲 Generate Mock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
    clearMessages();
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingId) return;
    clearMessages();
    try {
      const res = await fetch(`/api/transactions/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          description: editForm.description,
          amountPaise: editForm.amountPaise,
          direction: editForm.direction,
          category: editForm.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setTransactions(
        transactions.map((t) =>
          t.id === editingId
            ? { ...t, ...data, date: data.date }
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
    if (!newTx.description || !newTx.amount) {
      setError("Please fill in description and amount");
      return;
    }
    try {
      const amountPaise = Math.round(parseFloat(newTx.amount) * 100);
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newTx.date,
          description: newTx.description,
          amountPaise,
          direction: newTx.direction,
          category: newTx.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.duplicate) {
          throw new Error("Duplicate transaction: A transaction with these exact details already exists");
        }
        throw new Error(data.error);
      }
      setTransactions([data, ...transactions]);
      setNewTx({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        direction: "OUTFLOW",
        category: "Uncategorized",
      });
      setShowAddForm(false);
      setSuccess("Transaction added");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const CATEGORIES = [
    "Uncategorized",
    "Revenue",
    "Salary",
    "Software",
    "Office",
    "Travel",
    "Food",
    "Utilities",
    "Marketing",
    "Contractor",
    "Tax",
    "Other",
  ];

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showAddForm ? "Cancel" : "+ Add Transaction"}
        </button>
        <button
          onClick={handleGenerateMock}
          disabled={loading}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "🎲 Generate Mock Data"}
        </button>
        {transactions.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={loading}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/30"
          >
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      {/* Add transaction form */}
      {showAddForm && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <h3 className="text-white font-medium mb-4">Add New Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <input
              type="date"
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="text"
              placeholder="Description"
              value={newTx.description}
              onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
              className="lg:col-span-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newTx.amount}
              onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <select
              value={newTx.direction}
              onChange={(e) => setNewTx({ ...newTx, direction: e.target.value as "INFLOW" | "OUTFLOW" })}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="OUTFLOW" className="bg-slate-800">Expense</option>
              <option value="INFLOW" className="bg-slate-800">Income</option>
            </select>
            <select
              value={newTx.category}
              onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-800">
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddTransaction}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add Transaction
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transactions table */}
      {transactions.length > 0 ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                    Amount
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    {editingId === t.id ? (
                      // Edit mode
                      <>
                        <td className="py-2 px-4">
                          <input
                            type="date"
                            value={editForm.date || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, date: e.target.value })
                            }
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editForm.description || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <select
                            value={editForm.category || "Uncategorized"}
                            onChange={(e) =>
                              setEditForm({ ...editForm, category: e.target.value })
                            }
                            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat} className="bg-slate-800">
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 justify-end">
                            <select
                              value={editForm.direction || "OUTFLOW"}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  direction: e.target.value as "INFLOW" | "OUTFLOW",
                                })
                              }
                              className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="OUTFLOW" className="bg-slate-800">-</option>
                              <option value="INFLOW" className="bg-slate-800">+</option>
                            </select>
                            <input
                              type="number"
                              value={(editForm.amountPaise || 0) / 100}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  amountPaise: Math.round(parseFloat(e.target.value || "0") * 100),
                                })
                              }
                              className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditForm({});
                              }}
                              className="p-1.5 text-slate-400 hover:bg-white/10 rounded transition-colors"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View mode
                      <>
                        <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-sm text-white max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-white/10 text-slate-300">
                            {t.category}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-sm font-medium text-right whitespace-nowrap ${
                            t.direction === "INFLOW"
                              ? "text-emerald-400"
                              : "text-slate-300"
                          }`}
                        >
                          {t.direction === "INFLOW" ? "+" : "-"}
                          {formatINR(t.amountPaise)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => startEdit(t)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No transactions</h3>
          <p className="text-slate-400 mt-1 mb-6">
            Upload a bank statement or generate mock data to get started
          </p>
        </div>
      )}
    </div>
  );
}


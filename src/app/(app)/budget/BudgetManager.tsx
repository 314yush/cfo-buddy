"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/snapshot";

type Allocation = {
  id: string | null;
  category: string;
  percentOfBudget: number;
  amountPaise: number | null;
  color: string | null;
};

type Props = {
  initialAllocations: Allocation[];
  spendingByCategory: Record<string, number>;
  totalMonthlyBudget: number;
  totalSpent: number;
};

const DEFAULT_CATEGORIES = [
  { category: "Marketing", color: "#8b5cf6" },
  { category: "Employees", color: "#3b82f6" },
  { category: "Software", color: "#10b981" },
  { category: "Office", color: "#f59e0b" },
  { category: "Travel", color: "#ef4444" },
  { category: "Utilities", color: "#6366f1" },
  { category: "Contractor", color: "#ec4899" },
  { category: "Food", color: "#14b8a6" },
  { category: "Other", color: "#64748b" },
];

export function BudgetManager({ initialAllocations, spendingByCategory, totalMonthlyBudget, totalSpent }: Props) {
  const router = useRouter();
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newPercent, setNewPercent] = useState("");

  const totalAllocated = allocations.reduce((sum, a) => sum + a.percentOfBudget, 0);
  const remainingPercent = 100 - totalAllocated;

  const updateAllocation = (category: string, percent: number) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.category === category ? { ...a, percentOfBudget: Math.min(100, Math.max(0, percent)) } : a
      )
    );
  };

  const addCategory = () => {
    if (!newCategory || allocations.some((a) => a.category === newCategory)) return;
    const percent = parseInt(newPercent) || 0;
    
    setAllocations((prev) => [
      ...prev,
      {
        id: null,
        category: newCategory,
        percentOfBudget: Math.min(remainingPercent, percent),
        amountPaise: null,
        color: DEFAULT_CATEGORIES.find((c) => c.category === newCategory)?.color || "#64748b",
      },
    ]);
    setNewCategory("");
    setNewPercent("");
  };

  const removeCategory = (category: string) => {
    setAllocations((prev) => prev.filter((a) => a.category !== category));
  };

  const saveAllocations = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: "success", text: "Budget allocations saved!" });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  // Categories not yet allocated
  const availableCategories = DEFAULT_CATEGORIES.filter(
    (c) => !allocations.some((a) => a.category === c.category)
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <p className="text-sm text-slate-400">Monthly Budget</p>
          <p className="text-xl font-bold text-white">{formatINR(totalMonthlyBudget)}</p>
          <p className="text-xs text-slate-500">Based on 6-month runway</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <p className="text-sm text-slate-400">Allocated</p>
          <p className="text-xl font-bold text-white">{totalAllocated}%</p>
          <p className="text-xs text-slate-500">{remainingPercent}% unallocated</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <p className="text-sm text-slate-400">Spent This Month</p>
          <p className="text-xl font-bold text-white">{formatINR(totalSpent)}</p>
          <p className="text-xs text-slate-500">
            {totalMonthlyBudget > 0 ? `${((totalSpent / totalMonthlyBudget) * 100).toFixed(0)}% of budget` : "Set cash on hand first"}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <p className="text-sm text-slate-400">Remaining</p>
          <p className={`text-xl font-bold ${totalMonthlyBudget - totalSpent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatINR(totalMonthlyBudget - totalSpent)}
          </p>
          <p className="text-xs text-slate-500">
            {totalMonthlyBudget - totalSpent < 0 ? "Over budget!" : "Available"}
          </p>
        </div>
      </div>

      {/* Visual Budget Pie */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Budget Distribution</h3>
        <div className="flex items-center gap-6">
          {/* Pie Chart Visualization */}
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {allocations.reduce(
                (acc, a, i) => {
                  const startAngle = acc.currentAngle;
                  const angle = (a.percentOfBudget / 100) * 360;
                  const endAngle = startAngle + angle;
                  
                  // Convert to radians for path calculation
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  
                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  
                  if (angle > 0) {
                    acc.paths.push(
                      <path
                        key={a.category}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={a.color || "#64748b"}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  }
                  
                  return { paths: acc.paths, currentAngle: endAngle };
                },
                { paths: [] as React.ReactElement[], currentAngle: 0 }
              ).paths}
              {remainingPercent > 0 && (
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="40" 
                  strokeDasharray={`${(remainingPercent / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${((100 - remainingPercent) / 100) * 251.2}`}
                />
              )}
              <circle cx="50" cy="50" r="20" fill="#0f172a" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalAllocated}%</p>
                <p className="text-xs text-slate-400">allocated</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            {allocations.map((a) => (
              <div key={a.category} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color || "#64748b" }} />
                <span className="text-sm text-slate-300">{a.category}</span>
                <span className="text-sm text-slate-500">{a.percentOfBudget}%</span>
              </div>
            ))}
            {remainingPercent > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <span className="text-sm text-slate-500">Unallocated</span>
                <span className="text-sm text-slate-500">{remainingPercent}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Sliders */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Adjust Allocations</h3>
        <div className="space-y-4">
          {allocations.map((a) => {
            const budgetAmount = Math.round((a.percentOfBudget / 100) * totalMonthlyBudget);
            const spent = spendingByCategory[a.category] || 0;
            const spentPercent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
            const isOverBudget = spent > budgetAmount;

            return (
              <div key={a.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color || "#64748b" }} />
                    <span className="text-white font-medium">{a.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                      {formatINR(spent)} / {formatINR(budgetAmount)}
                    </span>
                    <button
                      onClick={() => removeCategory(a.category)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {/* Spending progress bar */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isOverBudget ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                  />
                </div>
                
                {/* Allocation slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={a.percentOfBudget}
                    onChange={(e) => updateAllocation(a.category, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${a.color || "#64748b"} 0%, ${a.color || "#64748b"} ${a.percentOfBudget}%, #334155 ${a.percentOfBudget}%, #334155 100%)`,
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={a.percentOfBudget}
                    onChange={(e) => updateAllocation(a.category, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm text-center"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
                
                {isOverBudget && (
                  <p className="text-red-400 text-xs">⚠️ Over budget by {formatINR(spent - budgetAmount)}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new category */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Add Category</h4>
          <div className="flex gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="" className="bg-slate-800">Select category...</option>
              {availableCategories.map((c) => (
                <option key={c.category} value={c.category} className="bg-slate-800">
                  {c.category}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              placeholder="%"
              min="0"
              max={remainingPercent}
              className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
            <button
              onClick={addCategory}
              disabled={!newCategory}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        {message && (
          <p className={message.type === "success" ? "text-emerald-400" : "text-red-400"}>
            {message.text}
          </p>
        )}
        <button
          onClick={saveAllocations}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50"
        >
          {loading ? "Saving..." : "💾 Save Budget Allocations"}
        </button>
      </div>
    </div>
  );
}


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

  const availableCategories = DEFAULT_CATEGORIES.filter(
    (c) => !allocations.some((a) => a.category === c.category)
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Monthly Budget</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatINR(totalMonthlyBudget)}</p>
          <p className="text-xs text-slate-400 mt-1">Based on 6-month runway</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Allocated</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalAllocated}%</p>
          <p className="text-xs text-slate-400 mt-1">{remainingPercent}% unallocated</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Spent This Month</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatINR(totalSpent)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {totalMonthlyBudget > 0 ? `${((totalSpent / totalMonthlyBudget) * 100).toFixed(0)}% of budget` : "Set cash first"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Remaining</p>
          <p className={`text-2xl font-bold mt-1 ${totalMonthlyBudget - totalSpent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatINR(totalMonthlyBudget - totalSpent)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {totalMonthlyBudget - totalSpent < 0 ? "Over budget!" : "Available"}
          </p>
        </div>
      </div>

      {/* Visual Budget Pie */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Budget Distribution</h3>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Pie Chart */}
          <div className="relative w-56 h-56">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {allocations.reduce(
                (acc, a) => {
                  const startAngle = acc.currentAngle;
                  const angle = (a.percentOfBudget / 100) * 360;
                  const endAngle = startAngle + angle;
                  
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
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="40" 
                  strokeDasharray={`${(remainingPercent / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${((100 - remainingPercent) / 100) * 251.2}`}
                />
              )}
              <circle cx="50" cy="50" r="20" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-800">{totalAllocated}%</p>
                <p className="text-xs text-slate-500">allocated</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            {allocations.map((a) => (
              <div key={a.category} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: a.color || "#64748b" }} />
                <div>
                  <span className="text-sm font-medium text-slate-700">{a.category}</span>
                  <span className="text-sm text-slate-400 ml-2">{a.percentOfBudget}%</span>
                </div>
              </div>
            ))}
            {remainingPercent > 0 && (
              <div className="flex items-center gap-3 p-2">
                <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                <div>
                  <span className="text-sm text-slate-400">Unallocated</span>
                  <span className="text-sm text-slate-400 ml-2">{remainingPercent}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Sliders */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Adjust Allocations</h3>
        <div className="space-y-6">
          {allocations.map((a) => {
            const budgetAmount = Math.round((a.percentOfBudget / 100) * totalMonthlyBudget);
            const spent = spendingByCategory[a.category] || 0;
            const spentPercent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
            const isOverBudget = spent > budgetAmount;

            return (
              <div key={a.category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: a.color || "#64748b" }} />
                    <span className="text-slate-800 font-semibold">{a.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                      {formatINR(spent)} / {formatINR(budgetAmount)}
                    </span>
                    <button
                      onClick={() => removeCategory(a.category)}
                      className="w-7 h-7 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {/* Spending progress */}
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                  />
                </div>
                
                {/* Allocation slider */}
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={a.percentOfBudget}
                    onChange={(e) => updateAllocation(a.category, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={a.percentOfBudget}
                      onChange={(e) => updateAllocation(a.category, parseInt(e.target.value) || 0)}
                      className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm text-center"
                    />
                    <span className="text-slate-400 text-sm font-medium">%</span>
                  </div>
                </div>
                
                {isOverBudget && (
                  <p className="text-red-600 text-sm font-medium">⚠️ Over budget by {formatINR(spent - budgetAmount)}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new category */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-600 mb-3">Add Category</h4>
          <div className="flex gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              <option value="">Select category...</option>
              {availableCategories.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
            <input
              type="number"
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              placeholder="%"
              min="0"
              max={remainingPercent}
              className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-center"
            />
            <button
              onClick={addCategory}
              disabled={!newCategory}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {message && (
          <p className={`text-sm font-medium ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
        {!message && <span />}
        <button
          onClick={saveAllocations}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
        >
          {loading ? "Saving..." : "💾 Save Budget Allocations"}
        </button>
      </div>
    </div>
  );
}

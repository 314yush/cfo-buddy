"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CashForm({
  currentCashPaise,
}: {
  currentCashPaise: number | null;
}) {
  const [amount, setAmount] = useState(
    currentCashPaise ? (currentCashPaise / 100).toString() : ""
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const paise = Math.round(parseFloat(amount) * 100);

    await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashOnHandPaise: paise }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
            ₹
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            placeholder="Enter current cash balance"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || !amount}
        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : "Update"}
      </button>
    </form>
  );
}

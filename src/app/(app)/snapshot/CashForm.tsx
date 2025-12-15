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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            ₹
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            placeholder="Enter current cash balance"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || !amount}
        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : "Update"}
      </button>
    </form>
  );
}


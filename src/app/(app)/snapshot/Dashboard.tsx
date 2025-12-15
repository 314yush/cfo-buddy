"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/snapshot";

type MonthlyData = {
  month: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  cashBalance: number;
};

type DashboardData = {
  cashOnHandPaise: number | null;
  burnMonthlyPaise: number;
  runwayMonths: number | null;
  txCount: number;
  inflowPaise: number;
  outflowPaise: number;
  categoryBreakdown: Array<{ category: string; total: number }>;
  people: Array<{ id: string; name: string; type: string; monthlyCostPaise: number }>;
  recurringExpenses: Array<{ id: string; name: string; amountPaise: number; frequency: string; nextDueDate: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; clientName: string; amountPaise: number; status: string; dueDate: string }>;
  taxReminders: Array<{ id: string; title: string; taxType: string; dueDate: string; isCompleted: boolean }>;
  goals: Array<{ id: string; title: string; targetPaise: number; currentPaise: number; deadline: string }>;
  upcomingPayments: number;
  overdueInvoices: number;
  pendingReceivables: number;
  monthlyTrend: MonthlyData[];
};

export function Dashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Affordability Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [expenseType, setExpenseType] = useState<"one-time" | "monthly">("monthly");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDuration, setExpenseDuration] = useState("12");
  
  // Scenario Planner State
  const [showScenario, setShowScenario] = useState(false);
  const [scenarioRevenue, setScenarioRevenue] = useState("");
  const [scenarioExpense, setScenarioExpense] = useState("");
  const [scenarioHires, setScenarioHires] = useState("0");
  const [scenarioHireCost, setScenarioHireCost] = useState("50000");

  const generateMockData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/mock/all", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage({ type: "success", text: "Mock data generated! Refreshing..." });
      setTimeout(() => router.refresh(), 1000);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  const clearAllData = async () => {
    if (!confirm("Delete ALL your data? This cannot be undone.")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/mock/all", { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage({ type: "success", text: "All data cleared! Refreshing..." });
      setTimeout(() => router.refresh(), 1000);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  // Calculate affordability
  const calculateAffordability = () => {
    if (!expenseAmount || !data.cashOnHandPaise) return null;
    
    const amount = parseFloat(expenseAmount) * 100; // Convert to paise
    const months = parseInt(expenseDuration);
    
    if (expenseType === "one-time") {
      const remainingCash = data.cashOnHandPaise - amount;
      const newRunway = data.burnMonthlyPaise > 0 
        ? remainingCash / data.burnMonthlyPaise 
        : null;
      return {
        canAfford: remainingCash > 0,
        newCash: remainingCash,
        newRunway,
        impact: amount,
      };
    } else {
      // Monthly expense
      const newBurn = data.burnMonthlyPaise + amount;
      const newRunway = data.cashOnHandPaise / newBurn;
      const totalCost = amount * months;
      return {
        canAfford: newRunway >= 3, // At least 3 months runway
        newBurn,
        newRunway,
        totalCost,
        monthlyImpact: amount,
      };
    }
  };

  const affordability = calculateAffordability();

  // Scenario Planner Calculation
  const calculateScenario = () => {
    if (!data.cashOnHandPaise) return null;
    
    const revenueChange = parseFloat(scenarioRevenue || "0") * 100;
    const expenseChange = parseFloat(scenarioExpense || "0") * 100;
    const hires = parseInt(scenarioHires || "0");
    const hireCost = parseFloat(scenarioHireCost || "0") * 100;
    
    const currentMonthlyInflow = data.inflowPaise / 3; // Assuming 90 days data = 3 months
    const currentMonthlyOutflow = data.outflowPaise / 3;
    
    const newMonthlyInflow = currentMonthlyInflow + revenueChange;
    const newMonthlyOutflow = currentMonthlyOutflow + expenseChange + (hires * hireCost);
    const newBurn = newMonthlyOutflow - newMonthlyInflow;
    
    // Project 12 months
    const projections = [];
    let cashBalance = data.cashOnHandPaise;
    
    for (let i = 1; i <= 12; i++) {
      cashBalance = cashBalance + newMonthlyInflow - newMonthlyOutflow;
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() + i);
      projections.push({
        month: i,
        label: monthDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        cash: cashBalance,
        profitable: newMonthlyInflow >= newMonthlyOutflow,
      });
    }
    
    const runwayMonths = newBurn > 0 ? data.cashOnHandPaise / newBurn : null;
    const zeroMonth = projections.findIndex(p => p.cash <= 0);
    
    return {
      newMonthlyInflow,
      newMonthlyOutflow,
      newBurn,
      runwayMonths,
      projections,
      zeroMonth: zeroMonth === -1 ? null : zeroMonth + 1,
      profitable: newMonthlyInflow >= newMonthlyOutflow,
    };
  };
  
  const scenario = calculateScenario();

  // Alerts
  const alerts = [];
  if (data.runwayMonths !== null && data.runwayMonths < 3) {
    alerts.push({ type: "danger", icon: "🔴", text: `Critical: Only ${data.runwayMonths.toFixed(1)} months runway remaining!` });
  } else if (data.runwayMonths !== null && data.runwayMonths < 6) {
    alerts.push({ type: "warning", icon: "🟡", text: `Warning: ${data.runwayMonths.toFixed(1)} months runway. Consider reducing expenses.` });
  }
  if (data.overdueInvoices > 0) {
    alerts.push({ type: "warning", icon: "⚠️", text: `${data.overdueInvoices} overdue invoice(s) - ₹${(data.pendingReceivables / 100).toLocaleString()} pending` });
  }
  const upcomingTax = data.taxReminders.filter(t => !t.isCompleted && new Date(t.dueDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  if (upcomingTax.length > 0) {
    alerts.push({ type: "info", icon: "📅", text: `${upcomingTax.length} tax deadline(s) in next 30 days` });
  }

  // Team cost
  const totalTeamCost = data.people.reduce((sum, p) => sum + p.monthlyCostPaise, 0);
  const totalRecurring = data.recurringExpenses.reduce((sum, e) => sum + e.amountPaise, 0);

  return (
    <div className="space-y-6">
      {/* Dev Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generateMockData}
          disabled={loading}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "🎲 Generate All Mock Data"}
        </button>
        <button
          onClick={clearAllData}
          disabled={loading}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/30"
        >
          🗑️ Clear All Data
        </button>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🧮 Can I Afford This?
        </button>
        <button
          onClick={() => setShowScenario(!showScenario)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🔮 Scenario Planner
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <p className={message.type === "success" ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>{message.text}</p>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-xl border ${
              alert.type === "danger" ? "bg-red-500/10 border-red-500/30" :
              alert.type === "warning" ? "bg-amber-500/10 border-amber-500/30" :
              "bg-blue-500/10 border-blue-500/30"
            }`}>
              <p className="text-sm text-white">
                {alert.icon} {alert.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Affordability Calculator */}
      {showCalculator && (
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 backdrop-blur-xl rounded-xl border border-emerald-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🧮 Can I Afford This?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="monthly" className="bg-slate-800">Monthly Expense</option>
                <option value="one-time" className="bg-slate-800">One-time Purchase</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            {expenseType === "monthly" && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (months)</label>
                <select
                  value={expenseDuration}
                  onChange={(e) => setExpenseDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="6" className="bg-slate-800">6 months</option>
                  <option value="12" className="bg-slate-800">12 months</option>
                  <option value="24" className="bg-slate-800">24 months</option>
                </select>
              </div>
            )}
          </div>
          
          {affordability && expenseAmount && (
            <div className={`p-4 rounded-lg ${affordability.canAfford ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{affordability.canAfford ? "✅" : "❌"}</span>
                <span className="text-lg font-semibold text-white">
                  {affordability.canAfford ? "Yes, you can afford this!" : "Not recommended right now"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {expenseType === "one-time" ? (
                  <>
                    <div>
                      <p className="text-slate-400">Impact</p>
                      <p className="text-white font-medium">-{formatINR(affordability.impact!)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Cash After</p>
                      <p className="text-white font-medium">{formatINR(affordability.newCash!)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">New Runway</p>
                      <p className="text-white font-medium">
                        {affordability.newRunway ? `${affordability.newRunway.toFixed(1)} months` : "N/A"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-slate-400">Monthly Impact</p>
                      <p className="text-white font-medium">+{formatINR(affordability.monthlyImpact!)}/mo</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total Cost ({expenseDuration}mo)</p>
                      <p className="text-white font-medium">{formatINR(affordability.totalCost!)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">New Burn</p>
                      <p className="text-white font-medium">{formatINR(affordability.newBurn!)}/mo</p>
                    </div>
                    <div>
                      <p className="text-slate-400">New Runway</p>
                      <p className={`font-medium ${affordability.newRunway! < 3 ? "text-red-400" : "text-white"}`}>
                        {affordability.newRunway!.toFixed(1)} months
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scenario Planner */}
      {showScenario && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-xl border border-blue-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔮 Scenario Planner - What If...</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Monthly Revenue Change (₹)</label>
              <input
                type="number"
                value={scenarioRevenue}
                onChange={(e) => setScenarioRevenue(e.target.value)}
                placeholder="+50000 or -20000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Monthly Expense Change (₹)</label>
              <input
                type="number"
                value={scenarioExpense}
                onChange={(e) => setScenarioExpense(e.target.value)}
                placeholder="+10000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">New Hires</label>
              <select
                value={scenarioHires}
                onChange={(e) => setScenarioHires(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="0" className="bg-slate-800">No new hires</option>
                <option value="1" className="bg-slate-800">1 person</option>
                <option value="2" className="bg-slate-800">2 people</option>
                <option value="3" className="bg-slate-800">3 people</option>
                <option value="5" className="bg-slate-800">5 people</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cost per Hire (₹/month)</label>
              <input
                type="number"
                value={scenarioHireCost}
                onChange={(e) => setScenarioHireCost(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500"
              />
            </div>
          </div>

          {scenario && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${scenario.profitable ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{scenario.profitable ? "📈" : "📉"}</span>
                  <span className="text-lg font-semibold text-white">
                    {scenario.profitable ? "Scenario looks profitable!" : "Scenario shows negative cash flow"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">New Monthly Revenue</p>
                    <p className="text-emerald-400 font-medium">{formatINR(scenario.newMonthlyInflow)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">New Monthly Expenses</p>
                    <p className="text-red-400 font-medium">{formatINR(scenario.newMonthlyOutflow)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Net Monthly</p>
                    <p className={`font-medium ${scenario.newMonthlyInflow >= scenario.newMonthlyOutflow ? "text-emerald-400" : "text-red-400"}`}>
                      {scenario.newMonthlyInflow >= scenario.newMonthlyOutflow ? "+" : ""}{formatINR(scenario.newMonthlyInflow - scenario.newMonthlyOutflow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Projected Runway</p>
                    <p className={`font-medium ${!scenario.runwayMonths || scenario.runwayMonths > 6 ? "text-emerald-400" : scenario.runwayMonths < 3 ? "text-red-400" : "text-amber-400"}`}>
                      {scenario.runwayMonths ? `${scenario.runwayMonths.toFixed(1)} months` : "∞ Profitable"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 12-Month Projection Chart */}
              <div className="p-4 bg-white/5 rounded-lg">
                <h4 className="text-sm font-medium text-slate-400 mb-4">12-Month Cash Projection</h4>
                <div className="flex items-end gap-1 h-32">
                  {scenario.projections.map((p, i) => {
                    const maxCash = Math.max(...scenario.projections.map(x => Math.abs(x.cash)), data.cashOnHandPaise || 1);
                    const height = Math.abs(p.cash) / maxCash * 100;
                    const isNegative = p.cash < 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full relative" style={{ height: '100px' }}>
                          <div
                            className={`absolute bottom-0 w-full rounded-t transition-all ${
                              isNegative ? "bg-red-500" : "bg-gradient-to-t from-emerald-600 to-emerald-400"
                            }`}
                            style={{ height: `${Math.min(height, 100)}%` }}
                            title={`${p.label}: ${formatINR(p.cash)}`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{p.label}</span>
                      </div>
                    );
                  })}
                </div>
                {scenario.zeroMonth && (
                  <p className="text-red-400 text-sm mt-3">
                    ⚠️ Cash runs out in month {scenario.zeroMonth} ({scenario.projections[scenario.zeroMonth - 1]?.label})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Trend Chart */}
      {data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Monthly Cash Flow Trend</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">Inflows vs Outflows</h4>
              <div className="space-y-3">
                {data.monthlyTrend.map((m, i) => {
                  const maxValue = Math.max(...data.monthlyTrend.flatMap(x => [x.inflow, x.outflow]));
                  const inflowWidth = (m.inflow / maxValue) * 100;
                  const outflowWidth = (m.outflow / maxValue) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{m.label}</span>
                        <span className={m.net >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {m.net >= 0 ? "+" : ""}{formatINR(m.net)}
                        </span>
                      </div>
                      <div className="flex gap-1 h-4">
                        <div
                          className="bg-emerald-500 rounded-l"
                          style={{ width: `${inflowWidth}%` }}
                          title={`Inflow: ${formatINR(m.inflow)}`}
                        />
                        <div
                          className="bg-red-500 rounded-r"
                          style={{ width: `${outflowWidth}%` }}
                          title={`Outflow: ${formatINR(m.outflow)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-emerald-500 rounded" /> Inflow
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500 rounded" /> Outflow
                </span>
              </div>
            </div>

            {/* Cash Balance Trend */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">Cash Balance Trend</h4>
              <div className="flex items-end gap-2 h-32">
                {data.monthlyTrend.map((m, i) => {
                  const maxCash = Math.max(...data.monthlyTrend.map(x => x.cashBalance));
                  const minCash = Math.min(...data.monthlyTrend.map(x => x.cashBalance));
                  const range = maxCash - minCash || 1;
                  const height = ((m.cashBalance - minCash) / range) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-24 relative">
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${m.label}: ${formatINR(m.cashBalance)}`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Cash on Hand"
          value={data.cashOnHandPaise ? formatINR(data.cashOnHandPaise) : "Not set"}
          icon="💰"
          color="emerald"
        />
        <StatCard
          label="Monthly Burn"
          value={formatINR(data.burnMonthlyPaise)}
          icon="🔥"
          color="orange"
        />
        <StatCard
          label="Runway"
          value={data.runwayMonths ? `${data.runwayMonths.toFixed(1)} months` : "—"}
          icon="✈️"
          color="blue"
          alert={data.runwayMonths !== null && data.runwayMonths < 3}
        />
        <StatCard
          label="Net Cash Flow"
          value={`${data.inflowPaise - data.outflowPaise >= 0 ? "+" : ""}${formatINR(data.inflowPaise - data.outflowPaise)}`}
          icon={data.inflowPaise - data.outflowPaise >= 0 ? "📈" : "📉"}
          color={data.inflowPaise - data.outflowPaise >= 0 ? "emerald" : "red"}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Inflows" value={formatINR(data.inflowPaise)} icon="⬆️" color="emerald" small />
        <StatCard label="Total Outflows" value={formatINR(data.outflowPaise)} icon="⬇️" color="red" small />
        <StatCard label="Team Cost/mo" value={formatINR(totalTeamCost)} icon="👥" color="purple" small />
        <StatCard label="Recurring/mo" value={formatINR(totalRecurring)} icon="🔄" color="blue" small />
      </div>

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Expense Breakdown</h3>
          <div className="space-y-3">
            {data.categoryBreakdown.slice(0, 8).map((cat) => {
              const percentage = (cat.total / data.outflowPaise) * 100;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{cat.category}</span>
                    <span className="text-white font-medium">{formatINR(cat.total)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🧾 Invoices & Receivables</h3>
          {data.invoices.length > 0 ? (
            <div className="space-y-3">
              {data.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{inv.clientName}</p>
                    <p className="text-xs text-slate-400">{inv.invoiceNumber} • Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatINR(inv.amountPaise)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === "PAID" ? "bg-emerald-500/20 text-emerald-400" :
                      inv.status === "OVERDUE" ? "bg-red-500/20 text-red-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No invoices yet</p>
          )}
        </div>

        {/* Team */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">👥 Team & Contractors</h3>
          {data.people.length > 0 ? (
            <div className="space-y-3">
              {data.people.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{person.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      person.type === "EMPLOYEE" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {person.type}
                    </span>
                  </div>
                  <p className="text-white font-medium">{formatINR(person.monthlyCostPaise)}/mo</p>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 flex justify-between">
                <span className="text-slate-400">Total Monthly</span>
                <span className="text-white font-semibold">{formatINR(totalTeamCost)}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No team members added</p>
          )}
        </div>

        {/* Recurring Expenses */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔄 Recurring Expenses</h3>
          {data.recurringExpenses.length > 0 ? (
            <div className="space-y-3">
              {data.recurringExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{exp.name}</p>
                    <p className="text-xs text-slate-400">{exp.frequency} • Next: {new Date(exp.nextDueDate).toLocaleDateString()}</p>
                  </div>
                  <p className="text-white font-medium">{formatINR(exp.amountPaise)}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 flex justify-between">
                <span className="text-slate-400">Monthly Total</span>
                <span className="text-white font-semibold">{formatINR(totalRecurring)}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No recurring expenses</p>
          )}
        </div>

        {/* Tax Reminders */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📅 Tax Reminders</h3>
          {data.taxReminders.length > 0 ? (
            <div className="space-y-3">
              {data.taxReminders.map((tax) => (
                <div key={tax.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  tax.isCompleted ? "bg-emerald-500/10" : "bg-white/5"
                }`}>
                  <div>
                    <p className={`font-medium ${tax.isCompleted ? "text-slate-400 line-through" : "text-white"}`}>
                      {tax.title}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {tax.taxType}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${tax.isCompleted ? "text-emerald-400" : "text-white"}`}>
                      {tax.isCompleted ? "✓ Done" : new Date(tax.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No tax reminders</p>
          )}
        </div>
      </div>

      {/* Financial Goals */}
      {data.goals.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🎯 Financial Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.goals.map((goal) => {
              const progress = (goal.currentPaise / goal.targetPaise) * 100;
              return (
                <div key={goal.id} className="p-4 bg-white/5 rounded-lg">
                  <p className="text-white font-medium mb-2">{goal.title}</p>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">{formatINR(goal.currentPaise)}</span>
                    <span className="text-white">{formatINR(goal.targetPaise)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {progress.toFixed(0)}% • Due {new Date(goal.deadline).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color, 
  small = false,
  alert = false 
}: { 
  label: string; 
  value: string; 
  icon: string; 
  color: string;
  small?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl rounded-xl border ${
      alert ? "border-red-500/50 animate-pulse" : "border-white/10"
    } ${small ? "p-4" : "p-6"}`}>
      <div className="flex items-center justify-between">
        <span className={`${small ? "text-xs" : "text-sm"} font-medium text-slate-400`}>{label}</span>
        <span className={small ? "text-lg" : "text-xl"}>{icon}</span>
      </div>
      <div className="mt-2">
        <span className={`${small ? "text-lg" : "text-2xl"} font-bold text-white`}>{value}</span>
      </div>
    </div>
  );
}


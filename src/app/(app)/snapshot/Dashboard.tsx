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

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon, 
  trend,
  trendUp,
  color = "green" 
}: { 
  label: string; 
  value: string; 
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: "green" | "orange" | "blue" | "red" | "purple";
}) {
  const colorClasses = {
    green: "bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600",
    orange: "bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600",
    blue: "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600",
    red: "bg-gradient-to-br from-red-100 to-rose-100 text-red-600",
    purple: "bg-gradient-to-br from-purple-100 to-violet-100 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-sm font-semibold ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// Mini Stat Card
function MiniStatCard({ label, value, icon, color = "slate" }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-lg font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

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
  
  // Add Form States
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showAddTax, setShowAddTax] = useState(false);
  
  // Form data
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: "", clientName: "", amount: "", dueDate: "" });
  const [teamForm, setTeamForm] = useState({ name: "", type: "EMPLOYEE", monthlyCost: "" });
  const [recurringForm, setRecurringForm] = useState({ name: "", amount: "", frequency: "MONTHLY", category: "Software" });
  const [taxForm, setTaxForm] = useState({ title: "", taxType: "GST", dueDate: "", amount: "" });

  // Generate mock data
  const generateMockData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mock/all", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage({ type: "success", text: "Mock data generated!" });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  // Clear all data
  const clearAllData = async () => {
    if (!confirm("Delete all data?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/mock/all", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ type: "success", text: "Data cleared!" });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  // Add handlers
  const handleAddInvoice = async () => {
    if (!invoiceForm.invoiceNumber || !invoiceForm.clientName || !invoiceForm.amount || !invoiceForm.dueDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoiceForm.invoiceNumber,
          clientName: invoiceForm.clientName,
          amountPaise: parseFloat(invoiceForm.amount) * 100,
          dueDate: invoiceForm.dueDate,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setInvoiceForm({ invoiceNumber: "", clientName: "", amount: "", dueDate: "" });
      setShowAddInvoice(false);
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  const handleAddTeam = async () => {
    if (!teamForm.name || !teamForm.monthlyCost) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamForm.name,
          type: teamForm.type,
          monthlyCostPaise: parseFloat(teamForm.monthlyCost) * 100,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTeamForm({ name: "", type: "EMPLOYEE", monthlyCost: "" });
      setShowAddTeam(false);
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  const handleAddRecurring = async () => {
    if (!recurringForm.name || !recurringForm.amount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recurringForm.name,
          amountPaise: parseFloat(recurringForm.amount) * 100,
          frequency: recurringForm.frequency,
          category: recurringForm.category,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setRecurringForm({ name: "", amount: "", frequency: "MONTHLY", category: "Software" });
      setShowAddRecurring(false);
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  const handleAddTax = async () => {
    if (!taxForm.title || !taxForm.dueDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tax-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taxForm.title,
          taxType: taxForm.taxType,
          dueDate: taxForm.dueDate,
          amountPaise: taxForm.amount ? parseFloat(taxForm.amount) * 100 : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTaxForm({ title: "", taxType: "GST", dueDate: "", amount: "" });
      setShowAddTax(false);
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setLoading(false);
  };

  // Delete handlers
  const handleDeleteInvoice = async (id: string) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkInvoicePaid = async (id: string) => {
    try {
      await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      await fetch(`/api/team/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTax = async (id: string) => {
    try {
      await fetch(`/api/tax-reminders/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTax = async (id: string, completed: boolean) => {
    try {
      await fetch(`/api/tax-reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !completed }),
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Affordability calculation
  const calculateAffordability = () => {
    if (!expenseAmount || !data.cashOnHandPaise) return null;
    
    const amount = parseFloat(expenseAmount) * 100;
    const months = parseInt(expenseDuration) || 12;
    
    if (expenseType === "one-time") {
      const newCash = data.cashOnHandPaise - amount;
      const newRunway = data.burnMonthlyPaise > 0 ? newCash / data.burnMonthlyPaise : null;
      return {
        canAfford: newCash > 0 && (newRunway === null || newRunway >= 3),
        newCash,
        newRunway,
        impact: amount,
      };
    } else {
      const newBurn = data.burnMonthlyPaise + amount;
      const newRunway = data.cashOnHandPaise / newBurn;
      const totalCost = amount * months;
      return {
        canAfford: newRunway >= 3,
        newBurn,
        newRunway,
        totalCost,
        monthlyImpact: amount,
      };
    }
  };

  const affordability = calculateAffordability();

  // Scenario calculation
  const calculateScenario = () => {
    if (!data.cashOnHandPaise) return null;
    
    const revenueChange = parseFloat(scenarioRevenue || "0") * 100;
    const expenseChange = parseFloat(scenarioExpense || "0") * 100;
    const hires = parseInt(scenarioHires || "0");
    const hireCost = parseFloat(scenarioHireCost || "0") * 100;
    
    const currentMonthlyInflow = data.inflowPaise / 3;
    const currentMonthlyOutflow = data.outflowPaise / 3;
    
    const newMonthlyInflow = currentMonthlyInflow + revenueChange;
    const newMonthlyOutflow = currentMonthlyOutflow + expenseChange + (hires * hireCost);
    const newBurn = newMonthlyOutflow - newMonthlyInflow;
    
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
  const alerts: Array<{ type: string; text: string; icon: string }> = [];
  if (data.runwayMonths !== null && data.runwayMonths < 3) {
    alerts.push({ type: "danger", icon: "⚠️", text: `Critical: Only ${data.runwayMonths.toFixed(1)} months runway remaining!` });
  } else if (data.runwayMonths !== null && data.runwayMonths < 6) {
    alerts.push({ type: "warning", icon: "⚡", text: `Warning: ${data.runwayMonths.toFixed(1)} months runway. Consider reducing expenses.` });
  }
  if (data.overdueInvoices > 0) {
    alerts.push({ type: "warning", icon: "📋", text: `${data.overdueInvoices} overdue invoice(s) — ${formatINR(data.pendingReceivables)} pending` });
  }

  // Team & recurring totals
  const totalTeamCost = data.people.reduce((sum, p) => sum + p.monthlyCostPaise, 0);
  const totalRecurring = data.recurringExpenses.reduce((sum, e) => sum + e.amountPaise, 0);

  // Chart max for scaling
  const maxTrend = Math.max(...data.monthlyTrend.map(m => Math.max(m.inflow, m.outflow)), 1);

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generateMockData}
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Loading..." : "🎲 Generate Mock Data"}
        </button>
        <button
          onClick={clearAllData}
          disabled={loading}
          className="px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all"
        >
          🗑️ Clear Data
        </button>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          🧮 Can I Afford This?
        </button>
        <button
          onClick={() => setShowScenario(!showScenario)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          🔮 Scenario Planner
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-xl border ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-xl border flex items-center gap-3 ${
              alert.type === "danger" ? "bg-red-50 border-red-200" :
              alert.type === "warning" ? "bg-amber-50 border-amber-200" :
              "bg-blue-50 border-blue-200"
            }`}>
              <span className="text-xl">{alert.icon}</span>
              <p className={`text-sm font-medium ${
                alert.type === "danger" ? "text-red-700" :
                alert.type === "warning" ? "text-amber-700" :
                "text-blue-700"
              }`}>{alert.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Affordability Calculator */}
      {showCalculator && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">🧮</span>
            Can I Afford This?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Type</label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="monthly">Monthly Expense</option>
                <option value="one-time">One-time Purchase</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Amount (₹)</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400"
              />
            </div>
            {expenseType === "monthly" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-2">Duration (months)</label>
                <div className="flex gap-2">
                  {["3", "6", "12", "24", "36"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExpenseDuration(m)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                        expenseDuration === m 
                          ? "bg-emerald-500 text-white shadow-md" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m}mo
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {affordability && expenseAmount && (
            <div className={`p-5 rounded-xl ${affordability.canAfford ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{affordability.canAfford ? "✅" : "❌"}</span>
                <span className="text-lg font-bold text-slate-800">
                  {affordability.canAfford ? "Yes, you can afford this!" : "Not recommended right now"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {expenseType === "one-time" ? (
                  <>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">Impact</p>
                      <p className="text-slate-800 font-bold">-{formatINR(affordability.impact!)}</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">Cash After</p>
                      <p className="text-slate-800 font-bold">{formatINR(affordability.newCash!)}</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">New Runway</p>
                      <p className="text-slate-800 font-bold">
                        {affordability.newRunway ? `${affordability.newRunway.toFixed(1)} months` : "N/A"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">Monthly Impact</p>
                      <p className="text-slate-800 font-bold">+{formatINR(affordability.monthlyImpact!)}/mo</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">Total ({expenseDuration}mo)</p>
                      <p className="text-slate-800 font-bold">{formatINR(affordability.totalCost!)}</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">New Burn</p>
                      <p className="text-slate-800 font-bold">{formatINR(affordability.newBurn!)}/mo</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-slate-500 text-xs">New Runway</p>
                      <p className={`font-bold ${affordability.newRunway! < 3 ? "text-red-600" : "text-slate-800"}`}>
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
        <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">🔮</span>
            Scenario Planner
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Revenue Change (₹/mo)</label>
              <input
                type="number"
                value={scenarioRevenue}
                onChange={(e) => setScenarioRevenue(e.target.value)}
                placeholder="+50000"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Expense Change (₹/mo)</label>
              <input
                type="number"
                value={scenarioExpense}
                onChange={(e) => setScenarioExpense(e.target.value)}
                placeholder="+10000"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">New Hires</label>
              <select
                value={scenarioHires}
                onChange={(e) => setScenarioHires(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="0">No new hires</option>
                <option value="1">1 person</option>
                <option value="2">2 people</option>
                <option value="3">3 people</option>
                <option value="5">5 people</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Cost/Hire (₹/mo)</label>
              <input
                type="number"
                value={scenarioHireCost}
                onChange={(e) => setScenarioHireCost(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {scenario && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-medium">New Monthly Inflow</p>
                  <p className="text-xl font-bold text-emerald-700">{formatINR(scenario.newMonthlyInflow)}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <p className="text-xs text-orange-600 font-medium">New Monthly Outflow</p>
                  <p className="text-xl font-bold text-orange-700">{formatINR(scenario.newMonthlyOutflow)}</p>
                </div>
                <div className={`rounded-xl p-4 border ${scenario.profitable ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <p className={`text-xs font-medium ${scenario.profitable ? "text-emerald-600" : "text-red-600"}`}>Status</p>
                  <p className={`text-xl font-bold ${scenario.profitable ? "text-emerald-700" : "text-red-700"}`}>
                    {scenario.profitable ? "Profitable ✓" : "Burning Cash"}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Projected Runway</p>
                  <p className="text-xl font-bold text-blue-700">
                    {scenario.runwayMonths ? `${scenario.runwayMonths.toFixed(1)} mo` : "∞"}
                  </p>
                </div>
              </div>

              {/* 12-month projection chart */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-medium text-slate-600 mb-4">12-Month Cash Projection</p>
                <div className="flex items-end gap-2 h-40">
                  {scenario.projections.map((p, i) => {
                    const maxCash = Math.max(...scenario.projections.map(x => Math.abs(x.cash)), 1);
                    const height = Math.min(Math.abs(p.cash) / maxCash * 100, 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full rounded-t-lg transition-all ${p.cash >= 0 ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : "bg-gradient-to-t from-red-500 to-red-400"}`}
                          style={{ height: `${height}%`, minHeight: "4px" }}
                        />
                        <span className="text-xs text-slate-500 mt-2">{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cash on Hand"
          value={data.cashOnHandPaise ? formatINR(data.cashOnHandPaise) : "—"}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="green"
        />
        <StatCard
          label="Monthly Burn"
          value={formatINR(data.burnMonthlyPaise)}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>}
          color="orange"
        />
        <StatCard
          label="Runway"
          value={data.runwayMonths ? `${data.runwayMonths.toFixed(1)} months` : "—"}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color={data.runwayMonths !== null && data.runwayMonths < 6 ? "red" : "blue"}
        />
        <StatCard
          label="Net Cash Flow"
          value={`${data.inflowPaise - data.outflowPaise >= 0 ? "+" : ""}${formatINR(data.inflowPaise - data.outflowPaise)}`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          color={data.inflowPaise - data.outflowPaise >= 0 ? "green" : "red"}
          trend={data.txCount > 0 ? `${data.txCount} txns` : undefined}
          trendUp={data.inflowPaise - data.outflowPaise >= 0}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStatCard label="Total Inflows" value={formatINR(data.inflowPaise)} icon="📈" />
        <MiniStatCard label="Total Outflows" value={formatINR(data.outflowPaise)} icon="📉" />
        <MiniStatCard label="Team Cost/mo" value={formatINR(totalTeamCost)} icon="👥" />
        <MiniStatCard label="Recurring/mo" value={formatINR(totalRecurring)} icon="🔄" />
      </div>

      {/* Monthly Trend Chart */}
      {data.monthlyTrend.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Monthly Cash Flow</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> Inflows
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" /> Outflows
              </span>
            </div>
          </div>
          <div className="flex items-end gap-4 h-48">
            {data.monthlyTrend.map((month, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end h-40">
                  <div 
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(month.inflow / maxTrend) * 100}%`, minHeight: month.inflow > 0 ? "4px" : "0" }}
                    title={`Inflow: ${formatINR(month.inflow)}`}
                  />
                  <div 
                    className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(month.outflow / maxTrend) * 100}%`, minHeight: month.outflow > 0 ? "4px" : "0" }}
                    title={`Outflow: ${formatINR(month.outflow)}`}
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">{month.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Expense Breakdown</h3>
          <div className="space-y-4">
            {data.categoryBreakdown.slice(0, 6).map((cat, i) => {
              const percentage = (cat.total / data.outflowPaise) * 100;
              const colors = ["emerald", "orange", "blue", "purple", "pink", "amber"];
              const color = colors[i % colors.length];
              return (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{cat.category}</span>
                    <span className="text-slate-500">{formatINR(cat.total)} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        color === "emerald" ? "from-emerald-400 to-emerald-500" :
                        color === "orange" ? "from-orange-400 to-orange-500" :
                        color === "blue" ? "from-blue-400 to-blue-500" :
                        color === "purple" ? "from-purple-400 to-purple-500" :
                        color === "pink" ? "from-pink-400 to-pink-500" :
                        "from-amber-400 to-amber-500"
                      }`}
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">🧾</span> Invoices
            </h3>
            <button
              onClick={() => setShowAddInvoice(!showAddInvoice)}
              className="text-sm px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              + Add
            </button>
          </div>
          
          {showAddInvoice && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl space-y-3">
              <input
                type="text"
                placeholder="Invoice # (e.g., INV-001)"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
              />
              <input
                type="text"
                placeholder="Client Name"
                value={invoiceForm.clientName}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                />
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                />
              </div>
              <button
                onClick={handleAddInvoice}
                disabled={loading}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Adding..." : "Add Invoice"}
              </button>
            </div>
          )}
          
          {data.invoices.length > 0 ? (
            <div className="space-y-3">
              {data.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-slate-800 font-medium">{inv.clientName}</p>
                    <p className="text-xs text-slate-500">{inv.invoiceNumber} • Due {new Date(inv.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-slate-800 font-semibold">{formatINR(inv.amountPaise)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                        inv.status === "OVERDUE" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      {inv.status !== "PAID" && (
                        <button onClick={() => handleMarkInvoicePaid(inv.id)} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center text-sm">✓</button>
                      )}
                      <button onClick={() => handleDeleteInvoice(inv.id)} className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No invoices yet</p>
          )}
        </div>

        {/* Team */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">👥</span> Team
            </h3>
            <button
              onClick={() => setShowAddTeam(!showAddTeam)}
              className="text-sm px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              + Add
            </button>
          </div>
          
          {showAddTeam && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={teamForm.type}
                  onChange={(e) => setTeamForm({ ...teamForm, type: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="CONTRACTOR">Contractor</option>
                </select>
                <input
                  type="number"
                  placeholder="Monthly Cost (₹)"
                  value={teamForm.monthlyCost}
                  onChange={(e) => setTeamForm({ ...teamForm, monthlyCost: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                />
              </div>
              <button
                onClick={handleAddTeam}
                disabled={loading}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Adding..." : "Add Member"}
              </button>
            </div>
          )}
          
          {data.people.length > 0 ? (
            <div className="space-y-3">
              {data.people.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {person.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-slate-800 font-medium">{person.name}</p>
                      <p className="text-xs text-slate-500">{person.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-slate-800 font-semibold">{formatINR(person.monthlyCostPaise)}/mo</p>
                    <button
                      onClick={() => handleDeleteTeam(person.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No team members yet</p>
          )}
        </div>

        {/* Recurring Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">🔄</span> Recurring
            </h3>
            <button
              onClick={() => setShowAddRecurring(!showAddRecurring)}
              className="text-sm px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              + Add
            </button>
          </div>
          
          {showAddRecurring && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl space-y-3">
              <input
                type="text"
                placeholder="Expense name"
                value={recurringForm.name}
                onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={recurringForm.amount}
                  onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                />
                <select
                  value={recurringForm.frequency}
                  onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <button
                onClick={handleAddRecurring}
                disabled={loading}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Adding..." : "Add Expense"}
              </button>
            </div>
          )}
          
          {data.recurringExpenses.length > 0 ? (
            <div className="space-y-3">
              {data.recurringExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-slate-800 font-medium">{exp.name}</p>
                    <p className="text-xs text-slate-500">{exp.frequency} • Next: {new Date(exp.nextDueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-slate-800 font-semibold">{formatINR(exp.amountPaise)}</p>
                    <button
                      onClick={() => handleDeleteRecurring(exp.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No recurring expenses</p>
          )}
        </div>

        {/* Tax Reminders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">📅</span> Tax Deadlines
            </h3>
            <button
              onClick={() => setShowAddTax(!showAddTax)}
              className="text-sm px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              + Add
            </button>
          </div>
          
          {showAddTax && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl space-y-3">
              <input
                type="text"
                placeholder="Title (e.g., Q3 GST Filing)"
                value={taxForm.title}
                onChange={(e) => setTaxForm({ ...taxForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={taxForm.taxType}
                  onChange={(e) => setTaxForm({ ...taxForm, taxType: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                >
                  <option value="GST">GST</option>
                  <option value="TDS">TDS</option>
                  <option value="ADVANCE_TAX">Advance Tax</option>
                  <option value="ITR">ITR</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="date"
                  value={taxForm.dueDate}
                  onChange={(e) => setTaxForm({ ...taxForm, dueDate: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm"
                />
              </div>
              <button
                onClick={handleAddTax}
                disabled={loading}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Adding..." : "Add Reminder"}
              </button>
            </div>
          )}
          
          {data.taxReminders.length > 0 ? (
            <div className="space-y-3">
              {data.taxReminders.map((tax) => (
                <div key={tax.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTax(tax.id, tax.isCompleted)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        tax.isCompleted 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "border-slate-300 hover:border-emerald-500"
                      }`}
                    >
                      {tax.isCompleted && "✓"}
                    </button>
                    <div>
                      <p className={`font-medium ${tax.isCompleted ? "text-slate-400 line-through" : "text-slate-800"}`}>{tax.title}</p>
                      <p className="text-xs text-slate-500">{tax.taxType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${tax.isCompleted ? "text-emerald-600" : "text-slate-600"}`}>
                      {tax.isCompleted ? "Done ✓" : new Date(tax.dueDate).toLocaleDateString('en-IN')}
                    </span>
                    <button
                      onClick={() => handleDeleteTax(tax.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No tax reminders</p>
          )}
        </div>
      </div>

      {/* Financial Goals */}
      {data.goals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🎯</span> Financial Goals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.goals.map((goal) => {
              const progress = (goal.currentPaise / goal.targetPaise) * 100;
              return (
                <div key={goal.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-slate-800">{goal.title}</p>
                    <span className="text-xs font-semibold text-emerald-600">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{formatINR(goal.currentPaise)}</span>
                    <span>{formatINR(goal.targetPaise)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Due {new Date(goal.deadline).toLocaleDateString('en-IN')}
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

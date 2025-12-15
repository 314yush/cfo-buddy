import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeBurnAndRunway, TxDirection } from "@/lib/snapshot";
import { redirect } from "next/navigation";
import { CashForm } from "./CashForm";
import { Dashboard } from "./Dashboard";
import Link from "next/link";

// Type aliases for Prisma models (IDE may not pick up generated types immediately)
type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amountPaise: number;
  status: string;
  dueDate: Date;
};

type RecurringExpense = {
  id: string;
  name: string;
  amountPaise: number;
  frequency: string;
  nextDueDate: Date;
};

type TaxReminder = {
  id: string;
  title: string;
  taxType: string;
  dueDate: Date;
  isCompleted: boolean;
};

type FinancialGoal = {
  id: string;
  title: string;
  targetPaise: number;
  currentPaise: number;
  deadline: Date;
};

export default async function SnapshotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user profile
  const appUser = await prisma.appUser.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      businessName: true,
      businessType: true,
      businessStage: true,
      onboardingComplete: true,
      primaryGoal: true,
    },
  });

  // Redirect to onboarding if not complete
  if (appUser && !appUser.onboardingComplete) {
    redirect("/onboarding");
  }

  const displayName = appUser?.name || appUser?.businessName || user.email?.split("@")[0] || "there";

  // Get latest cash snapshot
  const cashSnapshot = await prisma.cashSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { asOfDate: "desc" },
    select: { cashOnHandPaise: true, asOfDate: true },
  });

  // Get transactions for last 180 days (6 months for trend)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  const transactions = await prisma.transaction.findMany({
    where: { 
      userId: user.id, 
      date: { gte: sixMonthsAgo } 
    },
    select: { direction: true, amountPaise: true, category: true, date: true },
  });

  // Calculate totals (last 90 days for main stats)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentTransactions = transactions.filter(t => t.date >= ninetyDaysAgo);
  
  const inflowPaise = recentTransactions
    .filter(t => t.direction === "INFLOW")
    .reduce((sum, t) => sum + t.amountPaise, 0);
  
  const outflowPaise = recentTransactions
    .filter(t => t.direction === "OUTFLOW")
    .reduce((sum, t) => sum + t.amountPaise, 0);

  // Category breakdown (outflows only, last 90 days)
  const categoryMap = new Map<string, number>();
  recentTransactions
    .filter(t => t.direction === "OUTFLOW")
    .forEach(t => {
      const current = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, current + t.amountPaise);
    });
  
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Calculate monthly trend (last 6 months)
  const monthlyTrendMap = new Map<string, { inflow: number; outflow: number }>();
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrendMap.set(key, { inflow: 0, outflow: 0 });
  }
  
  // Aggregate transactions by month
  transactions.forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyTrendMap.get(key);
    if (existing) {
      if (t.direction === "INFLOW") {
        existing.inflow += t.amountPaise;
      } else {
        existing.outflow += t.amountPaise;
      }
    }
  });
  
  // Get cash snapshots for trend
  const cashSnapshots = await prisma.cashSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { asOfDate: "asc" },
  });
  
  // Build monthly trend array
  const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([month, data]) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    // Find closest cash snapshot for this month
    const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0);
    const snapshot = cashSnapshots.find(s => {
      const snapDate = new Date(s.asOfDate);
      return snapDate.getFullYear() === parseInt(year) && snapDate.getMonth() === parseInt(monthNum) - 1;
    });
    
    return {
      month,
      label,
      inflow: data.inflow,
      outflow: data.outflow,
      net: data.inflow - data.outflow,
      cashBalance: snapshot?.cashOnHandPaise || 0,
    };
  });

  // Compute burn and runway
  const latestTx = await prisma.transaction.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  let snapshot = null;
  if (latestTx) {
    const to = latestTx.date;
    const from = new Date(to);
    from.setDate(from.getDate() - 30);

    const recentTxs = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from, lte: to } },
      select: { direction: true, amountPaise: true },
    });

    snapshot = computeBurnAndRunway({
      latestTxDate: to,
      cashOnHandPaise: cashSnapshot?.cashOnHandPaise ?? null,
      transactions: recentTxs as Array<{
        direction: TxDirection;
        amountPaise: number;
      }>,
    });
  }

  // Get people (employees + contractors)
  const people = await prisma.person.findMany({
    where: { userId: user.id },
    orderBy: { monthlyCostPaise: "desc" },
  });

  // Get recurring expenses
  // @ts-expect-error - Prisma types may not be generated yet
  const recurringExpenses: RecurringExpense[] = await prisma.recurringExpense.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { amountPaise: "desc" },
  });

  // Get invoices
  // @ts-expect-error - Prisma types may not be generated yet
  const invoices: Invoice[] = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const overdueInvoices = invoices.filter((i: Invoice) => i.status === "OVERDUE").length;
  const pendingReceivables = invoices
    .filter((i: Invoice) => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((sum: number, i: Invoice) => sum + i.amountPaise, 0);

  // Get tax reminders
  // @ts-expect-error - Prisma types may not be generated yet
  const taxReminders: TaxReminder[] = await prisma.taxReminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  // Get financial goals
  // @ts-expect-error - Prisma types may not be generated yet
  const goals: FinancialGoal[] = await prisma.financialGoal.findMany({
    where: { userId: user.id },
    orderBy: { deadline: "asc" },
  });

  // Get upcoming payments
  const upcomingPayments = await prisma.payment.count({
    where: { 
      userId: user.id, 
      status: "PENDING",
      dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    },
  });

  // Count total transactions
  const txCount = await prisma.transaction.count({
    where: { userId: user.id },
  });

  // Prepare dashboard data
  const dashboardData = {
    cashOnHandPaise: cashSnapshot?.cashOnHandPaise ?? null,
    burnMonthlyPaise: snapshot?.burnMonthlyPaise ?? 0,
    runwayMonths: snapshot?.runwayMonths ?? null,
    txCount,
    inflowPaise,
    outflowPaise,
    categoryBreakdown,
    people: people.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      monthlyCostPaise: p.monthlyCostPaise,
    })),
    recurringExpenses: recurringExpenses.map((e: RecurringExpense) => ({
      id: e.id,
      name: e.name,
      amountPaise: e.amountPaise,
      frequency: e.frequency,
      nextDueDate: e.nextDueDate.toISOString(),
    })),
    invoices: invoices.map((i: Invoice) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      clientName: i.clientName,
      amountPaise: i.amountPaise,
      status: i.status,
      dueDate: i.dueDate.toISOString(),
    })),
    taxReminders: taxReminders.map((t: TaxReminder) => ({
      id: t.id,
      title: t.title,
      taxType: t.taxType,
      dueDate: t.dueDate.toISOString(),
      isCompleted: t.isCompleted,
    })),
    goals: goals.map((g: FinancialGoal) => ({
      id: g.id,
      title: g.title,
      targetPaise: g.targetPaise,
      currentPaise: g.currentPaise,
      deadline: g.deadline.toISOString(),
    })),
    upcomingPayments,
    overdueInvoices,
    pendingReceivables,
    monthlyTrend,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hey {displayName}! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            Here&apos;s your financial command center
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/upload"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
          >
            📄 Upload Statement
          </Link>
          <Link
            href="/transactions"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
          >
            📊 Transactions
          </Link>
        </div>
      </div>

      {/* Cash on Hand Form */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          💰 Update Cash on Hand
        </h2>
        <CashForm currentCashPaise={cashSnapshot?.cashOnHandPaise ?? null} />
      </div>

      {/* Dashboard */}
      <Dashboard data={dashboardData} />
    </div>
  );
}

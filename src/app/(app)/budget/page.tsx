import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BudgetManager } from "./BudgetManager";

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get budget allocations
  const allocations = await prisma.budgetAllocation.findMany({
    where: { userId: user.id },
    orderBy: { percentOfBudget: "desc" },
  });

  // Get actual spending by category (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      direction: "OUTFLOW",
      date: { gte: thirtyDaysAgo },
    },
    select: { category: true, amountPaise: true },
  });

  // Aggregate by category
  const spendingByCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amountPaise;
  });

  // Get cash on hand
  const cashSnapshot = await prisma.cashSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { asOfDate: "desc" },
  });

  const totalMonthlyBudget = cashSnapshot?.cashOnHandPaise 
    ? Math.round(cashSnapshot.cashOnHandPaise / 6)
    : 0;

  const totalSpent = transactions.reduce((sum, t) => sum + t.amountPaise, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">💰 Budget Allocation</h1>
        <p className="text-slate-400 mt-1">
          Set percentage-based budgets for each category and track your spending
        </p>
      </div>

      <BudgetManager
        initialAllocations={allocations.map((a) => ({
          id: a.id,
          category: a.category,
          percentOfBudget: a.percentOfBudget,
          amountPaise: a.amountPaise,
          color: a.color,
        }))}
        spendingByCategory={spendingByCategory}
        totalMonthlyBudget={totalMonthlyBudget}
        totalSpent={totalSpent}
      />
    </div>
  );
}



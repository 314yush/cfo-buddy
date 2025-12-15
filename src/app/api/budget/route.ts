import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { category: "Marketing", color: "#8b5cf6" },
  { category: "Employees", color: "#3b82f6" },
  { category: "Software", color: "#10b981" },
  { category: "Office", color: "#f59e0b" },
  { category: "Travel", color: "#ef4444" },
  { category: "Utilities", color: "#6366f1" },
  { category: "Contractor", color: "#ec4899" },
  { category: "Other", color: "#64748b" },
];

// GET all budget allocations with actual spending
export async function GET() {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const spendingByCategory = new Map<string, number>();
  transactions.forEach((t) => {
    const current = spendingByCategory.get(t.category) || 0;
    spendingByCategory.set(t.category, current + t.amountPaise);
  });

  // Get cash on hand for budget calculation
  const cashSnapshot = await prisma.cashSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { asOfDate: "desc" },
  });

  const totalMonthlyBudget = cashSnapshot?.cashOnHandPaise 
    ? Math.round(cashSnapshot.cashOnHandPaise / 6) // Assume 6-month runway target
    : 0;

  // Merge allocations with actual spending
  const budgetData = allocations.map((a) => ({
    ...a,
    actualSpendingPaise: spendingByCategory.get(a.category) || 0,
    budgetAmountPaise: a.amountPaise || Math.round((a.percentOfBudget / 100) * totalMonthlyBudget),
  }));

  // Add categories that have spending but no allocation
  const allocatedCategories = new Set(allocations.map((a) => a.category));
  const unallocatedSpending = Array.from(spendingByCategory.entries())
    .filter(([cat]) => !allocatedCategories.has(cat))
    .map(([category, amount]) => ({
      id: null,
      category,
      percentOfBudget: 0,
      amountPaise: null,
      color: DEFAULT_CATEGORIES.find((c) => c.category === category)?.color || "#64748b",
      actualSpendingPaise: amount,
      budgetAmountPaise: 0,
      isUnallocated: true,
    }));

  return NextResponse.json({
    allocations: [...budgetData, ...unallocatedSpending],
    totalMonthlyBudget,
    totalAllocated: allocations.reduce((sum, a) => sum + a.percentOfBudget, 0),
    totalSpent: transactions.reduce((sum, t) => sum + t.amountPaise, 0),
  });
}

// CREATE or UPDATE budget allocations (batch)
export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { allocations } = body;

    if (!allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { error: "Missing allocations array" },
        { status: 400 }
      );
    }

    // Validate total doesn't exceed 100%
    const totalPercent = allocations.reduce((sum: number, a: any) => sum + (a.percentOfBudget || 0), 0);
    if (totalPercent > 100) {
      return NextResponse.json(
        { error: "Total allocation cannot exceed 100%" },
        { status: 400 }
      );
    }

    // Upsert each allocation
    const results = [];
    for (const allocation of allocations) {
      const { category, percentOfBudget, amountPaise, color } = allocation;

      if (!category) continue;

      const result = await prisma.budgetAllocation.upsert({
        where: {
          userId_category: {
            userId: user.id,
            category,
          },
        },
        create: {
          userId: user.id,
          category,
          percentOfBudget: percentOfBudget || 0,
          amountPaise: amountPaise || null,
          color: color || DEFAULT_CATEGORIES.find((c) => c.category === category)?.color || "#64748b",
        },
        update: {
          percentOfBudget: percentOfBudget || 0,
          amountPaise: amountPaise || null,
          color: color || undefined,
        },
      });

      results.push(result);
    }

    return NextResponse.json({ success: true, allocations: results });
  } catch (error) {
    console.error("Budget allocation error:", error);
    return NextResponse.json({ error: "Failed to save budget allocations" }, { status: 500 });
  }
}

// DELETE a budget allocation
export async function DELETE(request: Request) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "Missing category parameter" }, { status: 400 });
    }

    await prisma.budgetAllocation.delete({
      where: {
        userId_category: {
          userId: user.id,
          category,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete budget allocation error:", error);
    return NextResponse.json({ error: "Failed to delete allocation" }, { status: 500 });
  }
}



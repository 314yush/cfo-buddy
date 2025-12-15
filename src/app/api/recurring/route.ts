import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET all recurring expenses
export async function GET() {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expenses = await prisma.recurringExpense.findMany({
    where: { userId: user.id },
    orderBy: { amountPaise: "desc" },
  });

  return NextResponse.json(expenses);
}

// CREATE new recurring expense
export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, amountPaise, frequency, category, nextDueDate } = body;

    if (!name || !amountPaise || !frequency) {
      return NextResponse.json(
        { error: "Missing required fields: name, amountPaise, frequency" },
        { status: 400 }
      );
    }

    const expense = await prisma.recurringExpense.create({
      data: {
        userId: user.id,
        name,
        amountPaise: Math.round(amountPaise),
        frequency, // WEEKLY, MONTHLY, QUARTERLY, YEARLY
        category: category || "Other",
        nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(),
        isActive: true,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Create recurring expense error:", error);
    return NextResponse.json({ error: "Failed to add recurring expense" }, { status: 500 });
  }
}



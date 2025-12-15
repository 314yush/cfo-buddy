import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function computeHash(date: Date, description: string, amountPaise: number, direction: string): string {
  const input = `${date.toISOString().slice(0, 10)}|${description.toLowerCase().trim()}|${amountPaise}|${direction}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

// GET all transactions
export async function GET() {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Failed to get transactions" },
      { status: 500 }
    );
  }
}

// CREATE new transaction manually
export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, description, amountPaise, direction, category } = body;

    if (!date || !description || !amountPaise || !direction) {
      return NextResponse.json(
        { error: "Missing required fields: date, description, amountPaise, direction" },
        { status: 400 }
      );
    }

    // Get or create default bank account
    let bankAccount = await prisma.bankAccount.findFirst({
      where: { userId: user.id },
    });

    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: {
          userId: user.id,
          name: "Primary Account",
          currency: "INR",
        },
      });
    }

    const txDate = new Date(date);
    const hash = computeHash(txDate, description, amountPaise, direction);

    // Check for duplicate
    const existing = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        dedupeHash: hash,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A transaction with these details already exists", duplicate: true },
        { status: 409 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        bankAccountId: bankAccount.id,
        date: txDate,
        description,
        amountPaise,
        direction,
        category: category || "Uncategorized",
        dedupeHash: hash,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

// DELETE all transactions (for clearing mock data)
export async function DELETE() {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.transaction.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("Delete all transactions error:", error);
    return NextResponse.json(
      { error: "Failed to delete transactions" },
      { status: 500 }
    );
  }
}


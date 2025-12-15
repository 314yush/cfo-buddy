import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function computeHash(date: Date, description: string, amountPaise: number, direction: string): string {
  const input = `${date.toISOString().slice(0, 10)}|${description.toLowerCase().trim()}|${amountPaise}|${direction}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

// GET single transaction
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    return NextResponse.json(
      { error: "Failed to get transaction" },
      { status: 500 }
    );
  }
}

// UPDATE transaction
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const body = await request.json();
    const { date, description, amountPaise, direction, category } = body;

    // Compute new hash if key fields changed
    const newDate = date ? new Date(date) : existing.date;
    const newDescription = description ?? existing.description;
    const newAmountPaise = amountPaise ?? existing.amountPaise;
    const newDirection = direction ?? existing.direction;
    const newHash = computeHash(newDate, newDescription, newAmountPaise, newDirection);

    // Check for duplicates (excluding current transaction)
    if (newHash !== existing.dedupeHash) {
      const duplicate = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          dedupeHash: newHash,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A transaction with these details already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        date: newDate,
        description: newDescription,
        amountPaise: newAmountPaise,
        direction: newDirection,
        category: category ?? existing.category,
        dedupeHash: newHash,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

// DELETE transaction
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}


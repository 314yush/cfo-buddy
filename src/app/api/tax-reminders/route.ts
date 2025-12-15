import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET all tax reminders
export async function GET() {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.taxReminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(reminders);
}

// CREATE new tax reminder
export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taxType, title, dueDate, amountPaise, notes } = body;

    if (!taxType || !title || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields: taxType, title, dueDate" },
        { status: 400 }
      );
    }

    const reminder = await prisma.taxReminder.create({
      data: {
        userId: user.id,
        taxType, // GST, TDS, ADVANCE_TAX, ITR, OTHER
        title,
        dueDate: new Date(dueDate),
        amountPaise: amountPaise ? Math.round(amountPaise) : null,
        notes: notes || null,
        isCompleted: false,
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Create tax reminder error:", error);
    return NextResponse.json({ error: "Failed to add tax reminder" }, { status: 500 });
  }
}


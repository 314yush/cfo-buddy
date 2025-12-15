import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// UPDATE tax reminder
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.taxReminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, dueDate, amountPaise, isCompleted, notes } = body;

    const updated = await prisma.taxReminder.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        amountPaise: amountPaise ?? existing.amountPaise,
        isCompleted: isCompleted ?? existing.isCompleted,
        completedAt: isCompleted && !existing.isCompleted ? new Date() : existing.completedAt,
        notes: notes ?? existing.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update tax reminder error:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}

// DELETE tax reminder
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.taxReminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    await prisma.taxReminder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tax reminder error:", error);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}



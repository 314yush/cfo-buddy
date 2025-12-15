import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// UPDATE team member
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
    const existing = await prisma.person.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, monthlyCostPaise, startDate } = body;

    const updated = await prisma.person.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        type: type ?? existing.type,
        monthlyCostPaise: monthlyCostPaise ?? existing.monthlyCostPaise,
        startDate: startDate ? new Date(startDate) : existing.startDate,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update team member error:", error);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}

// DELETE team member
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
    const existing = await prisma.person.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    await prisma.person.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete team member error:", error);
    return NextResponse.json({ error: "Failed to delete team member" }, { status: 500 });
  }
}


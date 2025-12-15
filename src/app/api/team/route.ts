import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET all team members
export async function GET() {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const people = await prisma.person.findMany({
    where: { userId: user.id },
    orderBy: { monthlyCostPaise: "desc" },
  });

  return NextResponse.json(people);
}

// CREATE new team member
export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type, monthlyCostPaise, startDate } = body;

    if (!name || !type || !monthlyCostPaise) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, monthlyCostPaise" },
        { status: 400 }
      );
    }

    const person = await prisma.person.create({
      data: {
        userId: user.id,
        name,
        type, // EMPLOYEE or CONTRACTOR
        monthlyCostPaise: Math.round(monthlyCostPaise),
        startDate: startDate ? new Date(startDate) : new Date(),
      },
    });

    return NextResponse.json(person);
  } catch (error) {
    console.error("Create team member error:", error);
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
  }
}


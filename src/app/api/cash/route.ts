import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error in cash route:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cashOnHandPaise } = await request.json();

  if (typeof cashOnHandPaise !== "number" || cashOnHandPaise < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  await prisma.cashSnapshot.create({
    data: {
      userId: user.id,
      asOfDate: new Date(),
      cashOnHandPaise: Math.round(cashOnHandPaise),
      source: "MANUAL",
    },
  });

  return NextResponse.json({ success: true });
}


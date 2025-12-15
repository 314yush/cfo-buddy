import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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


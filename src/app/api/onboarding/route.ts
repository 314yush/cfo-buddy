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
    console.error("Auth error in onboarding POST:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      businessName,
      businessType,
      businessStage,
      monthlyRevenue,
      monthlyExpenses,
      teamSize,
      primaryGoal,
    } = body;

    // Update user with onboarding data
    await prisma.appUser.update({
      where: { id: user.id },
      data: {
        name: name || null,
        businessName: businessName || null,
        businessType: businessType || null,
        businessStage: businessStage || null,
        monthlyRevenuePaise: monthlyRevenue || null,
        monthlyExpensesPaise: monthlyExpenses || null,
        teamSize: teamSize || null,
        primaryGoal: primaryGoal || null,
        onboardingComplete: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error in onboarding GET:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appUser = await prisma.appUser.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        businessName: true,
        businessType: true,
        businessStage: true,
        monthlyRevenuePaise: true,
        monthlyExpensesPaise: true,
        teamSize: true,
        primaryGoal: true,
        onboardingComplete: true,
      },
    });

    return NextResponse.json(appUser);
  } catch (error) {
    console.error("Get onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to get onboarding data" },
      { status: 500 }
    );
  }
}


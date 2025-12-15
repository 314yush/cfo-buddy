import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert user in our DB
      await prisma.appUser.upsert({
        where: { id: data.user.id },
        create: { id: data.user.id, email: data.user.email ?? "" },
        update: { email: data.user.email ?? "" },
      });
    }
  }

  return NextResponse.redirect(`${origin}/snapshot`);
}


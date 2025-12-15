import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/snapshot";

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth error:", error.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }

      if (data.user) {
        // Upsert user in our DB
        try {
          await prisma.appUser.upsert({
            where: { id: data.user.id },
            create: { id: data.user.id, email: data.user.email ?? "" },
            update: { email: data.user.email ?? "" },
          });
        } catch (dbError) {
          console.error("Database error:", dbError);
          // Continue anyway - user is authenticated
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error("Callback error:", err);
      return NextResponse.redirect(`${origin}/login?error=callback_failed`);
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}


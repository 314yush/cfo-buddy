import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/snapshot";

  if (code) {
    const cookieStore = await cookies();
    
    // Create Supabase client with full cookie access for code exchange
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth code exchange error:", error.message, error.code);
        
        // If code mismatch, clear auth cookies and redirect to login
        if (error.message.includes("code") || error.code === "invalid_grant") {
          // Clear any stale auth cookies
          const allCookies = cookieStore.getAll();
          allCookies.forEach(cookie => {
            if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
              cookieStore.delete(cookie.name);
            }
          });
          
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent("Session expired. Please request a new magic link.")}`
          );
        }
        
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(error.message)}`
        );
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
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}

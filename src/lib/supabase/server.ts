import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}

// For route handlers that need to refresh the session
export async function createClientWithRefresh() {
  const supabase = await createClient();
  
  // Attempt to refresh session if needed
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error("Session error:", error.message);
  }
  
  // If session exists, try to refresh it
  if (session) {
    await supabase.auth.refreshSession();
  }
  
  return supabase;
}


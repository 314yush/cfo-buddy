import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const NAV_ITEMS = [
  { href: "/snapshot", label: "Snapshot" },
  { href: "/transactions", label: "Transactions" },
  { href: "/upload", label: "Upload" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check onboarding status and show name
  const appUser = await prisma.appUser.findUnique({
    where: { id: user.id },
    select: { onboardingComplete: true, name: true, businessName: true },
  });

  const displayName = appUser?.name || appUser?.businessName || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/snapshot"
              className="text-lg font-bold text-white tracking-tight"
            >
              Accounting Buddy
            </Link>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="ml-4 flex items-center gap-3 pl-4 border-l border-white/10">
                <span className="text-sm text-slate-400">
                  {displayName}
                </span>
                <Link
                  href="/logout"
                  className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Sign out
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}


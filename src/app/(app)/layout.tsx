import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./Sidebar";

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
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <Sidebar displayName={displayName} initials={initials} />

      {/* Main Content */}
      <main className="flex-1 ml-[240px]">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
              <p className="text-sm text-slate-500">Welcome back, {displayName}!</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

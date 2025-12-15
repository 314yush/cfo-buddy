import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeBurnAndRunway, formatINR, TxDirection } from "@/lib/snapshot";
import { redirect } from "next/navigation";
import { CashForm } from "./CashForm";
import Link from "next/link";

export default async function SnapshotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user profile
  const appUser = await prisma.appUser.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      businessName: true,
      businessType: true,
      businessStage: true,
      onboardingComplete: true,
      primaryGoal: true,
    },
  });

  // Redirect to onboarding if not complete
  if (appUser && !appUser.onboardingComplete) {
    redirect("/onboarding");
  }

  const displayName = appUser?.name || appUser?.businessName || user.email?.split("@")[0] || "there";

  // Get latest transaction date
  const latestTx = await prisma.transaction.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  // Get cash on hand
  const cashSnapshot = await prisma.cashSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { asOfDate: "desc" },
    select: { cashOnHandPaise: true, asOfDate: true },
  });

  // Get transactions for last 30 days
  let snapshot = null;
  if (latestTx) {
    const to = latestTx.date;
    const from = new Date(to);
    from.setDate(from.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from, lte: to } },
      select: { direction: true, amountPaise: true },
    });

    snapshot = computeBurnAndRunway({
      latestTxDate: to,
      cashOnHandPaise: cashSnapshot?.cashOnHandPaise ?? null,
      transactions: transactions as Array<{
        direction: TxDirection;
        amountPaise: number;
      }>,
    });
  }

  // Count total transactions
  const txCount = await prisma.transaction.count({
    where: { userId: user.id },
  });

  // Check if user has goals that include hiring
  const wantsHiringHelp = appUser?.primaryGoal?.includes("hiring_decisions");
  const wantsRunway = appUser?.primaryGoal?.includes("runway");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hey {displayName}! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            Here&apos;s your financial snapshot
          </p>
        </div>
        {!appUser?.onboardingComplete && (
          <Link
            href="/onboarding"
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Complete Setup →
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash on Hand */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">
              Cash on Hand
            </span>
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="mt-4">
            {cashSnapshot ? (
              <span className="text-2xl font-bold text-white">
                {formatINR(cashSnapshot.cashOnHandPaise)}
              </span>
            ) : (
              <span className="text-lg text-slate-500">Not set</span>
            )}
          </div>
        </div>

        {/* Monthly Burn */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">
              Monthly Burn
            </span>
            <svg
              className="w-5 h-5 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
            </svg>
          </div>
          <div className="mt-4">
            {snapshot ? (
              <span className="text-2xl font-bold text-white">
                {formatINR(snapshot.burnMonthlyPaise)}
              </span>
            ) : (
              <span className="text-lg text-slate-500">No data</span>
            )}
          </div>
          {snapshot && (
            <p className="text-xs text-slate-500 mt-1">
              Based on last 30 days
            </p>
          )}
        </div>

        {/* Runway */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Runway</span>
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div className="mt-4">
            {snapshot?.runwayMonths != null ? (
              <span className="text-2xl font-bold text-white">
                {snapshot.runwayMonths.toFixed(1)} months
              </span>
            ) : snapshot && snapshot.burnMonthlyPaise === 0 ? (
              <span className="text-lg text-emerald-400">Stable</span>
            ) : (
              <span className="text-lg text-slate-500">—</span>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">
              Transactions
            </span>
            <svg
              className="w-5 h-5 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-white">{txCount}</span>
          </div>
        </div>
      </div>

      {/* Cash on Hand Form */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Update Cash on Hand
        </h2>
        <CashForm currentCashPaise={cashSnapshot?.cashOnHandPaise ?? null} />
      </div>

      {/* Recommendations */}
      {snapshot && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Insights</h2>
          <ul className="space-y-3">
            {snapshot.runwayMonths != null && snapshot.runwayMonths < 3 && (
              <li className="flex items-start gap-3 text-sm">
                <span className="text-amber-400 mt-0.5">•</span>
                <span className="text-slate-300">
                  Your runway is under 3 months. Consider delaying fixed monthly
                  commitments unless they directly increase revenue.
                </span>
              </li>
            )}
            {snapshot.burnMonthlyPaise === 0 && (
              <li className="flex items-start gap-3 text-sm">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span className="text-slate-300">
                  Cashflow looks stable — inflows match or exceed outflows. You
                  may be able to take on a new expense if this trend continues.
                </span>
              </li>
            )}
            {snapshot.runwayMonths != null && snapshot.runwayMonths >= 6 && (
              <li className="flex items-start gap-3 text-sm">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span className="text-slate-300">
                  You have 6+ months of runway. This is a healthy position to
                  make growth investments.
                </span>
              </li>
            )}
            {!cashSnapshot && (
              <li className="flex items-start gap-3 text-sm">
                <span className="text-blue-400 mt-0.5">•</span>
                <span className="text-slate-300">
                  Set your current cash on hand above to see runway calculations.
                </span>
              </li>
            )}
            {txCount === 0 && (
              <li className="flex items-start gap-3 text-sm">
                <span className="text-blue-400 mt-0.5">•</span>
                <span className="text-slate-300">
                  Upload a bank statement CSV to get started with burn
                  calculations.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}


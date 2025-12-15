import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TransactionsList } from "./TransactionsList";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 100,
  });

  // Convert dates to strings for client component
  const serializedTxs = txs.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    description: t.description,
    amountPaise: t.amountPaise,
    direction: t.direction as "INFLOW" | "OUTFLOW",
    category: t.category,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-slate-500 mt-1">
            {txs.length === 0
              ? "No transactions yet"
              : `Showing latest ${txs.length} transactions`}
          </p>
        </div>
        <Link
          href="/upload"
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Statement
        </Link>
      </div>

      <TransactionsList initialTransactions={serializedTxs} />
    </div>
  );
}

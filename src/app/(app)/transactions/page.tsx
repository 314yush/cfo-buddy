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
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 mt-1">
            {txs.length === 0
              ? "No transactions yet"
              : `Showing latest ${txs.length} transactions`}
          </p>
        </div>
        <Link
          href="/upload"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
        >
          📄 Upload Statement
        </Link>
      </div>

      <TransactionsList initialTransactions={serializedTxs} />
    </div>
  );
}

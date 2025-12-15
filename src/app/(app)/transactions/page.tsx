import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/snapshot";
import { redirect } from "next/navigation";
import Link from "next/link";

type Transaction = {
  id: string;
  date: Date;
  description: string;
  amountPaise: number;
  direction: string;
  category: string;
};

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
        {txs.length === 0 && (
          <Link
            href="/upload"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            Upload CSV
          </Link>
        )}
      </div>

      {txs.length > 0 ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t: Transaction) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-white max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-white/10 text-slate-300">
                        {t.category}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-sm font-medium text-right whitespace-nowrap ${
                        t.direction === "INFLOW"
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      {t.direction === "INFLOW" ? "+" : "-"}
                      {formatINR(t.amountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No transactions</h3>
          <p className="text-slate-400 mt-1 mb-6">
            Upload a bank statement CSV to get started
          </p>
          <Link
            href="/upload"
            className="inline-flex px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            Upload CSV
          </Link>
        </div>
      )}
    </div>
  );
}


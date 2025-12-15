export type TxDirection = "INFLOW" | "OUTFLOW";

export type CashflowSnapshot = {
  from: Date;
  to: Date;
  outflowsPaise: number;
  inflowsPaise: number;
  burnMonthlyPaise: number;
  runwayMonths: number | null;
};

export function computeBurnAndRunway(args: {
  latestTxDate: Date;
  cashOnHandPaise: number | null;
  transactions: Array<{ direction: TxDirection; amountPaise: number }>;
}): CashflowSnapshot {
  const to = args.latestTxDate;
  const from = new Date(to);
  from.setDate(from.getDate() - 30);

  const outflowsPaise = args.transactions
    .filter((t) => t.direction === "OUTFLOW")
    .reduce((sum, t) => sum + t.amountPaise, 0);
  const inflowsPaise = args.transactions
    .filter((t) => t.direction === "INFLOW")
    .reduce((sum, t) => sum + t.amountPaise, 0);

  const burnMonthlyPaise = Math.max(0, outflowsPaise - inflowsPaise);
  const runwayMonths =
    args.cashOnHandPaise != null && burnMonthlyPaise > 0
      ? args.cashOnHandPaise / burnMonthlyPaise
      : null;

  return {
    from,
    to,
    outflowsPaise,
    inflowsPaise,
    burnMonthlyPaise,
    runwayMonths,
  };
}

export function formatINR(paise: number) {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}


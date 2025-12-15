import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Realistic Indian business transaction descriptions
const INFLOW_DESCRIPTIONS = [
  "NEFT-INVOICE PAYMENT-CLIENT ABC",
  "UPI-RAZORPAY-PROJECT MILESTONE",
  "IMPS-FREELANCE WORK-JOHN DOE",
  "NEFT-CONSULTING FEE-TECHCORP",
  "UPI-SWIGGY REFUND",
  "NEFT-SALARY CREDIT",
  "UPI-GPAY-CLIENT PAYMENT",
  "IMPS-BONUS PAYMENT",
  "NEFT-DIVIDEND CREDIT",
  "UPI-PAYTM-CASHBACK",
  "NEFT-TAX REFUND",
  "UPI-CONTRACT PAYMENT",
  "IMPS-COMMISSION-AFFILIATE",
  "NEFT-ADVANCE PAYMENT-PROJECT X",
  "UPI-DEPOSIT-FD MATURITY",
];

const OUTFLOW_DESCRIPTIONS = [
  "UPI-SWIGGY-LUNCH ORDER",
  "UPI-ZOMATO-DINNER",
  "NEFT-RENT PAYMENT",
  "UPI-AMAZON-OFFICE SUPPLIES",
  "IMPS-FREELANCER PAYMENT",
  "UPI-UBER-RIDE TO CLIENT",
  "NEFT-AWS HOSTING",
  "UPI-FLIPKART-EQUIPMENT",
  "NEFT-GST PAYMENT",
  "UPI-GOOGLE WORKSPACE",
  "IMPS-CONTRACTOR-DEV WORK",
  "UPI-ELECTRICITY BILL",
  "NEFT-INTERNET BILL-AIRTEL",
  "UPI-PHONE RECHARGE",
  "NEFT-INSURANCE PREMIUM",
  "UPI-OFFICE RENT-WEWORK",
  "IMPS-SALARY-EMPLOYEE",
  "UPI-SOFTWARE LICENSE",
  "NEFT-VENDOR PAYMENT",
  "UPI-PETROL-HP",
];

const CATEGORIES = [
  "Revenue",
  "Salary",
  "Software",
  "Office",
  "Travel",
  "Food",
  "Utilities",
  "Marketing",
  "Contractor",
  "Tax",
  "Uncategorized",
];

function computeHash(date: Date, description: string, amountPaise: number, direction: string): string {
  const input = `${date.toISOString().slice(0, 10)}|${description.toLowerCase().trim()}|${amountPaise}|${direction}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomAmount(min: number, max: number): number {
  // Return amount in paise
  return Math.round((Math.random() * (max - min) + min) * 100);
}

function getRandomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error in mock route:", authError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const count = Math.min(body.count || 20, 100); // Max 100 transactions

    // Get or create default bank account
    let bankAccount = await prisma.bankAccount.findFirst({
      where: { userId: user.id },
    });

    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: {
          userId: user.id,
          name: "Primary Account",
          currency: "INR",
        },
      });
    }

    const transactions: Array<{
      date: Date;
      description: string;
      amountPaise: number;
      direction: "INFLOW" | "OUTFLOW";
      category: string;
      dedupeHash: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const isInflow = Math.random() > 0.6; // 40% inflow, 60% outflow
      const direction = isInflow ? "INFLOW" : "OUTFLOW";
      const descriptions = isInflow ? INFLOW_DESCRIPTIONS : OUTFLOW_DESCRIPTIONS;
      
      const description = getRandomElement(descriptions);
      const date = getRandomDate(90); // Last 90 days
      
      // Vary amounts based on type
      let amountPaise: number;
      if (isInflow) {
        // Inflows: ₹500 to ₹2,00,000
        amountPaise = getRandomAmount(500, 200000);
      } else {
        // Outflows: ₹50 to ₹50,000
        amountPaise = getRandomAmount(50, 50000);
      }
      
      const category = isInflow 
        ? (description.includes("INVOICE") || description.includes("CLIENT") ? "Revenue" : getRandomElement(["Revenue", "Salary", "Other Income"]))
        : getRandomElement(CATEGORIES.filter(c => c !== "Revenue" && c !== "Salary"));

      const hash = computeHash(date, description, amountPaise, direction);

      transactions.push({
        date,
        description,
        amountPaise,
        direction,
        category,
        dedupeHash: hash,
      });
    }

    // Insert transactions, skipping duplicates
    let imported = 0;
    let skipped = 0;

    for (const t of transactions) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            bankAccountId: bankAccount.id,
            date: t.date,
            description: t.description,
            amountPaise: t.amountPaise,
            direction: t.direction,
            category: t.category,
            dedupeHash: t.dedupeHash,
          },
        });
        imported++;
      } catch (e: unknown) {
        if (
          e &&
          typeof e === "object" &&
          "code" in e &&
          (e as { code: string }).code === "P2002"
        ) {
          skipped++;
        } else {
          throw e;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: count,
    });
  } catch (error) {
    console.error("Mock data error:", error);
    return NextResponse.json(
      { error: "Failed to generate mock data" },
      { status: 500 }
    );
  }
}


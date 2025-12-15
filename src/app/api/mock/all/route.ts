import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ============================================
// MOCK DATA GENERATORS
// ============================================

const INFLOW_DESCRIPTIONS = [
  "NEFT-INVOICE PAYMENT-CLIENT ABC",
  "UPI-RAZORPAY-PROJECT MILESTONE",
  "IMPS-FREELANCE WORK-JOHN DOE",
  "NEFT-CONSULTING FEE-TECHCORP",
  "UPI-SWIGGY REFUND",
  "NEFT-SALARY CREDIT",
  "UPI-GPAY-CLIENT PAYMENT",
  "IMPS-BONUS PAYMENT",
  "NEFT-TAX REFUND",
  "UPI-CONTRACT PAYMENT",
  "IMPS-COMMISSION-AFFILIATE",
  "NEFT-ADVANCE PAYMENT-PROJECT X",
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
];

const CLIENT_NAMES = [
  "Acme Corp",
  "TechStart Inc",
  "GlobalMedia",
  "DataFlow Systems",
  "CloudNine Solutions",
  "Innovate Labs",
  "BlueChip Enterprises",
  "NextGen Digital",
];

const EMPLOYEE_NAMES = [
  "Rahul Kumar",
  "Priya Sharma",
  "Amit Patel",
  "Sneha Reddy",
  "Vikram Singh",
  "Anjali Gupta",
];

const CONTRACTOR_NAMES = [
  "Deepak (Designer)",
  "Neha (Content Writer)",
  "Suresh (DevOps)",
  "Kavita (Marketing)",
];

const RECURRING_EXPENSES = [
  { name: "AWS Hosting", amount: 15000, frequency: "MONTHLY", category: "Software" },
  { name: "Google Workspace", amount: 2500, frequency: "MONTHLY", category: "Software" },
  { name: "Slack Business", amount: 1500, frequency: "MONTHLY", category: "Software" },
  { name: "Figma Pro", amount: 3000, frequency: "MONTHLY", category: "Software" },
  { name: "Office Rent", amount: 35000, frequency: "MONTHLY", category: "Office" },
  { name: "Internet (Airtel)", amount: 2000, frequency: "MONTHLY", category: "Utilities" },
  { name: "Insurance Premium", amount: 45000, frequency: "QUARTERLY", category: "Other" },
  { name: "Domain Renewal", amount: 1500, frequency: "YEARLY", category: "Software" },
];

// Budget categories that match transaction categories
const BUDGET_ALLOCATIONS = [
  { category: "Employees", percent: 35, color: "#3b82f6" },
  { category: "Software", percent: 15, color: "#10b981" },
  { category: "Marketing", percent: 12, color: "#8b5cf6" },
  { category: "Office", percent: 10, color: "#f59e0b" },
  { category: "Contractor", percent: 10, color: "#ec4899" },
  { category: "Food", percent: 8, color: "#14b8a6" },
  { category: "Utilities", percent: 5, color: "#6366f1" },
  { category: "Travel", percent: 3, color: "#ef4444" },
  { category: "Other", percent: 2, color: "#64748b" },
];

function computeHash(date: Date, description: string, amountPaise: number, direction: string): string {
  const input = `${date.toISOString().slice(0, 10)}|${description.toLowerCase().trim()}|${amountPaise}|${direction}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100);
}

function getRandomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

function getFutureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  return date;
}

export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const results = {
      transactions: 0,
      cashSnapshots: 0,
      people: 0,
      recurringExpenses: 0,
      invoices: 0,
      taxReminders: 0,
      goals: 0,
      budget: 0,
    };

    // ============================================
    // 1. GENERATE TRANSACTIONS (last 90 days)
    // ============================================
    for (let i = 0; i < 50; i++) {
      const isInflow = Math.random() > 0.6;
      const direction = isInflow ? "INFLOW" : "OUTFLOW";
      const descriptions = isInflow ? INFLOW_DESCRIPTIONS : OUTFLOW_DESCRIPTIONS;
      const description = getRandomElement(descriptions);
      const date = getRandomDate(90);
      
      let amountPaise: number;
      if (isInflow) {
        amountPaise = getRandomAmount(5000, 150000);
      } else {
        amountPaise = getRandomAmount(100, 40000);
      }
      
      const category = isInflow 
        ? "Revenue"
        : getRandomElement(["Software", "Office", "Travel", "Food", "Utilities", "Marketing", "Contractor", "Employees"]);

      const hash = computeHash(date, description, amountPaise, direction);

      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            bankAccountId: bankAccount.id,
            date,
            description,
            amountPaise,
            direction,
            category,
            dedupeHash: hash,
          },
        });
        results.transactions++;
      } catch (e: any) {
        if (e?.code !== "P2002") throw e; // Ignore duplicates
      }
    }

    // ============================================
    // 2. GENERATE CASH SNAPSHOTS (monthly for last 6 months)
    // ============================================
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      
      // Decreasing cash over time (realistic runway scenario)
      const baseCash = 800000 - (i * 50000) + (Math.random() * 100000 - 50000);
      
      await prisma.cashSnapshot.create({
        data: {
          userId: user.id,
          asOfDate: date,
          cashOnHandPaise: Math.round(baseCash * 100),
          source: "MOCK",
        },
      });
      results.cashSnapshots++;
    }

    // ============================================
    // 3. GENERATE PEOPLE (employees + contractors)
    // ============================================
    // Add 2 employees
    for (let i = 0; i < 2; i++) {
      const name = EMPLOYEE_NAMES[i];
      const existing = await prisma.person.findFirst({
        where: { userId: user.id, name },
      });
      
      if (!existing) {
        await prisma.person.create({
          data: {
            userId: user.id,
            name,
            type: "EMPLOYEE",
            monthlyCostPaise: getRandomAmount(40000, 80000),
            startDate: getRandomDate(365),
          },
        });
        results.people++;
      }
    }
    
    // Add 2 contractors
    for (let i = 0; i < 2; i++) {
      const name = CONTRACTOR_NAMES[i];
      const existing = await prisma.person.findFirst({
        where: { userId: user.id, name },
      });
      
      if (!existing) {
        await prisma.person.create({
          data: {
            userId: user.id,
            name,
            type: "CONTRACTOR",
            monthlyCostPaise: getRandomAmount(20000, 50000),
            startDate: getRandomDate(180),
          },
        });
        results.people++;
      }
    }

    // ============================================
    // 4. GENERATE RECURRING EXPENSES
    // ============================================
    for (const expense of RECURRING_EXPENSES) {
      const existing = await prisma.recurringExpense.findFirst({
        where: { userId: user.id, name: expense.name },
      });
      
      if (!existing) {
        await prisma.recurringExpense.create({
          data: {
            userId: user.id,
            name: expense.name,
            amountPaise: expense.amount * 100,
            frequency: expense.frequency as any,
            category: expense.category,
            nextDueDate: getFutureDate(30),
            isActive: true,
          },
        });
        results.recurringExpenses++;
      }
    }

    // ============================================
    // 5. GENERATE INVOICES
    // ============================================
    const invoiceStatuses = ["PAID", "PAID", "PAID", "SENT", "SENT", "OVERDUE"];
    
    for (let i = 0; i < 6; i++) {
      const invoiceNumber = `INV-2024-${String(100 + i).padStart(3, "0")}`;
      const existing = await prisma.invoice.findFirst({
        where: { userId: user.id, invoiceNumber },
      });
      
      if (!existing) {
        const status = invoiceStatuses[i];
        const dueDate = status === "OVERDUE" 
          ? getRandomDate(30) 
          : status === "PAID" 
            ? getRandomDate(60) 
            : getFutureDate(30);
        
        await prisma.invoice.create({
          data: {
            userId: user.id,
            invoiceNumber,
            clientName: getRandomElement(CLIENT_NAMES),
            amountPaise: getRandomAmount(25000, 200000),
            dueDate,
            status: status as any,
            paidAt: status === "PAID" ? getRandomDate(30) : null,
          },
        });
        results.invoices++;
      }
    }

    // ============================================
    // 6. GENERATE TAX REMINDERS
    // ============================================
    const taxReminders = [
      { type: "GST", title: "GST Filing - December", dueDate: new Date(2025, 0, 11) },
      { type: "ADVANCE_TAX", title: "Advance Tax Q4", dueDate: new Date(2025, 2, 15) },
      { type: "TDS", title: "TDS Return Q3", dueDate: new Date(2025, 0, 31) },
      { type: "ITR", title: "Income Tax Return FY 2024-25", dueDate: new Date(2025, 6, 31) },
    ];
    
    for (const reminder of taxReminders) {
      const existing = await prisma.taxReminder.findFirst({
        where: { userId: user.id, title: reminder.title },
      });
      
      if (!existing) {
        await prisma.taxReminder.create({
          data: {
            userId: user.id,
            taxType: reminder.type as any,
            title: reminder.title,
            dueDate: reminder.dueDate,
            amountPaise: getRandomAmount(10000, 100000),
            isCompleted: reminder.dueDate < new Date(),
          },
        });
        results.taxReminders++;
      }
    }

    // ============================================
    // 7. GENERATE FINANCIAL GOALS
    // ============================================
    const goals = [
      { title: "Emergency Fund (6 months)", target: 600000, current: 350000 },
      { title: "New Laptop", target: 150000, current: 80000 },
      { title: "Office Deposit", target: 200000, current: 50000 },
    ];
    
    for (const goal of goals) {
      const existing = await prisma.financialGoal.findFirst({
        where: { userId: user.id, title: goal.title },
      });
      
      if (!existing) {
        await prisma.financialGoal.create({
          data: {
            userId: user.id,
            title: goal.title,
            targetPaise: goal.target * 100,
            currentPaise: goal.current * 100,
            deadline: getFutureDate(180),
          },
        });
        results.goals++;
      }
    }

    // ============================================
    // 8. GENERATE BUDGET ALLOCATIONS
    // ============================================
    for (const allocation of BUDGET_ALLOCATIONS) {
      const existing = await prisma.budgetAllocation.findUnique({
        where: {
          userId_category: {
            userId: user.id,
            category: allocation.category,
          },
        },
      });

      if (!existing) {
        await prisma.budgetAllocation.create({
          data: {
            userId: user.id,
            category: allocation.category,
            percentOfBudget: allocation.percent,
            color: allocation.color,
          },
        });
        results.budget++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Mock data generated successfully!",
      results,
    });
  } catch (error) {
    console.error("Mock data error:", error);
    return NextResponse.json(
      { error: "Failed to generate mock data" },
      { status: 500 }
    );
  }
}

// Clear all mock data
export async function DELETE() {
  const supabase = await createClientWithRefresh();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await Promise.all([
      prisma.transaction.deleteMany({ where: { userId: user.id } }),
      prisma.cashSnapshot.deleteMany({ where: { userId: user.id } }),
      prisma.person.deleteMany({ where: { userId: user.id } }),
      prisma.recurringExpense.deleteMany({ where: { userId: user.id } }),
      prisma.invoice.deleteMany({ where: { userId: user.id } }),
      prisma.taxReminder.deleteMany({ where: { userId: user.id } }),
      prisma.financialGoal.deleteMany({ where: { userId: user.id } }),
      prisma.payment.deleteMany({ where: { userId: user.id } }),
      prisma.budgetAllocation.deleteMany({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        transactions: results[0].count,
        cashSnapshots: results[1].count,
        people: results[2].count,
        recurringExpenses: results[3].count,
        invoices: results[4].count,
        taxReminders: results[5].count,
        goals: results[6].count,
        payments: results[7].count,
        budgetAllocations: results[8].count,
      },
    });
  } catch (error) {
    console.error("Clear data error:", error);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";
import crypto from "crypto";

// Column name mappings (lowercase)
const DATE_COLS = ["date", "txn date", "transaction date", "value date", "posting date"];
const DESC_COLS = ["description", "particulars", "narration", "remarks", "transaction details"];
const AMOUNT_COLS = ["amount", "transaction amount"];
const DEBIT_COLS = ["debit", "withdrawal", "debit amount", "dr"];
const CREDIT_COLS = ["credit", "deposit", "credit amount", "cr"];
const TYPE_COLS = ["type", "dr/cr", "transaction type"];

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
}

function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const c of candidates) {
    const idx = normalized.indexOf(c);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }
  
  // Try YYYY-MM-DD
  const ymdMatch = val.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  
  // Fallback to Date.parse
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) return new Date(parsed);
  
  return null;
}

function parseAmount(val: string): number {
  if (!val || val.trim() === "" || val === "-") return 0;
  // Remove commas and currency symbols
  const clean = val.replace(/[₹,$,\s]/g, "").replace(/,/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(Math.abs(num) * 100); // Convert to paise
}

function computeHash(date: Date, description: string, amountPaise: number, direction: string): string {
  const input = `${date.toISOString().slice(0, 10)}|${description.toLowerCase().trim()}|${amountPaise}|${direction}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const csvText = await file.text();

  // Upload to Supabase Storage
  const admin = createAdminClient();
  const storagePath = `${user.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await admin.storage
    .from("bank-statements")
    .upload(storagePath, csvText, {
      contentType: "text/csv",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to store file" },
      { status: 500 }
    );
  }

  // Create upload record
  const upload = await prisma.upload.create({
    data: {
      userId: user.id,
      bankAccountId: bankAccount.id,
      originalFilename: file.name,
      storageBucket: "bank-statements",
      storagePath,
      status: "PROCESSING",
    },
  });

  // Parse CSV
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (e) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "Failed to parse CSV" },
    });
    return NextResponse.json({ error: "Failed to parse CSV" }, { status: 400 });
  }

  if (records.length === 0) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "CSV is empty" },
    });
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  // Detect columns
  const headers = Object.keys(records[0]);
  const dateCol = findColumn(headers, DATE_COLS);
  const descCol = findColumn(headers, DESC_COLS);
  const amountCol = findColumn(headers, AMOUNT_COLS);
  const debitCol = findColumn(headers, DEBIT_COLS);
  const creditCol = findColumn(headers, CREDIT_COLS);
  const typeCol = findColumn(headers, TYPE_COLS);

  if (!dateCol) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "No date column found" },
    });
    return NextResponse.json(
      { error: "No date column found. Expected: date, txn date, transaction date" },
      { status: 400 }
    );
  }

  if (!descCol) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "No description column found" },
    });
    return NextResponse.json(
      { error: "No description column found. Expected: description, particulars, narration" },
      { status: 400 }
    );
  }

  if (!amountCol && !debitCol && !creditCol) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "No amount column found" },
    });
    return NextResponse.json(
      { error: "No amount column found. Expected: amount, debit, credit" },
      { status: 400 }
    );
  }

  // Parse transactions
  const txs: Array<{
    date: Date;
    description: string;
    amountPaise: number;
    direction: "INFLOW" | "OUTFLOW";
    rawRow: Record<string, string>;
  }> = [];

  for (const row of records) {
    const date = parseDate(row[dateCol]);
    if (!date) continue; // Skip rows without valid date

    const description = (row[descCol] || "").trim();
    if (!description) continue;

    let amountPaise = 0;
    let direction: "INFLOW" | "OUTFLOW" = "OUTFLOW";

    if (debitCol || creditCol) {
      // Separate debit/credit columns
      const debit = parseAmount(row[debitCol || ""] || "");
      const credit = parseAmount(row[creditCol || ""] || "");

      if (credit > 0) {
        amountPaise = credit;
        direction = "INFLOW";
      } else if (debit > 0) {
        amountPaise = debit;
        direction = "OUTFLOW";
      } else {
        continue; // Skip zero transactions
      }
    } else if (amountCol) {
      // Single amount column - use type or sign
      const rawAmount = row[amountCol] || "";
      amountPaise = parseAmount(rawAmount);

      if (amountPaise === 0) continue;

      // Determine direction from type column or sign
      const typeVal = typeCol ? (row[typeCol] || "").toLowerCase() : "";
      if (typeVal.includes("cr") || typeVal.includes("credit")) {
        direction = "INFLOW";
      } else if (typeVal.includes("dr") || typeVal.includes("debit")) {
        direction = "OUTFLOW";
      } else if (rawAmount.includes("-")) {
        direction = "OUTFLOW";
      } else {
        // Positive = inflow by default
        direction = "INFLOW";
      }
    }

    txs.push({
      date,
      description,
      amountPaise,
      direction,
      rawRow: row,
    });
  }

  if (txs.length === 0) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "No valid transactions found" },
    });
    return NextResponse.json(
      { error: "No valid transactions found in CSV" },
      { status: 400 }
    );
  }

  // Insert transactions (skip duplicates)
  let imported = 0;
  let skipped = 0;

  for (const t of txs) {
    const hash = computeHash(t.date, t.description, t.amountPaise, t.direction);

    try {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          bankAccountId: bankAccount.id,
          uploadId: upload.id,
          date: t.date,
          description: t.description,
          amountPaise: t.amountPaise,
          direction: t.direction,
          category: "Uncategorized",
          dedupeHash: hash,
          rawRowJson: JSON.parse(JSON.stringify(t.rawRow)),
        },
      });
      imported++;
    } catch (e: unknown) {
      // Unique constraint violation = duplicate
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

  await prisma.upload.update({
    where: { id: upload.id },
    data: { status: "IMPORTED" },
  });

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    total: txs.length,
  });
}


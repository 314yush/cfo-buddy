import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";
import crypto from "crypto";
import Groq from "groq-sdk";

// Column name mappings (lowercase)
const DATE_COLS = [
  "date",
  "txn date",
  "transaction date",
  "value date",
  "posting date",
  "trans date",
];
const DESC_COLS = [
  "description",
  "particulars",
  "narration",
  "remarks",
  "transaction details",
  "details",
];
const AMOUNT_COLS = ["amount", "transaction amount", "txn amount"];
const DEBIT_COLS = ["debit", "withdrawal", "debit amount", "dr", "withdrawals"];
const CREDIT_COLS = ["credit", "deposit", "credit amount", "cr", "deposits"];
const TYPE_COLS = ["type", "dr/cr", "transaction type", "cr/dr"];

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "");
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

  // Clean the value
  val = val.trim();

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

  // Try DD MMM YYYY (e.g., "15 Dec 2024")
  const dMonthY = val.match(
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})$/i
  );
  if (dMonthY) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const [, d, m, y] = dMonthY;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, months[m.toLowerCase().slice(0, 3)], parseInt(d));
  }

  // Fallback to Date.parse
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) return new Date(parsed);

  return null;
}

function parseAmount(val: string): number {
  if (!val || val.trim() === "" || val === "-") return 0;
  // Remove commas, currency symbols, and spaces
  const clean = val.replace(/[₹,$,\s]/g, "").replace(/,/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(Math.abs(num) * 100); // Convert to paise
}

function computeHash(
  date: Date,
  description: string,
  amountPaise: number,
  direction: string
): string {
  const input = `${date.toISOString().slice(0, 10)}|${description
    .toLowerCase()
    .trim()}|${amountPaise}|${direction}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

type ParsedTx = {
  date: Date;
  description: string;
  amountPaise: number;
  direction: "INFLOW" | "OUTFLOW";
  rawRow: Record<string, string>;
};

// Parse CSV content
function parseCSV(csvText: string): ParsedTx[] {
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch {
    throw new Error("Failed to parse CSV format");
  }

  if (records.length === 0) {
    throw new Error("CSV is empty");
  }

  const headers = Object.keys(records[0]);
  const dateCol = findColumn(headers, DATE_COLS);
  const descCol = findColumn(headers, DESC_COLS);
  const amountCol = findColumn(headers, AMOUNT_COLS);
  const debitCol = findColumn(headers, DEBIT_COLS);
  const creditCol = findColumn(headers, CREDIT_COLS);
  const typeCol = findColumn(headers, TYPE_COLS);

  if (!dateCol) {
    throw new Error(
      "No date column found. Expected: date, txn date, transaction date"
    );
  }

  if (!descCol) {
    throw new Error(
      "No description column found. Expected: description, particulars, narration"
    );
  }

  if (!amountCol && !debitCol && !creditCol) {
    throw new Error(
      "No amount column found. Expected: amount, debit, credit"
    );
  }

  const txs: ParsedTx[] = [];

  for (const row of records) {
    const date = parseDate(row[dateCol]);
    if (!date) continue;

    const description = (row[descCol] || "").trim();
    if (!description) continue;

    let amountPaise = 0;
    let direction: "INFLOW" | "OUTFLOW" = "OUTFLOW";

    if (debitCol || creditCol) {
      const debit = parseAmount(row[debitCol || ""] || "");
      const credit = parseAmount(row[creditCol || ""] || "");

      if (credit > 0) {
        amountPaise = credit;
        direction = "INFLOW";
      } else if (debit > 0) {
        amountPaise = debit;
        direction = "OUTFLOW";
      } else {
        continue;
      }
    } else if (amountCol) {
      const rawAmount = row[amountCol] || "";
      amountPaise = parseAmount(rawAmount);

      if (amountPaise === 0) continue;

      const typeVal = typeCol ? (row[typeCol] || "").toLowerCase() : "";
      if (typeVal.includes("cr") || typeVal.includes("credit")) {
        direction = "INFLOW";
      } else if (typeVal.includes("dr") || typeVal.includes("debit")) {
        direction = "OUTFLOW";
      } else if (rawAmount.includes("-")) {
        direction = "OUTFLOW";
      } else {
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

  return txs;
}

// ============================================
// LOCAL PDF PARSING (using pdf-parse)
// ============================================

// Extract text from PDF using pdfjs-dist (no worker)
async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  // Use dynamic import for pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  // Disable worker to avoid serverless issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  
  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  } catch (err) {
    console.error("PDF text extraction error:", err);
    throw new Error("Failed to extract text from PDF");
  }
}

// Parse PDF locally using pattern matching
async function parsePDFLocally(pdfBuffer: Buffer): Promise<ParsedTx[]> {
  const text = await extractPdfText(pdfBuffer);
  const txs: ParsedTx[] = [];

  // Split into lines and clean up
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Join lines that might be split (like multi-line descriptions)
  const joinedText = lines.join(" ");

  // ============================================
  // PATTERN: ICICI Bank Format
  // DATE | MODE | PARTICULARS | DEPOSITS | WITHDRAWALS | BALANCE
  // Example: 15-09-2025 ACH/NSEClearingLimited/... 15,000.00 15,84,245.69
  // ============================================

  // Pattern to match transaction lines
  // Date (DD-MM-YYYY) followed by description and amounts
  const txPattern =
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(?:NET BANKING\s+)?([A-Z]{2,}[\/\-][^\d]+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})?/gi;

  let match;
  while ((match = txPattern.exec(joinedText)) !== null) {
    const [, dateStr, description, amount1, amount2] = match;

    const date = parseDate(dateStr);
    if (!date) continue;

    // Clean description
    let desc = description.trim();
    // Remove trailing slashes and clean up
    desc = desc.replace(/\/+$/, "").trim();
    if (!desc || desc.length < 3) continue;

    // Determine if this is a deposit or withdrawal
    // In ICICI format: if there are 2 amounts, first might be withdrawal, second balance
    // Or first might be deposit, second balance
    // We need to look at the description to determine direction

    const amt1 = parseAmount(amount1);
    const amt2 = amount2 ? parseAmount(amount2) : 0;

    if (amt1 === 0) continue;

    // Determine direction based on description keywords
    const descLower = desc.toLowerCase();
    let direction: "INFLOW" | "OUTFLOW" = "OUTFLOW";
    let amountPaise = amt1;

    // INFLOW indicators
    if (
      descLower.includes("neft-") && descLower.includes("send from") ||
      descLower.includes("salary") ||
      descLower.includes("credit") ||
      descLower.includes("refund") ||
      descLower.includes("cashback") ||
      descLower.includes("reversal") ||
      descLower.includes("interest")
    ) {
      direction = "INFLOW";
    }
    // OUTFLOW indicators (most UPI, ACH, BIL are outflows)
    else if (
      descLower.startsWith("upi/") ||
      descLower.startsWith("ach/") ||
      descLower.startsWith("bil/") ||
      descLower.includes("withdrawal") ||
      descLower.includes("payment") ||
      descLower.includes("transfer")
    ) {
      direction = "OUTFLOW";
    }

    txs.push({
      date,
      description: desc.slice(0, 200), // Limit description length
      amountPaise,
      direction,
      rawRow: { original: match[0] },
    });
  }

  // ============================================
  // PATTERN: Alternative format with separate columns
  // Try to find "DEPOSITS" and "WITHDRAWALS" sections
  // ============================================

  if (txs.length === 0) {
    // Try simpler pattern: date followed by any text and amounts
    const simplePattern =
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/g;

    while ((match = simplePattern.exec(joinedText)) !== null) {
      const [, dateStr, descRaw, amountStr] = match;

      const date = parseDate(dateStr);
      if (!date) continue;

      // Skip if description looks like a balance or header
      if (
        descRaw.includes("B/F") ||
        descRaw.includes("BALANCE") ||
        descRaw.includes("TOTAL")
      ) {
        continue;
      }

      const desc = descRaw.trim().slice(0, 200);
      if (!desc || desc.length < 3) continue;

      const amountPaise = parseAmount(amountStr);
      if (amountPaise === 0) continue;

      // Determine direction
      const descLower = desc.toLowerCase();
      let direction: "INFLOW" | "OUTFLOW" = "OUTFLOW";

      if (
        descLower.includes("salary") ||
        descLower.includes("credit") ||
        descLower.includes("deposit") ||
        descLower.includes("refund") ||
        (descLower.includes("neft") && descLower.includes("from"))
      ) {
        direction = "INFLOW";
      }

      txs.push({
        date,
        description: desc,
        amountPaise,
        direction,
        rawRow: { original: match[0] },
      });
    }
  }

  return txs;
}

// ============================================
// GROQ AI PARSING (free, fast)
// ============================================

// Extract text from PDF for Groq processing using pdf2json
async function extractPdfTextForGroq(pdfBuffer: Buffer): Promise<string> {
  const PDFParser = (await import("pdf2json")).default;
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on("pdfParser_dataError", (errData: { parserError: Error }) => {
      reject(errData.parserError);
    });
    
    pdfParser.on("pdfParser_dataReady", (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
      // Extract text from all pages
      let fullText = "";
      for (const page of pdfData.Pages) {
        for (const textItem of page.Texts) {
          for (const r of textItem.R) {
            // Decode URI-encoded text
            fullText += decodeURIComponent(r.T) + " ";
          }
        }
        fullText += "\n";
      }
      resolve(fullText);
    });
    
    // Parse the PDF buffer
    pdfParser.parseBuffer(pdfBuffer);
  });
}

// Parse PDF using Groq AI (free & fast)
async function parsePDFWithGroq(pdfBuffer: Buffer): Promise<ParsedTx[]> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PDF parsing requires Groq API key. Please add GROQ_API_KEY to your .env file. " +
      "Get a free key at: https://console.groq.com/keys"
    );
  }

  // First extract text from PDF
  console.log("Extracting text from PDF...");
  let pdfText: string;
  try {
    pdfText = await extractPdfTextForGroq(pdfBuffer);
  } catch (err) {
    console.error("PDF text extraction failed:", err);
    throw new Error(
      "Could not extract text from PDF. The file may be scanned/image-based. " +
      "Please download CSV from your bank instead."
    );
  }

  if (!pdfText || pdfText.trim().length < 100) {
    throw new Error(
      "PDF appears to be empty or image-based. Please download CSV from your bank instead."
    );
  }

  console.log(`Extracted ${pdfText.length} characters from PDF`);

  // Initialize Groq client
  const groq = new Groq({ apiKey });

  // Split text into chunks if too large (max ~4000 chars per chunk to stay under token limits)
  const maxCharsPerChunk = 4000;
  const textChunks: string[] = [];
  
  if (pdfText.length > maxCharsPerChunk) {
    // Split by newlines to keep transactions together
    const lines = pdfText.split('\n');
    let currentChunk = "";
    
    for (const line of lines) {
      if (currentChunk.length + line.length > maxCharsPerChunk) {
        if (currentChunk) textChunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    if (currentChunk) textChunks.push(currentChunk);
  } else {
    textChunks.push(pdfText);
  }

  console.log(`Split into ${textChunks.length} chunks for processing`);

  // Process each chunk and collect transactions
  const allTxs: ParsedTx[] = [];

  for (let chunkIdx = 0; chunkIdx < textChunks.length; chunkIdx++) {
    const chunk = textChunks[chunkIdx];
    console.log(`Processing chunk ${chunkIdx + 1}/${textChunks.length} (${chunk.length} chars)...`);

    const prompt = `You are a bank statement parser. Convert this bank statement text to CSV format.

BANK STATEMENT TEXT:
${chunk}

OUTPUT FORMAT:
Output a CSV with these exact columns: date,description,debit,credit

Rules:
- date: Transaction date (keep original format like DD-MM-YYYY or DD/MM/YYYY)
- description: Transaction narration/particulars (remove commas, replace with spaces)
- debit: Amount withdrawn/debited (leave empty if credit)
- credit: Amount deposited/credited (leave empty if debit)
- Skip any lines that are not transactions (headers, footers, summaries)

Output ONLY the CSV data. No markdown, no code blocks, no explanations.
Start with header row, then transactions found in this text.

Example:
date,description,debit,credit
15-12-2024,UPI-SWIGGY-123456,450.00,
14-12-2024,SALARY DECEMBER,,50000.00`;

    // Retry logic for each chunk
    const maxRetries = 3;
    let lastError: Error | null = null;
    let chunkSuccess = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  Groq API attempt ${attempt}/${maxRetries}...`);

        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
          temperature: 0.1,
          max_tokens: 4000,
        });

        const text = completion.choices[0]?.message?.content || "";

        // Clean up response
        let csvText = text.trim();
        if (csvText.startsWith("```csv")) {
          csvText = csvText.slice(6);
        } else if (csvText.startsWith("```")) {
          csvText = csvText.slice(3);
        }
        if (csvText.endsWith("```")) {
          csvText = csvText.slice(0, -3);
        }
        csvText = csvText.trim();

        console.log(`  Chunk ${chunkIdx + 1} CSV (first 200 chars):`, csvText.slice(0, 200));

        // Parse using existing CSV parser
        const chunkTxs = parseCSV(csvText);
        console.log(`  Found ${chunkTxs.length} transactions in chunk ${chunkIdx + 1}`);
        
        allTxs.push(...chunkTxs);
        chunkSuccess = true;
        break; // Success, move to next chunk
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`  Chunk ${chunkIdx + 1} attempt ${attempt} failed:`, errMsg);

        // Check if retryable (rate limit, server error)
        if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("rate") || errMsg.includes("413")) {
          lastError = err instanceof Error ? err : new Error(errMsg);
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`  Waiting ${waitTime / 1000}s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
        } else {
          // Non-retryable error, skip this chunk
          console.log(`  Skipping chunk ${chunkIdx + 1} due to non-retryable error`);
          break;
        }
      }
    }

    // Add delay between chunks to avoid rate limits
    if (chunkIdx < textChunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (allTxs.length === 0) {
    throw new Error(
      "No transactions found in PDF. The document may not be a bank statement."
    );
  }

  console.log(`Successfully parsed ${allTxs.length} total transactions from PDF`);
  return allTxs;
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
  const csvText = formData.get("csvText") as string | null; // Pre-processed CSV from client-side PDF conversion
  const originalFilename = formData.get("originalFilename") as string | null;

  // Handle two modes:
  // 1. csvText provided: PDF was processed client-side, csvText contains the result
  // 2. file provided: Either CSV file or PDF to be processed server-side
  
  const isClientProcessedPdf = csvText && originalFilename;
  
  if (!file && !isClientProcessedPdf) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let fileName: string;
  let isPdf: boolean;
  let isCsv: boolean;
  let fileContent: Buffer | string;

  if (isClientProcessedPdf) {
    // Client already processed the PDF and sent CSV text
    fileName = originalFilename.toLowerCase();
    isPdf = false; // Treat as CSV since it's already converted
    isCsv = true;
    fileContent = csvText;
    console.log("Received client-processed PDF as CSV");
  } else if (file) {
    fileName = file.name.toLowerCase();
    isPdf = fileName.endsWith(".pdf");
    isCsv = fileName.endsWith(".csv");
    
    if (!isPdf && !isCsv) {
      return NextResponse.json(
        { error: "Please upload a CSV or PDF file" },
        { status: 400 }
      );
    }
    
    fileContent = isPdf
      ? Buffer.from(await file.arrayBuffer())
      : await file.text();
  } else {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const admin = createAdminClient();
  const storagePath = `${user.id}/${Date.now()}-${originalFilename || file?.name || "upload.csv"}`;

  const { error: uploadError } = await admin.storage
    .from("bank-statements")
    .upload(storagePath, fileContent, {
      contentType: isPdf ? "application/pdf" : "text/csv",
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
      originalFilename: originalFilename || file?.name || "upload.csv",
      storageBucket: "bank-statements",
      storagePath,
      status: "PROCESSING",
    },
  });

  // Parse the file
  let txs: ParsedTx[];
  try {
    if (isPdf && !isClientProcessedPdf) {
      // Server-side PDF processing (fallback if client-side fails)
      console.log("Parsing PDF with Groq AI (server-side)...");
      
      if (!process.env.GROQ_API_KEY) {
        throw new Error(
          "PDF parsing requires Groq API key. Please add GROQ_API_KEY to your .env file. " +
          "Get a free key at: https://console.groq.com/keys"
        );
      }
      
      txs = await parsePDFWithGroq(fileContent as Buffer);
      console.log(`Groq extracted ${txs.length} transactions`);

      if (txs.length === 0) {
        throw new Error(
          "Could not extract transactions from PDF. Try downloading CSV from your bank instead."
        );
      }
    } else {
      // Parse CSV (either direct CSV upload or client-processed PDF)
      console.log("Parsing CSV...");
      txs = parseCSV(fileContent as string);
    }
  } catch (e: unknown) {
    const errMsg =
      e instanceof Error ? e.message : "Failed to parse file";
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: errMsg },
    });
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  if (txs.length === 0) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", error: "No valid transactions found" },
    });
    return NextResponse.json(
      { error: "No valid transactions found" },
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
    format: isPdf ? "pdf" : "csv",
  });
}


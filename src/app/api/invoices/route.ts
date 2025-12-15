import { NextResponse } from "next/server";
import { createClientWithRefresh } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET all invoices
export async function GET() {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(invoices);
}

// CREATE new invoice
export async function POST(request: Request) {
  const supabase = await createClientWithRefresh();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { invoiceNumber, clientName, clientEmail, amountPaise, dueDate, notes } = body;

    if (!invoiceNumber || !clientName || !amountPaise || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields: invoiceNumber, clientName, amountPaise, dueDate" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber,
        clientName,
        clientEmail: clientEmail || null,
        amountPaise: Math.round(amountPaise),
        dueDate: new Date(dueDate),
        status: "SENT",
        notes: notes || null,
      },
    });

    return NextResponse.json(invoice);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Invoice number already exists" },
        { status: 409 }
      );
    }
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}


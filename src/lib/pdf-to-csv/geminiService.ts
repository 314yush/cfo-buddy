import { GoogleGenAI } from "@google/genai";

// Initialize with environment variable (client-side safe with NEXT_PUBLIC_ prefix)
const getAI = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY environment variable. Get one at aistudio.google.com/app/apikey");
  }
  return new GoogleGenAI({ apiKey });
};

// Sleep helper for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Models to try in order (fallback chain)
const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

export const convertPdfToCsv = async (base64Data: string): Promise<string> => {
  const ai = getAI();
  
  const prompt = `You are a bank statement parser. Extract ALL transactions from this PDF.
            
Convert the data into CSV format with these exact columns:
date,description,debit,credit

Rules:
1. Output ONLY the CSV data - no markdown, no code blocks, no explanations
2. date: Keep original format (DD-MM-YYYY or DD/MM/YYYY)
3. description: Transaction narration (remove commas, use spaces instead)
4. debit: Amount withdrawn/debited (empty if credit)
5. credit: Amount deposited/credited (empty if debit)
6. Include header row, then all transactions
7. Skip non-transaction rows (headers, footers, summaries, balances)

Example output:
date,description,debit,credit
15-12-2024,UPI-SWIGGY-123456,450.00,
14-12-2024,SALARY DECEMBER,,50000.00
13-12-2024,NEFT-RENT PAYMENT,25000.00,

Also extract and include at the very end (after a blank line) these summary lines if found:
OPENING_BALANCE:amount
CLOSING_BALANCE:amount
TOTAL_DEPOSITS:amount
TOTAL_WITHDRAWALS:amount

If no transactions found, return empty string.`;

  let lastError: Error | null = null;

  // Try each model with retries
  for (const model of MODELS) {
    console.log(`Trying model: ${model}`);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/3...`);
        
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              },
              { text: prompt }
            ]
          }
        });

        let text = response.text || '';
        
        // Cleanup: Remove markdown code blocks if present
        text = text.replace(/^```csv\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '');
        
        console.log(`  Success with ${model}!`);
        return text.trim();
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  Attempt ${attempt} failed:`, errorMsg);
        lastError = error instanceof Error ? error : new Error(errorMsg);
        
        // Check if retryable (503 overloaded, 429 rate limit)
        if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('429')) {
          if (attempt < 3) {
            const waitTime = attempt * 2000; // 2s, 4s
            console.log(`  Waiting ${waitTime/1000}s before retry...`);
            await sleep(waitTime);
            continue;
          }
        }
        
        // Non-retryable error or max retries - try next model
        break;
      }
    }
  }

  // All models failed
  throw lastError || new Error("Failed to process PDF with all available models");
};


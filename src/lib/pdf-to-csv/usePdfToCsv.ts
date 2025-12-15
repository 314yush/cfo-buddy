"use client";

import { useState, useCallback } from 'react';
import { ProcessingState, CsvData, FileData } from './types';
import { readFileAsBase64 } from './fileUtils';
import { convertPdfToCsv } from './geminiService';

export interface UsePdfToCsvReturn {
  status: ProcessingState;
  result: CsvData | null;
  fileMetadata: FileData | null;
  error: string | null;
  processTime: number;
  processFile: (file: File) => Promise<string | null>;
  reset: () => void;
}

// Parse CSV text into structured data
const parseCSV = (csvText: string): CsvData => {
  const lines = csvText.trim().split(/\r?\n/);
  
  if (lines.length === 0) {
    return { headers: [], rows: [], rawText: csvText };
  }

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, '')); // Remove surrounding quotes
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1)
    .filter(line => line.trim() && !line.startsWith('OPENING_BALANCE') && !line.startsWith('CLOSING_BALANCE'))
    .map(parseLine);

  return {
    headers,
    rows,
    rawText: csvText
  };
};

export const usePdfToCsv = (): UsePdfToCsvReturn => {
  const [status, setStatus] = useState<ProcessingState>(ProcessingState.IDLE);
  const [result, setResult] = useState<CsvData | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processTime, setProcessTime] = useState<number>(0);

  const processFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      setStatus(ProcessingState.PROCESSING);
      setError(null);
      setResult(null);

      // 1. Read File as base64
      const data = await readFileAsBase64(file);
      setFileMetadata(data);

      // 2. Process with Gemini
      const startTime = performance.now();
      const csvText = await convertPdfToCsv(data.base64);
      const endTime = performance.now();
      setProcessTime((endTime - startTime) / 1000);

      // 3. Parse Result
      const parsedData = parseCSV(csvText);
      setResult(parsedData);
      
      setStatus(ProcessingState.SUCCESS);
      
      // Return raw CSV text for server submission
      return csvText;
    } catch (err: unknown) {
      console.error(err);
      setStatus(ProcessingState.ERROR);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred while processing the PDF.";
      setError(errorMessage);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus(ProcessingState.IDLE);
    setResult(null);
    setFileMetadata(null);
    setError(null);
    setProcessTime(0);
  }, []);

  return {
    status,
    result,
    fileMetadata,
    error,
    processTime,
    processFile,
    reset
  };
};


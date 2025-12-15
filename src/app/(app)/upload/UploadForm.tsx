"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isPdf = file?.name.toLowerCase().endsWith(".pdf");

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setStatusMessage("");

    try {
      // All processing happens server-side now (Groq is fast!)
      if (isPdf) {
        setStatusMessage("Uploading PDF for AI processing...");
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/bank-statement", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setSuccess(
          `Imported ${data.imported} transactions (${data.skipped} duplicates skipped)`
        );
        setFile(null);
        setPassword("");
        setStatusMessage("");
        if (inputRef.current) inputRef.current.value = "";

        // Redirect to transactions after short delay
        setTimeout(() => router.push("/transactions"), 1500);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          file
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-white/20 hover:border-white/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setPassword("");
            setError(null);
            setSuccess(null);
          }}
          className="hidden"
          id="statement-upload"
        />
        <label htmlFor="statement-upload" className="cursor-pointer block">
          {file ? (
            <>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                {isPdf ? (
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">
                {(file.size / 1024).toFixed(1)} KB
                {isPdf && " • PDF"}
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-white font-medium">
                Click to select CSV or PDF
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Bank statements from HDFC, ICICI, SBI, Axis, etc.
              </p>
            </>
          )}
        </label>
      </div>

      {/* Password field for PDFs */}
      {isPdf && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            PDF Password{" "}
            <span className="text-slate-500">(if password-protected)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password (usually DOB or PAN)"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          />
          <p className="text-xs text-slate-500">
            Common passwords: Date of birth (DDMMYYYY), PAN number, or account
            number
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{statusMessage || "Processing..."}</span>
          </>
        ) : (
          "Import Transactions"
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}
      
      {isPdf && !loading && !error && !success && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm flex items-center gap-2">
            <span>✨</span>
            <span>PDF will be processed with AI to extract transactions</span>
          </p>
        </div>
      )}
    </div>
  );
}


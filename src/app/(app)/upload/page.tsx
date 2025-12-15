import { UploadForm } from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Bank Statement</h1>
        <p className="text-slate-400 mt-1">
          Import your transactions from a CSV or PDF file
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <UploadForm />
      </div>

      {/* Supported Formats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Info */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                PDF Support
              </h2>
              <span className="text-xs text-blue-400">Powered by Gemini AI</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>AI-powered extraction — understands any bank format</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Works with scanned PDFs and images</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Handles HDFC, ICICI, SBI, Axis, Kotak, and more</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500 mt-0.5">•</span>
              <span className="text-slate-400">
                Password hint: DOB (DDMMYYYY), PAN, or Account number
              </span>
            </li>
          </ul>
          <p className="text-slate-500 text-xs mt-4">
            Note: Requires GEMINI_API_KEY in environment. Get free at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              aistudio.google.com
            </a>
          </p>
        </div>

        {/* CSV Info */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">
              CSV Format (Recommended)
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>
                Columns: <code className="text-xs bg-white/10 px-1 rounded">date</code>,{" "}
                <code className="text-xs bg-white/10 px-1 rounded">description</code>,{" "}
                <code className="text-xs bg-white/10 px-1 rounded">debit/credit</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Most reliable parsing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Works with HDFC, ICICI, SBI, Axis, Kotak, Yes Bank</span>
            </li>
          </ul>
          <p className="text-slate-500 text-xs mt-4">
            Download from your bank&apos;s net banking portal: Statement → Download
            → CSV/Excel
          </p>
        </div>
      </div>
    </div>
  );
}


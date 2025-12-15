import { UploadForm } from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upload Bank Statement</h1>
        <p className="text-slate-500 mt-1">
          Import your transactions from a CSV or PDF file
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <UploadForm />
      </div>

      {/* Supported Formats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">PDF Support</h2>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Powered by AI</span>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-xs">✓</span>
              </span>
              <span className="text-slate-600">AI-powered extraction — understands any bank format</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-xs">✓</span>
              </span>
              <span className="text-slate-600">Works with scanned PDFs and images</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-xs">✓</span>
              </span>
              <span className="text-slate-600">Handles HDFC, ICICI, SBI, Axis, Kotak, and more</span>
            </li>
          </ul>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-slate-500 text-xs">
              💡 Common passwords: DOB (DDMMYYYY), PAN, or Account number
            </p>
          </div>
        </div>

        {/* CSV Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-emerald-600"
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
            <div>
              <h2 className="text-lg font-bold text-slate-800">CSV Format</h2>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Recommended</span>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-xs">✓</span>
              </span>
              <span className="text-slate-600">
                Columns: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">date</code>,{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">description</code>,{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">debit/credit</code>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-xs">✓</span>
              </span>
              <span className="text-slate-600">Most reliable parsing method</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-xs">✓</span>
              </span>
              <span className="text-slate-600">Works with all major Indian banks</span>
            </li>
          </ul>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-slate-500 text-xs">
              📥 Download from: Net Banking → Statement → Download → CSV/Excel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

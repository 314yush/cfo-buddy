"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BusinessType = "FREELANCER" | "AGENCY" | "STARTUP" | "SMB" | "OTHER";
type BusinessStage = "JUST_STARTED" | "EARLY" | "GROWING" | "ESTABLISHED";

const businessTypes: { value: BusinessType; label: string; description: string; icon: string }[] = [
  { value: "FREELANCER", label: "Freelancer", description: "Solo professional, consultant, or creator", icon: "👤" },
  { value: "AGENCY", label: "Agency", description: "Service business with a team", icon: "🏢" },
  { value: "STARTUP", label: "Startup", description: "Building a scalable product", icon: "🚀" },
  { value: "SMB", label: "Small Business", description: "Traditional business with steady revenue", icon: "🏪" },
  { value: "OTHER", label: "Other", description: "Something else entirely", icon: "✨" },
];

const businessStages: { value: BusinessStage; label: string; description: string }[] = [
  { value: "JUST_STARTED", label: "Just Started", description: "0-6 months in business" },
  { value: "EARLY", label: "Early Stage", description: "6-18 months, finding product-market fit" },
  { value: "GROWING", label: "Growing", description: "18+ months, scaling up" },
  { value: "ESTABLISHED", label: "Established", description: "Profitable and stable" },
];

const primaryGoals = [
  { value: "track_cash", label: "Track my cash flow", icon: "💰" },
  { value: "hiring_decisions", label: "Make hiring decisions", icon: "👥" },
  { value: "runway", label: "Calculate my runway", icon: "⏱️" },
  { value: "expenses", label: "Understand my expenses", icon: "📊" },
  { value: "investments", label: "Plan investments/purchases", icon: "📈" },
  { value: "taxes", label: "Prepare for taxes", icon: "🧾" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [businessStage, setBusinessStage] = useState<BusinessStage | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [teamSize, setTeamSize] = useState("1");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const totalSteps = 4;

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          businessName,
          businessType,
          businessStage,
          monthlyRevenue: monthlyRevenue ? parseInt(monthlyRevenue) * 100 : null, // Convert to paise
          monthlyExpenses: monthlyExpenses ? parseInt(monthlyExpenses) * 100 : null,
          teamSize: parseInt(teamSize) || 1,
          primaryGoal: selectedGoals.join(","),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      router.push("/snapshot");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return businessType !== null;
      case 3: return businessStage !== null;
      case 4: return selectedGoals.length > 0;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome to Accounting Buddy! 👋
                </h1>
                <p className="text-slate-400">
                  Let&apos;s personalize your experience. First, what should we call you?
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Piyush"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business/Brand Name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Acme Inc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  What best describes you?
                </h1>
                <p className="text-slate-400">
                  This helps us tailor insights for your situation.
                </p>
              </div>
              
              <div className="grid gap-3">
                {businessTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setBusinessType(type.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      businessType === type.value
                        ? "bg-emerald-500/20 border-emerald-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-slate-400">{type.description}</div>
                      </div>
                      {businessType === type.value && (
                        <div className="ml-auto">
                          <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Business Stage & Numbers */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Where are you in your journey?
                </h1>
                <p className="text-slate-400">
                  This helps us provide relevant runway and growth insights.
                </p>
              </div>
              
              <div className="grid gap-3">
                {businessStages.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => setBusinessStage(stage.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      businessStage === stage.value
                        ? "bg-emerald-500/20 border-emerald-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{stage.label}</div>
                        <div className="text-sm text-slate-400">{stage.description}</div>
                      </div>
                      {businessStage === stage.value && (
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Avg Monthly Revenue <span className="text-slate-500">(₹)</span>
                  </label>
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(e.target.value)}
                    placeholder="e.g., 100000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Team Size
                  </label>
                  <input
                    type="number"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  What do you want to achieve?
                </h1>
                <p className="text-slate-400">
                  Select all that apply. We&apos;ll prioritize these in your dashboard.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {primaryGoals.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => handleGoalToggle(goal.value)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selectedGoals.includes(goal.value)
                        ? "bg-emerald-500/20 border-emerald-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{goal.icon}</span>
                      <span className="font-medium">{goal.label}</span>
                      {selectedGoals.includes(goal.value) && (
                        <svg className="w-4 h-4 text-emerald-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="px-6 py-2.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            
            {step < totalSteps ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                    <span>🚀</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button 
            onClick={() => router.push("/snapshot")}
            className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}


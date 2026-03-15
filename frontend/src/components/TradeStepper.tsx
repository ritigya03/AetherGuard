import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X, Shield, Cpu, TrendingUp, Lock, Zap, AlertTriangle } from "lucide-react";
import type { TradeStep, TradeEntry } from "@/lib/claude";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradeStepperProps {
  steps: TradeStep[];
  proposal?: TradeEntry | null;
  proofPassed?: boolean | null;
  onApprove?: () => void;
  onReject?: () => void;
  multiSigEnabled?: boolean;
}

// ─── Step icon map ────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ReactNode> = {
  intent_received:  <Cpu      className="w-4 h-4" />,
  rules_hashed:     <Lock     className="w-4 h-4" />,
  prices_fetched:   <TrendingUp className="w-4 h-4" />,
  proposal_ready:   <Zap      className="w-4 h-4" />,
  proof_verified:   <Shield   className="w-4 h-4" />,
  executed:         <Check    className="w-4 h-4" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  if (!n) return "$0";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 1)    return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepRow = ({ step, index }: { step: TradeStep; index: number }) => {
  const isLoading = step.status === "loading";
  const isDone    = step.status === "done";
  const isError   = step.status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="flex items-start gap-4 py-3"
    >
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center gap-0 self-stretch">
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-all duration-500
            ${isDone  ? "bg-green-500/10 border-green-500/40 text-green-400" : ""}
            ${isLoading ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : ""}
            ${isError ? "bg-red-500/10 border-red-500/40 text-red-400" : ""}
            ${step.status === "pending" ? "bg-slate-800/60 border-slate-700/40 text-slate-500" : ""}
          `}
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isError
            ? <X className="w-4 h-4" />
            : isDone
            ? <Check className="w-3.5 h-3.5" />
            : STEP_ICONS[step.id] ?? <div className="w-2 h-2 rounded-full bg-slate-600" />
          }
        </div>
        {/* connector line — hide on last */}
        <div className="w-px flex-1 bg-white/5 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`
              text-sm font-black uppercase tracking-tight
              ${isDone ? "text-white" : isLoading ? "text-blue-300" : isError ? "text-red-400" : "text-slate-500"}
            `}
          >
            {step.label}
          </span>
          {step.timestamp && (
            <span className="text-[10px] text-slate-600 font-mono">
              {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <p className={`text-xs mt-0.5 leading-relaxed ${isDone ? "text-slate-400" : isLoading ? "text-blue-400/70" : "text-slate-600"}`}>
          {step.detail}
        </p>

        {/* Privacy callout on rules_hashed step */}
        {step.id === "rules_hashed" && isDone && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/5 border border-purple-500/20 w-fit">
            <Lock className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest">
              Rules never sent to AI · Merkle-protected
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const ProposalCard = ({ proposal }: { proposal: TradeEntry }) => {
  const isBuy = proposal.action === "buy";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 overflow-hidden bg-slate-900/60 mt-4 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
              isBuy ? "bg-green-500/15 text-green-400 border border-green-500/20"
                    : "bg-red-500/15 text-red-400 border border-red-500/20"
            }`}
          >
            {proposal.action}
          </span>
          <span className="text-base font-black text-white tracking-tight">{proposal.token}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
              proposal.riskLevel === "low"    ? "bg-green-500/10 text-green-400" :
              proposal.riskLevel === "medium" ? "bg-amber-500/10 text-amber-400" :
                                               "bg-red-500/10 text-red-400"
            }`}
          >
            {proposal.riskLevel} risk
          </span>
        </div>
      </div>

      {/* Price grid */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        <div className="px-4 py-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Entry</div>
          <div className="text-sm font-mono font-bold text-white">{fmtUsd(proposal.entryPriceUsd)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Target</div>
          <div className="text-sm font-mono font-bold text-green-400">{fmtUsd(proposal.targetPriceUsd)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Stop</div>
          <div className="text-sm font-mono font-bold text-red-400">{fmtUsd(proposal.stopLossPriceUsd)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        <div className="px-4 py-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Allocation</div>
          <div className="text-sm font-mono font-bold text-white">{proposal.allocationPercent}%</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Expected</div>
          <div className="text-sm font-mono font-bold text-green-400">+{proposal.expectedReturnPercent}%</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Horizon</div>
          <div className="text-sm font-mono font-bold text-white">{proposal.timeHorizon}</div>
        </div>
      </div>

      {/* Signal + Reasoning */}
      <div className="px-4 py-3 border-b border-white/5 space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-300 font-bold">{proposal.technicalSignal}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{proposal.reasoning}</p>
      </div>
    </motion.div>
  );
};


const ProofResult = ({
  passed,
  onApprove,
  onReject,
  multiSigEnabled,
}: {
  passed: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  multiSigEnabled?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`mt-4 rounded-2xl border p-4 ${
      passed
        ? "border-green-500/30 bg-green-500/5 shadow-lg shadow-green-500/10"
        : "border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/10"
    }`}
  >
    <div className="flex items-center gap-3 mb-4">
      {passed ? (
        <Shield className="w-5 h-5 text-green-400" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-red-400" />
      )}
      <span className={`text-sm font-black uppercase tracking-tight ${passed ? "text-green-400" : "text-red-400"}`}>
        {passed ? "Merkle Proof Valid — Rules Satisfied" : "Merkle Proof Failed — Policy Breached"}
      </span>
    </div>

    <div className="flex gap-2.5">
      {onApprove && (
        <button
          onClick={onApprove}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg ${
            passed 
              ? "bg-green-500 text-white hover:bg-green-600 shadow-green-500/20" 
              : "bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 shadow-amber-500/10"
          }`}
        >
          {passed ? (multiSigEnabled ? "Propose to Multi-Sig" : "Sign & Execute") : "Approve Anyway"}
        </button>
      )}

      {onReject && (
        <button
          onClick={onReject}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] border ${
            passed
              ? "bg-red-500/5 border-red-500/20 text-red-400/70 hover:bg-red-500/10"
              : "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 shadow-lg shadow-red-500/10"
          }`}
        >
          {passed ? "Reject" : "Reject (Recommended)"}
        </button>
      )}
    </div>
  </motion.div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const TradeStepper = ({
  steps,
  proposal,
  proofPassed,
  onApprove,
  onReject,
  multiSigEnabled,
}: TradeStepperProps) => {
  const hasSteps = steps.length > 0;

  if (!hasSteps) return null;

  return (
    <div className="w-full">
      {/* Step pipeline */}
      <div className="relative">
        {steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* Proposal card — shown when proposal_ready step is done */}
      <AnimatePresence>
        {proposal && proposal.entryPriceUsd > 0 && (
          <ProposalCard proposal={proposal} />
        )}
      </AnimatePresence>

      {/* Proof result — shown when proof_verified step is done */}
      <AnimatePresence>
        {proofPassed !== null && proofPassed !== undefined && (
          <ProofResult
            passed={proofPassed}
            onApprove={onApprove}
            onReject={onReject}
            multiSigEnabled={multiSigEnabled}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeStepper;

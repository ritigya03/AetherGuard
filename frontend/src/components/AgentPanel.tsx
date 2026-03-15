import { motion, AnimatePresence } from "framer-motion";
import { Bot, CheckCircle, XCircle, Zap, Loader2, AlertTriangle, ShieldAlert, Lock, Users, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getTradeProposal, type TradeProposal, type TradeStep } from "@/lib/claude";
import { generateProposalProof } from "@/lib/proof";
import { submitProofToChain, getEtherscanUrl } from "@/lib/contract";
import { extractGoal, parseUserRules } from "@/lib/strategyParser";
import { checkRules } from "@/lib/guardrail";
import type { ProofResult } from "@/lib/proof";
import {
  getAgentContext,
  recordApprovedTrade,
  recordRejectedTrade,
  recordProposal,
  getPortfolio,
  getActiveStrategy,
  proposeTradeMultiSig,
  getPendingProposals,
  signPendingProposal,
  removePendingProposal,
  fetchCollaborativeState,
  promoteRules,
  type PortfolioState,
  type UserGoals,
  type PendingProposal,
  type MultiSigConfig,
  type CollaborativeState,
} from "@/lib/fileverseStore";
import TradeStepper from "./TradeStepper";

interface AgentPanelProps {
  goal: string;
  rules: string;
  portfolioState?: PortfolioState;
  userGoals?: UserGoals;
  multiSigConfig?: MultiSigConfig;
  onPortfolioUpdate?: (pf: PortfolioState) => void;
  onProofVerified?: (txHash: string, blockNumber: number, proposal: TradeProposal, proofResult: ProofResult) => void;
  onProofRejected?: (txHash: string, blockNumber: number, proposal: TradeProposal, proofResult: ProofResult) => void;
}

type Status = "idle" | "thinking" | "proposed" | "submitting" | "verified" | "rejecting" | "rejected" | "error";

const AgentPanel = ({ goal, rules, portfolioState, userGoals, multiSigConfig, onPortfolioUpdate, onProofVerified, onProofRejected }: AgentPanelProps) => {
  const [status, setStatus] = useState<Status>("idle");
  const [proposal, setProposal] = useState<TradeProposal | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectedTokens, setRejectedTokens] = useState<string[]>([]);
  const [violations, setViolations] = useState<string[]>([]);
  
  // Pipeline State
  const [steps, setSteps] = useState<TradeStep[]>([]);
  const [proofPassed, setProofPassed] = useState<boolean | null>(null);
  const [pendingProposals, setPendingProposals] = useState<PendingProposal[]>([]);
  const [currentWallet, setCurrentWallet] = useState<string>("");

  useEffect(() => {
    setPendingProposals(getPendingProposals());
    
    const updateAccount = (accounts: any) => {
      if (accounts?.[0]) setCurrentWallet(accounts[0].toLowerCase());
    };

    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then(updateAccount);
      window.ethereum.on("accountsChanged", updateAccount);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", updateAccount);
      }
    };
  }, []);

  const updateStep = (newStep: TradeStep) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === newStep.id);
      if (idx === -1) return [...prev, newStep];
      const updated = [...prev];
      updated[idx] = newStep;
      return updated;
    });
  };

  const handleAskAgent = async (overrideRejected?: string[]) => {
    if (!goal.trim()) { setError("State your investment goal first."); return; }
    setStatus("thinking");
    setProposal(null);
    setTxHash(null);
    setError(null);
    setViolations([]);
    setSteps([]);
    setProofPassed(null);

    try {
      // Use the rejected list to ensure we suggest something else
      const currentRejected = overrideRejected || rejectedTokens;

      // ─── NEW: Fetch Team Consensus from Fileverse ───
      updateStep({
        id: "fetch_team",
        label: "Syncing Team Strategy",
        detail: "Pulling consensus from Fileverse dDoc...",
        status: "loading",
        timestamp: Date.now()
      });

      const activeStrat = getActiveStrategy();
      let collab: CollaborativeState | null = null;
      if (activeStrat?.docId) {
        collab = await fetchCollaborativeState(activeStrat.docId);
        if (collab) {
          console.log("[AetherGuard:v2] 🤝 Consensus fetched:", collab.sharedGoal);
          // Promote rules for next time
          if (multiSigConfig?.signers) {
            promoteRules(collab, multiSigConfig.signers);
          }
        }
      }

      updateStep({ 
        id: "fetch_team", 
        label: "Strategy Synced", 
        detail: "Team consensus active.",
        status: "done" 
      });

      // Assemble PUBLIC context only — strategy_rules NEVER included
      const context = getAgentContext(collab || undefined);

      const result = await getTradeProposal(
        collab?.sharedGoal || goal, 
        "L2-Verified-Root", // Root stays on-chain
        currentRejected, 
        (step) => updateStep(step),
        context                     // portfolio + goals + recent trades
      );

      // Rules checked LOCALLY
      const strategyRules = parseUserRules(collab?.sharedRules || rules);
      const guardrail = checkRules(result, strategyRules);

      setProposal(result);
      setViolations(guardrail.violations);
      setProofPassed(guardrail.passed);

      // Finalize the verification step in UI
      updateStep({
        id: "proof_verified",
        label: guardrail.passed ? "Policy Satisfied" : "Policy Violation",
        detail: guardrail.passed 
          ? "All local constraints met. Ready for on-chain submission." 
          : guardrail.violations[0],
        status: guardrail.passed ? "done" : "error",
        timestamp: Date.now()
      });

      setStatus("proposed");

      // Log this proposal to the active strategy doc (whether accepted or not)
      const strat = getActiveStrategy();
      if (strat) {
        const proposalStatus = guardrail.passed ? "proposed" : "rejected_guardrail";
        recordProposal(strat.id, result, proposalStatus, {
          rejectionAt: guardrail.passed ? undefined : new Date().toISOString(),
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to get AI proposal.");
      setStatus("error");
    }
  };

  const handleApprove = async () => {
    if (!proposal || !proofPassed) return;

    if (multiSigConfig?.enabled) {
      proposeTradeMultiSig(proposal);
      setPendingProposals(getPendingProposals());
      setProposal(null);
      setStatus("idle");
      setSteps([]);
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      const strategyRules = parseUserRules(rules);
      const proofResult = generateProposalProof(proposal, strategyRules);
      
      const result = await submitProofToChain(proofResult, proposal.allocationPercent);
      setTxHash(result.txHash);
      
      if (result.passed) {
        setStatus("verified");
        updateStep({
          id: "executed",
          label: "Trade Executed",
          detail: `On-chain verification at block #${result.blockNumber}`,
          status: "done",
          timestamp: Date.now()
        });

        // Privacy-partitioned writes:
        // 1. Public trade_log (sanitized — no reasoning/rule info)
        // 2. Portfolio state update (allocation shift)
        // 3. Private execution_audit (full proof + reasoning)
        recordApprovedTrade(
          proposal.token,
          proposal.action as "buy" | "sell",
          proposal.allocationPercent,
          result.txHash,
          proposal.entryPriceUsd,
          proofResult.proof,
          proofResult.root,
          proposal.reasoning,
          proposal as unknown as Record<string, unknown>
        );
        // Refresh parent with updated portfolio
        onPortfolioUpdate?.(getPortfolio());

        onProofVerified?.(result.txHash, result.blockNumber, proposal, proofResult);
      } else {
        setError("On-chain policy check failed.");
        setStatus("error");
      }
    } catch (e: any) {
      setError(e?.message || "Transaction failed.");
      setStatus("error");
    }
  };

  const handleReject = async (proposal: TradeProposal) => {
    setStatus("rejecting");
    setError(null);

    // Log user rejection to the strategy doc
    const strat = getActiveStrategy();
    if (strat) {
      recordProposal(strat.id, proposal, "rejected_user", {
        rejectionAt: new Date().toISOString(),
      });
    }
    const rejectedToken = proposal.token;
    try {
      const newRejected = [...rejectedTokens, rejectedToken];
      setRejectedTokens(newRejected);

      const strategyRules = parseUserRules(rules);
      const proofResult = generateProposalProof(proposal, strategyRules);
      
      // Log rejection on-chain
      const result = await submitProofToChain(proofResult, 0);
      setTxHash(result.txHash);
      setStatus("rejected");

      updateStep({
        id: "executed",
        label: "Trade Blocked",
        detail: "Rejection decision finalized on-chain.",
        status: "done",
        timestamp: Date.now()
      });

      // Private rejection log — agent NEVER sees this
      recordRejectedTrade(
        proposal as unknown as Record<string, unknown>,
        proofPassed ? "user" : "guardrail"  // was it blocked by rules or declined by user?
      );

      onProofRejected?.(result.txHash, result.blockNumber, proposal, proofResult);
    } catch {
      // Even if on-chain fails, still log the rejection privately
      recordRejectedTrade(
        proposal as unknown as Record<string, unknown>,
        proofPassed ? "user" : "guardrail"
      );
      setRejectedTokens([...rejectedTokens, rejectedToken]);
      setStatus("rejected");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setProposal(null);
    setTxHash(null);
    setError(null);
    setViolations([]);
    setSteps([]);
    setProofPassed(null);
    setRejectedTokens([]);
  };

  const handleSignProposal = (propId: string) => {
    if (signPendingProposal(propId, currentWallet)) {
      setPendingProposals(getPendingProposals());
    }
  };

  const handleExecuteMultiSig = async (pendingProp: PendingProposal) => {
    setStatus("submitting");
    const { proposal: p } = pendingProp;
    const strategyRules = parseUserRules(rules);
    const proofResult = generateProposalProof(p, strategyRules);
    
    setError(null);
    try {
      updateStep({
        id: "executed",
        label: "Executing Authorized Trade",
        detail: "Submission authorized by Multi-Sig policy.",
        status: "loading",
        timestamp: Date.now()
      });

      const result = await submitProofToChain(proofResult, p.allocationPercent);
      setTxHash(result.txHash);
      
      if (result.passed) {
        updateStep({
          id: "executed",
          label: "Multi-Sig Execution Complete",
          detail: "All authorization criteria met and trade finalized.",
          status: "done",
          timestamp: Date.now()
        });
        recordApprovedTrade(
          p.token,
          p.action as "buy" | "sell",
          p.allocationPercent,
          result.txHash,
          p.entryPriceUsd,
          proofResult.proof,
          proofResult.root,
          p.reasoning,
          p as unknown as Record<string, unknown>,
          pendingProp.id
        );
        onPortfolioUpdate?.(getPortfolio());
        onProofVerified?.(result.txHash, result.blockNumber, p, proofResult);
        
        setPendingProposals(getPendingProposals());
        setStatus("verified");
      } else {
        setError("On-chain policy check failed.");
        setStatus("error");
      }
    } catch (e: any) {
      setError(e?.message || "Execution failed.");
      setStatus("error");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Bot className="w-6 h-6 text-primary" />
          <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse-dot ${
            status === "verified" ? "bg-cyber-verified" :
            status === "rejected" ? "bg-yellow-500" :
            status === "error" ? "bg-destructive" : "bg-primary"
          }`} />
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-foreground">Economic Identity Agent</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">
            {status === "idle" && "Ready to Analyze"}
            {status === "thinking" && "AI Brainstorming..."}
            {status === "proposed" && (proofPassed ? "✓ Policy Compliant" : "🛡️ Policy Violation")}
            {status === "submitting" && "🔐 Generating ZK-Proof..."}
            {status === "verified" && "Proof Verified ✓"}
            {status === "rejecting" && "Recording Rejection..."}
            {status === "rejected" && "Decision Hashed"}
            {status === "error" && "Subsystem Error"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Lock className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-primary font-black uppercase tracking-tighter">Rules Private</span>
        </div>
      </div>

      {/* Main Pipeline Analysis Area */}
      <div className="flex-1 overflow-y-auto mb-4 scrollbar-hide">
        {status === "idle" ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 mb-2">
              <Zap className="w-8 h-8 text-primary opacity-20" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Agent Standby</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                State your goals in the Strategy Editor. <br/> 
                Your private rules will be cryptographically <br/> 
                verified locally before any trade is proposed.
              </p>
            </div>
          </div>
        ) : (
          <TradeStepper 
            steps={steps} 
            proposal={proposal} 
            proofPassed={proofPassed}
            onApprove={handleApprove}
            onReject={() => proposal && handleReject(proposal)}
            multiSigEnabled={multiSigConfig?.enabled}
          />
        )}

        {/* ── Multi-Sig Queue ────────────────────────────────────────────── */}
        <AnimatePresence>
          {pendingProposals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 space-y-3"
            >
              <div className="flex items-center gap-2 px-2">
                <Users className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-display">Pending Signatures</span>
              </div>
              
              {pendingProposals.map((pp) => {
                const hasSigned = pp.approvedBy.includes(currentWallet);
                const isAuthorized = multiSigConfig?.signers.includes(currentWallet);
                const required = multiSigConfig?.threshold || 1;
                const currentApprovals = pp.approvedBy.length;
                const canExecute = currentApprovals >= required;

                return (
                  <div key={pp.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">AI Proposal</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {pp.proposal.action.toUpperCase()} {pp.proposal.token} @ {pp.proposal.allocationPercent}%
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Status</span>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          {currentApprovals}/{required}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-2">
                      {canExecute ? (
                        <button
                          onClick={() => handleExecuteMultiSig(pp)}
                          className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-black border border-green-500/30 hover:bg-green-500/30 transition-all active:scale-[0.98] uppercase tracking-wider"
                        >
                          Execute Authorized Trade
                        </button>
                      ) : (
                        <button
                          disabled={hasSigned || !isAuthorized}
                          onClick={() => handleSignProposal(pp.id)}
                          className="flex-1 py-2 rounded-lg disabled:opacity-30 disabled:grayscale bg-primary text-primary-foreground text-[10px] font-black border border-primary/30 hover:bg-primary/90 transition-all active:scale-[0.98] uppercase tracking-wider"
                        >
                          {hasSigned ? "Already Signed" : isAuthorized ? "Co-Sign Transaction" : "Signer Exclusive"}
                        </button>
                      )}
                      <button
                        onClick={() => { removePendingProposal(pp.id); setPendingProposals(getPendingProposals()); }}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                        title="Dismiss Proposal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Result Hash */}
        <AnimatePresence>
          {txHash && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 glass rounded-xl px-4 py-3 border ${
                status === "verified" ? "border-cyber-verified/30" : "border-yellow-500/30"
              }`}
            >
              <p className="text-[10px] text-muted-foreground mb-1 font-display uppercase tracking-wider font-bold">
                {status === "verified" ? "Verification Proof Hash" : "Rejection Record Hash"}
              </p>
              <a
                href={getEtherscanUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[10px] font-mono hover:underline break-all block ${
                  status === "verified" ? "text-cyber-verified" : "text-yellow-400"
                }`}
              >
                {txHash}
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 glass rounded-xl px-4 py-3 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-4 border-t border-white/5">
        {status === "idle" && (
          <button
            onClick={() => handleAskAgent()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" /> Start AI Analysis
          </button>
        )}
        {(status === "verified" || status === "rejected") && (
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-[0.98] border border-white/10"
          >
            Analyze Next Opportunity
          </button>
        )}
      </div>
    </div>
  );
};

export default AgentPanel;
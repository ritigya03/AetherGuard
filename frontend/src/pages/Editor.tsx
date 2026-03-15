import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import StrategyEditor from "@/components/StrategyEditor";
import AgentPanel from "@/components/AgentPanel";
import ProofVerifier from "@/components/ProofVerifier";
import OnboardingModal from "@/components/OnboardingModal";
import ParticleBackground from "@/components/ParticleBackground";
import DataVault from "@/components/DataVault";
import { saveDecision } from "@/lib/historyStore";
import { checkUserHasAgent, getUserAgentAddress } from "@/lib/factory";
import { fetchDualChainBalances } from "@/lib/balances";
import { fetchPrices } from "@/lib/prices";
import {
  hydrateFromFileverse,
  getPortfolio,
  getGoals,
  getMultiSigConfig,
  saveMultiSigConfig,
  getAllStrategies,
  getActiveStrategy,
  createStrategy,
  syncMasterIndex,
  type PortfolioState,
  type UserGoals,
  type Strategy,
  type MultiSigConfig,
} from "@/lib/fileverseStore";
import { PlusCircle, List, BookOpen, X, Sparkles, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import type { TradeProposal } from "@/lib/claude";
import type { ProofResult } from "@/lib/proof";

const DEFAULT_GOAL = `I want to invest in ETH for long-term growth`;
const DEFAULT_RULES = `// Guardrail Rules — AI never sees these
max allocation per token: 10%
avoid memecoins
only top 20 by market cap
never trade more than $500 at once
prefer blue chip assets`;

// ─── New Strategy Modal ───────────────────────────────────────────────────────

const NewStrategyModal = ({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (name: string, goal: string, risk: string, horizon: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [risk, setRisk] = useState("medium");
  const [horizon, setHorizon] = useState("1 year");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative glass rounded-3xl p-6 sm:p-10 w-full max-w-2xl border border-primary/20 shadow-[-20px_-20px_60px_rgba(0,0,0,0.5),20px_20px_60px_rgba(var(--primary-rgb),0.05)] overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black text-foreground tracking-tight">Establish Strategy</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5 opacity-70">New Private dDoc Manifest</p>
              </div>
            </div>
            <button 
              onClick={onCancel} 
              className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Manifest Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. ALPHA_HARVEST_01"
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Risk Profile</label>
                  <select
                    value={risk}
                    onChange={e => setRisk(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Time Horizon</label>
                  <select
                    value={horizon}
                    onChange={e => setHorizon(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="1 month">1 Month</option>
                    <option value="6 months">6 Months</option>
                    <option value="1 year">1 Year</option>
                    <option value="2+ years">2+ Years</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Primary Objective</label>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                rows={3}
                placeholder="Describe your investment goals for the AI..."
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl bg-white/5 text-muted-foreground text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:text-foreground transition-all"
            >
              Discard
            </button>
            <button
              disabled={!name.trim() || !goal.trim()}
              onClick={() => onConfirm(name.trim(), goal.trim(), risk, horizon)}
              className="flex-[2] py-4 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-primary/20 group flex items-center justify-center gap-2"
            >
              Initialize Strategy
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Editor ───────────────────────────────────────────────────────────────────

const Editor = () => {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);

  const [activeStrategy, setActiveStrategyState] = useState<Strategy | null>(null);
  const [allStrategies, setAllStrategiesState] = useState<Strategy[]>([]);
  const [portfolioState, setPortfolioState] = useState<PortfolioState>(getPortfolio());
  const [userGoals, setUserGoals] = useState<UserGoals>(getGoals());
  const [multiSig, setMultiSig] = useState<MultiSigConfig>(getMultiSigConfig());

  const [lastProof, setLastProof] = useState<{
    trade: string; merkleRoot: string; txHash: string;
    blockNumber: number; status?: "verified" | "rejected"; proof?: ProofResult;
  } | undefined>();
  const [vaultTrigger, setVaultTrigger] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshStore = () => {
    const strat = getActiveStrategy();
    const all = getAllStrategies();
    setActiveStrategyState(strat);
    setAllStrategiesState(all);
    setPortfolioState(getPortfolio());
    setUserGoals(getGoals());
    setMultiSig(getMultiSigConfig());
    if (strat) setGoal(strat.goal);
  };

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if ((accounts as string[]).length === 0) return;
        const currentAccount = (accounts as string[])[0];

        // Check for agent
        const hasAgent = await checkUserHasAgent(currentAccount);
        if (!hasAgent) {
          setOnboardingOpen(true);
        } else {
          const cached = localStorage.getItem("aetherguard_agent");
          if (!cached) {
            try {
              const agentAddr = await getUserAgentAddress(currentAccount);
              if (agentAddr && agentAddr !== "0x0000000000000000000000000000000000000000") {
                localStorage.setItem("aetherguard_agent", agentAddr);
              }
            } catch (e) {
              console.warn("Could not restore agent address", e);
            }
          }
        }

        // Hydrate the v2 store
        await hydrateFromFileverse(currentAccount);
        refreshStore();

        // If no strategies exist yet, show the creation modal
        const strats = getAllStrategies();
        if (strats.length === 0) {
          setNewStrategyOpen(true);
        }

        // Sync real on-chain balances into active strategy
        try {
          const strat = getActiveStrategy();
          if (strat) {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const [{ testnet }, prices] = await Promise.all([
              fetchDualChainBalances(provider, currentAccount),
              fetchPrices(["ETH", "USDC", "WBTC"]),
            ]);
            const totalUsd = testnet.balances.reduce((sum, b) => {
              const p = prices[b.symbol] ?? 0;
              return sum + parseFloat(b.formatted) * p;
            }, 0);
            if (totalUsd > 0) {
              const pf = getPortfolio();
              pf.totalValueUsd = totalUsd;
              setPortfolioState({ ...pf });
            }
          }
        } catch (e) {
          console.warn("Real portfolio sync failed, using cached values", e);
        }

        // Sync master index with wallet
        syncMasterIndex(currentAccount).catch(() => {});

      } catch (e) {
        console.error("Wallet init failed", e);
      }
    };

    init();
  }, []);

  const handleNewStrategy = async (name: string, stratGoal: string, risk: string, horizon: string) => {
    setIsCreatingStrategy(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const currentAccount = (accounts as string[])[0];

      const goals: UserGoals = {
        targetAnnualReturn: 15,
        riskTolerance: risk as "low" | "medium" | "high",
        timeHorizon: horizon,
        rebalanceFrequency: "monthly",
        preferredCategories: ["crypto"],
      };

      await createStrategy(name, stratGoal, goals, portfolioState);
      refreshStore();
      setNewStrategyOpen(false);
      setVaultTrigger(v => v + 1);
      console.log(`[Editor] Strategy "${name}" created`);
    } catch (e) {
      console.error("Failed to create strategy", e);
    } finally {
      setIsCreatingStrategy(false);
    }
  };

  const handleRulesChange = (value: string) => {
    setRules(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Rules are local-only by design (privacy). No Fileverse sync.
      console.log("[Editor] Rules saved locally");
    }, 1000);
  };

  const handleMultiSigChange = (config: MultiSigConfig) => {
    setMultiSig(config);
    saveMultiSigConfig(config);
    setVaultTrigger(v => v + 1);
  };

  const handleProofVerified = async (txHash: string, blockNumber: number, proposal: TradeProposal, proofResult: ProofResult) => {
    const trade = `${proposal.action.toUpperCase()} ${proposal.token} @ ${proposal.allocationPercent}%`;
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    const walletAddress = (accounts as string[])[0]?.toLowerCase();

    saveDecision({
      trade,
      reasoning: proposal.reasoning,
      txHash,
      blockNumber,
      merkleRoot: proofResult.root,
      status: "verified",
    }, walletAddress);

    refreshStore();
    setVaultTrigger(v => v + 1);
    setLastProof({ trade, merkleRoot: proofResult.root, txHash, blockNumber, status: "verified", proof: proofResult });
    setProofModalOpen(true);
  };

  const handleProofRejected = async (txHash: string, blockNumber: number, proposal: TradeProposal, proofResult: ProofResult) => {
    const trade = `REJECTED: ${proposal.action.toUpperCase()} ${proposal.token} @ ${proposal.allocationPercent}%`;
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    const walletAddress = (accounts as string[])[0]?.toLowerCase();

    saveDecision({
      trade,
      reasoning: `REJECTED — ${proposal.reasoning}`,
      txHash,
      blockNumber,
      merkleRoot: proofResult.root,
      status: "rejected",
    }, walletAddress);

    refreshStore();
    setVaultTrigger(v => v + 1);
    setLastProof({ trade, merkleRoot: proofResult.root, txHash, blockNumber, status: "rejected", proof: proofResult });
    setProofModalOpen(true);
  };

  const masterDocLink = activeStrategy
    ? `http://127.0.0.1:8001/api/ddocs/${localStorage.getItem("ag_v2_master_doc_id") || ""}?apiKey=8R_TjebRrSkVT1YOx4ktUCrRLfwfwgz3`
    : null;

  return (
    <div className="relative min-h-screen pt-24 pb-12">
      <ParticleBackground />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6"
        >
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-display text-4xl font-black text-foreground tracking-tight">Strategy Editor</h1>
            </div>
            {activeStrategy ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <Activity className="w-3 h-3 text-primary animate-pulse" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                    ACTIVE: {activeStrategy.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground opacity-50 uppercase tracking-widest">
                  Hash: {activeStrategy.number}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                AI Agent Manifest Management
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeStrategy?.docLink && (
              <a
                href={activeStrategy.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary font-display text-sm font-bold border border-primary/20 hover:bg-primary/20 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Strategy Report
              </a>
            )}
            {allStrategies.length > 0 && (
              <a
                href={masterDocLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-foreground font-display text-sm font-bold border border-white/10 hover:bg-white/10 transition-all"
              >
                <List className="w-4 h-4 opacity-60" />
                Index ({allStrategies.length})
              </a>
            )}
            <button
              onClick={() => setNewStrategyOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display text-sm font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              <PlusCircle className="w-4 h-4" />
              New
            </button>
          </div>
        </motion.div>

        {activeStrategy ? (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 min-h-[640px]">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-7 flex flex-col"
            >
              <StrategyEditor
                goal={goal}
                rules={rules}
                multiSig={{ multiSig }}
                docLink={activeStrategy?.docLink}
                onGoalChange={setGoal}
                onRulesChange={handleRulesChange}
                onMultiSigChange={(cfg) => handleMultiSigChange(cfg.multiSig || multiSig)}
                strategyNumber={activeStrategy.number}
                strategyName={activeStrategy.name}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3 glass rounded-xl p-6"
            >
              <h3 className="font-display text-sm font-semibold tracking-wider text-primary mb-4 uppercase">
                AI Agent
              </h3>
              <AgentPanel
                goal={goal}
                rules={rules}
                portfolioState={portfolioState}
                userGoals={userGoals}
                multiSigConfig={multiSig}
                onPortfolioUpdate={(pf) => { setPortfolioState(pf); refreshStore(); }}
                onProofVerified={handleProofVerified}
                onProofRejected={handleProofRejected}
              />
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[500px] text-center max-w-2xl mx-auto"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/20">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight mb-4">No Active Manifest</h2>
            <p className="text-sm text-muted-foreground mb-10 leading-relaxed font-medium">
              Initialize your first strategy to unlock the power of Privacy-First AI. Each manifest creates a dedicated dDoc report on Fileverse, ensuring total transparency while your rules remain encrypted and local.
            </p>
            <button
              onClick={() => setNewStrategyOpen(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display text-sm font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-primary/20 group"
            >
              <PlusCircle className="w-5 h-5" />
              Create First Strategy
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        <DataVault refreshTrigger={vaultTrigger} strategies={allStrategies} />
      </div>

      <AnimatePresence>
        {newStrategyOpen && (
          <NewStrategyModal
            open={newStrategyOpen}
            onConfirm={handleNewStrategy}
            onCancel={() => { if (getAllStrategies().length > 0) setNewStrategyOpen(false); }}
          />
        )}
      </AnimatePresence>

      <ProofVerifier
        open={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        proof={lastProof}
      />

      <OnboardingModal
        open={onboardingOpen}
        onComplete={(agentAddress) => {
          localStorage.setItem("aetherguard_agent", agentAddress);
          setOnboardingOpen(false);
        }}
      />
    </div>
  );
};

export default Editor;
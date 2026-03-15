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
import { PlusCircle, List, BookOpen, X, Sparkles } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass rounded-2xl p-8 w-full max-w-lg border border-primary/30 shadow-2xl shadow-primary/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">New Strategy</h2>
              <p className="text-xs text-muted-foreground">This will create a dedicated Fileverse report doc.</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Strategy Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. ETH Accumulation, BTC Hedge, DeFi Rotation..."
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Investment Goal</label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={2}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Risk Tolerance</label>
              <select
                value={risk}
                onChange={e => setRisk(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Time Horizon</label>
              <select
                value={horizon}
                onChange={e => setHorizon(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="1 month">1 Month</option>
                <option value="3 months">3 Months</option>
                <option value="6 months">6 Months</option>
                <option value="1 year">1 Year</option>
                <option value="2+ years">2+ Years</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-muted-foreground text-xs font-bold border border-white/10 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim() || !goal.trim()}
            onClick={() => onConfirm(name.trim(), goal.trim(), risk, horizon)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Strategy & Report Doc
          </button>
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
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-foreground">Strategy Editor</h1>
              {activeStrategy && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest">
                  #{activeStrategy.number} — {activeStrategy.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-display">
              Goal → AI &nbsp;|&nbsp; Rules → Local + On-chain Merkle Proof
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeStrategy?.docLink && (
              <a
                href={activeStrategy.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary font-display text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground font-display text-xs font-semibold border border-border hover:bg-secondary/80 transition-colors"
              >
                <List className="w-3.5 h-3.5" />
                Master Index ({allStrategies.length})
              </a>
            )}
            <button
              onClick={() => setNewStrategyOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 font-display text-xs font-semibold border border-green-500/20 hover:bg-green-500/20 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Strategy
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center"
          >
            <BookOpen className="w-12 h-12 text-primary/40" />
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">No Strategy Yet</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Create your first strategy to get started. Each strategy gets its own dedicated Fileverse report tracking every AI proposal, rejection, and execution.
              </p>
            </div>
            <button
              onClick={() => setNewStrategyOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Strategy
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
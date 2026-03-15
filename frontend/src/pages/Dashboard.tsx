import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import DashboardCard from "@/components/DashboardCard";
import ParticleBackground from "@/components/ParticleBackground";
import {
  Activity,
  Bot,
  ChevronRight,
  FileCode,
  RefreshCw,
  Shield,
  Zap,
  AlertTriangle,
  FlaskConical,
  Globe,
} from "lucide-react";
import { Link } from "react-router-dom";
import { fetchDualChainBalances, type TokenBalance } from "@/lib/balances";
import { fetchPrices, formatUsd, type PriceMap } from "@/lib/prices";
import { useWallet } from "@/context/WalletContext";
import { getDecisions, type DecisionRecord } from "@/lib/historyStore";
import { formatDistanceToNow } from "date-fns";
import OnboardingModal from "@/components/OnboardingModal";

// ─── Static data ──────────────────────────────────────────────────────────────
// (We'll now pull this from historyStore)

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState = "idle" | "loading" | "success" | "error";

interface ChainSlice {
  balances: TokenBalance[];
  totalUsd: number;
}

interface PortfolioState {
  testnet: ChainSlice;
  mainnet: ChainSlice;
  prices: PriceMap;
  loadState: LoadState;
  errorMsg: string | null;
  lastUpdated: Date | null;
}

const emptySlice = (): ChainSlice => ({ balances: [], totalUsd: 0 });

// ─── Sub-components ───────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }: { className?: string }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.7, 0.3] }}
    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    className={`bg-border/40 rounded ${className}`}
  />
);

const AssetRowSkeleton = () => (
  <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0 gap-2">
    <Skeleton className="h-3 w-9" />
    <Skeleton className="h-3 w-14" />
    <Skeleton className="h-3 w-14" />
  </div>
);

/** A single token row inside one chain column */
const AssetRow = ({
  balance,
  prices,
  isTestnet,
}: {
  balance: TokenBalance;
  prices: PriceMap;
  isTestnet: boolean;
}) => {
  const price = prices[balance.symbol];
  const amount = parseFloat(balance.formatted);
  const usdValue = !isTestnet && price ? amount * price : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0"
    >
      <span className="text-muted-foreground font-mono w-10">{balance.symbol}</span>
      <span className="text-foreground flex-1 text-right font-mono">
        {amount === 0 ? "0" : balance.formatted}
      </span>
      <span className="text-primary font-display font-semibold w-16 text-right">
        {isTestnet ? (
          <span className="text-muted-foreground italic text-[10px]">testnet</span>
        ) : usdValue !== null ? (
          formatUsd(usdValue)
        ) : (
          "—"
        )}
      </span>
    </motion.div>
  );
};

/** One column: either the Sepolia or Mainnet pane */
const ChainColumn = ({
  label,
  icon: Icon,
  accentClass,
  badgeClass,
  isTestnet,
  totalUsd,
  balances,
  prices,
  isLoading,
  error,
}: {
  label: string;
  icon: React.ElementType;
  accentClass: string;
  badgeClass: string;
  isTestnet: boolean;
  totalUsd: number;
  balances: TokenBalance[];
  prices: PriceMap;
  isLoading: boolean;
  error?: string | null;
}) => (
  <div className="flex-1 min-w-0">
    {/* Column header */}
    <div className={`flex items-center gap-1.5 mb-3 pb-2 border-b ${accentClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className={`text-xs font-display font-semibold ${badgeClass}`}>{label}</span>
      {isTestnet && (
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          testnet
        </span>
      )}
    </div>

    {/* Total */}
    <div className="mb-3">
      {isLoading ? (
        <Skeleton className="h-6 w-24 mb-1" />
      ) : error ? (
        <p className="text-xs text-cyber-pending font-mono">—</p>
      ) : isTestnet ? (
        <p className="text-lg font-display font-bold text-amber-400/80">Sepolia ETH</p>
      ) : (
        <motion.p
          key={totalUsd}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-display font-bold text-foreground"
        >
          {formatUsd(totalUsd)}
        </motion.p>
      )}
    </div>

    {/* Column sub-headers */}
    <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 font-display mb-1">
      <span className="w-10">Token</span>
      <span className="flex-1 text-right">Amount</span>
      <span className="w-16 text-right">{isTestnet ? "" : "Value"}</span>
    </div>

    {/* Rows */}
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div key="skel" exit={{ opacity: 0 }}>
          {["ETH", "USDC", "WBTC"].map((s) => <AssetRowSkeleton key={s} />)}
        </motion.div>
      ) : error ? (
        <motion.div
          key="err"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 py-3 text-cyber-pending"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p className="text-[11px]">{error}</p>
        </motion.div>
      ) : (
        <motion.div key="rows" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {balances.map((b) => (
            <AssetRow key={b.symbol} balance={b} prices={prices} isTestnet={isTestnet} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { address, isConnected, hasAgent, agentAddress, isLoadingAgent, refreshAgent } = useWallet();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioState>({
    testnet: emptySlice(),
    mainnet: emptySlice(),
    prices: {},
    loadState: "idle",
    errorMsg: null,
    lastUpdated: null,
  });
  const [recentActivity, setRecentActivity] = useState<DecisionRecord[]>([]);

  const loadPortfolio = useCallback(async () => {
    if (!address) {
      setPortfolio((prev) => ({ ...prev, loadState: "idle" }));
      return;
    }
    setPortfolio((prev) => ({ ...prev, loadState: "loading", errorMsg: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      
      // Fetch both chains + prices simultaneously
      const [{ testnet, mainnet }, prices] = await Promise.all([
        fetchDualChainBalances(provider, address),
        fetchPrices(["ETH", "USDC", "WBTC"]),
      ]);

      // Mainnet USD totals only (testnet tokens have no real value)
      const mainnetTotalUsd = mainnet.balances.reduce((sum, b) => {
        const p = prices[b.symbol] ?? 0;
        return sum + parseFloat(b.formatted) * p;
      }, 0);

      setPortfolio({
        testnet: { balances: testnet.balances, totalUsd: 0 },
        mainnet: { balances: mainnet.balances, totalUsd: mainnetTotalUsd },
        prices,
        loadState: "success",
        errorMsg: null,
        lastUpdated: new Date(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load portfolio.";
      setPortfolio((prev) => ({ ...prev, loadState: "error", errorMsg: msg }));
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      loadPortfolio();
      // Load last 4 decisions
      const history = getDecisions(address);
      setRecentActivity(history.slice(0, 4));
    } else {
      setRecentActivity([]);
    }
  }, [loadPortfolio, address]);

  const isLoading = portfolio.loadState === "idle" || portfolio.loadState === "loading";
  const isError = portfolio.loadState === "error";

  return (
    <div className="relative min-h-screen pt-24 pb-12">
      <ParticleBackground />
      <div className="fixed inset-0 scanline pointer-events-none z-[1]" />
      <div className="container mx-auto px-6 relative z-10">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-display text-primary">
            <div className="w-2 h-2 rounded-full bg-cyber-verified animate-pulse-dot" />
            System Online
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Portfolio: split Sepolia / Mainnet ──────────────────────────── */}
          <DashboardCard
            title="Portfolio"
            delay={0.1}
            // Span full width so both columns sit inside one card
            className="lg:col-span-2"
          >
            {/* Card-level header row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {/* Combined USD total (mainnet only) */}
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : isError ? (
                  <span className="text-2xl font-display font-bold text-cyber-pending">—</span>
                ) : (
                  <motion.span
                    key={portfolio.mainnet.totalUsd}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-display font-bold text-foreground"
                  >
                    {formatUsd(portfolio.mainnet.totalUsd)}
                  </motion.span>
                )}
                <span className="text-xs text-muted-foreground font-display">
                  {portfolio.lastUpdated
                    ? `Updated ${portfolio.lastUpdated.toLocaleTimeString()}`
                    : "mainnet value"}
                </span>
              </div>

              {/* Refresh */}
              <motion.button
                onClick={loadPortfolio}
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg glass hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Refresh balances"
              >
                <motion.div
                  animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                  transition={isLoading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                >
                  <RefreshCw className="w-4 h-4 text-primary" />
                </motion.div>
              </motion.button>
            </div>

            {/* Two-column split */}
            <div className="flex gap-6">
              {/* Sepolia column */}
              <ChainColumn
                label="Sepolia"
                icon={FlaskConical}
                accentClass="border-amber-500/30"
                badgeClass="text-amber-400"
                isTestnet
                totalUsd={0}
                balances={portfolio.testnet.balances}
                prices={portfolio.prices}
                isLoading={isLoading}
                error={isError ? portfolio.errorMsg : null}
              />

              {/* Divider */}
              <div className="w-px bg-border/30 self-stretch" />

              {/* Mainnet column */}
              <ChainColumn
                label="Mainnet"
                icon={Globe}
                accentClass="border-primary/30"
                badgeClass="text-primary"
                isTestnet={false}
                totalUsd={portfolio.mainnet.totalUsd}
                balances={portfolio.mainnet.balances}
                prices={portfolio.prices}
                isLoading={isLoading}
                error={isError ? portfolio.errorMsg : null}
              />
            </div>
          </DashboardCard>

          {/* ── AI Agent Status ──────────────────────────────────────────────── */}
          <DashboardCard title="AI Agent Status" delay={0.2}>
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <motion.div
                  animate={hasAgent ? { 
                    boxShadow: ["0 0 8px hsl(50 100% 50% / 0.3)", "0 0 20px hsl(50 100% 50% / 0.6)", "0 0 8px hsl(50 100% 50% / 0.3)"] 
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-full p-2"
                >
                  <Bot className={`w-8 h-8 ${hasAgent ? "text-primary" : "text-muted-foreground"}`} />
                </motion.div>
                {hasAgent && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyber-verified animate-pulse-dot" />
                )}
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">
                  {isLoadingAgent ? "Checking status..." : hasAgent ? "Agent Online" : "No Agent Deployed"}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {agentAddress ? `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}` : "Deploy an agent to start"}
                </p>
              </div>
            </div>
            <div className="glass rounded-lg p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-sm text-foreground">
                {hasAgent 
                  ? "Monitoring ETH/USDC price deviation for rebalance trigger" 
                  : isConnected 
                    ? "Establish your AetherGuard to enable autonomous protection." 
                    : "Connect wallet to view agent status."}
              </p>
            </div>
            {!hasAgent && isConnected && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOnboardingOpen(true)}
                className="w-full mt-4 py-2 rounded-lg bg-primary/10 text-primary font-display text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                Setup Agent
              </motion.button>
            )}

            <OnboardingModal
              open={isOnboardingOpen}
              onComplete={(deployedAgentAddress) => {
                localStorage.setItem("aetherguard_agent", deployedAgentAddress);
                setIsOnboardingOpen(false);
                refreshAgent(); // Update status immediately
              }}
            />
          </DashboardCard>

          {/* ── Quick Actions ─────────────────────────────────────────────────── */}
          <DashboardCard title="Quick Actions" delay={0.3}>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Open Strategy Editor", icon: FileCode, path: "/editor" },
                { label: "View Proofs", icon: Shield, path: "/history" },
                { label: "Run AI Analysis", icon: Zap, path: "#" },
              ].map((action) => (
                <Link key={action.label} to={action.path}>
                  <motion.div
                    whileHover={{ x: 4, boxShadow: "inset 0 0 20px hsl(50 100% 50% / 0.05)" }}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <action.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground font-display">{action.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </DashboardCard>

          {/* ── Recent Activity ───────────────────────────────────────────────── */}
          <DashboardCard title="Recent Activity" delay={0.4} className="lg:col-span-2">
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
              ) : (
                recentActivity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate">{item.trade}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-display font-semibold text-cyber-verified">
                        verified
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </DashboardCard>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
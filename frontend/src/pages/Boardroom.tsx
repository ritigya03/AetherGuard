import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ParticleBackground from "@/components/ParticleBackground";
import {
  Users,
  Shield,
  Zap,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  PlusCircle,
  TrendingUp,
  Settings,
  Search,
  Bot,
  Share2,
  CheckCircle2,
  History,
  Database,
  Globe,
  Lock,
  ChevronRight,
  AlertCircle,
  UserPlus,
  Activity,
  Layers,
} from "lucide-react";
import {
  getAllTeamStrategies,
  getActiveTeam,
  createTeamStrategy,
  syncTeamStrategyDoc,
  syncTeamMasterIndex,
  proposeRuleToTeam,
  toggleRuleReaction,
  promoteRule,
  suggestManualTrade,
  signProposalToTeam,
  executeProposalInTeam,
  fetchCollaborativeState,
  addCommentToProposal,
  updateTeamGoal,
  fvGetDoc,
  fvGetDocMeta,
  fvUpdateDoc,
  saveAllTeamStrategies,
  setActiveTeamId,
  proposeTradeToTeam,
  getAgentContext,
  hydrateFromFileverse,
  type TeamStrategy,
  type CollaborativeState,
  type ActiveProposal,
} from "@/lib/fileverseStore";
import { getTradeProposal, type TradeProposal } from "@/lib/claude";
import { X, ThumbsUp, ArrowBigUp, Loader2 } from "lucide-react";

// ─── Shared primitives ──────────────────────────────────────────────────────

const Badge = ({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "green" | "red" | "orange";
  className?: string;
}) => {
  const styles = {
    default: "bg-white/5 border-white/10 text-muted-foreground",
    primary: "bg-primary/10 border-primary/20 text-primary",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

const SectionLabel = ({
  icon: Icon,
  children,
  color = "text-primary",
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  color?: string;
}) => (
  <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${color}`}>
    <Icon className="w-3.5 h-3.5" />
    {children}
  </div>
);

const EmptyState = ({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) => (
  <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-40">
    <Icon className="w-6 h-6 text-muted-foreground" />
    <p className="text-[10px] text-muted-foreground font-medium text-center leading-relaxed">
      {message}
    </p>
  </div>
);

const Card = ({
  children,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) => (
  <div
    className={`rounded-2xl border backdrop-blur-md ${
      glow
        ? "border-primary/30 bg-primary/5 shadow-[0_0_30px_rgba(var(--primary-rgb),0.07)]"
        : "border-white/8 bg-white/[0.03]"
    } ${className}`}
  >
    {children}
  </div>
);

// ─── Sub-panels ──────────────────────────────────────────────────────────────

type ProposeRulePanelProps = {
  activeTeam: TeamStrategy;
  userAddress: string;
  onPropose: (val: string) => void;
};

const ProposeRulePanel = ({ onPropose }: ProposeRulePanelProps) => {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value.trim()) return;
    onPropose(value.trim());
    setValue("");
  };
  return (
    <Card className="p-4 space-y-3">
      <SectionLabel icon={Shield} color="text-orange-400">
        Propose Rule
      </SectionLabel>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Max 5% stop-loss per position…"
        className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-[11px] font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all resize-none leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="w-full py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        Submit Proposal
      </button>
    </Card>
  );
};

type SuggestTradePanelProps = {
  activeTeam: TeamStrategy;
  userAddress: string;
  onSuggest: (val: string) => void;
  onSummonAI: () => void;
  isSummoning: boolean;
  draftProposal: TradeProposal | null;
  onPromoteDraft: () => void;
  onDiscardDraft: () => void;
};

const SuggestTradePanel = ({
  onSuggest,
  onSummonAI,
  isSummoning,
  draftProposal,
  onPromoteDraft,
  onDiscardDraft,
}: SuggestTradePanelProps) => {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value.trim()) return;
    onSuggest(value.trim());
    setValue("");
  };
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel icon={Zap} color="text-primary">
          Suggest Trade
        </SectionLabel>
        <button
          onClick={onSummonAI}
          disabled={isSummoning}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
        >
          {isSummoning ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <Bot className="w-2.5 h-2.5" />
          )}
          {isSummoning ? "Consulting AI…" : "Ask AI"}
        </button>
      </div>

      <textarea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Rotate 20% ETH → WBTC…"
        className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-[11px] font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all resize-none leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="w-full py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        Submit Suggestion
      </button>

      <AnimatePresence>
        {draftProposal && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl bg-primary/10 border border-primary/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black text-primary uppercase tracking-wider">
                  AI Draft
                </span>
              </div>
              <button
                onClick={onDiscardDraft}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-foreground">
                {draftProposal.action.toUpperCase()} {draftProposal.token} @{" "}
                {draftProposal.allocationPercent}%
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                "{draftProposal.reasoning.slice(0, 120)}…"
              </p>
            </div>
            <button
              onClick={onPromoteDraft}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <ArrowBigUp className="w-3.5 h-3.5" />
              Promote to Boardroom
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const Boardroom = () => {
  const [teams, setTeams] = useState<TeamStrategy[]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamStrategy | null>(null);
  const [collab, setCollab] = useState<CollaborativeState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [isOpeningDoc, setIsOpeningDoc] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedGoal, setEditedGoal] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [teamName, setTeamName] = useState("");
  const [teamGoal, setTeamGoal] = useState("");
  const [signers, setSigners] = useState<string[]>([]);
  const [signerInput, setSignerInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draftProposal, setDraftProposal] = useState<TradeProposal | null>(null);
  const [isSummoning, setIsSummoning] = useState(false);

  // ── data helpers ──────────────────────────────────────────────────────────

  const refresh = () => {
    const all = getAllTeamStrategies();
    const active = getActiveTeam();
    setTeams(all);
    setActiveTeam(active);
    if (!active && all.length > 0) {
      setActiveTeamId(all[0].id);
      setActiveTeam(all[0]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setNewTeamOpen(false);
      setIsSyncing(false);
      setIsHydrating(false);
      const accounts = await (window as any).ethereum?.request({ method: "eth_accounts" });
      if (accounts?.[0]) {
        const addr = accounts[0].toLowerCase();
        setUserAddress(addr);
        const params = new URLSearchParams(window.location.search);
        const inviteDocId = params.get("invite");
        setIsHydrating(true);
        try {
          await hydrateFromFileverse(addr, inviteDocId || undefined);
        } finally {
          setIsHydrating(false);
          refresh();
        }
      } else {
        refresh();
      }
    };
    init();
    const handleBg = () => refresh();
    window.addEventListener("ag-discovery-found", handleBg);
    return () => window.removeEventListener("ag-discovery-found", handleBg);
  }, []);

  useEffect(() => {
    if (activeTeam?.docId) handleSync();
  }, [activeTeam?.id]);

  const handleSync = async () => {
    if (!activeTeam?.docId) return;
    setIsSyncing(true);
    try {
      const state = await fetchCollaborativeState(activeTeam.docId);
      setCollab(state);
      if (state?.sharedGoal) setEditedGoal(state.sharedGoal);
    } catch (err) {
      console.error("[Boardroom] Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateGoal = async () => {
    if (!activeTeam?.docId || !editedGoal) return;
    try {
      await updateTeamGoal(activeTeam.docId, editedGoal);
      setIsEditingGoal(false);
      handleSync();
    } catch (err) {
      console.error("Goal update failed", err);
    }
  };

  const handleAddComment = async (proposalId: string) => {
    const comment = commentInputs[proposalId];
    if (!activeTeam?.docId || !userAddress || !comment) return;
    try {
      await addCommentToProposal(activeTeam.docId, proposalId, userAddress.slice(0, 6), comment);
      setCommentInputs((prev) => ({ ...prev, [proposalId]: "" }));
      handleSync();
    } catch (err) {
      console.error("Comment failed", err);
    }
  };

  const handleSignProposal = async (proposalId: string) => {
    if (!activeTeam?.docId || !userAddress) return;
    try {
      await signProposalToTeam(activeTeam.docId, proposalId, userAddress);
      handleSync();
    } catch (err) {
      console.error("Sign failed", err);
    }
  };

  const handleExecuteProposal = async (proposalId: string) => {
    if (!activeTeam?.docId) return;
    try {
      const txHash = "0x" + Math.random().toString(16).slice(2);
      await executeProposalInTeam(activeTeam.docId, proposalId, txHash);
      handleSync();
    } catch (err) {
      console.error("Execution failed", err);
    }
  };

  const handleToggleReaction = async (idx: number) => {
    if (!activeTeam?.docId || !userAddress) return;
    await toggleRuleReaction(activeTeam.docId, idx, userAddress.slice(0, 6));
    handleSync();
  };

  const handlePromoteRule = async (idx: number) => {
    if (!activeTeam?.docId) return;
    await promoteRule(activeTeam.docId, idx);
    handleSync();
  };

  const handleOpenDoc = async () => {
    if (!activeTeam?.docId) return;
    setIsOpeningDoc(true);
    try {
      const meta = await fvGetDocMeta(activeTeam.docId);
      const liveLink = meta.link;
      if (liveLink?.startsWith("http")) {
        const all = getAllTeamStrategies();
        const idx = all.findIndex((t) => t.id === activeTeam.id);
        if (idx !== -1 && !all[idx].docLink) {
          all[idx].docLink = liveLink;
          saveAllTeamStrategies(all);
          setActiveTeam((prev) => (prev ? { ...prev, docLink: liveLink } : prev));
        }
        window.open(liveLink, "_blank");
      } else {
        window.open(`/ddoc/${activeTeam.docId}`, "_blank");
      }
    } catch {
      window.open(`/ddoc/${activeTeam.docId}`, "_blank");
    } finally {
      setIsOpeningDoc(false);
    }
  };

  const handleSummonAI = async () => {
    if (!activeTeam?.docId) return;
    setIsSummoning(true);
    try {
      const context = getAgentContext(collab || undefined);
      const goalStr = collab?.sharedGoal || activeTeam.goal || "Optimize portfolio";
      const proposal = await getTradeProposal(goalStr, "L2-Verified-Root", [], undefined, context);
      setDraftProposal(proposal);
    } catch (err) {
      console.error("Agent failed", err);
    } finally {
      setIsSummoning(false);
    }
  };

  const handlePromoteDraft = async () => {
    if (!activeTeam?.docId || !userAddress || !draftProposal) return;
    try {
      await proposeTradeToTeam(activeTeam.docId, userAddress, draftProposal);
      setDraftProposal(null);
      handleSync();
    } catch (err) {
      console.error("Promotion failed", err);
    }
  };

  const handleShareLink = () => {
    if (!activeTeam?.docId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("invite", activeTeam.docId);
    navigator.clipboard.writeText(url.toString());
    setCopiedId("share");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTeam = async () => {
    if (!teamName || !teamGoal) return;
    setIsCreating(true);
    try {
      const accounts = await (window as any).ethereum?.request({ method: "eth_accounts" });
      const myWallet = (accounts?.[0] || "").toLowerCase();
      if (!myWallet) {
        alert("Please connect your MetaMask wallet first!");
        return;
      }
      const finalSigners = signers.includes(myWallet) ? signers : [myWallet, ...signers];
      await createTeamStrategy(teamName, teamGoal, finalSigners, myWallet);
      setUserAddress(myWallet);
      refresh();
      setNewTeamOpen(false);
      setTeamName("");
      setTeamGoal("");
      setSigners([]);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePromoteManualSuggestion = async (i: number) => {
    if (!activeTeam?.docId || !userAddress || !collab) return;
    const collabState = { ...collab };
    const suggested = collabState.manualTradeSuggestions[i];
    collabState.activeProposals.push({
      id: `prop_${Date.now()}`,
      title: `MANUAL: ${suggested.suggestion}`,
      action: "PROPOSAL",
      token: "TBD",
      amount: "0",
      reasoning: "Manually promoted by team member",
      proposedBy: suggested.author,
      votes: [],
      comments: [],
      status: "pending",
      timestamp: new Date().toLocaleDateString(),
    });
    collabState.manualTradeSuggestions.splice(i, 1);
    await syncTeamStrategyDoc(activeTeam.id, collabState);
    handleSync();
  };

  const handleProposeRule = async (val: string) => {
    if (!val || !activeTeam?.docId) return;
    const accounts = await (window as any).ethereum?.request({ method: "eth_accounts" });
    await proposeRuleToTeam(
      activeTeam.docId,
      (accounts?.[0] || userAddress || "Signer").slice(0, 6),
      val
    );
    handleSync();
  };

  const handleSuggestTrade = async (val: string) => {
    if (!val || !activeTeam?.docId) return;
    const accounts = await (window as any).ethereum?.request({ method: "eth_accounts" });
    await suggestManualTrade(
      activeTeam.docId,
      (accounts?.[0] || userAddress || "Signer").slice(0, 6),
      val
    );
    handleSync();
  };

  // ── render helpers ────────────────────────────────────────────────────────

  const pendingProposals = collab?.activeProposals.filter((p) => p.status === "pending") ?? [];
  const resolvedProposals =
    collab?.activeProposals.filter((p) => p.status === "approved" || p.status === "rejected") ?? [];
  const isOwner = userAddress && activeTeam?.creatorAddress === userAddress;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen pt-20 pb-16 z-0">
      <ParticleBackground />

      <div className="container mx-auto px-4 md:px-6 relative z-20">

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_16px_rgba(var(--primary-rgb),0.12)]">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-black text-foreground tracking-tight leading-none">
                Boardroom
              </h1>
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.22em] opacity-50 ml-12">
              Collaborative Multi-Sig Strategy Coordination
            </p>
          </div>
          <button
            onClick={() => setNewTeamOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Team
          </button>
        </motion.div>

        {/* ── Body grid: Sidebar + Main ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">

          {/* ── Left Sidebar: Registry ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Card className="p-4 sticky top-24">
              {/* Registry header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                    Registry
                  </span>
                  {teams.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold">
                      {teams.length}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      if (!userAddress) return;
                      setIsHydrating(true);
                      try {
                        await hydrateFromFileverse(userAddress, undefined, true);
                      } finally {
                        setIsHydrating(false);
                        refresh();
                      }
                    }}
                    title="Scan Network"
                    className="p-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 transition-all text-muted-foreground hover:text-primary"
                  >
                    <Search className={`w-3 h-3 ${isHydrating ? "animate-pulse" : ""}`} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("NUCLEAR RESET: Wipe all local boardroom data and re-sync from Fileverse?")) return;
                      setIsHydrating(true);
                      try {
                        await hydrateFromFileverse(userAddress, undefined, true);
                        window.location.reload();
                      } finally {
                        setIsHydrating(false);
                      }
                    }}
                    title="Reset Cache"
                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Team list */}
              <div className="space-y-2">
                {teams.length === 0 ? (
                  <EmptyState
                    icon={Globe}
                    message={isHydrating ? "Deep scanning network…" : "No boardrooms found. Use search to scan."}
                  />
                ) : (
                  teams.map((t) => {
                    const isActive = activeTeam?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTeamId(t.id);
                          refresh();
                        }}
                        className={`w-full group text-left px-3.5 py-3.5 rounded-xl transition-all border ${
                          isActive
                            ? "bg-primary/10 border-primary/25 shadow-[0_0_12px_rgba(var(--primary-rgb),0.08)]"
                            : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-black tracking-tight truncate ${
                              isActive ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {t.name || `TEAM_${t.number}`}
                          </span>
                          {isActive ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0 transition-all" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">
                            {t.multiSig?.signers?.length || 0} signers
                          </span>
                          {isActive && (
                            <Badge variant="primary">Active</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>

          {/* ── Right: Workspace ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {activeTeam ? (
              <div className="space-y-5">

                {/* ── Workspace Header ── */}
                <Card glow className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">
                            {activeTeam.name}
                          </h2>
                          {isOwner && <Badge variant="green">Owner</Badge>}
                          {activeTeam.creatorAddress && !isOwner && (
                            <Badge>
                              {activeTeam.creatorAddress.slice(0, 6)}…{activeTeam.creatorAddress.slice(-4)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium uppercase tracking-wider">
                          Boardroom Workspace
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Sync controls */}
                      <div className="flex items-center bg-black/30 rounded-xl p-1 border border-white/5 gap-0.5">
                        <button
                          onClick={async () => {
                            if (!activeTeam?.id || !collab) return;
                            setIsSyncing(true);
                            try {
                              await syncTeamStrategyDoc(activeTeam.id, collab);
                              setTimeout(handleSync, 1000);
                            } finally {
                              setIsSyncing(false);
                            }
                          }}
                          disabled={isSyncing}
                          title="Force template update"
                          className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                        >
                          <Database className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                        </button>
                        <button
                          onClick={handleSync}
                          disabled={isSyncing}
                          title="Refresh"
                          className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      <button
                        onClick={handleShareLink}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-muted-foreground hover:text-white hover:border-white/15 transition-all"
                      >
                        {copiedId === "share" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {copiedId === "share" ? "Copied!" : "Invite"}
                        </span>
                      </button>

                      <button
                        onClick={handleOpenDoc}
                        disabled={isOpeningDoc}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-60"
                      >
                        {isOpeningDoc ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3 h-3" />
                        )}
                        Open dDoc
                      </button>
                    </div>
                  </div>

                  {/* Live indicator */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground/40 font-medium">
                      Powered by Fileverse dDocs
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] text-green-500 font-bold uppercase tracking-wider">
                        Live Sync
                      </span>
                    </div>
                  </div>
                </Card>

                {/* ── 2-column grid: Main content + Sidebar ── */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">

                  {/* ── Main content column ── */}
                  <div className="space-y-5">

                    {/* Consensus Goal */}
                    <Card className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionLabel icon={TrendingUp} color="text-primary">
                          Consensus Goal
                        </SectionLabel>
                        <button
                          onClick={() => {
                            setIsEditingGoal(!isEditingGoal);
                            if (!isEditingGoal)
                              setEditedGoal(collab?.sharedGoal || activeTeam.goal || "");
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-primary/20 transition-all"
                        >
                          <Settings className="w-2.5 h-2.5" />
                          {isEditingGoal ? "Cancel" : "Modify"}
                        </button>
                      </div>

                      {isSyncing ? (
                        <div className="flex items-center gap-2.5 py-4 text-xs text-primary font-bold animate-pulse">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="uppercase tracking-widest text-[10px]">Hydrating Consensus…</span>
                        </div>
                      ) : isEditingGoal ? (
                        <div className="space-y-3">
                          <textarea
                            value={editedGoal}
                            onChange={(e) => setEditedGoal(e.target.value)}
                            rows={3}
                            placeholder="Define the team's primary objective…"
                            className="w-full bg-black/30 border border-primary/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all leading-relaxed resize-none"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={handleUpdateGoal}
                              className="px-5 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                            >
                              Publish Goal
                            </button>
                          </div>
                        </div>
                      ) : collab?.sharedGoal ? (
                        <blockquote className="text-sm text-white/80 leading-relaxed font-medium italic border-l-2 border-primary/30 pl-4 py-1">
                          "{collab.sharedGoal}"
                        </blockquote>
                      ) : (
                        <EmptyState icon={AlertCircle} message="No goal published yet. Use Modify to set the team's direction." />
                      )}
                    </Card>

                    {/* Governing Rules */}
                    <Card className="p-5 space-y-4">
                      <SectionLabel icon={Lock} color="text-red-400">
                        Governing Rules
                      </SectionLabel>
                      <div className="rounded-xl bg-black/30 border border-red-500/10 p-4 font-mono text-[12px] text-foreground/70 leading-relaxed min-h-[60px]">
                        {collab?.sharedRules ||
                          "No rules established yet. Teams must propose and reach consensus to lock governing logic."}
                      </div>
                    </Card>

                    {/* Pending Rule Proposals */}
                    <Card className="p-5 space-y-4">
                      <SectionLabel icon={RefreshCw} color="text-orange-400">
                        Pending Rule Proposals
                      </SectionLabel>
                      {!collab?.pendingRuleProposals.length ? (
                        <EmptyState icon={AlertCircle} message="No pending rule proposals." />
                      ) : (
                        <div className="space-y-2">
                          {collab.pendingRuleProposals.map((p, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-2.5"
                            >
                              <p className="text-[11px] text-foreground/80 font-mono leading-relaxed">
                                "{p.rule}"
                              </p>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] text-muted-foreground/50 uppercase">
                                  {p.author} · {p.timestamp}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleReaction(i)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                                      p.reactions.some((r) => r.includes(userAddress.slice(0, 6)))
                                        ? "bg-primary/15 border-primary/25 text-primary"
                                        : "bg-white/5 border-white/8 text-muted-foreground hover:bg-white/10"
                                    }`}
                                  >
                                    <ThumbsUp className="w-2.5 h-2.5" />
                                    {p.reactions.length}
                                  </button>
                                  {p.reactions.length >= activeTeam.multiSig.threshold && (
                                    <button
                                      onClick={() => handlePromoteRule(i)}
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 transition-all"
                                    >
                                      <ArrowBigUp className="w-2.5 h-2.5" />
                                      Promote
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Manual Trade Suggestions */}
                    <Card className="p-5 space-y-4">
                      <SectionLabel icon={Zap} color="text-muted-foreground">
                        Manual Suggestions
                      </SectionLabel>
                      {!collab?.manualTradeSuggestions.length ? (
                        <EmptyState icon={Zap} message="No manual suggestions yet." />
                      ) : (
                        <div className="space-y-2">
                          {collab.manualTradeSuggestions.map((s, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 flex items-center justify-between gap-3"
                            >
                              <div className="overflow-hidden">
                                <p className="text-[11px] text-foreground/70 truncate">{s.suggestion}</p>
                                <p className="text-[9px] text-muted-foreground/40 uppercase mt-0.5">
                                  {s.author} · {s.timestamp}
                                </p>
                              </div>
                              <button
                                onClick={() => handlePromoteManualSuggestion(i)}
                                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold hover:bg-primary/20 transition-all"
                              >
                                Promote
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Active Trade Proposals (Multi-Sig) */}
                    <Card glow className="p-5 space-y-4">
                      <SectionLabel icon={Activity} color="text-primary">
                        Active Trade Proposals
                      </SectionLabel>
                      {!pendingProposals.length ? (
                        <EmptyState icon={Layers} message="No active proposals pending signature." />
                      ) : (
                        <div className="space-y-3">
                          {pendingProposals.map((p) => {
                            const hasSigned = p.votes.some(
                              (v) => v.address.toLowerCase() === userAddress.toLowerCase()
                            );
                            const sigCount = p.votes.length;
                            const threshold = activeTeam.multiSig.threshold;
                            return (
                              <div
                                key={p.id}
                                className="rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden"
                              >
                                {/* Proposal header */}
                                <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.02]">
                                  <div className="overflow-hidden">
                                    <p className="text-[12px] font-bold text-foreground truncate">{p.title}</p>
                                    <p className="text-[9px] text-muted-foreground/50 uppercase mt-0.5">
                                      {p.proposedBy} · {p.timestamp}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <span className="text-[10px] font-black text-primary">
                                      {sigCount} / {threshold}
                                    </span>
                                    <p className="text-[8px] text-muted-foreground/40 uppercase">signed</p>
                                  </div>
                                </div>

                                {/* Signature progress bar */}
                                <div className="px-4 py-2.5">
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (sigCount / threshold) * 100)}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Comments */}
                                {p.comments && p.comments.length > 0 && (
                                  <div className="px-4 pb-2 space-y-1.5">
                                    {p.comments.map((c, ci) => (
                                      <p key={ci} className="text-[10px] text-muted-foreground leading-relaxed">
                                        <span className="font-bold text-primary">{c.address}</span>: {c.comment}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Comment input + actions */}
                                <div className="px-4 py-3 border-t border-white/5 space-y-3">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add a comment…"
                                      value={commentInputs[p.id] || ""}
                                      onChange={(e) =>
                                        setCommentInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddComment(p.id);
                                      }}
                                      className="flex-1 bg-black/20 border border-white/8 rounded-lg px-3 py-1.5 text-[10px] placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-all"
                                    />
                                    <button
                                      onClick={() => handleAddComment(p.id)}
                                      className="px-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    {/* Signer avatars */}
                                    <div className="flex -space-x-2">
                                      {p.votes.map((v) => (
                                        <div
                                          key={v.address}
                                          title={v.address}
                                          className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[7px] font-bold text-primary uppercase"
                                        >
                                          {v.address.slice(0, 2)}
                                        </div>
                                      ))}
                                      {Array.from({
                                        length: Math.max(0, threshold - sigCount),
                                      }).map((_, i) => (
                                        <div
                                          key={i}
                                          className="w-6 h-6 rounded-full bg-white/5 border-2 border-background border-dashed"
                                        />
                                      ))}
                                    </div>

                                    {p.status === "approved" ? (
                                      <button
                                        onClick={() => handleExecuteProposal(p.id)}
                                        className="px-4 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-bold hover:bg-green-600 transition-all shadow-md shadow-green-500/20"
                                      >
                                        Execute Multi-Sig
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleSignProposal(p.id)}
                                        disabled={hasSigned}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                          hasSigned
                                            ? "bg-green-500/15 text-green-400 border border-green-500/20 cursor-default"
                                            : "bg-primary text-primary-foreground hover:brightness-110 active:scale-95 shadow-md shadow-primary/20"
                                        }`}
                                      >
                                        {hasSigned ? "✓ Signed" : "Sign Multi-Sig"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                    {/* Decision History */}
                    {resolvedProposals.length > 0 && (
                      <Card className="p-5 space-y-4">
                        <SectionLabel icon={History} color="text-muted-foreground">
                          Decision History
                        </SectionLabel>
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-white/8 bg-white/[0.03]">
                                {["Date", "Proposal", "Status", "Author", "Votes"].map((h) => (
                                  <th key={h} className="px-4 py-2.5 text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {resolvedProposals.map((p) => (
                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                  <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                                    {p.timestamp.split(",")[0]}
                                  </td>
                                  <td className="px-4 py-3 text-[11px] font-medium text-foreground max-w-[200px] truncate">
                                    {p.title}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant={p.status === "approved" ? "green" : "red"}>
                                      {p.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">
                                    {p.proposedBy.slice(0, 6)}…
                                  </td>
                                  <td className="px-4 py-3 text-[10px] text-muted-foreground">
                                    {p.votes.length}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* ── Right sidebar column ── */}
                  <div className="space-y-5">

                    {/* Propose Rule & Suggest Trade panels */}
                    <ProposeRulePanel
                      activeTeam={activeTeam}
                      userAddress={userAddress}
                      onPropose={handleProposeRule}
                    />
                    <SuggestTradePanel
                      activeTeam={activeTeam}
                      userAddress={userAddress}
                      onSuggest={handleSuggestTrade}
                      onSummonAI={handleSummonAI}
                      isSummoning={isSummoning}
                      draftProposal={draftProposal}
                      onPromoteDraft={handlePromoteDraft}
                      onDiscardDraft={() => setDraftProposal(null)}
                    />

                    {/* Multi-sig policy */}
                    <Card glow className="p-5 space-y-5">
                      <SectionLabel icon={Shield} color="text-primary">
                        Multi-Sig Policy
                      </SectionLabel>

                      {/* Threshold */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Threshold
                          </span>
                          <span className="text-[11px] font-mono font-black text-primary">
                            {activeTeam.multiSig.threshold} of {activeTeam.multiSig.signers.length}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full"
                            style={{
                              width: `${(activeTeam.multiSig.threshold / activeTeam.multiSig.signers.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Signer list */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Signers
                        </span>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                          {activeTeam.multiSig?.signers?.map((signer) => {
                            const isMe = userAddress === signer.toLowerCase();
                            const isCreator = signer.toLowerCase() === activeTeam.creatorAddress?.toLowerCase();
                            return (
                              <div
                                key={signer}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      isMe ? "bg-primary animate-pulse" : "bg-white/15"
                                    }`}
                                  />
                                  <span className="text-[10px] font-mono text-foreground/70 truncate">
                                    {signer.slice(0, 10)}…{signer.slice(-6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isCreator && <Badge variant="primary">Owner</Badge>}
                                  {isMe && <span className="text-[9px] font-black text-primary">YOU</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-start gap-2">
                        <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                        <p className="text-[9px] text-muted-foreground/40 italic leading-relaxed">
                          Policy is tied to the boardroom dDoc audit trail.
                        </p>
                      </div>
                    </Card>

                    {/* Boardroom info */}
                    <Card className="p-5 space-y-4">
                      <SectionLabel icon={Database} color="text-muted-foreground">
                        Room Info
                      </SectionLabel>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">
                            Created
                          </p>
                          <p className="text-[11px] font-mono text-foreground/70">
                            {activeTeam.createdAt
                              ? new Date(activeTeam.createdAt).toLocaleDateString()
                              : "Established"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">
                            Protocol
                          </p>
                          <p className="text-[11px] font-mono text-foreground/70">AetherGuard v2</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            ) : (
              /* ── No Active Team ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[420px] text-center"
              >
                <Card className="w-full max-w-md mx-auto p-12">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-primary/40" />
                  </div>
                  <h2 className="text-lg font-black text-foreground">Select a Boardroom</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {teams.length > 0
                      ? "Choose a team strategy from the registry on the left."
                      : "No team strategies found. Create one to coordinate with partners."}
                  </p>
                  <button
                    onClick={() => setNewTeamOpen(true)}
                    className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 mx-auto"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Establish Team Room
                  </button>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Create Team Modal ── */}
      <AnimatePresence>
        {newTeamOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="w-full max-w-lg"
            >
              <Card glow className="p-7">
                {/* Modal header */}
                <div className="flex items-start justify-between mb-7">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-foreground">New Team Strategy</h2>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Creates a dedicated Fileverse boardroom doc.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNewTeamOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block">
                      Team Name
                    </label>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Alpha DAO Treasury, Family Fund…"
                      className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block">
                      Foundational Goal
                    </label>
                    <textarea
                      value={teamGoal}
                      onChange={(e) => setTeamGoal(e.target.value)}
                      placeholder="Describe the shared direction of this team fund…"
                      rows={3}
                      className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm placeholder:text-white/20 resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block">
                      Signer Governance
                      <span className="ml-2 font-normal text-muted-foreground normal-case tracking-normal">
                        ({signers.length + 1} signer{signers.length !== 0 ? "s" : ""})
                      </span>
                    </label>

                    {/* Current signers */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary text-[10px] font-mono">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        You (Owner)
                      </span>
                      {signers.map((s) => (
                        <div
                          key={s}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/8"
                        >
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {s.slice(0, 8)}…{s.slice(-4)}
                          </span>
                          <button
                            onClick={() => setSigners(signers.filter((x) => x !== s))}
                            className="text-muted-foreground/50 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add signer */}
                    <div className="flex gap-2">
                      <input
                        value={signerInput}
                        onChange={(e) => setSignerInput(e.target.value)}
                        placeholder="Add partner wallet 0x…"
                        className="flex-1 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-[11px] font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (signerInput.startsWith("0x") && signerInput.length === 42) {
                              setSigners([...signers, signerInput.toLowerCase()]);
                              setSignerInput("");
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (signerInput.startsWith("0x") && signerInput.length === 42) {
                            setSigners([...signers, signerInput.toLowerCase()]);
                            setSignerInput("");
                          }
                        }}
                        className="px-4 bg-primary/10 text-primary rounded-xl border border-primary/25 hover:bg-primary/20 font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setNewTeamOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.04] text-muted-foreground text-sm font-bold border border-white/8 hover:bg-white/[0.08] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!teamName || !teamGoal || isCreating}
                    onClick={handleCreateTeam}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Establishing…
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Launch Boardroom
                      </>
                    )}
                  </button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Boardroom;
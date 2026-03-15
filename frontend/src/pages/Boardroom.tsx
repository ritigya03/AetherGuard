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
  FileCode,
  Share2,
  Copy,
  CheckCircle2,
  History,
  Database,
  Globe
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
  type TeamStrategy,
  type CollaborativeState,
  type ActiveProposal
} from "@/lib/fileverseStore";
import { getTradeProposal, type TradeProposal } from "@/lib/claude";
import { X, ThumbsUp, ArrowBigUp, Loader2 } from "lucide-react";

const Boardroom = () => {
  const [teams, setTeams] = useState<TeamStrategy[]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamStrategy | null>(null);
  const [collab, setCollab] = useState<CollaborativeState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [signedProposals, setSignedProposals] = useState<Record<string, string[]>>({});
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

  const refresh = () => {
    const all = getAllTeamStrategies();
    const active = getActiveTeam();
    console.log(`[AetherGuard] 🔄 Refreshing state. Registry size: ${all.length}`, all.map(t => t.name));
    setTeams(all);
    setActiveTeam(active);
    
    // Auto-select first room if none is active
    if (!active && all.length > 0) {
      console.log(`[AetherGuard] 🎯 Auto-selecting first room: ${all[0].name}`);
      setActiveTeamId(all[0].id);
      setActiveTeam(all[0]);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Force close any stuck modals on refresh
      setNewTeamOpen(false);
      setIsSyncing(false);
      setIsHydrating(false);

      const accounts = await (window as any).ethereum?.request({ method: "eth_accounts" });
      if (accounts?.[0]) {
        const addr = accounts[0].toLowerCase();
        console.log("%c[AetherGuard] 🔌 Wallet Connected:", "color:#34d399;font-weight:bold", addr);
        setUserAddress(addr);
        const params = new URLSearchParams(window.location.search);
        const inviteDocId = params.get("invite");
        setIsHydrating(true);
        try {
          console.log("[AetherGuard] 💧 Hydrating from Fileverse...");
          await hydrateFromFileverse(addr, inviteDocId || undefined);
        } finally {
          setIsHydrating(false);
          const current = getAllTeamStrategies();
          console.log(`[AetherGuard] 💧 Hydration finished. Found ${current.length} teams.`);
          refresh();
        }
      } else {
        console.warn("[AetherGuard] ⚠️ No wallet accounts found.");
        refresh();
      }
    };
    init();

    const handleBackgroundFound = () => {
      console.log("%c[AetherGuard] 🚀 Background discovery update detected. Refreshing UI...", "color:#34d399;font-weight:bold");
      refresh();
    };
    window.addEventListener("ag-discovery-found", handleBackgroundFound);
    return () => window.removeEventListener("ag-discovery-found", handleBackgroundFound);
  }, []);

  useEffect(() => {
    if (activeTeam?.docId) {
      handleSync();
    }
  }, [activeTeam?.id]);

  const handleSync = async () => {
    if (!activeTeam?.docId) return;
    setIsSyncing(true);
    try {
      const state = await fetchCollaborativeState(activeTeam.docId);
      setCollab(state);
      if (state?.sharedGoal) setEditedGoal(state.sharedGoal);
    } catch (err) {
      console.error("[AetherGuard:v2] Workspace Sync Error:", err);
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
      await addCommentToProposal(
        activeTeam.docId,
        proposalId,
        userAddress.slice(0, 6),
        comment
      );
      setCommentInputs(prev => ({ ...prev, [proposalId]: "" }));
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
      if (liveLink && liveLink.startsWith("http")) {
        const all = getAllTeamStrategies();
        const idx = all.findIndex(t => t.id === activeTeam.id);
        if (idx !== -1 && !all[idx].docLink) {
          all[idx].docLink = liveLink;
          saveAllTeamStrategies(all);
          setActiveTeam(prev => prev ? { ...prev, docLink: liveLink } : prev);
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
      console.log("[AetherGuard] 🤖 Summoning AI Agent with consensus context...");
      const context = getAgentContext(collab || undefined);
      const goalStr = collab?.sharedGoal || activeTeam.goal || "Optimize portfolio";
      const proposal = await getTradeProposal(
        goalStr,
        "L2-Verified-Root",
        [],
        undefined,
        context
      );
      setDraftProposal(proposal);
    } catch (err) {
      console.error("Agent failed to respond", err);
    } finally {
      setIsSummoning(false);
    }
  };

  const handlePromoteDraft = async () => {
    if (!activeTeam?.docId || !userAddress || !draftProposal) return;
    try {
      console.log("[AetherGuard] 🚀 Promoting AI draft to multi-sig queue...");
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
      timestamp: new Date().toLocaleDateString()
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

  return (
    <div className="relative min-h-screen pt-24 pb-12 z-0">
      <div className="container mx-auto px-6 relative z-20 pointer-events-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Boardroom
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-display">
              Collaborative multi-sig strategies & team coordination.
            </p>
          </div>
          <button
            onClick={() => setNewTeamOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-display text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Establish New Team
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Team Registry
                  {teams.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/20 animate-pulse">
                      {teams.length}
                    </span>
                  )}
                </span>
                <div className="flex gap-3">
                  {isHydrating && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
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
                    className={`flex items-center gap-1 hover:text-white transition-colors ${teams.length === 0 ? "animate-pulse text-primary font-black" : ""}`}
                    title="Deep Search Portal"
                  >
                    <Search className="w-3 h-3" />
                    <span className="text-[8px] tracking-tighter">FIND</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("NUCLEAR RESET: This will wipe all local boardroom data and re-sync fresh from Fileverse. Fixes most ID and sync issues. Continue?")) return;
                      clearTeamRegistry();
                      setIsHydrating(true);
                      try {
                        await hydrateFromFileverse(userAddress, undefined, true);
                        // Force a reload to ensure clean state
                        window.location.reload();
                      } finally {
                        setIsHydrating(false);
                      }
                    }}
                    className="flex items-center gap-1 hover:text-primary transition-colors animate-pulse"
                    title="Nuclear Sync Reset (Wipes Cache & Re-scans)"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                    <span className="text-[8px] tracking-tighter text-red-500 font-bold">NUCLEAR</span>
                  </button>
                </div>
              </h3>
              <div className="space-y-2">
                {console.log(`[AetherGuard] UI Rendering: ${teams.length} teams in registry state.`)}
                {teams.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-white/20" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground px-4 leading-relaxed">
                      {isHydrating 
                        ? "Deep scanning portal for boardrooms where you are a signer..." 
                        : "No boardrooms found locally. Click the pulsing Search icon above to scan the network."}
                    </p>
                  </div>
                ) : (
                  teams.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTeamId(t.id);
                        refresh();
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                        activeTeam?.id === t.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{t.name || `Boardroom #${t.number}`}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">{t.multiSig?.signers?.length || 0} Signers</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-9">
            {activeTeam ? (
              <div key={activeTeam.id} className="grid grid-cols-1 lg:grid-cols-9 gap-6">
                <div className="lg:col-span-6 space-y-6">
                  <div className="glass rounded-2xl border border-primary/30 overflow-hidden flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <h2 className="text-sm font-bold text-foreground">Boardroom Workspace</h2>
                          <div className="text-[10px] text-primary font-medium uppercase">{activeTeam.name}</div>
                          {activeTeam.creatorAddress && (
                            <div className={`mt-0.5 inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                              userAddress && activeTeam.creatorAddress === userAddress
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-white/5 border-white/10 text-muted-foreground"
                            }`}>
                              {userAddress && activeTeam.creatorAddress === userAddress
                                ? "👑 You own this"
                                : `Owner: ${activeTeam.creatorAddress.slice(0, 6)}...${activeTeam.creatorAddress.slice(-4)}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                             if (!activeTeam?.id || !collab) return;
                             setIsSyncing(true);
                             try {
                                await syncTeamStrategyDoc(activeTeam.id, collab);
                                console.log("%c[AetherGuard] 🚀 Forced professional template sync triggered.", "color:#34d399;font-weight:bold");
                                // Wait a bit for portal to catch up
                                setTimeout(handleSync, 1000);
                             } finally {
                                setIsSyncing(false);
                             }
                          }}
                          disabled={isSyncing}
                          className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                          title="Force Professional Template Upgrade"
                        >
                          <Database className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                        </button>
                        <button
                          onClick={handleSync}
                          disabled={isSyncing}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                          title="Refresh Consensus"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          onClick={handleShareLink}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-primary transition-all flex items-center gap-2"
                          title="Copy Invite Link"
                        >
                          {copiedId === "share" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-[10px] font-bold text-green-400">Copied!</span>
                            </>
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={handleOpenDoc}
                          disabled={isOpeningDoc}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-all font-display disabled:opacity-70"
                        >
                          {isOpeningDoc ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3 h-3" />
                          )}
                          {isOpeningDoc ? "Opening..." : "Open dDoc"}
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-8 flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Current Consensus Goal
                          </label>
                          <button
                            onClick={() => setIsEditingGoal(!isEditingGoal)}
                            className="text-[9px] text-primary hover:underline"
                          >
                            {isEditingGoal ? "Cancel" : "Edit Goal"}
                          </button>
                        </div>
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 min-h-[80px] flex flex-col justify-center">
                          {isSyncing ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Fetching dDoc consensus...</span>
                            </div>
                          ) : isEditingGoal ? (
                            <div className="space-y-3">
                              <textarea
                                value={editedGoal}
                                onChange={e => setEditedGoal(e.target.value)}
                                className="w-full bg-black/40 border border-primary/30 rounded-lg p-3 text-sm focus:outline-none"
                                rows={3}
                              />
                              <button
                                onClick={handleUpdateGoal}
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg"
                              >
                                Update Team Goal
                              </button>
                            </div>
                          ) : collab?.sharedGoal ? (
                            <p className="text-sm text-foreground leading-relaxed italic">"{collab.sharedGoal}"</p>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                              <Search className="w-5 h-5 mb-2 opacity-20" />
                              <p className="text-[10px]">No goal defined yet in dDoc</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                          <Shield className="w-3 h-3" /> Shared Governing Rules
                        </label>
                        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 min-h-[60px] font-mono whitespace-pre-wrap">
                          <p className="text-xs text-foreground/80 leading-relaxed">
                            {collab?.sharedRules || "No rules established yet. Propose rules below."}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                          <RefreshCw className="w-3 h-3" />
                          Pending Proposals & Voting
                        </label>
                        <div className="space-y-2">
                          {!collab?.pendingRuleProposals.length && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] text-muted-foreground italic">
                              No pending rule proposals.
                            </div>
                          )}
                          {collab?.pendingRuleProposals.map((p, i) => (
                            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                              <div className="text-[10px] text-foreground font-mono leading-relaxed">"{p.rule}"</div>
                              <div className="flex items-center justify-between">
                                <div className="text-[8px] text-muted-foreground uppercase flex items-center gap-1">
                                  By {p.author} • {p.timestamp}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleReaction(i)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all ${
                                      p.reactions.some(r => r.includes(userAddress.slice(0, 6)))
                                        ? "bg-primary/20 border-primary/30 text-primary"
                                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                                    }`}
                                  >
                                    <ThumbsUp className="w-2.5 h-2.5" />
                                    +1 ({p.reactions.length})
                                  </button>
                                  {p.reactions.length >= activeTeam.multiSig.threshold && (
                                    <button
                                      onClick={() => handlePromoteRule(i)}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
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
                      </div>

                      {collab?.activeProposals && collab.activeProposals.filter(p => p.status === "approved" || p.status === "rejected").length > 0 && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <History className="w-3 h-3" />
                            Execution & Decision History
                          </label>
                          <div className="overflow-x-auto rounded-xl border border-white/5">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                  <th className="px-4 py-2 text-[9px] text-muted-foreground uppercase">Date</th>
                                  <th className="px-4 py-2 text-[9px] text-muted-foreground uppercase">Rule</th>
                                  <th className="px-4 py-2 text-[9px] text-muted-foreground uppercase">Status</th>
                                  <th className="px-4 py-2 text-[9px] text-muted-foreground uppercase">Author</th>
                                  <th className="px-4 py-2 text-[9px] text-muted-foreground uppercase">Votes</th>
                                  <th className="px-4 py-2 text-[9px] text-muted-foreground uppercase">Tx</th>
                                </tr>
                              </thead>
                              <tbody>
                                {collab.activeProposals
                                  .filter(p => p.status === "approved" || p.status === "rejected")
                                  .map(p => (
                                    <tr key={p.id} className="border-b border-white/5 bg-white/5">
                                      <td className="px-4 py-3 text-muted-foreground">{p.timestamp.split(",")[0]}</td>
                                      <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          p.status === "approved"
                                            ? "bg-green-500/10 text-green-400"
                                            : "bg-red-500/10 text-red-400"
                                        }`}>
                                          {p.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground font-mono">{p.proposedBy.slice(0, 6)}...</td>
                                      <td className="px-4 py-3 text-muted-foreground">{p.votes.length} Votes</td>
                                      <td className="px-4 py-3 font-mono text-[10px] text-primary">Tx: 0x...</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          Manual Trade Suggestions
                        </label>
                        <div className="space-y-2">
                          {!collab?.manualTradeSuggestions.length && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] text-muted-foreground italic">
                              No manual suggestions yet.
                            </div>
                          )}
                          {collab?.manualTradeSuggestions.map((s, i) => (
                            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                              <div className="space-y-1 overflow-hidden">
                                <div className="text-[10px] text-foreground/70 truncate">{s.suggestion}</div>
                                <div className="text-[8px] text-muted-foreground/50 uppercase">
                                  By {s.author} • {s.timestamp}
                                </div>
                              </div>
                              <button
                                onClick={() => handlePromoteManualSuggestion(i)}
                                className="px-2 py-1 rounded bg-white/5 border border-primary/20 text-[8px] font-bold text-primary hover:bg-primary/10"
                              >
                                Promote
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          Active Trade Proposals (Multi-Sig)
                        </label>
                        <div className="space-y-3">
                          {!collab?.activeProposals.length && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] text-muted-foreground italic">
                              No active trade proposals pending.
                            </div>
                          )}
                          {collab?.activeProposals.map(p => (
                            <div key={p.id} className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 overflow-hidden">
                                  <div className="text-xs font-bold text-foreground truncate">{p.title}</div>
                                  <div className="text-[8px] text-muted-foreground uppercase">{p.proposedBy} • {p.timestamp}</div>
                                </div>
                                <div className={`text-[10px] font-black ${p.status === "approved" ? "text-green-400" : "text-primary"}`}>
                                  {p.votes.length} / {activeTeam.multiSig.threshold} Signed
                                </div>
                              </div>

                              {p.comments && p.comments.length > 0 && (
                                <div className="space-y-2 py-2 border-t border-white/5">
                                  {p.comments.map((c, ci) => (
                                    <div key={ci} className="text-[9px] text-muted-foreground leading-relaxed">
                                      <span className="font-bold text-primary">{c.address}</span>: {c.comment}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  placeholder="Add comment..."
                                  value={commentInputs[p.id] || ""}
                                  onChange={e => setCommentInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") handleAddComment(p.id);
                                  }}
                                  className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-[9px] focus:outline-none focus:border-primary/40"
                                />
                                <button
                                  onClick={() => handleAddComment(p.id)}
                                  className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between py-2 border-t border-white/5">
                                <div className="flex -space-x-2">
                                  {p.votes.map(v => (
                                    <div
                                      key={v.address}
                                      className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[8px] font-bold text-primary uppercase"
                                      title={v.address}
                                    >
                                      {v.address.slice(0, 2)}
                                    </div>
                                  ))}
                                  {Array.from({ length: Math.max(0, activeTeam.multiSig.threshold - p.votes.length) }).map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-white/5 border-2 border-background border-dashed" />
                                  ))}
                                </div>

                                {p.status === "approved" ? (
                                  <button
                                    onClick={() => handleExecuteProposal(p.id)}
                                    className="px-4 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                                  >
                                    Execute Multi-Sig
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSignProposal(p.id)}
                                    disabled={p.votes.some(v => v.address.toLowerCase() === userAddress.toLowerCase())}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                      p.votes.some(v => v.address.toLowerCase() === userAddress.toLowerCase())
                                        ? "bg-green-500/20 text-green-500 border border-green-500/20"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                                  >
                                    {p.votes.some(v => v.address.toLowerCase() === userAddress.toLowerCase()) ? "Signed" : "Sign Multi-Sig"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">Consensus powered by Fileverse dDocs</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] text-green-500 font-bold uppercase">Sync Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  <div className="glass rounded-xl p-6 border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-6">
                      <Shield className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Multi-Sig Policy</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-bold text-primary uppercase">Threshold</label>
                          <span className="text-xs font-mono font-bold text-primary">
                            {activeTeam.multiSig.threshold} of {activeTeam.multiSig.signers.length}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max={activeTeam.multiSig.signers.length}
                          value={activeTeam.multiSig.threshold}
                          readOnly
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none accent-primary cursor-default opacity-50"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-primary uppercase">Signer List</label>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                          {activeTeam.multiSig?.signers?.map(signer => (
                            <div key={signer} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${userAddress === signer.toLowerCase() ? "bg-primary animate-pulse" : "bg-white/20"}`} />
                                <span className="text-[10px] font-mono text-foreground">
                                  {signer.slice(0, 10)}...{signer.slice(-8)}
                                </span>
                                {signer.toLowerCase() === activeTeam.creatorAddress?.toLowerCase() && (
                                  <span className="text-[8px] px-1 bg-primary/20 text-primary rounded border border-primary/20">OWNER</span>
                                )}
                              </div>
                              {userAddress === signer.toLowerCase() && (
                                <span className="text-[9px] text-primary font-bold">YOU</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic leading-relaxed">
                          <Shield className="w-3 h-3 flex-shrink-0" />
                          Policy is cryptographically tied to the boardroom dDoc audit trail.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-6 border border-white/10">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Boardroom Info</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-1 uppercase">Doc Created</div>
                        <div className="text-xs font-mono">
                          {activeTeam.createdAt
                            ? new Date(activeTeam.createdAt).toLocaleDateString()
                            : "Established"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-1 uppercase">Protocol</div>
                        <div className="text-xs font-mono">AetherGuard v2 Collab</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[400px] text-center glass rounded-2xl border border-white/5"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-primary/40" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Select or Create a Boardroom</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  {teams.length > 0
                    ? "Choose a team strategy from the registry on the left to enter the boardroom workspace."
                    : "You haven't established any team strategies yet. Boardrooms allow you to coordinate with partners."}
                </p>
                <button
                  onClick={() => setNewTeamOpen(true)}
                  className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  Establish Team Room
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {newTeamOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass rounded-2xl p-8 w-full max-w-xl border border-primary/30 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Establish Team Strategy</h2>
                    <p className="text-xs text-muted-foreground">Creates a dedicated collaborative Fileverse boardroom doc.</p>
                  </div>
                </div>
                <button onClick={() => setNewTeamOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">
                    Team Strategy Name
                  </label>
                  <input
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Alpha DAO Treasury, Family Fund..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">
                    Foundational Goal
                  </label>
                  <textarea
                    value={teamGoal}
                    onChange={e => setTeamGoal(e.target.value)}
                    placeholder="Describe the shared direction of this team fund..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">
                    Signer Governance (Signers: {signers.length + 1})
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-[10px] font-mono border border-primary/30">
                        You (Owner)
                      </span>
                      {signers.map(s => (
                        <div key={s} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 group">
                          <span className="text-[10px] font-mono text-muted-foreground">{s.slice(0, 10)}...</span>
                          <button
                            onClick={() => setSigners(signers.filter(x => x !== s))}
                            className="text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={signerInput}
                        onChange={e => setSignerInput(e.target.value)}
                        placeholder="Add partner wallet 0x..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary/50"
                      />
                      <button
                        onClick={() => {
                          if (signerInput.startsWith("0x") && signerInput.length === 42) {
                            setSigners([...signers, signerInput.toLowerCase()]);
                            setSignerInput("");
                          }
                        }}
                        className="px-4 bg-primary/10 text-primary rounded-xl border border-primary/30 hover:bg-primary/20 font-bold text-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setNewTeamOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-muted-foreground text-sm font-bold border border-white/10 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!teamName || !teamGoal || isCreating}
                  onClick={handleCreateTeam}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isCreating ? "Establishing..." : "Launch Boardroom"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ParticleBackground />
    </div>
  );
};

type ProposeRulePanelProps = {
  activeTeam: TeamStrategy;
  userAddress: string;
  onPropose: (val: string) => void;
};

const ProposeRulePanel = ({ activeTeam, userAddress, onPropose }: ProposeRulePanelProps) => {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) return;
    onPropose(value.trim());
    setValue("");
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Plus className="w-3 h-3" /> Propose Rule
      </span>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. Max 5% SL..."
          className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-primary/50"
          onKeyDown={e => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          onClick={submit}
          className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all font-display"
        >
          PROPOSE
        </button>
      </div>
      <ParticleBackground />
    </div>
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
  activeTeam, 
  userAddress, 
  onSuggest, 
  onSummonAI, 
  isSummoning, 
  draftProposal, 
  onPromoteDraft,
  onDiscardDraft
}: SuggestTradePanelProps) => {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) return;
    onSuggest(value.trim());
    setValue("");
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-primary" /> Suggest Trade
        </span>
        <button
          onClick={onSummonAI}
          disabled={isSummoning}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[8px] font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
        >
          {isSummoning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Bot className="w-2.5 h-2.5" />}
          {isSummoning ? "CONSULTING AI..." : "ASK AI ASSISTANT"}
        </button>
      </div>

      <div className="flex gap-2">
        <textarea
          rows={1}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. Rotate part of ETH to WBTC..."
          className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-primary/50 resize-none"
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all font-display"
        >
          SUGGEST
        </button>
      </div>

      <AnimatePresence>
        {draftProposal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-3 relative z-10"
          >
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                   <Bot className="w-3 h-3 text-primary" />
                   <span className="text-[9px] font-bold text-primary uppercase">Draft Proposal</span>
                </div>
                <button onClick={onDiscardDraft} className="text-muted-foreground hover:text-foreground">
                   <X className="w-2.5 h-2.5" />
                </button>
             </div>
             
             <div className="space-y-1">
                <div className="text-[10px] font-bold text-foreground">
                   {draftProposal.action.toUpperCase()} {draftProposal.token} @ {draftProposal.allocationPercent}%
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                   "{draftProposal.reasoning.slice(0, 100)}..."
                </p>
             </div>

             <div className="flex gap-2 pt-1">
                <button 
                  onClick={onPromoteDraft}
                  className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-[9px] font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                >
                   <ArrowBigUp className="w-3 h-3" />
                   PROMOTE TO BOARDROOM
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Boardroom;
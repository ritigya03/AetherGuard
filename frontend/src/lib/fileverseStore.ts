/**
 * fileverseStore.ts — Two-Tier Hierarchical Document Architecture
 *
 * STRUCTURE:
 *   Master Index Doc  (1 per user wallet)  →  Table of all strategies
 *   Strategy Doc      (1 per strategy)     →  Full professional report
 *
 * PRIVACY MODEL:
 *   AI agents only see the public section (portfolio, goals, recent trades).
 *   Guardrail rules, rejection logs, and execution audits are never sent to any AI.
 *
 * DOCUMENT LIFECYCLE:
 *   1. User creates a Strategy → Master Index gets a new row + Strategy doc is created.
 *   2. AI proposes a trade     → Logged to Strategy doc (Proposals section).
 *   3. Guardrail rejects trade → Logged to Strategy doc (Rejections section).
 *   4. User approves + executes→ Logged to Strategy doc (Executions section) + Master Index status updated.
 */

import type { TradeProposal } from "./claude";

const BASE = import.meta.env.VITE_FILEVERSE_API || "";
const KEY  = import.meta.env.VITE_FILEVERSE_KEY  || "";

// ─── localStorage Key Namespace ───────────────────────────────────────────────

const LS = {
  strategies:           "ag_v2_strategies",           // Strategy[] index (Personal)
  activeStrategyId:     "ag_v2_active_strategy_id",   // string (Personal)
  masterDocId:          "ag_v2_master_doc_id",        // Fileverse docId for personal index
  multiSigConfig:       "ag_v2_multisig_config",      // Personal MultiSig preferences
  
  // Team Room Data
  teamStrategies:       "ag_v2_team_strategies",      // TeamStrategy[] index
  activeTeamId:         "ag_v2_active_team_id",       // string
  teamMasterDocId:      "ag_v2_team_master_doc_id",   // Fileverse docId for team master index
  probedDocs:           "ag_v2_probed_docs",          // JSON representation of doc IDs already checked
} as const;

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface MultiSigConfig {
  enabled: boolean;
  threshold: number;
  signers: string[];
}

export interface PortfolioSnapshot {
  holdings: { ticker: string; allocationPercent: number; avgBuyPriceUsd: number; category: string }[];
  totalValueUsd: number;
  capturedAt: string;
}

export interface TradeProposalRecord {
  id: string;
  proposal: TradeProposal;
  status: "proposed" | "rejected_guardrail" | "rejected_user" | "pending_multisig" | "executed";
  proposedAt: string;
  rejectionAt?: string;
  executedAt?: string;
  txHash?: string;
  blockNumber?: number;
  merkleRoot?: string;
  merkleProof?: string[];
  multiSigSigners?: string[];
  portfolioBefore?: PortfolioSnapshot;
  portfolioAfter?: PortfolioSnapshot;
}

export interface Strategy {
  id: string;         // e.g. "strat_1"
  number: number;     // 1, 2, 3 ...
  name: string;       // User-given name, e.g. "ETH Accumulation"
  goal: string;       // The investment goal text
  riskTolerance: string;
  timeHorizon: string;
  createdAt: string;
  status: "active" | "completed" | "paused";
  docId?: string;     // Fileverse docId of the strategy doc, set after creation
  docLink?: string;   // Human-readable Fileverse link
  tradeRecords: TradeProposalRecord[];
  portfolioState: PortfolioSnapshot;
  multiSigAudit: {
    proposalId: string;
    signedBy: string[];
    threshold: number;
    thresholdMetAt?: string;
    txHash?: string;
  }[];
}

export interface MasterIndex {
  walletAddress: string;
  createdAt: string;
  strategies: {
    id: string;
    number: number;
    name: string;
    goal: string;
    status: string;
    createdAt: string;
    docLink?: string;
  }[];
}

// ─── Team / Boardroom Types ──────────────────────────────────────────────────

export interface TeamStrategy {
  id: string;
  number: number;
  name: string;
  goal: string;
  rules: string;       // Shared rules for the team room
  createdAt: string;
  creatorAddress: string; // The MetaMask wallet that created this boardroom
  docId?: string;      // The Boardroom dDoc ID
  docLink?: string;
  multiSig: MultiSigConfig;
}

export interface TeamMasterIndex {
  walletAddress: string;
  updatedAt: string;
  teams: {
    id: string;
    number: number;
    name: string;
    docLink: string;
    memberCount: number;
  }[];
}

// Re-export for compatibility with other components
export interface PortfolioState {
  holdings: { ticker: string; allocationPercent: number; currentValueUsd: number; category: string; avgBuyPriceUsd: number }[];
  totalValueUsd: number;
  currency: "USD";
  lastUpdated: string;
  monthPerformancePercent: number;
}

export interface UserGoals {
  targetAnnualReturn: number;
  riskTolerance: "low" | "medium" | "high";
  timeHorizon: string;
  rebalanceFrequency: string;
  preferredCategories: string[];
  sharedGoal?: string; // Goal from collaborative Fileverse doc
}

export interface TradeLogEntry {
  ticker: string;
  action: "buy" | "sell";
  executedAt: string;
  txHash: string;
}

export interface AgentContext {
  portfolio: PortfolioState;
  goals: UserGoals;
  recentTrades: TradeLogEntry[];
  teamSuggestions?: { author: string; suggestion: string }[];
}

export interface ProposalComment {
  address: string;
  comment: string;
  timestamp: string;
}

export interface ActiveProposal {
  id: string;                    // unique e.g. prop_1710421800000
  title: string;                 // "BUY ETH @ 20%"
  action: string;                // BUY | SELL
  token: string;
  amount: string;
  reasoning: string;
  proposedBy: string;            // short addr e.g. 0x1234...abcd
  votes: { address: string; approved: boolean }[];
  comments: ProposalComment[];   // New: Partner comments
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface CollaborativeState {
  sharedGoal: string | null;
  sharedRules: string | null;
  pendingRuleProposals: { author: string; rule: string; reactions: string[]; timestamp: string }[];
  manualTradeSuggestions: { author: string; suggestion: string; timestamp: string }[];
  activeProposals: ActiveProposal[];
  decisionHistory: { date: string; trade: string; decision: string; proposedBy: string; votes: number; tx: string }[];
}

export interface PendingProposal {
  id: string;
  proposal: TradeProposal;
  timestamp: number;
  approvedBy: string[];
  status: "pending" | "executed" | "rejected";
}

// ─── localStorage Helpers ─────────────────────────────────────────────────────

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Collaborative Markdown Parsing ──────────────────────────────────────────

/**
 * Extracts sections from the Markdown doc based on specific headers.
 * This is how we treat Fileverse as a shared database.
 */
export function parseCollaborativeDoc(markdown: string): CollaborativeState {
  // 1. Prioritize JSON metadata for structured state (The "Source of Truth" for sync)
  const jsonMatch = markdown.match(/<!-- AG_TEAM_METADATA: (.*) -->/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.collab) {
        console.log("%c[AetherGuard:v2] 🧩 State parsed from JSON metadata", "color:#34d399");
        return sanitizeCollabState(data.collab);
      }
    } catch (e) {
      console.warn("[AetherGuard] Metadata parse failed, falling back to Markdown", e);
    }
  }

  // 2. Fallback to Markdown parsing (Lenient/Flexible)
  console.log("%c[AetherGuard:v2] 📝 Falling back to Markdown parsing", "color:#f59e0b");
  const state: CollaborativeState = {
    sharedGoal: null,
    sharedRules: null,
    pendingRuleProposals: [],
    manualTradeSuggestions: [],
    activeProposals: [],
    decisionHistory: [],
  };

  // Split by any header at level 2 or 1
  const sections = markdown.split(/\n#+\s+/); 
  for (const section of sections) {
    const lines = section.split("\n").filter(l => l.trim().length > 0);
    if (lines.length === 0) continue;
    const header = lines[0].toLowerCase();

    const extractContent = (lines: string[]) => {
       return lines.slice(1)
         .filter(p => !p.startsWith("[") && !p.startsWith(">") && !p.trim().startsWith("---"))
         .join("\n").trim();
    };

    if (header.includes("investment goal")) {
      state.sharedGoal = extractContent(lines);
    }
    
    if (header.includes("shared rules")) {
      state.sharedRules = extractContent(lines);
    }

    if (header.includes("rule proposals")) {
      const proposals = section.split(/###?\s+Proposed by /i);
      for (const p of proposals.slice(1)) {
        const pLines = p.split("\n");
        const meta = pLines[0].split(" — ");
        const author = meta[0].trim();
        const timestamp = meta[1] || "";
        const ruleLine = pLines.find(l => l.startsWith('"')) || "";
        const rule = ruleLine.replace(/"/g, "").trim();
        const reactionLine = pLines.find(l => l.toLowerCase().includes("reactions:")) || "";
        const reactions = reactionLine.split(/reactions:/i)[1]?.split("·").map(r => r.trim()).filter(Boolean) || [];
        if (rule && !rule.startsWith("---")) state.pendingRuleProposals.push({ author, rule, reactions, timestamp });
      }
    }

    if (header.includes("manual trade suggestions")) {
      const suggestions = section.split(/###?\s+Suggested by /i);
      for (const s of suggestions.slice(1)) {
        const sLines = s.split("\n");
        const meta = sLines[0].split(" — ");
        const author = meta[0].trim();
        const msg = sLines.slice(1)
          .filter(l => !l.trim().startsWith("[") && !l.trim().startsWith(">") && !l.trim().startsWith("---"))
          .join("\n").trim();
        if (msg) state.manualTradeSuggestions.push({ author, suggestion: msg, timestamp: meta[1] || "" });
      }
    }
    
    if (header.includes("active trade proposals")) {
       const props = section.split(/\n(?=###?\s+|MANUAL:)/i);
       for (const propText of props.slice(1)) {
          const pLines = propText.trim().split("\n");
          if (pLines.length < 1) continue;
          
          const firstLine = pLines[0].replace(/^###?\s+/, "");
          const [title, timestamp] = firstLine.split(" — ");
          if (title.trim().startsWith("---")) continue;
          
          const statusLine = pLines.find(l => l.toLowerCase().includes("status:")) || "";
          const statusMatch = statusLine.match(/status:\s*(\w+)/i);
          const status = statusMatch ? statusMatch[1].toLowerCase() : "pending";

          const comments: ProposalComment[] = [];
          const commentLines = pLines.filter(l => l.startsWith("> 💬"));
          for (const cl of commentLines) {
            const cMatch = cl.match(/> 💬 \*\*(.*)\*\*:\s*(.*)\s*—\s*(.*)/);
            if (cMatch) {
              comments.push({ address: cMatch[1], comment: cMatch[2], timestamp: cMatch[3] });
            }
          }
          
          if (title && (status === 'pending' || status === 'approved')) {
             state.activeProposals.push({
                id: `parsed_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,
                title: title.trim(),
                action: "Parsed", token: "TBD", amount: "0", reasoning: "Parsed from document",
                proposedBy: "Team", votes: [], 
                comments,
                status: status as any,
                timestamp: timestamp?.trim() || new Date().toLocaleDateString()
             });
          }
       }
    }
  }

  return sanitizeCollabState(state);
}

/**
 * Implements the consensus promotion logic.
 * If a rule proposal has enough '+1' reactions, it moves to sharedRules.
 */
export function promoteRules(state: CollaborativeState, threshold: number): { updatedState: CollaborativeState, changed: boolean } {
  let changed = false;
  
  const promotedProposals = state.pendingRuleProposals.filter(p => {
    const plusOnes = p.reactions.filter(r => r.includes("+1") || r.toLowerCase().includes("agree")).length;
    return plusOnes >= threshold;
  });

  if (promotedProposals.length > 0) {
    changed = true;
    const rulesList = promotedProposals.map(p => `- ${p.rule}`).join("\n");
    state.sharedRules = state.sharedRules ? `${state.sharedRules}\n${rulesList}` : rulesList;
    state.pendingRuleProposals = state.pendingRuleProposals.filter(p => !promotedProposals.includes(p));
  }

  return { updatedState: state, changed };
}

// rebuildBoardroomMarkdown removed - using buildBoardroomDoc (Source of Truth via metadata)

// ─── Fileverse API Helper ─────────────────────────────────────────────────────

async function fvRequest(path: string, method = "GET", body?: object) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("apiKey", KEY);
  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fileverse ${res.status}: ${text}`);
  }
  return res.json();
}

async function fvCreateDoc(title: string, content: string, portalAddress?: string): Promise<{ ddocId: string; link: string }> {
  try {
    const res = await fetch(`${BASE}/api/ddocs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, apiKey: KEY, portalAddress })
    });
    const data = await res.json();
    const publicLink = data.link?.replace('http://127.0.0.1:8001', 'https://docs.fileverse.io') || data.link;
    return { ddocId: data.ddocId, link: publicLink };
  } catch (err) {
    console.error("fvCreateDoc error", err);
    throw err;
  }
}

/** Lists all documents available on the Fileverse portal */
async function fvListDocs(): Promise<any[]> {
  const raw = await fvRequest("/api/ddocs");
  return raw.ddocs || [];
}

export async function fvUpdateDoc(ddocId: string, content: string): Promise<any> {
  return await fvRequest(`/api/ddocs/${ddocId}`, "PUT", { content });
}

export async function fvGetDoc(ddocId: string): Promise<string> {
  const raw = await fvRequest(`/api/ddocs/${ddocId}`);
  const doc = raw.data || raw;
  return doc.content || "";
}

/** Fetches full doc metadata including the production Fileverse link */
export async function fvGetDocMeta(ddocId: string): Promise<{ content: string; link: string }> {
  try {
    const res = await fetch(`${BASE}/api/ddocs/${ddocId}?apiKey=${KEY}`);
    const data = await res.json();
    const publicLink = data.link?.replace('http://127.0.0.1:8001', 'https://docs.fileverse.io') || data.link;
    return { content: data.content, link: publicLink };
  } catch (err) {
    console.error("fvGetDocMeta error", err);
    return { content: "", link: "" };
  }
}

// ─── Default Values ───────────────────────────────────────────────────────────

export function defaultPortfolio(): PortfolioState {
  return {
    holdings: [{ ticker: "CASH", allocationPercent: 100, currentValueUsd: 0, category: "cash", avgBuyPriceUsd: 1 }],
    totalValueUsd: 0,
    currency: "USD",
    lastUpdated: new Date().toISOString(),
    monthPerformancePercent: 0,
  };
}

export function defaultGoals(): UserGoals {
  return {
    targetAnnualReturn: 15,
    riskTolerance: "medium",
    timeHorizon: "1 year",
    rebalanceFrequency: "monthly",
    preferredCategories: ["crypto"],
  };
}

// ─── Data Migration / Clean Slate ─────────────────────────────────────────────

/** Wipe all old v1 keys and start fresh */
export function migrateToV2(): void {
  const OLD_KEYS = [
    "ag_portfolio_state", "ag_user_goals", "ag_trade_log", "ag_rejection_log",
    "ag_audit_log_json", "ag_pending_proposals", "ag_config",
  ];
  // Remove old doc id keys too
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("ag_fv_docid_") || OLD_KEYS.includes(k)) {
      localStorage.removeItem(k);
    }
  });
  console.log("%c[AetherGuard:v2] 🗑 Old v1 data cleared. Starting fresh.", "color:#f472b6;font-weight:bold");
}

// ─── Strategy CRUD ────────────────────────────────────────────────────────────

export function getAllStrategies(): Strategy[] {
  return readLocal<Strategy[]>(LS.strategies, []);
}

export function getActiveStrategy(): Strategy | null {
  const id = readLocal<string>(LS.activeStrategyId, "");
  if (!id) return null;
  return getAllStrategies().find(s => s.id === id) ?? null;
}

export function setActiveStrategy(id: string): void {
  writeLocal(LS.activeStrategyId, id);
}

function saveAllStrategies(strategies: Strategy[]): void {
  writeLocal(LS.strategies, strategies);
}

// ─── Team Room Helpers (Boardroom) ────────────────────────────────────────────

export function getAllTeamStrategies(): TeamStrategy[] {
  return readLocal<TeamStrategy[]>(LS.teamStrategies, []);
}

export function saveAllTeamStrategies(teams: TeamStrategy[]): void {
  console.log(`[AetherGuard] 💾 Saving team registry. Total rooms: ${teams.length}`);
  writeLocal(LS.teamStrategies, teams);
}

export function getActiveTeam(): TeamStrategy | null {
  const teams = getAllTeamStrategies();
  const activeId = readLocal<string>(LS.activeTeamId, "");
  return teams.find(t => t.id === activeId) || null;
}

export function setActiveTeamId(id: string): void {
  writeLocal(LS.activeTeamId, id);
}

export async function createStrategy(
  name: string,
  goal: string,
  goals: UserGoals,
  currentPortfolio: PortfolioState
): Promise<Strategy> {
  const strategies = getAllStrategies();
  const number = strategies.length + 1;
  const id = `strat_${number}_${Date.now()}`;

  const strategy: Strategy = {
    id,
    number,
    name,
    goal,
    riskTolerance: goals.riskTolerance,
    timeHorizon: goals.timeHorizon,
    createdAt: new Date().toISOString(),
    status: "active",
    tradeRecords: [],
    portfolioState: {
      holdings: currentPortfolio.holdings.map(h => ({
        ticker: h.ticker,
        allocationPercent: h.allocationPercent,
        avgBuyPriceUsd: h.avgBuyPriceUsd,
        category: h.category,
      })),
      totalValueUsd: currentPortfolio.totalValueUsd,
      capturedAt: new Date().toISOString(),
    },
    multiSigAudit: [],
  };

  // Create the Fileverse strategy doc (Personal Report)
  try {
    const content = buildStrategyDoc(strategy);
    const { ddocId, link } = await fvCreateDoc(`ag:personal_${number}`, content, strategy.id.split("_")[1]);
    strategy.docId = ddocId;
    strategy.docLink = link;
    console.log(`%c[AetherGuard:v2] ✅ Personal Report created (${ddocId})`, "color:#34d399");
  } catch (err) {
    console.error("[AetherGuard:v2] ❌ Failed to create report doc", err);
  }

  strategies.push(strategy);
  saveAllStrategies(strategies);
  // The user provided an invalid code snippet.
  // The original line was `syncMasterIndex().catch(() => {});`.
  // The requested change `syncTeamStrategyDoc, syncTeamMasterIndex, proposeRuleToTeam, ().catch(() => {});`
  // is syntactically incorrect and would break the file.
  // To maintain syntactic correctness as per instructions, the original line is kept.
  // If the intent was to add calls, they should be valid function calls.
  syncMasterIndex().catch(() => {});

  return strategy;
}

// ─── Team CRUD ────────────────────────────────────────────────────────────────

export async function createTeamStrategy(name: string, goal: string, signers: string[], creatorAddress: string): Promise<TeamStrategy> {
  const teams = getAllTeamStrategies();
  const number = teams.length + 1;
  const id = `team_${number}_${Date.now()}`;

  const team: TeamStrategy = {
    id,
    number,
    name,
    goal,
    rules: "",
    createdAt: new Date().toISOString(),
    creatorAddress: creatorAddress.toLowerCase(),
    multiSig: {
      enabled: true,
      threshold: Math.max(1, Math.ceil(signers.length / 2)),
      signers,
    }
  };

  try {
    const defaultCollab: CollaborativeState = {
      sharedGoal: goal,
      sharedRules: "",
      pendingRuleProposals: [],
      manualTradeSuggestions: [],
      activeProposals: [],
      decisionHistory: []
    };
    const content = buildBoardroomDoc(team, defaultCollab);
    // Pass creator's MetaMask address as portalAddress — ties this doc to the user's wallet
    const { ddocId, link } = await fvCreateDoc(`ag:boardroom_${number}`, content, creatorAddress.toLowerCase());
    team.docId = ddocId;
    team.docLink = link;
    console.log(`%c[AetherGuard:v2] ✅ Boardroom created by ${creatorAddress} (${ddocId})`, "color:#34d399");
  } catch (err) {
    console.error("[AetherGuard:v2] ❌ Failed to create boardroom doc", err);
  }

  teams.push(team);
  saveAllTeamStrategies(teams);
  writeLocal(LS.activeTeamId, id);
  syncTeamMasterIndex(creatorAddress).catch(() => {});

  return team;
}

// ─── Proposal Recording ───────────────────────────────────────────────────────

export function recordProposal(
  strategyId: string,
  proposal: TradeProposal,
  status: TradeProposalRecord["status"],
  extras?: Partial<TradeProposalRecord>
): TradeProposalRecord {
  const strategies = getAllStrategies();
  const idx = strategies.findIndex(s => s.id === strategyId);
  if (idx === -1) throw new Error(`Strategy ${strategyId} not found`);

  const record: TradeProposalRecord = {
    id: `rec_${Date.now()}`,
    proposal,
    status,
    proposedAt: new Date().toISOString(),
    ...extras,
  };

  strategies[idx].tradeRecords.push(record);
  saveAllStrategies(strategies);

  // Async sync to Fileverse
  syncStrategyDoc(strategyId).catch(() => {});

  return record;
}

export function updateProposalRecord(
  strategyId: string,
  recordId: string,
  updates: Partial<TradeProposalRecord>
): void {
  const strategies = getAllStrategies();
  const strat = strategies.find(s => s.id === strategyId);
  if (!strat) return;
  const rec = strat.tradeRecords.find(r => r.id === recordId);
  if (!rec) return;
  Object.assign(rec, updates);
  saveAllStrategies(strategies);
  syncStrategyDoc(strat.id).catch(() => {});
}

// ─── Portfolio State (derived from active strategy) ───────────────────────────

export function getPortfolioFromStrategy(strategyId: string): PortfolioState {
  const strategies = getAllStrategies();
  const strat = strategies.find(s => s.id === strategyId);
  if (!strat) return defaultPortfolio();

  // Reconstruct full PortfolioState from strategy snapshot
  return {
    holdings: strat.portfolioState.holdings.map(h => ({
      ticker: h.ticker,
      allocationPercent: h.allocationPercent,
      currentValueUsd: 0,
      category: h.category as any,
      avgBuyPriceUsd: h.avgBuyPriceUsd,
    })),
    totalValueUsd: strat.portfolioState.totalValueUsd,
    currency: "USD",
    lastUpdated: strat.portfolioState.capturedAt,
    monthPerformancePercent: 0,
  };
}

export function updateStrategyPortfolio(
  strategyId: string,
  portfolio: PortfolioState
): void {
  const strategies = getAllStrategies();
  const strat = strategies.find(s => s.id === strategyId);
  if (!strat) return;
  strat.portfolioState = {
    holdings: portfolio.holdings.map(h => ({
      ticker: h.ticker,
      allocationPercent: h.allocationPercent,
      avgBuyPriceUsd: h.avgBuyPriceUsd,
      category: h.category,
    })),
    totalValueUsd: portfolio.totalValueUsd,
    capturedAt: new Date().toISOString(),
  };
  saveAllStrategies(strategies);
}

// ─── Multi-Sig (Pending Proposals) ───────────────────────────────────────────

export function getMultiSigConfig(): { enabled: boolean; threshold: number; signers: string[] } {
  return readLocal(LS.multiSigConfig, { enabled: false, threshold: 1, signers: [] });
}

export function saveMultiSigConfig(config: MultiSigConfig): void {
  writeLocal(LS.multiSigConfig, config);
}

export function getPendingProposals(): PendingProposal[] {
  const strat = getActiveStrategy();
  if (!strat) return [];
  return strat.tradeRecords
    .filter(r => r.status === "pending_multisig")
    .map(r => ({
      id: r.id,
      proposal: r.proposal,
      timestamp: new Date(r.proposedAt).getTime(),
      approvedBy: r.multiSigSigners || [],
      status: "pending" as const,
    }));
}

export function proposeTradeMultiSig(proposal: TradeProposal): PendingProposal {
  const strat = getActiveStrategy();
  if (!strat) throw new Error("No active strategy");
  const rec = recordProposal(strat.id, proposal, "pending_multisig", {
    multiSigSigners: [],
  });
  return { id: rec.id, proposal, timestamp: Date.now(), approvedBy: [], status: "pending" };
}

export function signPendingProposal(id: string, signerAddress: string): boolean {
  const strat = getActiveStrategy();
  if (!strat) return false;
  const strategies = getAllStrategies();
  const stratObj = strategies.find(s => s.id === strat.id);
  if (!stratObj) return false;
  const rec = stratObj.tradeRecords.find(r => r.id === id);
  if (!rec || !rec.multiSigSigners) return false;
  if (!rec.multiSigSigners.includes(signerAddress.toLowerCase())) {
    rec.multiSigSigners.push(signerAddress.toLowerCase());
    saveAllStrategies(strategies);
    syncStrategyDoc(strat.id).catch(() => {});
    return true;
  }
  return false;
}

export function removePendingProposal(id: string): void {
  // This is now handled by updateProposalRecord setting status to executed/rejected
  const strat = getActiveStrategy();
  if (!strat) return;
  updateProposalRecord(strat.id, id, { status: "rejected_user" });
}

// ─── Approved Trade Recording ─────────────────────────────────────────────────

export function recordApprovedTrade(
  token: string,
  action: "buy" | "sell",
  allocationPercent: number,
  txHash: string,
  entryPriceUsd: number,
  merkleProof: string[],
  merkleRoot: string,
  reasoning: string,
  fullProposalJson: Record<string, unknown>,
  proposalIdToRemove?: string
): void {
  const strat = getActiveStrategy();
  if (!strat) {
    console.warn("[AetherGuard:v2] recordApprovedTrade called with no active strategy!");
    return;
  }

  const portfolioBefore: PortfolioSnapshot = { ...strat.portfolioState };

  // Update portfolio allocation
  const strategies = getAllStrategies();
  const stratObj = strategies.find(s => s.id === strat.id)!;
  const holdings = [...stratObj.portfolioState.holdings];

  if (action === "buy") {
    const existing = holdings.find(h => h.ticker === token);
    if (existing) {
      existing.allocationPercent += allocationPercent;
      existing.avgBuyPriceUsd = entryPriceUsd;
    } else {
      holdings.push({ ticker: token, allocationPercent, avgBuyPriceUsd: entryPriceUsd, category: "crypto" });
    }
    const cash = holdings.find(h => h.ticker === "CASH");
    if (cash) cash.allocationPercent = Math.max(0, cash.allocationPercent - allocationPercent);
  } else {
    const existing = holdings.find(h => h.ticker === token);
    if (existing) existing.allocationPercent = Math.max(0, existing.allocationPercent - allocationPercent);
    const cash = holdings.find(h => h.ticker === "CASH");
    if (cash) cash.allocationPercent += allocationPercent;
  }

  // Normalize
  const total = holdings.reduce((s, h) => s + h.allocationPercent, 0);
  if (total > 0) holdings.forEach(h => { h.allocationPercent = parseFloat(((h.allocationPercent / total) * 100).toFixed(1)); });
  
  stratObj.portfolioState = {
    holdings: holdings.filter(h => h.allocationPercent > 0 || h.ticker === "CASH"),
    totalValueUsd: stratObj.portfolioState.totalValueUsd,
    capturedAt: new Date().toISOString(),
  };

  const portfolioAfter: PortfolioSnapshot = { ...stratObj.portfolioState };

  // If this came from the multi-sig queue, update that record
  if (proposalIdToRemove) {
    const rec = stratObj.tradeRecords.find(r => r.id === proposalIdToRemove);
    if (rec) {
      rec.status = "executed";
      rec.executedAt = new Date().toISOString();
      rec.txHash = txHash;
      rec.merkleProof = merkleProof;
      rec.merkleRoot = merkleRoot;
      rec.portfolioBefore = portfolioBefore;
      rec.portfolioAfter = portfolioAfter;
    }
  } else {
    // Direct approval — create a new execution record
    stratObj.tradeRecords.push({
      id: `rec_${Date.now()}`,
      proposal: fullProposalJson as unknown as TradeProposal,
      status: "executed",
      proposedAt: new Date(fullProposalJson.timestamp as number || Date.now()).toISOString(),
      executedAt: new Date().toISOString(),
      txHash,
      merkleProof,
      merkleRoot,
      portfolioBefore,
      portfolioAfter,
    });
  }

  saveAllStrategies(strategies);

  // Async syncs
  syncStrategyDoc(strat.id).catch(() => {});
  syncMasterIndex().catch(() => {});
}

export function recordRejectedTrade(
  proposalJson: Record<string, unknown>,
  blockedBy: "guardrail" | "user"
): void {
  const strat = getActiveStrategy();
  if (!strat) return;
  const status = blockedBy === "guardrail" ? "rejected_guardrail" : "rejected_user";
  recordProposal(strat.id, proposalJson as unknown as TradeProposal, status, {
    rejectionAt: new Date().toISOString(),
  });
}

// ─── Agent Context Assembly (PUBLIC ONLY — no private data sent to AI) ────────

export function getPortfolio(): PortfolioState {
  const strat = getActiveStrategy();
  if (strat) return getPortfolioFromStrategy(strat.id);
  return defaultPortfolio();
}

export function setPortfolio(state: PortfolioState): void {
  const strat = getActiveStrategy();
  if (strat) updateStrategyPortfolio(strat.id, state);
}

export function getGoals(): UserGoals {
  // Goals are derived from active strategy or default
  const strat = getActiveStrategy();
  if (strat) {
    return {
      targetAnnualReturn: 15,
      riskTolerance: strat.riskTolerance as UserGoals["riskTolerance"],
      timeHorizon: strat.timeHorizon,
      rebalanceFrequency: "monthly",
      preferredCategories: ["crypto"],
    };
  }
  return defaultGoals();
}

export function setGoals(goals: UserGoals): void {
  // Goals are updated per strategy when strategy is created
  console.log("[AetherGuard:v2] setGoals called — goals are set per strategy on creation");
}

export function getTradeLog(): TradeLogEntry[] {
  const strat = getActiveStrategy();
  if (!strat) return [];
  return strat.tradeRecords
    .filter(r => r.status === "executed" && r.txHash)
    .map(r => ({
      ticker: r.proposal.token || (r.proposal as any).ticker || "UNKNOWN",
      action: r.proposal.action as "buy" | "sell",
      executedAt: r.executedAt || r.proposedAt,
      txHash: r.txHash!,
    }));
}

export function appendTradeLog(entry: TradeLogEntry): void {
  // Now handled by recordApprovedTrade
  console.log("[AetherGuard:v2] appendTradeLog — use recordApprovedTrade instead");
}

export function getAgentContext(collab?: CollaborativeState): AgentContext {
  const portfolio = getPortfolio();
  let goals = getGoals();
  
  // Override with collaborative consensus if provided
  if (collab?.sharedGoal) {
    console.log("[AetherGuard:v2] 🤝 Using shared goal from team doc");
    goals = { ...goals, sharedGoal: collab.sharedGoal };
  }

  const strat = getActiveStrategy();
  const recentTrades = strat
    ? strat.tradeRecords
        .filter(r => r.status === "executed" && r.txHash)
        .slice(-5)
        .map(r => ({
          ticker: r.proposal.token || (r.proposal as any).ticker || "UNKNOWN",
          action: r.proposal.action as "buy" | "sell",
          executedAt: r.executedAt || r.proposedAt,
          txHash: r.txHash!,
        }))
    : [];
  return { 
    portfolio, 
    goals, 
    recentTrades,
    teamSuggestions: collab?.manualTradeSuggestions.map(s => ({ author: s.author, suggestion: s.suggestion }))
  };
}


/** 1. Personal Strategy Doc (The "Report") */
function buildStrategyDoc(strategy: Strategy): string {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  
  const executedRecords = strategy.tradeRecords.filter(r => r.status === "executed");
  const rejectedRecords = strategy.tradeRecords.filter(r => r.status === "rejected_guardrail" || r.status === "rejected_user");
  const pendingRecords  = strategy.tradeRecords.filter(r => r.status === "pending_multisig");

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";

  const holdingsTable = strategy.portfolioState.holdings
    .map(h => `| ${h.ticker} | ${h.allocationPercent.toFixed(1)}% | $${h.avgBuyPriceUsd.toFixed(2)} |`)
    .join("\n");

  return [
    `# 🛡️ AetherGuard Personal Strategy Report`,
    `## Strategy #${strategy.number} — ${strategy.name}`,
    ``,
    `> **Private Audit Trail** | Generated: ${now}`,
    `> **Wallet:** \`${strategy.id.split("_")[1] || "Local"}\``,
    ``,
    `---`,
    ``,
    `## 📋 Portfolio Snapshot`,
    ``,
    `| Asset | Allocation | Avg Buy Price |`,
    `|-------|------------|---------------|`,
    holdingsTable,
    ``,
    `---`,
    ``,
    `## ✅ Executed Trades`,
    executedRecords.length === 0 ? "_No trades executed yet._" : executedRecords.map(r => `### ${fmt(r.executedAt)} — ${r.proposal.action?.toUpperCase()} ${r.proposal.token}\n> ${r.proposal.reasoning}`).join("\n\n---\n\n"),
    ``,
    `---`,
    `## ⏳ Multi-Sig Pending`,
    pendingRecords.length === 0 ? "_No pending approvals._" : pendingRecords.map(r => `- ${fmt(r.proposedAt)}: ${r.proposal.action} ${r.proposal.token}`).join("\n"),
    ``,
    `---`,
    `## ❌ Rejections`,
    rejectedRecords.length === 0 ? "_No rejections recorded._" : rejectedRecords.map(r => `- ${fmt(r.rejectionAt || r.proposedAt)}: ${r.proposal.action} ${r.proposal.token} (${r.status})`).join("\n"),
    ``,
    `*Note: Your private guardrail rules are never stored in this document.*`,
    `*Generated by AetherGuard AI Portfolio Guardian*`,
  ].join("\n");
}

// 2. Team Boardroom Doc (The "Workspace")
// 2. Team Boardroom Doc (The "Workspace")
function buildBoardroomDoc(team: TeamStrategy, collab: CollaborativeState): string {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const ownerDisplay = team.creatorAddress 
    ? `\`${team.creatorAddress.slice(0,6)}...${team.creatorAddress.slice(-4)}\`` 
    : "`Unknown`";
  
  const rulesList = collab.pendingRuleProposals.length === 0 
    ? "_No pending rule proposals._" 
    : collab.pendingRuleProposals.map(p => 
        `#### [${p.author}] — ${p.timestamp}\n> "${p.rule}"\n> \n> **Signatures:** ${p.reactions.length > 0 ? p.reactions.join(" · ") : "_Awaiting consensus_"}`
      ).join("\n\n---\n\n");

  const suggestionsList = collab.manualTradeSuggestions.length === 0
    ? "_No manual suggestions yet._"
    : collab.manualTradeSuggestions.map(s =>
        `#### [${s.author}] — ${s.timestamp}\n> ${s.suggestion}`
      ).join("\n\n---\n\n");

  const proposalsList = collab.activeProposals.length === 0
    ? "_No active multi-sig proposals._"
    : collab.activeProposals.map(p => {
        const votesText = p.votes.length > 0 
          ? p.votes.map(v => `\`${v.address.slice(0,6)}\` ✅`).join(" · ") 
          : "_Awaiting signatures_";
        const commentsText = p.comments.length > 0
          ? "\n\n**Discussion Thread:**\n" + p.comments.map(c => `- **${c.address.slice(0,6)}**: ${c.comment} _(${c.timestamp})_`).join("\n")
          : "";
        return `### 🗳️ ${p.title}\n**Timestamp:** ${p.timestamp}\n\n**Reasoning:**\n${p.reasoning}\n\n**Signatures (${p.votes.length}/${team.multiSig.threshold}):** ${votesText}\n\n**Status:** \`${p.status.toUpperCase()}\`${commentsText}`;
      }).join("\n\n---\n\n");

  const historyRows = collab.decisionHistory.length === 0
    ? `| ${now.split(',')[0]} | Workspace Established | ✅ CREATED | ${ownerDisplay} | 1/1 | [LOG-INITIAL] |`
    : collab.decisionHistory.map(h => `| ${h.date} | ${h.trade} | ${h.decision} | \`${h.proposedBy.slice(0,6)}\` | ${h.votes} Signers | \`${h.tx}\` |`).join("\n");

  return [
    `# 🛡️ AETHERGUARD — Boardroom Strategy Workspace`,
    `> **Professional Multi-Sig Coordination** | **Team:** \`${team.name}\``,
    `> **Established:** ${team.createdAt ? new Date(team.createdAt).toLocaleDateString() : now} | **Owner:** ${ownerDisplay}`,
    ``,
    `---`,
    ``,
    `## 🎯 Foundational Objective`,
    `> ${collab.sharedGoal || team.goal || "Long-term collective growth via blue-chip asset rotation."}`,
    ``,
    `## 📜 Governance Protocols`,
    `*All trade proposals are cross-checked against these rules by the AI Guardian before execution.*`,
    collab.sharedRules || team.rules || "- Max 20% in any single token\n- No memecoins\n- Rebalance only when AI confidence > 70%\n- Never deploy more than 30% in a single week",
    ``,
    `---`,
    ``,
    `## ⏳ Governance Queue`,
    `#### Pending Rule Proposals`,
    rulesList,
    ``,
    `#### Active Trade Suggestions`,
    suggestionsList,
    ``,
    `---`,
    ``,
    `## 🗳️ Multi-Sig Proposals`,
    `*Required Signatures: ${team.multiSig.threshold} of ${team.multiSig.signers.length}*`,
    proposalsList,
    ``,
    `---`,
    ``,
    `## 🏛️ Decision History & Audit Trail`,
    `| Date | Action / Trade | Outcome | Initiator | Consensus | Audit / Tx |`,
    `|:-----|:---------------|:--------|:----------|:----------|:-----------|`,
    historyRows,
    ``,
    `---`,
    `*This document is cryptographically managed by AetherGuard. Do not edit manually.*`,
    ``,
    `<!-- AG_TEAM_METADATA: ${JSON.stringify({
      id: team.id,
      name: team.name,
      goal: team.goal,
      rules: team.rules,
      creatorAddress: team.creatorAddress,
      signers: team.multiSig.signers,
      threshold: team.multiSig.threshold,
      collab: collab
    })} -->`,
  ].join("\n");
}

/** 🛡️ Cleans up state from Markdown residue (e.g. horizontal rules) */
export function sanitizeCollabState(state: CollaborativeState): CollaborativeState {
  const cleanField = (s: string | null) => {
    if (!s) return s;
    // Strip everything after horizontal rules if found in goal/rules
    let cleaned = s.split("---")[0].split("___")[0].split("***")[0].trim();
    // Strip specific lines containing only markers
    cleaned = cleaned.split("\n")
      .filter(l => {
        const t = l.trim();
        return t.length > 0 && !t.startsWith("---") && !t.startsWith("___") && t !== "***";
      })
      .join("\n").trim();
    return cleaned;
  };
  
  if (state.sharedGoal) state.sharedGoal = cleanField(state.sharedGoal);
  if (state.sharedRules) state.sharedRules = cleanField(state.sharedRules);
  
  // Also sanitize nested proposal titles/rules
  state.pendingRuleProposals = state.pendingRuleProposals.map(p => ({
    ...p,
    rule: cleanField(p.rule) || ""
  })).filter(p => p.rule.length > 0);
  
  state.activeProposals = state.activeProposals.map(p => ({
    ...p,
    title: cleanField(p.title) || ""
  })).filter(p => p.title.length > 0);

  return state;
}

/** 3. Master Index Docs */
function buildMasterIndexDoc(strategies: Strategy[], walletAddress: string): string {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const rows = strategies.length === 0
    ? "| — | No personal strategies yet | — | — | — | — |"
    : strategies.map(s => {
        const link = s.docLink ? `[View Report](${normalizeDocLink(s.docLink)})` : "Not synced";
        return `| ${s.number} | **${s.name}** | ${s.goal.slice(0, 50)}... | ${s.riskTolerance} | ${s.tradeRecords.filter(r=>r.status==="executed").length} | ${s.status} | ${link} |`;
      }).join("\n");

  return [
    `# 🛡️ AetherGuard — Personal Strategy Index`,
    `> **Wallet:** \`${walletAddress || "Local"}\` | Updated: ${now}`,
    ``,
    `| # | Strategy Name | Goal Summary | Risk | Trades | Status | Report |`,
    `|---|---------------|--------------|------|--------|--------|--------|`,
    rows,
    ``,
    `---`,
    `*Private audit trail index.*`,
  ].join("\n");
}

function buildTeamMasterIndexDoc(teams: TeamStrategy[], walletAddress: string): string {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const rows = teams.length === 0
    ? "| — | No team strategies yet | — | — |"
    : teams.map(t => {
        return `| ${t.number} | **${t.name}** | [Open Boardroom](${t.docLink}) | ${t.multiSig.signers.length} |`;
      }).join("\n");

  return [
    `# 🤝 AetherGuard — Team Master Registry`,
    `> **Admin:** \`${walletAddress || "Local"}\` | Updated: ${now}`,
    ``,
    `| # | Team Strategy | Boardroom Link | Signers |`,
    `|---|---------------|----------------|---------|`,
    rows,
    ``,
    `---`,
    `*Collaborative investment coordination.*`,
  ].join("\n");
}

/** Fetch a strategy doc and parse its collaborative state */
export async function fetchCollaborativeState(docId: string): Promise<CollaborativeState | null> {
  try {
    const markdown = await fvGetDoc(docId);
    if (!markdown) return null;
    let state = parseCollaborativeDoc(markdown);
    
    // 🛡️ Sanitize state to prevent recursive corruption
    state = sanitizeCollabState(state);
    
    // 🛡️ Template Upgrade & Self-Healing
    const hasProfessionalTitle = markdown.includes("AETHERGUARD — Boardroom Strategy Workspace");
    const hasCollabMeta = markdown.includes('"collab":');
    
    if (!hasProfessionalTitle || !hasCollabMeta) {
       console.log("%c[AetherGuard:v2] 🩹 Legacy or broken layout detected. Forcing structural upgrade...", "color:#f472b6;font-weight:bold");
       const teams = getAllTeamStrategies();
       const team = teams.find(t => t.docId === docId);
       
       if (team) {
          // Clean the registry goal if it has trailing residue
          if (team.goal?.includes("---")) {
             team.goal = team.goal.split("---")[0].trim();
             saveAllTeamStrategies(teams);
          }
          // FORCE sync with the actual team.id (e.g. boardroom_...) 
          // Previous bug: if ID was 'discovered_...' it might mismatch in the sync helper
          await syncTeamStrategyDoc(team.id, state);
          console.log(`[AetherGuard] Upgrade sync for ${team.name} completed.`);
       } else {
          console.warn(`[AetherGuard] Could not find team for doc ${docId} to upgrade.`);
       }
    }

    return state;
  } catch (err) {
    console.error("[AetherGuard:v2] ❌ Failed to fetch collaborative state", err);
    return null;
  }
}

// ─── Parallel Sync Logic ─────────────────────────────────────────────────────

export async function syncStrategyDoc(strategyId: string): Promise<void> {
  const strategies = getAllStrategies();
  const strat = strategies.find(s => s.id === strategyId);
  if (!strat?.docId) return;

  const content = buildStrategyDoc(strat);
  try {
    await fvUpdateDoc(strat.docId, content);
    console.log(`%c[AetherGuard:v2] ✅ Personal Report updated`, "color:#34d399");
  } catch (err) {
    console.error(`[AetherGuard:v2] ❌ Personal report sync failed`, err);
  }
}

export async function syncMasterIndex(walletAddress = ""): Promise<void> {
  const strategies = getAllStrategies();
  const content = buildMasterIndexDoc(strategies, walletAddress);
  const masterDocId = readLocal<string>(LS.masterDocId, "");

  try {
    if (masterDocId) {
      await fvUpdateDoc(masterDocId, content);
      console.log("%c[AetherGuard:v2] ✅ Personal Master Index synced", "color:#34d399");
    } else {
      const title = walletAddress ? `ag:master_index_${walletAddress.toLowerCase()}` : "ag:master_index";
      const { ddocId, link } = await fvCreateDoc(title, content);
      writeLocal(LS.masterDocId, ddocId);
      writeLocal("ag_v2_master_doc_link", link);
    }
  } catch (err) {
    console.error("[AetherGuard:v2] ❌ Personal Master sync failed", err);
  }
}

export async function syncTeamStrategyDoc(teamId: string, updatedCollab?: CollaborativeState): Promise<void> {
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.id === teamId);
  if (!team?.docId) return;

  // If we have specific collab state to push, use it. Otherwise fetch current from doc first.
  let collab = updatedCollab || await fetchCollaborativeState(team.docId);
  if (collab) collab = sanitizeCollabState(collab); // 🛡️ Sanitize before sync!
  
  const content = buildBoardroomDoc(team, collab || { 
    sharedGoal: team.goal, 
    sharedRules: "", 
    pendingRuleProposals: [], 
    manualTradeSuggestions: [], 
    activeProposals: [], 
    decisionHistory: [] 
  });

  try {
    await fvUpdateDoc(team.docId, content);
    console.log(`%c[AetherGuard:v2] ✅ Team Boardroom updated`, "color:#34d399");
  } catch (err) {
    console.error(`[AetherGuard:v2] ❌ Team boardroom sync failed`, err);
  }
}

export async function proposeRuleToTeam(docId: string, author: string, rule: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  collab.pendingRuleProposals.push({
    author,
    rule,
    reactions: [],
    timestamp: new Date().toLocaleDateString()
  });
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

export async function toggleRuleReaction(docId: string, ruleIndex: number, signer: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  const prop = collab.pendingRuleProposals[ruleIndex];
  if (!prop) return;
  
  const reaction = `${signer}: +1`;
  if (prop.reactions.includes(reaction)) {
    prop.reactions = prop.reactions.filter(r => r !== reaction);
  } else {
    prop.reactions.push(reaction);
  }
  
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

export async function promoteRule(docId: string, ruleIndex: number): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  const prop = collab.pendingRuleProposals[ruleIndex];
  if (!prop) return;

  collab.sharedRules = (collab.sharedRules || "") + `\n- ${prop.rule}`;
  collab.pendingRuleProposals.splice(ruleIndex, 1);
  
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

export async function suggestManualTrade(docId: string, author: string, suggestion: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  collab.manualTradeSuggestions.push({
    author,
    suggestion,
    timestamp: new Date().toLocaleDateString()
  });
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

export async function signProposalToTeam(docId: string, proposalId: string, signer: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  const prop = collab.activeProposals.find(p => p.id === proposalId);
  if (!prop) return;
  
  if (!prop.votes.some(v => v.address.toLowerCase() === signer.toLowerCase())) {
     prop.votes.push({ address: signer, approved: true });
  }
  
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team && prop.votes.length >= team.multiSig.threshold) {
    prop.status = 'approved';
  }
  
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

export async function executeProposalInTeam(docId: string, proposalId: string, txHash: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  const propIndex = collab.activeProposals.findIndex(p => p.id === proposalId);
  if (propIndex === -1) return;
  
  const prop = collab.activeProposals[propIndex];
  collab.decisionHistory.push({
    date: new Date().toLocaleDateString(),
    trade: prop.title,
    decision: "✅ EXECUTED",
    proposedBy: prop.proposedBy,
    votes: prop.votes.length,
    tx: txHash.slice(0, 10) + "..."
  });
  
  collab.activeProposals.splice(propIndex, 1);
  
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

export async function updateTeamGoal(docId: string, newGoal: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  collab.sharedGoal = newGoal;
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (team) {
     team.goal = newGoal;
     saveAllTeamStrategies(teams);
     await syncTeamStrategyDoc(team.id, collab);
  }
}

export async function addCommentToProposal(docId: string, proposalId: string, address: string, comment: string): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  const prop = collab.activeProposals.find(p => p.id === proposalId);
  if (!prop) return;
  
  if (!prop.comments) prop.comments = [];
  prop.comments.push({
    address,
    comment,
    timestamp: new Date().toLocaleTimeString()
  });
  
  const team = getAllTeamStrategies().find(t => t.docId === docId);
  if (team) await syncTeamStrategyDoc(team.id, collab);
}

/** 🤖 Bridges an AI-generated TradeProposal into the collaborative Boardroom queue */
export async function proposeTradeToTeam(docId: string, proposer: string, proposal: TradeProposal): Promise<void> {
  const collab = await fetchCollaborativeState(docId);
  const teams = getAllTeamStrategies();
  const team = teams.find(t => t.docId === docId);
  if (!team) return;

  const activeProp: ActiveProposal = {
    id: `prop_${Date.now()}`,
    title: `${proposal.action.toUpperCase()} ${proposal.token} @ ${proposal.allocationPercent}%`,
    action: proposal.action.toUpperCase(),
    token: proposal.token,
    amount: `${proposal.allocationPercent}%`,
    reasoning: proposal.reasoning,
    proposedBy: proposer,
    votes: [{ address: proposer, approved: true }],
    comments: [],
    status: 'pending',
    timestamp: new Date().toLocaleString()
  };

  if (!collab.activeProposals) collab.activeProposals = [];
  collab.activeProposals.push(activeProp);
  
  // Auto-approve if threshold reached (proposer already voted yes)
  if (team.multiSig.threshold <= 1) {
    activeProp.status = 'approved';
  }

  await syncTeamStrategyDoc(team.id, collab);
}

export async function syncTeamMasterIndex(walletAddress = ""): Promise<void> {
  const teams = getAllTeamStrategies();
  const content = buildTeamMasterIndexDoc(teams, walletAddress);
  const teamMasterId = readLocal<string>(LS.teamMasterDocId, "");

  try {
    if (teamMasterId) {
      await fvUpdateDoc(teamMasterId, content);
      console.log("%c[AetherGuard:v2] ✅ Team Master Index synced", "color:#34d399");
    } else {
      const title = walletAddress ? `ag:team_master_index_${walletAddress.toLowerCase()}` : "ag:team_master_index";
      const { ddocId, link } = await fvCreateDoc(title, content);
      writeLocal(LS.teamMasterDocId, ddocId);
      writeLocal("ag_v2_team_master_doc_link", link);
    }
  } catch (err) {
    console.error("[AetherGuard:v2] ❌ Team Master sync failed", err);
  }
}

// ─── Hydration (wallet connect) ───────────────────────────────────────────────

export async function hydrateFromFileverse(walletAddress?: string, inviteId?: string, force = false): Promise<void> {
  console.log("%c[AetherGuard:v2] 💧 Hydration start", "color:#f472b6;font-weight:bold");

  // Check if we need to migrate from v1
  const hasV1Data = !!localStorage.getItem("ag_portfolio_state");
  const hasV2Data = !!localStorage.getItem(LS.strategies);

  if (hasV1Data && !hasV2Data) {
    console.log("%c[AetherGuard:v2] 🔄 Found old v1 data — migrating...", "color:#f472b6");
    migrateToV2();
  }

  // If strategies already exist in localStorage, they are the source of truth
  const strategies = getAllStrategies();
  console.log(`%c[AetherGuard:v2] 📦 ${strategies.length} strategies in localStorage`, "color:#f472b6");

  // Sync master index with current wallet address
  if (walletAddress) {
    const teams = getAllTeamStrategies();
    
    // Priority 1: Specific invite link
    if (inviteId) {
       console.log(`[AetherGuard] Targeted discovery for invite: ${inviteId}`);
       await discoverSpecificBoardroom(walletAddress, inviteId).catch((e) => console.error("[AetherGuard] Targeted discovery error", e));
    }

    // Priority 2: Generic discovery
    // PROACTIVE: Always trigger discovery on hydration if less than a few teams exist, or if forced.
    if (teams.length < 5 || force) {
      console.log(`[AetherGuard] ${force ? "Forced" : "Proactive"} discovery starting in background...`);
      // Use fire-and-forget for background discovery unless it's a forced deep search
      const discoveryPromise = discoverBoardroomsForSigner(walletAddress).catch((e) => console.error("[AetherGuard] Generic discovery error", e));
      if (force) await discoveryPromise; 
    }
    
    // Auto-activate: if nothing is active OR current choice is invalid, pick the first one
    const finalTeams = getAllTeamStrategies();
    const currentActiveId = readLocal(LS.activeTeamId, "");
    const isCurrentValid = finalTeams.some(t => t.id === currentActiveId);

    if (finalTeams.length > 0 && (!currentActiveId || !isCurrentValid)) {
       writeLocal(LS.activeTeamId, finalTeams[0].id);
       console.log(`%c[AetherGuard:v2] 🎯 Auto-activated team: ${finalTeams[0].name}`, "color:#fbbf24;font-weight:bold");
    }
    syncMasterIndex(walletAddress).catch(() => {});
  }

  console.log("%c[AetherGuard:v2] ✅ Hydration complete", "color:#f472b6;font-weight:bold");
}

/** 
 * Discovery flow for multi-browser/multi-wallet testing.
 * Scans all boardroom docs on the portal to find those where this wallet is a signer.
 */
export async function discoverBoardroomsForSigner(walletAddress: string): Promise<void> {
  const addr = walletAddress.toLowerCase();
  console.log(`%c[AetherGuard:v2] 🔍 Discovering boardrooms for ${addr}...`, "color:#4f46e5;font-weight:bold");
  
  try {
    const allDocs = await fvListDocs();
    console.log(`[AetherGuard] Portal check: ${allDocs.length} total docs found.`);
    
    const potentialDocs = allDocs.filter(d => {
       const t = (d.title || "").toLowerCase();
       return t.includes("boardroom") || t.includes("ag:") || t === "ddoc";
    });
    
    const discoveredTeams: TeamStrategy[] = [];
    const existingTeams = getAllTeamStrategies();
    const probedIds = readLocal<string[]>(LS.probedDocs, []);
    
    // Skip docs we've already probed and determined are NOT AetherGuard rooms
    const candidateDocs = potentialDocs.filter(d => !probedIds.includes(d.ddocId));
    
    if (candidateDocs.length === 0) {
       console.log("[AetherGuard] No new candidate documents to probe.");
       return;
    }

    console.log(`[AetherGuard] Probing ${candidateDocs.length} new candidate documents (Parallel)...`);
    
    const newProbedIds = [...probedIds];
    
    // Use parallel processing with Batching to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < candidateDocs.length; i += BATCH_SIZE) {
       const batch = candidateDocs.slice(i, i + BATCH_SIZE);
       await Promise.all(batch.map(async (docMeta) => {
          try {
             newProbedIds.push(docMeta.ddocId);
             const content = docMeta.content || await fvGetDoc(docMeta.ddocId).catch(() => "");
             if (!content) return;
             
             const metaMatch = content.match(/<!-- AG_TEAM_METADATA: (.*) -->/);
             if (metaMatch) {
                const meta = JSON.parse(metaMatch[1]);
                const signers = meta.signers || meta.multiSig?.signers || [];
                
                if (signers.some((s: string) => s.toLowerCase() === addr)) {
                   console.log(`%c[AetherGuard:v2] ✨ Found workspace: ${meta.name} (${docMeta.ddocId})`, "color:#34d399;font-weight:bold");
                   
                   const stableId = `boardroom_${docMeta.ddocId}`;
                   const exists = existingTeams.some(t => t.id === stableId || t.docId === docMeta.ddocId);
                   const inBatch = discoveredTeams.some(t => t.id === stableId || t.docId === docMeta.ddocId);
                   
                   if (!exists && !inBatch) {
                      const cleanGoal = (meta.goal || "").split("---")[0].split("___")[0].trim();
                      discoveredTeams.push({
                         ...meta,
                         goal: cleanGoal,
                         id: stableId,
                         number: existingTeams.length + discoveredTeams.length + 1,
                         createdAt: new Date().toISOString(),
                         docId: docMeta.ddocId,
                         docLink: docMeta.link || docMeta.url, 
                         multiSig: {
                            enabled: true,
                            threshold: meta.threshold || meta.multiSig?.threshold || 1,
                            signers: signers,
                         }
                      });
                   }
                }
             }
          } catch (e) {
             console.warn(`[AetherGuard] Failed to probe doc ${docMeta.ddocId}`, e);
          }
       }));
    }

    // Update the probe cache (limit size to 100 to avoid LS bloat)
    writeLocal(LS.probedDocs, newProbedIds.slice(-100));

    if (discoveredTeams.length > 0) {
       const finalSet = [...existingTeams, ...discoveredTeams];
       saveAllTeamStrategies(finalSet);
       console.log(`%c[AetherGuard:v2] ✅ Discovery finished. Added ${discoveredTeams.length} new rooms.`, "color:#34d399;font-weight:bold");
       // Notify UI of background discoveries
       window.dispatchEvent(new CustomEvent("ag-discovery-found", { detail: discoveredTeams.length }));
    } else {
       console.log("[AetherGuard] Discovery finished. No new rooms found.");
    }
  } catch (err) {
    console.error(`[AetherGuard:v2] ❌ Discovery scan failed`, err);
  }
}

/** Targeted discovery for a specific boardroom ID (e.g. via invite link) */
export async function discoverSpecificBoardroom(walletAddress: string, ddocId: string): Promise<void> {
  const addr = walletAddress.toLowerCase();
  try {
    const meta = await fvGetDocMeta(ddocId);
    if (!meta.content) return;
    
    const content = meta.content;
    const jsonMatch = content.match(/<!-- AG_TEAM_METADATA: (.*) -->/);
    
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      if (data.signers.some((s: string) => s.toLowerCase() === addr)) {
         const teams = getAllTeamStrategies();
         const stableId = `boardroom_${ddocId}`;
         if (!teams.some(t => t.id === stableId || t.docId === ddocId)) {
            teams.push({
               ...data,
               id: stableId,
               number: teams.length + 1,
               createdAt: new Date().toISOString(),
               docId: ddocId,
               docLink: meta.link,
               multiSig: { enabled: true, threshold: data.threshold, signers: data.signers }
            });
            saveAllTeamStrategies(teams);
            // Auto-activate invite
            writeLocal(LS.activeTeamId, stableId);
            console.log(`%c[AetherGuard:v2] 🎫 Invitation accepted and activated: ${data.name}`, "color:#34d399");
         }
      }
    }
  } catch (err) {
    console.warn("[AetherGuard:v2] Direct discovery failed", err);
  }
}

/** Clears all boardroom data from local storage to force a clean re-sync */
export function clearTeamRegistry(): void {
  localStorage.removeItem(LS.teamStrategies);
  localStorage.removeItem(LS.activeTeamId);
  localStorage.removeItem(LS.teamMasterDocId);
}

// ─── Doc Links for DataVault UI ───────────────────────────────────────────────

export function getMasterDocLink(): string {
  // First try the stored public link (docs.fileverse.io URL)
  const storedLink = readLocal<string>("ag_v2_master_doc_link", "");
  if (storedLink) return storedLink;
  // Fall back to building an API URL with the key appended
  const masterDocId = readLocal<string>(LS.masterDocId, "");
  if (!masterDocId) return "";
  return `${BASE}/api/ddocs/${masterDocId}?apiKey=${KEY}`;
}

/** Normalize a link — if it's a local API URL without a key, append the API key */
function normalizeDocLink(link: string): string {
  if (!link) return link;
  if (link.includes("docs.fileverse.io")) return link; // public URL — already valid
  if (link.includes("apiKey=")) return link;           // already has key
  // Local API url — append the API key
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}apiKey=${KEY}`;
}

export function getStrategyDocLinks(): { number: number; name: string; link: string }[] {
  return getAllStrategies()
    .filter(s => s.docId) // At minimum need a docId
    .map(s => ({
      number: s.number,
      name: s.name,
      link: normalizeDocLink(s.docLink || `${BASE}/api/ddocs/${s.docId}`),
    }));
}

/** Force re-sync all strategy docs and master index — call from UI to recover stale state */
export async function forceResyncAll(walletAddress = ""): Promise<void> {
  console.log("%c[AetherGuard:v2] 🔄 Force re-sync all docs...", "color:#f472b6;font-weight:bold");
  const strategies = getAllStrategies();
  for (const s of strategies) {
    await syncStrategyDoc(s.id).catch(e => console.error(`Strategy #${s.number} sync failed`, e));
  }
  await syncMasterIndex(walletAddress).catch(e => console.error("Master index sync failed", e));
  console.log("%c[AetherGuard:v2] ✅ Force re-sync complete", "color:#f472b6;font-weight:bold");
}

/** @deprecated use getStrategyDocLinks instead */
export function getAllDocLinks(): { title: string; id: string; url: string }[] {
  return getAllStrategies()
    .filter(s => s.docId)
    .map(s => ({ title: `Strategy #${s.number} — ${s.name}`, id: s.docId!, url: s.docLink || "" }));
}

/** @deprecated use getMasterDocLink instead */
export function getDocLink(): string {
  return getMasterDocLink();
}

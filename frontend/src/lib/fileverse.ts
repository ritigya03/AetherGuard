export interface FileverseDoc {
  ddocId: string;
  title: string;
  content: string;
  syncStatus: string;
  link?: string;
  isRealLink?: boolean;
}

const BASE = import.meta.env.VITE_FILEVERSE_API || "";
const KEY = import.meta.env.VITE_FILEVERSE_KEY || "";

// Storage keys
const MASTER_DOC_KEY = "aetherguard_master_doc_id";
const MASTER_LINK_KEY = "aetherguard_master_link";
const ACTIVE_STRATEGY_DOC_KEY = "aetherguard_active_strategy_doc_id";
const ACTIVE_STRATEGY_LINK_KEY = "aetherguard_ddoc_link";

// Legacy key — keep for backwards compat
const LEGACY_DOC_KEY = "aetherguard_ddoc_id";

const TABLE_DIVIDER = `|---|-------|--------|------------|-------------|---------------|--------|-------|---------|`;
const AUDIT_MARKER = `## 🗂️ Decision Audit Trail`;
const SUMMARY_MARKER = `## 📈 Portfolio Summary`;
const SIM_MARKER = `## 📊 Trade Simulations`;

// ================================================================
// Core request helper
// ================================================================

async function request(path: string, method = "GET", body?: object) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("apiKey", KEY);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for Fileverse API
  
  try {
    const res = await fetch(url.toString(), {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Fileverse Error [${method} ${path}]:`, text);
      throw new Error(`Fileverse ${res.status}: ${text}`);
    }
    const data = await res.json();
    console.log(`Fileverse Success [${method} ${path}]:`, data);
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ================================================================
// Link resolution
// ================================================================

async function waitForLink(ddocId: string, maxWaitMs = 10000): Promise<string> {
  const start = Date.now();
  // Check once immediately then poll
  while (Date.now() - start < maxWaitMs) {
    try {
      const raw = await request(`/api/ddocs/${ddocId}`);
      const doc = raw.data || raw;
      if (doc.link && doc.link.includes("fileverse.io")) {
        return doc.link;
      }
    } catch (_e) { }
    await new Promise(r => setTimeout(r, 1500)); // Poll every 1.5s (faster than 3s)
  }
  return `${BASE}/api/ddocs/${ddocId}?apiKey=${KEY}`;
}

async function getDocWithLink(ddocId: string, linkKey?: string): Promise<FileverseDoc> {
  const raw = await request(`/api/ddocs/${ddocId}`);
  const doc = raw.data || raw;

  if (doc.link && doc.link.includes("fileverse.io")) {
    if (linkKey) localStorage.setItem(linkKey, doc.link);
    return { ...doc, isRealLink: true };
  }

  const cached = linkKey ? localStorage.getItem(linkKey) : null;
  const fallback = cached || `${BASE}/api/ddocs/${ddocId}?apiKey=${KEY}`;
  return { ...doc, link: fallback, isRealLink: !!cached };
}

// ================================================================
// Token price fetch
// ================================================================

async function fetchTokenPrice(token: string): Promise<number | null> {
  const idMap: Record<string, string> = {
    ETH: "ethereum", BTC: "bitcoin", WBTC: "wrapped-bitcoin",
    USDC: "usd-coin", USDT: "tether", SOL: "solana",
    MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap",
    AAVE: "aave", MKR: "maker", ARB: "arbitrum", OP: "optimism",
    AVAX: "avalanche-2", BNB: "binancecoin", DOT: "polkadot",
    ADA: "cardano", ATOM: "cosmos", NEAR: "near",
  };
  const id = idMap[token.toUpperCase()];
  if (!id) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for CoinGecko

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { signal: controller.signal }
    );
    const data = await res.json();
    return data[id]?.usd ?? null;
  } catch { 
    return null; 
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function riskBadge(allocationPercent: number): string {
  if (allocationPercent >= 30) return "🔴 HIGH";
  if (allocationPercent >= 15) return "🟡 MEDIUM";
  return "🟢 LOW";
}

// ================================================================
// Master Index Doc
// ================================================================

function buildMasterDoc(walletAddress?: string): string {
  const now = new Date().toLocaleString();
  return [
    `# 🛡️ AetherGuard — Strategy Index`,
    ``,
    `> **Wallet:** \`${walletAddress || "Unknown"}\``,
    `> **Created:** ${now}`,
    `> **Encryption:** End-to-end encrypted · Only you can read this`,
    ``,
    `---`,
    ``,
    `## 📋 My Strategies`,
    ``,
    `| # | Strategy Name | Created | Status | Trades | Report |`,
    `|---|--------------|---------|--------|--------|--------|`,
    ``,
    `---`,
    ``,
    `> *Each strategy has its own private report with full trade history, simulations, and audit trail.*`,
  ].join("\n");
}

export async function getOrCreateMasterDoc(walletAddress?: string): Promise<FileverseDoc> {
  const existing = localStorage.getItem(MASTER_DOC_KEY);
  if (existing) {
    try {
      const doc = await getDocWithLink(existing, MASTER_LINK_KEY);
      if (doc.ddocId) return doc;
    } catch (_e) {
      localStorage.removeItem(MASTER_DOC_KEY);
    }
  }

  const res = await request("/api/ddocs", "POST", {
    title: `AetherGuard Index · ${walletAddress?.slice(0, 10) || "My Strategies"}`,
    content: buildMasterDoc(walletAddress),
  });

  const doc = res.data || res;
  localStorage.setItem(MASTER_DOC_KEY, doc.ddocId);
  console.log("Created Master Doc:", doc.ddocId);

  // Wait for sync
  const link = await waitForLink(doc.ddocId);
  localStorage.setItem(MASTER_LINK_KEY, link);
  console.log("Master Doc Link:", link);

  return { ...doc, link };
}

async function addStrategyToMasterDoc(
  masterDocId: string,
  strategyName: string,
  strategyDocLink: string,
  strategyNumber: number,
  isActive: boolean,
  strategyDdocId: string
): Promise<void> {
  console.log(`Syncing Strategy ${strategyDdocId} to Master Doc ${masterDocId}...`);
  try {
    const raw = await request(`/api/ddocs/${masterDocId}`);
    const doc = raw.data || raw;
    let content: string = doc.content || "";

    const now = new Date().toLocaleString();
    const status = isActive ? "✅ Active" : "📦 Archived";

    // Use a link title to silently embed the ID for deduplication
    // This is valid GFM and shouldn't break the table
    const reportLink = strategyDocLink
      ? `[View Report](${strategyDocLink} "id:${strategyDdocId}")`
      : `[Syncing...](# "id:${strategyDdocId}")`;

    const newRow = `| ${strategyNumber} | ${strategyName} | ${now} | ${status} | 0 | ${reportLink} |`;

    // 1. Surgical cleaning: Remove all lines containing this strategy ID
    let lines = content.split("\n");
    const originalCount = lines.length;
    lines = lines.filter(line => !line.includes(strategyDdocId));
    console.log(`Deduplication: Removed ${originalCount - lines.length} stale row(s).`);

    // 2. Locate or Create Table Section
    const tableHeader = `| # | Strategy Name | Created | Status | Trades | Report |`;
    const tableDivider = `| --- | --- | --- | --- | --- | --- |`;
    const sectionTitle = `## 📋 My Strategies`;

    let headerIdx = lines.findIndex(l => l.includes(sectionTitle));
    let dividerIdx = lines.findIndex((l, idx) => idx > headerIdx && l.includes(`| --- |`));

    const finalLines: string[] = [];
    if (headerIdx === -1) {
      // Complete rebuild if section is missing
      finalLines.push(`# 🛡️ AetherGuard — Strategy Index`, "", `> **Wallet:** \`Connected\``, "", "---", "", sectionTitle, "", tableHeader, tableDivider, newRow, "", "---");
    } else {
      // Preserve everything before the section
      for (let i = 0; i <= headerIdx; i++) finalLines.push(lines[i]);

      if (dividerIdx === -1) {
        // Section exists but table is missing
        finalLines.push("", tableHeader, tableDivider, newRow, "");
      } else {
        // Insert new row immediately after divider
        for (let i = headerIdx + 1; i <= dividerIdx; i++) finalLines.push(lines[i]);
        finalLines.push(newRow);
        // Add remaining lines
        for (let i = dividerIdx + 1; i < lines.length; i++) finalLines.push(lines[i]);
      }
    }

    content = finalLines.join("\n").replace(/\n{3,}/g, "\n\n"); // Normalize spacing

    console.log("FINAL DRAFT FOR MASTER DOC:\n", content);
    await request(`/api/ddocs/${masterDocId}`, "PUT", { content });
    console.log("Master Doc update successful.");
  } catch (e) {
    console.warn("Could not update master doc", e);
  }
}

async function updateStrategyTradeCount(
  masterDocId: string,
  strategyDocLink: string,
  newCount: number
): Promise<void> {
  try {
    const raw = await request(`/api/ddocs/${masterDocId}`);
    const doc = raw.data || raw;
    let content: string = doc.content || "";

    // Find the row with this strategy link and update trade count
    const linkShort = strategyDocLink.slice(0, 40);
    const lines = content.split("\n");
    const updated = lines.map(line => {
      if (line.includes(linkShort)) {
        // Replace trade count (5th column)
        return line.replace(/\| (\d+) \| \[View/, `| ${newCount} | [View`);
      }
      return line;
    });
    content = updated.join("\n");
    await request(`/api/ddocs/${masterDocId}`, "PUT", { content });
  } catch (e) {
    console.warn("Could not update trade count", e);
  }
}

// ================================================================
// Strategy Doc — one per strategy
// ================================================================

function buildStrategyDoc(
  strategy: string,
  strategyName: string,
  walletAddress?: string
): string {
  const now = new Date().toLocaleString();
  return [
    `# 🛡️ ${strategyName}`,
    ``,
    `> **Wallet:** \`${walletAddress || "Unknown"}\``,
    `> **Created:** ${now}`,
    `> **Encryption:** End-to-end encrypted · Only you can read this`,
    ``,
    `---`,
    ``,
    `## 📋 Strategy Rules`,
    ``,
    `> 🔒 **Your rules are stored encrypted here.**`,
    `> They are **never** sent to any AI. Only your goal is shared.`,
    ``,
    "```",
    strategy,
    "```",
    ``,
    `---`,
    ``,
    `## 📜 Strategy Versions`,
    ``,
    `| # | Saved At | Rules Count |`,
    `|---|----------|-------------|`,
    `| 1 | ${now} | ${strategy.split("\n").filter(l => l.trim() && !l.startsWith("//")).length} rules |`,
    ``,
    `---`,
    ``,
    `## 📊 Trade Simulations`,
    ``,
    `> Simulated decisions — no real funds moved.`,
    ``,
    `| # | Token | Action | Allocation | Entry Price | Position Size | Decision | Block | Tx Hash |`,
    TABLE_DIVIDER,
    ``,
    `---`,
    ``,
    `## 🗂️ Decision Audit Trail`,
    ``,
    `> Every decision is permanently recorded on-chain.`,
    ``,
    `---`,
    ``,
    `## 📈 Portfolio Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Total Trades** | 0 |`,
    `| **Approved** | 0 ✅ |`,
    `| **Rejected** | 0 ❌ |`,
    `| **Approval Rate** | 0% |`,
    `| **Total Capital Deployed** | $0 |`,
    `| **Most Traded Token** | — |`,
    ``,
    `---`,
  ].join("\n");
}

// ================================================================
// Main: getOrCreateStrategyDoc
// ================================================================

let updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export async function getOrCreateStrategyDoc(
  strategy: string,
  walletAddress?: string
): Promise<FileverseDoc> {
  // Ensure master doc exists first so it's always available
  const masterDoc = await getOrCreateMasterDoc(walletAddress);

  // Check legacy doc first — migrate if exists
  const legacy = localStorage.getItem(LEGACY_DOC_KEY);
  const existing = localStorage.getItem(ACTIVE_STRATEGY_DOC_KEY) || legacy;

  if (existing) {
    try {
      const doc = await getDocWithLink(existing, ACTIVE_STRATEGY_LINK_KEY);
      if (doc.ddocId) {
        // Migrate legacy key
        if (legacy && !localStorage.getItem(ACTIVE_STRATEGY_DOC_KEY)) {
          localStorage.setItem(ACTIVE_STRATEGY_DOC_KEY, legacy);
        }

        // Backfill to master index if needed
        if (masterDoc.ddocId) {
          let link = doc.link;
          if (!doc.isRealLink) {
            console.log("No real Fileverse link yet, using fallback for index...");
          }

          const strategyName = (doc.title || "My Strategy").replace(/Strategy #\d+: /, "");
          const count = localStorage.getItem("aetherguard_strategy_count") || "1";
          await addStrategyToMasterDoc(
            masterDoc.ddocId,
            doc.title || `Strategy #${count}: ${strategyName}`,
            link || "",
            parseInt(count),
            true,
            doc.ddocId
          );
        }

        return doc;
      }
    } catch (_e) {
      localStorage.removeItem(ACTIVE_STRATEGY_DOC_KEY);
      localStorage.removeItem(LEGACY_DOC_KEY);
    }
  }

  // Create strategy name from first non-comment line
  const strategyName = strategy
    .split("\n")
    .find(l => l.trim() && !l.startsWith("//"))
    ?.trim()
    .slice(0, 40) || "My Strategy";

  // Get strategy count for numbering
  const strategyNumber = (localStorage.getItem("aetherguard_strategy_count")
    ? parseInt(localStorage.getItem("aetherguard_strategy_count")!) + 1
    : 1);
  localStorage.setItem("aetherguard_strategy_count", strategyNumber.toString());

  // Create strategy doc
  const res = await request("/api/ddocs", "POST", {
    title: `Strategy #${strategyNumber}: ${strategyName.slice(0, 30)}`,
    content: buildStrategyDoc(strategy, `Strategy #${strategyNumber}: ${strategyName}`, walletAddress),
  });

  const doc = res.data || res;
  localStorage.setItem(ACTIVE_STRATEGY_DOC_KEY, doc.ddocId);

  // Wait for real link
  const link = await waitForLink(doc.ddocId);
  localStorage.setItem(ACTIVE_STRATEGY_LINK_KEY, link);

  // Add to master index
  if (masterDoc.ddocId) {
    await addStrategyToMasterDoc(
      masterDoc.ddocId,
      `Strategy #${strategyNumber}: ${strategyName}`,
      link,
      strategyNumber,
      true,
      doc.ddocId
    );
  }

  return { ...doc, link };
}

// ================================================================
// Update strategy doc
// ================================================================

async function _updateStrategyDoc(
  strategy: string,
  walletAddress?: string
): Promise<FileverseDoc> {
  const ddocId = localStorage.getItem(ACTIVE_STRATEGY_DOC_KEY)
    || localStorage.getItem(LEGACY_DOC_KEY);
  if (!ddocId) return getOrCreateStrategyDoc(strategy, walletAddress);

  const current = await getDocWithLink(ddocId);
  let content = current.content || "";

  const now = new Date().toLocaleString();
  const ruleCount = strategy.split("\n").filter(l => l.trim() && !l.startsWith("//")).length;

  // Add version row
  const versionMarker = `|---|----------|-------------|`;
  if (content.includes(versionMarker)) {
    const existingVersions = content
      .split("\n")
      .filter(l => l.startsWith("| ") && l.includes(" rules |"))
      .length;
    const newRow = `| ${existingVersions + 1} | ${now} | ${ruleCount} rules |`;
    const idx = content.indexOf(versionMarker) + versionMarker.length;
    content = content.slice(0, idx) + "\n" + newRow + content.slice(idx);
  }

  // Update strategy rules block
  const rulesStart = content.indexOf("```\n") + 4;
  const rulesEnd = content.indexOf("\n```", rulesStart);
  if (rulesStart > 4 && rulesEnd > rulesStart) {
    content = content.slice(0, rulesStart) + strategy + content.slice(rulesEnd);
  }

  const res = await request(`/api/ddocs/${ddocId}`, "PUT", { content });
  const doc = res.data || res;
  const link = current.link || localStorage.getItem(ACTIVE_STRATEGY_LINK_KEY) || "";
  return { ...doc, link };
}

export function updateStrategyDoc(
  strategy: string,
  walletAddress?: string
): Promise<FileverseDoc> {
  return new Promise((resolve, reject) => {
    if (updateDebounceTimer) clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      _updateStrategyDoc(strategy, walletAddress).then(resolve).catch(reject);
    }, 3000);
  });
}

// ================================================================
// Append decision to strategy doc
// ================================================================

export async function appendDecisionToDoc(
  trade: string,
  txHash: string,
  blockNumber: number,
  reasoning: string,
  decisionStatus: "APPROVED" | "REJECTED" = "APPROVED",
  token?: string,
  allocationPercent?: number,
  portfolioValueUsd = 10000
): Promise<FileverseDoc> {
  const ddocId = localStorage.getItem(ACTIVE_STRATEGY_DOC_KEY)
    || localStorage.getItem(LEGACY_DOC_KEY);
  if (!ddocId) throw new Error("No strategy doc found");

  const current = await getDocWithLink(ddocId);
  let content = current.content || "";

  const timestamp = new Date().toLocaleString();
  const emoji = decisionStatus === "APPROVED" ? "✅" : "❌";
  const etherscanBlock = `[#${blockNumber}](https://sepolia.etherscan.io/block/${blockNumber})`;
  const etherscanTx = `[${txHash.slice(0, 14)}...](https://sepolia.etherscan.io/tx/${txHash})`;

  // Simulation row
  let auditSimBlock = "";
  let positionUsd = 0;
  let formattedPrice = "N/A";
  let tokensAcquired = "N/A";

  if (token && allocationPercent) {
    const price = await fetchTokenPrice(token);
    formattedPrice = price ? formatUsd(price) : "N/A";
    positionUsd = (allocationPercent / 100) * portfolioValueUsd;
    tokensAcquired = price ? (positionUsd / price).toFixed(6) : "N/A";
    const positionStr = price
      ? `${formatUsd(positionUsd)} (~${tokensAcquired} ${token})`
      : formatUsd(positionUsd);

    const rowNum = (content.match(/\| \d+ \| \*\*/g) || []).length + 1;
    const cleanTrade = trade.replace(/^(APPROVED|REJECTED):\s*/i, "");
    const action = cleanTrade.split(" ").slice(0, 2).join(" ");

    const simRow =
      `| ${rowNum} | **${token}** | ${action} | ${allocationPercent}% (${riskBadge(allocationPercent)}) ` +
      `| ${formattedPrice} | ${positionStr} | ${emoji} ${decisionStatus} | ${etherscanBlock} | \`${txHash.slice(0, 12)}...\` |`;

    if (content.includes(TABLE_DIVIDER)) {
      const idx = content.indexOf(TABLE_DIVIDER) + TABLE_DIVIDER.length;
      content = content.slice(0, idx) + "\n" + simRow + content.slice(idx);
    }

    auditSimBlock = [
      ``,
      `> 💰 **Position Breakdown**`,
      `> | Detail | Value |`,
      `> |--------|-------|`,
      `> | Allocation | **${allocationPercent}%** |`,
      `> | Position Size | **${formatUsd(positionUsd)}** |`,
      `> | Entry Price | **${formattedPrice}** per ${token} |`,
      `> | Tokens | **~${tokensAcquired} ${token}** |`,
      `> | Risk | ${riskBadge(allocationPercent)} |`,
    ].join("\n");
  }

  // Audit entry
  const auditEntry = [
    ``,
    `### ${emoji} ${trade}`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Decision** | ${emoji} ${decisionStatus} |`,
    `| **Time** | ${timestamp} |`,
    `| **Block** | ${etherscanBlock} |`,
    `| **Tx** | ${etherscanTx} |`,
    token ? `| **Token** | ${token} |` : "",
    allocationPercent ? `| **Allocation** | ${allocationPercent}% |` : "",
    formattedPrice !== "N/A" ? `| **Entry Price** | ${formattedPrice} |` : "",
    ``,
    decisionStatus === "APPROVED"
      ? `> ✅ **APPROVED** — Logged on-chain`
      : `> ❌ **REJECTED** — Logged on-chain`,
    auditSimBlock,
    ``,
    `> 🤖 **AI Reasoning:** ${reasoning}`,
    ``,
    `---`,
  ].filter(Boolean).join("\n");

  // Insert after audit marker
  if (content.includes(AUDIT_MARKER)) {
    const idx = content.indexOf(AUDIT_MARKER) + AUDIT_MARKER.length;
    content = content.slice(0, idx) + "\n" + auditEntry + content.slice(idx);
  } else {
    content += `\n\n${AUDIT_MARKER}\n` + auditEntry;
  }

  // Update summary
  if (content.includes(SUMMARY_MARKER)) {
    const totalTrades = (content.match(/\| \d+ \| \*\*/g) || []).length;
    const approvedCount = (content.match(/\| ✅ APPROVED \|/g) || []).length;
    const rejectedCount = (content.match(/\| ❌ REJECTED \|/g) || []).length;

    const positionMatches = content.match(/\$[\d,]+(?:\.\d+)? \(~/g) || [];
    const totalCapital = (positionMatches as string[]).reduce((sum: number, match: string) => {
      const val = parseFloat(match.replace(/[$,]/g, "").replace(" (~", ""));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const tokenMatches = content.match(/\| \*\*(\w+)\*\* \|/g) || [];
    const tokenCounts: Record<string, number> = {};
    tokenMatches.forEach(m => {
      const t = m.replace(/\| \*\*|\*\* \|/g, "").trim();
      tokenCounts[t] = (tokenCounts[t] || 0) + 1;
    });
    const mostTraded = Object.entries(tokenCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const newSummary = [
      `## 📈 Portfolio Summary`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| **Total Trades** | ${totalTrades} |`,
      `| **Approved** | ${approvedCount} ✅ |`,
      `| **Rejected** | ${rejectedCount} ❌ |`,
      `| **Approval Rate** | ${totalTrades > 0 ? Math.round((approvedCount / totalTrades) * 100) : 0}% |`,
      `| **Total Capital Deployed** | ${formatUsd(totalCapital as number)} |`,
      `| **Most Traded Token** | ${mostTraded} |`,
      ``,
      `---`,
    ].join("\n");

    const summaryStart = content.indexOf(SUMMARY_MARKER);
    const summaryEnd = content.indexOf("\n---", summaryStart) + 4;
    content = content.slice(0, summaryStart) + newSummary + content.slice(summaryEnd);
  }

  const res = await request(`/api/ddocs/${ddocId}`, "PUT", { content });
  const updated = res.data || res;

  // Update trade count in master doc
  const masterDocId = localStorage.getItem(MASTER_DOC_KEY);
  const activeLink = localStorage.getItem(ACTIVE_STRATEGY_LINK_KEY) || "";
  if (masterDocId && activeLink) {
    const totalTrades = (content.match(/\| \d+ \| \*\*/g) || []).length;
    updateStrategyTradeCount(masterDocId, activeLink, totalTrades).catch(() => { });
  }

  return { ...updated, link: current.link || "" };
}

// ================================================================
// New strategy — archive current, create new
// ================================================================

export async function archiveAndCreateNewStrategy(
  newStrategy: string,
  walletAddress?: string
): Promise<FileverseDoc> {
  // Archive current strategy in master doc
  const masterDocId = localStorage.getItem(MASTER_DOC_KEY);
  const currentLink = localStorage.getItem(ACTIVE_STRATEGY_LINK_KEY) || "";

  if (masterDocId && currentLink) {
    try {
      const raw = await request(`/api/ddocs/${masterDocId}`);
      const doc = raw.data || raw;
      let content: string = doc.content || "";
      // Mark current as archived
      content = content.replace(
        new RegExp(`(${currentLink.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^|]*)\\| ✅ Active`),
        `$1| 📦 Archived`
      );
      await request(`/api/ddocs/${masterDocId}`, "PUT", { content });
    } catch (_e) { }
  }

  // Clear active strategy
  localStorage.removeItem(ACTIVE_STRATEGY_DOC_KEY);
  localStorage.removeItem(ACTIVE_STRATEGY_LINK_KEY);

  // Create new strategy doc
  return getOrCreateStrategyDoc(newStrategy, walletAddress);
}

// ================================================================
// Public helpers
// ================================================================

export function getDocId(): string | null {
  return localStorage.getItem(ACTIVE_STRATEGY_DOC_KEY) || localStorage.getItem(LEGACY_DOC_KEY);
}

export function getDocLink(): string | null {
  return localStorage.getItem(ACTIVE_STRATEGY_LINK_KEY);
}

export function getMasterDocLink(): string | null {
  return localStorage.getItem(MASTER_LINK_KEY);
}

export function getMasterDocId(): string | null {
  return localStorage.getItem(MASTER_DOC_KEY);
}

export async function refreshDocLink(): Promise<string | null> {
  const ddocId = getDocId();
  if (!ddocId) return null;
  try {
    const raw = await request(`/api/ddocs/${ddocId}`);
    const doc = raw.data || raw;
    if (doc.link && doc.link.includes("fileverse.io")) {
      localStorage.setItem(ACTIVE_STRATEGY_LINK_KEY, doc.link);
      return doc.link;
    }
  } catch (_e) { }
  return localStorage.getItem(ACTIVE_STRATEGY_LINK_KEY);
}

// Legacy no-ops
export async function appendToMasterDoc(): Promise<void> { }
export async function upsertMasterDocRow(): Promise<void> { }
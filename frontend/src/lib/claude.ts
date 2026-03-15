import Groq from "groq-sdk";
import type { AgentContext } from "./fileverseStore";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenMarketData {
  symbol: string;
  geckoId: string;
  priceUsd: number;
  change24h: number;       // percent, e.g. -3.2
  volumeUsd24h: number;
  marketCapUsd: number;
}

export interface TradeEntry {
  action: "buy" | "sell" | "hold";
  token: string;
  geckoId: string;
  entryPriceUsd: number;
  targetPriceUsd: number;   // take-profit
  stopLossPriceUsd: number; // stop-loss
  allocationPercent: number;
  expectedReturnPercent: number;
  timeHorizon: string;      // e.g. "4–8 hours", "2–3 days"
  reasoning: string;
  technicalSignal: string;  // e.g. "RSI oversold + support bounce"
  riskLevel: "low" | "medium" | "high";
  timestamp: number;
}

// Legacy alias so nothing downstream breaks
export type TradeProposal = TradeEntry;

/**
 * TradeStep — emitted one-by-one so the UI can animate each stage of the
 * pipeline as it happens in real time.
 */
export type StepId =
  | "fetch_team"
  | "intent_received"
  | "rules_hashed"
  | "prices_fetched"
  | "proposal_ready"
  | "proof_verified"
  | "executed";

export interface TradeStep {
  id: StepId;
  label: string;
  detail: string;
  status: "pending" | "loading" | "done" | "error";
  timestamp?: number;
}

export type OnStep = (step: TradeStep) => void;

// ─── Token catalogue ─────────────────────────────────────────────────────────

const TOKENS: { symbol: string; geckoId: string }[] = [
  { symbol: "ETH",  geckoId: "ethereum" },
  { symbol: "BTC",  geckoId: "bitcoin" },
  { symbol: "SOL",  geckoId: "solana" },
  { symbol: "USDC", geckoId: "usd-coin" },
  { symbol: "USDT", geckoId: "tether" },
  { symbol: "BNB",  geckoId: "binancecoin" },
  { symbol: "AVAX", geckoId: "avalanche-2" },
  { symbol: "LINK", geckoId: "chainlink" },
  { symbol: "UNI",  geckoId: "uniswap" },
  { symbol: "ARB",  geckoId: "arbitrum" },
  { symbol: "OP",   geckoId: "optimism" },
  { symbol: "PEPE", geckoId: "pepe" },
  { symbol: "SHIB", geckoId: "shiba-inu" },
  { symbol: "LDO",  geckoId: "lido-dao" },
  { symbol: "AAVE", geckoId: "aave" },
];

// ─── Live price fetch ─────────────────────────────────────────────────────────

async function fetchMarketData(): Promise<TokenMarketData[]> {
  const ids = TOKENS.map((t) => t.geckoId).join(",");
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${ids}` +
    `&vs_currencies=usd` +
    `&include_24hr_change=true` +
    `&include_24hr_vol=true` +
    `&include_market_cap=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for market data

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();

    return TOKENS.map((t) => ({
      symbol: t.symbol,
      geckoId: t.geckoId,
      priceUsd:      data[t.geckoId]?.usd               ?? 0,
      change24h:     data[t.geckoId]?.usd_24h_change     ?? 0,
      volumeUsd24h:  data[t.geckoId]?.usd_24h_vol        ?? 0,
      marketCapUsd:  data[t.geckoId]?.usd_market_cap     ?? 0,
    })).filter((t) => t.priceUsd > 0);
  } catch (err) {
    console.error("[claude.ts] Market data fetch failed:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtPrice(usd: number): string {
  if (usd >= 1000) return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (usd >= 1)    return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(8)}`;
}

function fmtVol(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(2)}M`;
  return `$${usd.toLocaleString()}`;
}

function buildMarketSnapshot(tokens: TokenMarketData[]): string {
  return tokens
    .map(
      (t, i) =>
        `${i + 1}. ${t.symbol} (geckoId: "${t.geckoId}")\n` +
        `   price=${fmtPrice(t.priceUsd)}  |  ` +
        `24h=${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(2)}%  |  ` +
        `vol=${fmtVol(t.volumeUsd24h)}  |  mcap=${fmtVol(t.marketCapUsd)}`
    )
    .join("\n");
}

// ─── Post-processing safety ───────────────────────────────────────────────────

function sanitize(parsed: Partial<TradeEntry>, marketData: TokenMarketData[]): TradeEntry {
  const liveToken =
    marketData.find((t) => t.geckoId === parsed.geckoId) ??
    marketData.find((t) => t.symbol.toUpperCase() === parsed.token?.toUpperCase());

  const entry = liveToken?.priceUsd ?? parsed.entryPriceUsd ?? 0;
  const isBuy = (parsed.action ?? "buy") !== "sell";

  const target =
    parsed.targetPriceUsd && parsed.targetPriceUsd !== 0
      ? parsed.targetPriceUsd
      : isBuy ? entry * 1.05 : entry * 0.95;

  const stop =
    parsed.stopLossPriceUsd && parsed.stopLossPriceUsd !== 0
      ? parsed.stopLossPriceUsd
      : isBuy ? entry * 0.97 : entry * 1.03;

  const expectedReturn =
    entry > 0 ? parseFloat((Math.abs((target - entry) / entry) * 100).toFixed(2)) : 0;

  return {
    action:                (parsed.action === "sell" ? "sell" : "buy") as "buy" | "sell",
    token:                 parsed.token           ?? "ETH",
    geckoId:               parsed.geckoId         ?? "ethereum",
    entryPriceUsd:         entry,
    targetPriceUsd:        target,
    stopLossPriceUsd:      stop,
    allocationPercent:     parsed.allocationPercent ?? 10,
    expectedReturnPercent: expectedReturn,
    timeHorizon:           parsed.timeHorizon     ?? "1–2 days",
    reasoning:             parsed.reasoning       ?? "",
    technicalSignal:       parsed.technicalSignal ?? "momentum play",
    riskLevel:             parsed.riskLevel       ?? "medium",
    timestamp:             Date.now(),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getTradeProposal(
  goal: string, 
  merkleRoot: string = "",
  rejectedTokens: string[] = [],
  onStep?: OnStep,
  agentContext?: AgentContext
): Promise<TradeEntry> {
  const emit = (step: TradeStep) => onStep?.(step);

  // 1. Intent received
  const safeGoal = typeof goal === "string" ? goal : "AI Analysis request";
  emit({
    id: "intent_received",
    label: "Intent Captured",
    detail: `"${safeGoal.trim()}"`,
    status: "done",
    timestamp: Date.now(),
  });

  // 2. Rules hashed (Merkle)
  emit({
    id: "rules_hashed",
    label: "Rules Hashed (Merkle)",
    detail: merkleRoot 
      ? `Root: ${merkleRoot.slice(0, 10)}...${merkleRoot.slice(-6)} · Stored On-chain` 
      : "Rules remain private · Root computed client-side",
    status: "done",
    timestamp: Date.now(),
  });

  // 3. Fetch live prices
  emit({
    id: "prices_fetched",
    label: "Fetching Live Prices",
    detail: "Scanning CoinGecko signals...",
    status: "loading",
  });

  const marketData = await fetchMarketData();
  
  if (marketData.length === 0) {
    emit({ id: "prices_fetched", label: "Price Fetch Failed", detail: "Network error", status: "error" });
    throw new Error("Market data unavailable");
  }

  const topMover = [...marketData].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];
  emit({
    id: "prices_fetched",
    label: "Market Data Ready",
    detail: `${marketData.length} tokens tracked · Top Mover: ${topMover.symbol} (${topMover.change24h.toFixed(1)}%)`,
    status: "done",
    timestamp: Date.now(),
  });

  // 4. AI Analyzing
  emit({
    id: "proposal_ready",
    label: "AI Analyzing Strategy",
    detail: "Quant-bot is drafting proposal...",
    status: "loading",
  });

  const marketSnapshot = buildMarketSnapshot(marketData);
  const rejectedList = rejectedTokens.length > 0 ? `NEVER suggest these tokens: ${rejectedTokens.join(", ")}` : "";

  // Build portfolio-aware context block
  let portfolioBlock = "";
  if (agentContext?.portfolio?.holdings?.length) {
    const holdingLines = agentContext.portfolio.holdings
      .map(h => `  ${h.ticker}: ${h.allocationPercent}% ($${h.currentValueUsd.toFixed(0)})`)
      .join("\n");
    portfolioBlock = `\nCURRENT PORTFOLIO (total: $${agentContext.portfolio.totalValueUsd.toFixed(0)}):\n${holdingLines}\n`;
  }

  let goalsBlock = "";
  if (agentContext?.goals) {
    const g = agentContext.goals;
    goalsBlock = `\nUSER GOALS: ${g.targetAnnualReturn}% annual return, ${g.riskTolerance} risk, ${g.timeHorizon} horizon, prefers ${g.preferredCategories.join("/")}.`;
  }

  let recentTradesBlock = "";
  if (agentContext?.recentTrades?.length) {
    const trades = agentContext.recentTrades
      .map(t => `  ${t.action.toUpperCase()} ${t.ticker} on ${new Date(t.executedAt).toLocaleDateString()}`)
      .join("\n");
    recentTradesBlock = `\nRECENT TRADES (do not repeat these):\n${trades}`;
  }

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a professional DeFi portfolio analyst known for conservative but profitable risk management.
User intent: "${goal}"
${portfolioBlock}${goalsBlock}${recentTradesBlock}
- Focus: Find the highest conviction trade from: ${marketData.map(t => t.symbol).join(", ")}
- ${rejectedList}
- PROFESSIONAL STANDARD: Even if the portfolio is 100% cash, a professional analyst ALMOST NEVER suggests moving 100% into a single asset. 
- Always leave room for diversification and future opportunities. Conviction usually translates to 10% - 30% of total portfolio value.
- REASONING REQUIREMENT: You MUST explicitly mention the user's current holdings (e.g., "Since you currently hold 20% ETH...") and explain how this trade improves their overall balance.
- Analyze price momentum, volume trends, and market cap stability.
- Base your allocation on a combination of User Intent, Conviction Level, and prudent Diversification.
- Return ONLY raw JSON.`,
        },
        {
          role: "user",
          content: `MARKET DATA:\n${marketSnapshot}\n\nReturn exactly:\n{ "action": "buy"|"sell", "token": "...", "geckoId": "...", "entryPriceUsd": 0, "targetPriceUsd": 0, "stopLossPriceUsd": 0, "allocationPercent": 0, "expectedReturnPercent": 0, "timeHorizon": "...", "technicalSignal": "...", "reasoning": "...", "riskLevel": "low"|"medium"|"high" }`,
        },
      ],
      max_tokens: 500,
      temperature: 0.6,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const startIdx = text.indexOf("{");
    const endIdx = text.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) throw new Error("No JSON found");
    
    const parsed = JSON.parse(text.slice(startIdx, endIdx + 1));
    const result = sanitize(parsed, marketData);

    emit({
      id: "proposal_ready",
      label: "Proposal Generated",
      detail: `${result.action.toUpperCase()} ${result.token} @ ${fmtPrice(result.entryPriceUsd)}`,
      status: "done",
      timestamp: Date.now(),
    });

    // 5. Verifying Locally
    emit({
      id: "proof_verified",
      label: "Verifying Policy Locally",
      detail: "Shielding private rules from AI...",
      status: "loading",
    });

    return result;
  } catch (err) {
    emit({ id: "proposal_ready", label: "AI Analysis Failed", detail: "Using safe fallback", status: "error" });
    const ethLive = marketData.find((t) => t.geckoId === "ethereum");
    const ethPrice = ethLive?.priceUsd ?? 0;
    return sanitize({ action: "buy", token: "ETH", geckoId: "ethereum", entryPriceUsd: ethPrice }, marketData);
  }
}
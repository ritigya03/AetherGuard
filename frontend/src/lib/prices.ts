// CoinGecko public API — no API key required (rate-limited to ~30 req/min)
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Maps our token symbols to CoinGecko IDs
const SYMBOL_TO_CG_ID: Record<string, string> = {
  ETH: "ethereum",
  USDC: "usd-coin",
  WBTC: "wrapped-bitcoin",
};

export type PriceMap = Record<string, number>; // symbol → USD price

/**
 * Fetch current USD prices for the given token symbols from CoinGecko.
 * Returns a map of { ETH: 2300.50, USDC: 1.0, WBTC: 61234.0 }.
 */
export async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  const ids = symbols
    .map((s) => SYMBOL_TO_CG_ID[s])
    .filter(Boolean)
    .join(",");

  if (!ids) return {};

  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  const data: Record<string, { usd: number }> = await res.json();

  // Invert back from CoinGecko ID → symbol
  const priceMap: PriceMap = {};
  for (const symbol of symbols) {
    const cgId = SYMBOL_TO_CG_ID[symbol];
    if (cgId && data[cgId]?.usd !== undefined) {
      priceMap[symbol] = data[cgId].usd;
    }
  }
  return priceMap;
}
/**
 * Format a USD value as a currency string, e.g. "$1,234.56"
 */
export function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 10 ? 4 : 2,
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

/**
 * Compute total portfolio value in USD from balances + prices.
 */
export function computePortfolioValue(
  balances: { symbol: string; formatted: string }[],
  prices: PriceMap
): number {
  return balances.reduce((total, { symbol, formatted }) => {
    const price = prices[symbol] ?? 0;
    const amount = parseFloat(formatted) || 0;
    return total + amount * price;
  }, 0);
}
import type { TradeProposal } from "./claude";

export interface GuardrailResult {
  passed: boolean;
  violations: string[];
  autoReject: boolean;
}

const TOP_20 = [
  'btc','eth','usdc','usdt','bnb','sol','xrp',
  'ada','avax','dot','matic','link','uni','aave',
  'mkr','wbtc','dai','atom','ltc','near'
];

const MEMECOINS = [
  'doge','shib','pepe','wif','bonk',
  'floki','meme','brett','turbo'
];

export function checkRules(
  proposal: TradeProposal,
  rules: string[]
): GuardrailResult {
  const violations: string[] = [];
  const token = proposal.token.toLowerCase();

  for (const rule of rules) {
    const r = rule.toLowerCase();

    // Max allocation check (flexible RegEx)
    const maxMatch = r.match(/(?:max allocation|allocation limit|allocation per token).*?(\d+)\s*%/i);
    if (maxMatch) {
      const max = parseInt(maxMatch[1]);
      if (proposal.allocationPercent > max) {
        violations.push(
          `Exceeds allocation limit — ${proposal.allocationPercent}% > ${max}%`
        );
      }
    }

    // No memecoins
    if (r.includes('no memecoins') || r.includes('avoid memecoins')) {
      if (MEMECOINS.some(m => token.includes(m))) {
        violations.push(`${proposal.token} is a memecoin — strategy forbids it`);
      }
    }

    // Only specific tokens (ignore 'top X' and 'buy/sell' actions here)
    if (r.includes('only') && !r.includes('top')) {
      // Check for action constraints: "only buy" or "only sell"
      if (r.includes('only buy') && proposal.action.toLowerCase() !== 'buy') {
        violations.push(`Strategy only allows BUY actions`);
      }
      if (r.includes('only sell') && proposal.action.toLowerCase() !== 'sell') {
        violations.push(`Strategy only allows SELL actions`);
      }

      // Handle token lists: "only BTC, ETH" (excluding 'buy'/'sell' from being treated as tokens)
      const onlyMatch = r.match(/only\s+(.*?)(?:\by|by|$)/i);
      if (onlyMatch) {
        const allowedText = onlyMatch[1].toLowerCase();
        // Remove 'buy' and 'sell' from the potential token list strings
        const cleanedText = allowedText.replace(/\bbuy\b|\bsell\b/g, '').trim();
        
        if (cleanedText.length > 2) {
          const allowedTokens = cleanedText.split(/[,\s]+|and/).map(t => t.trim()).filter(t => t.length > 1);
          if (allowedTokens.length > 0) {
            const isAllowed = allowedTokens.some(allowed => 
              token.includes(allowed) || allowed.includes(token)
            );
            if (!isAllowed) {
              violations.push(`${proposal.token} is not in your allowed set: [${allowedTokens.join(", ")}]`);
            }
          }
        }
      }
    }

    // Dynamic Top X check
    const topMatch = r.match(/top\s+(\d+)/);
    if (topMatch) {
      const limit = parseInt(topMatch[1]);
      // We use our existing TOP_20 list as a proxy for the top assets
      // In a real app, this would check a live market cap API
      if (!TOP_20.slice(0, limit).some(t => token.includes(t))) {
        violations.push(`${proposal.token} is not in top ${limit} by market cap`);
      }
    }

    // Blue chip only
    if (r.includes('blue chip')) {
      const blueChips = ['btc','eth','usdc','usdt'];
      if (!blueChips.some(b => token.includes(b))) {
        violations.push(`${proposal.token} is not a blue chip asset`);
      }
    }

    // Never trade more than $X
    const amountMatch = r.match(/never trade more than \$(\d+)/);
    if (amountMatch) {
      if (proposal.allocationPercent > 15) {
        violations.push(
          `Allocation may exceed $${amountMatch[1]} trade limit`
        );
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    autoReject: violations.length > 0,
  };
}
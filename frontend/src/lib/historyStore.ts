export interface DecisionRecord {
  id: string;
  timestamp: string;
  trade: string;
  reasoning: string;
  txHash: string;
  blockNumber: number;
  merkleRoot: string;
  status: "verified" | "rejected";
}

const BASE_KEY = "aetherguard_decisions";

function storageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${BASE_KEY}_${walletAddress.toLowerCase()}`;
  }
  return BASE_KEY;
}

export function saveDecision(
  record: Omit<DecisionRecord, "id" | "timestamp">,
  walletAddress?: string
): DecisionRecord {
  const full: DecisionRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const existing = getDecisions(walletAddress);
  localStorage.setItem(storageKey(walletAddress), JSON.stringify([full, ...existing]));
  return full;
}

export function getDecisions(walletAddress?: string): DecisionRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearDecisions(walletAddress?: string): void {
  localStorage.removeItem(storageKey(walletAddress));
}
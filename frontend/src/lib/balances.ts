import { ethers } from "ethers";

// ─── ABI ──────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

// ─── Chain config ─────────────────────────────────────────────────────────────

export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  /** Public RPC — used when we want to read a chain the wallet isn't on */
  rpcUrl: string;
  isTestnet: boolean;
  tokens: TokenConfig[];
}

export const CHAINS: Record<number, ChainConfig> = {
  // ── Mainnets ────────────────────────────────────────────────────────────────
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    shortName: "Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    isTestnet: false,
    tokens: [
      { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
      { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
    ],
  },
  8453: {
    chainId: 8453,
    name: "Base",
    shortName: "Base",
    rpcUrl: "https://mainnet.base.org",
    isTestnet: false,
    tokens: [
      { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    ],
  },
  10: {
    chainId: 10,
    name: "Optimism",
    shortName: "OP",
    rpcUrl: "https://mainnet.optimism.io",
    isTestnet: false,
    tokens: [
      { symbol: "USDC", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
      { symbol: "WBTC", address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8 },
    ],
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum One",
    shortName: "Arb",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    isTestnet: false,
    tokens: [
      { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      { symbol: "WBTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8 },
    ],
  },
  // ── Testnets ─────────────────────────────────────────────────────────────────
  11155111: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    isTestnet: true,
    tokens: [
      // Aave faucet USDC on Sepolia — swap for your own deployed token address if needed
      { symbol: "USDC", address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", decimals: 6 },
    ],
  },
  31337: {
    chainId: 31337,
    name: "Localhost",
    shortName: "Local",
    rpcUrl: "http://localhost:8545",
    isTestnet: true,
    tokens: [],
  },
};

// Canonical display symbols — always shown, zero if not deployed on chain
const DISPLAY_SYMBOLS = ["ETH", "USDC", "WBTC"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenBalance {
  symbol: string;
  raw: bigint;
  formatted: string;
}

export interface BalancesResult {
  chainId: number;
  chainName: string;
  shortName: string;
  isTestnet: boolean;
  balances: TokenBalance[];
  totalUsd: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function zeroBalance(symbol: string): TokenBalance {
  return { symbol, raw: 0n, formatted: "0.00" };
}

async function safeErc20Balance(
  provider: ethers.JsonRpcProvider | ethers.BrowserProvider,
  token: TokenConfig,
  address: string
): Promise<TokenBalance> {
  try {
    const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
    const raw: bigint = await contract.balanceOf(address);
    const decimals = token.decimals;
    const formatted = parseFloat(ethers.formatUnits(raw, decimals)).toFixed(
      decimals === 6 ? 2 : decimals === 8 ? 6 : 4
    );
    return { symbol: token.symbol, raw, formatted };
  } catch {
    return zeroBalance(token.symbol);
  }
}

async function safeEthBalance(
  provider: ethers.JsonRpcProvider | ethers.BrowserProvider,
  address: string
): Promise<TokenBalance> {
  try {
    const raw = await provider.getBalance(address);
    const formatted = parseFloat(ethers.formatEther(raw)).toFixed(4);
    return { symbol: "ETH", raw, formatted };
  } catch {
    return zeroBalance("ETH");
  }
}

// ─── Core: fetch balances for a specific chain via static public RPC ──────────

/**
 * Fetches ETH + all configured token balances for `address` on `chainId`.
 * Uses a public JSON-RPC endpoint — does NOT require the wallet to be on that chain.
 * Pass `existingProvider` when the wallet is already on this chain to reuse the connection.
 */
export async function fetchBalancesForChain(
  chainId: number,
  address: string,
  existingProvider?: ethers.BrowserProvider
): Promise<Omit<BalancesResult, "totalUsd">> {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const provider: ethers.JsonRpcProvider | ethers.BrowserProvider =
    existingProvider ?? new ethers.JsonRpcProvider(chain.rpcUrl);

  const [ethBalance, ...tokenBalances] = await Promise.all([
    safeEthBalance(provider, address),
    ...DISPLAY_SYMBOLS.filter((s) => s !== "ETH").map((sym) => {
      const cfg = chain.tokens.find((t) => t.symbol === sym);
      if (!cfg) return Promise.resolve(zeroBalance(sym));
      return safeErc20Balance(provider, cfg, address);
    }),
  ]);

  return {
    chainId,
    chainName: chain.name,
    shortName: chain.shortName,
    isTestnet: chain.isTestnet,
    balances: [ethBalance, ...tokenBalances],
  };
}

// ─── Dual-chain: fetch Sepolia + Mainnet in parallel ─────────────────────────

export interface DualChainBalances {
  testnet: Omit<BalancesResult, "totalUsd">;
  mainnet: Omit<BalancesResult, "totalUsd">;
}

/**
 * Fetches balances for Sepolia AND Ethereum Mainnet simultaneously.
 * No chain-switching required — the wallet can be on any network.
 */
export async function fetchDualChainBalances(
  walletProvider: ethers.BrowserProvider,
  address: string
): Promise<DualChainBalances> {
  const network = await walletProvider.getNetwork();
  const connectedChainId = Number(network.chainId);

  const [testnet, mainnet] = await Promise.all([
    fetchBalancesForChain(
      11155111,
      address,
      connectedChainId === 11155111 ? walletProvider : undefined
    ),
    fetchBalancesForChain(
      1,
      address,
      connectedChainId === 1 ? walletProvider : undefined
    ),
  ]);

  return { testnet, mainnet };
}

// Re-export chain names map for convenience
export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
  Object.values(CHAINS).map((c) => [c.chainId, c.name])
);
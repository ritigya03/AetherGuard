import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserProvider, JsonRpcProvider } from "ethers";
import { checkUserHasAgent, getUserAgentAddress } from "@/lib/factory";

interface WalletState {
  address: string | null;
  shortAddress: string;
  ensName: string | null;
  displayName: string;
  isConnected: boolean;
  hasAgent: boolean;
  agentAddress: string | null;
  isLoadingAgent: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshAgent: () => Promise<void>;
}

const defaultState: WalletState = {
  address: null,
  shortAddress: "",
  ensName: null,
  displayName: "",
  isConnected: false,
  hasAgent: false,
  agentAddress: null,
  isLoadingAgent: false,
  connect: async () => {},
  disconnect: () => {},
  refreshAgent: async () => {},
};

const WalletContext = createContext<WalletState>(defaultState);

export function useWallet(): WalletState {
  return useContext(WalletContext);
}

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function loadAgentInfo(address: string) {
  const [hasAgent, agentAddress] = await Promise.all([
    checkUserHasAgent(address).catch(() => false),
    getUserAgentAddress(address).catch(() => null),
  ]);
  const validAgent =
    agentAddress && agentAddress !== "0x0000000000000000000000000000000000000000"
      ? agentAddress
      : null;
  return { hasAgent, agentAddress: validAgent };
}

async function resolveENSName(address: string): Promise<string | null> {
  try {
    const provider = new JsonRpcProvider("https://ethereum.publicnode.com");
    const name = await provider.lookupAddress(address);
    return name;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [hasAgent, setHasAgent] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  const refreshAgent = useCallback(async () => {
    if (!address) {
      setHasAgent(false);
      setAgentAddress(null);
      return;
    }
    setIsLoadingAgent(true);
    try {
      const info = await loadAgentInfo(address);
      setHasAgent(info.hasAgent);
      setAgentAddress(info.agentAddress);
    } catch(_e) {
      console.log(_e);
    } 
    
    finally {
      setIsLoadingAgent(false);
    }
  }, [address]);

  useEffect(() => {
    refreshAgent();
  }, [refreshAgent]);

  // Resolve ENS name whenever address changes
  useEffect(() => {
    if (!address) { setEnsName(null); return; }
    resolveENSName(address).then(setEnsName).catch(() => setEnsName(null));
  }, [address]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Please install it first.");
      return;
    }
    const provider = new BrowserProvider(window.ethereum);
    const accounts: string[] = await provider.send("eth_requestAccounts", []);
    if (accounts[0]) setAddress(accounts[0]);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setHasAgent(false);
    setAgentAddress(null);
    setEnsName(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else setAddress(accounts[0]);
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts[0]) setAddress(accounts[0]);
      })
      .catch(() => {});

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect]);

  const value: WalletState = {
    address,
    shortAddress: address ? shorten(address) : "",
    ensName,
    // Shows ENS name if available, otherwise shortened address
    displayName: ensName ?? (address ? shorten(address) : ""),
    isConnected: !!address,
    hasAgent,
    agentAddress,
    isLoadingAgent,
    connect,
    disconnect,
    refreshAgent,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
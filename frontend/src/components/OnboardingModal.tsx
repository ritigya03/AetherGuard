import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Shield, Loader2, CheckCircle } from "lucide-react";
import { deployUserAgent } from "@/lib/factory";
import { keccak256, toUtf8Bytes } from "ethers";

interface OnboardingModalProps {
  open: boolean;
  onComplete: (agentAddress: string) => void;
}

function ensNamehash(name: string): string {
  let node = new Uint8Array(32).fill(0);

  if (name === "") return "0x" + Array.from(node).map(b => b.toString(16).padStart(2, "0")).join("");

  const labels = name.split(".").reverse();

  for (const label of labels) {
    const labelHash = keccak256(toUtf8Bytes(label));
    const labelHashBytes = hexToBytes(labelHash.slice(2));
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(labelHashBytes, 32);
    const newHash = keccak256(combined);
    node = hexToBytes(newHash.slice(2));
  }

  return "0x" + Array.from(node).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [ensName, setEnsName] = useState("");
  const [status, setStatus] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const handleDeploy = async () => {
    if (!ensName.trim()) { setError("Enter an ENS name."); return; }
    
    // 1. Ensure we are on Sepolia (11155111)
    if (window.ethereum) {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0xaa36a7') { // 11155111 in hex
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia',
                  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                }],
              });
            } catch (addError) {
              setError("Please switch your MetaMask to Sepolia network.");
              return;
            }
          } else {
            setError("Please switch your MetaMask to Sepolia network.");
            return;
          }
        }
      }
    }

    setStatus("deploying");
    setError("");
    try {
      const node = ensNamehash(ensName.trim());
      const agentAddress = await deployUserAgent(node);
      setStatus("done");
      setTimeout(() => onComplete(agentAddress), 1500);
    } catch (e: any) {
      setError(e?.message || "Deployment failed.");
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-strong rounded-xl p-8 max-w-md w-full mx-4 glow-border"
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Deploy Your Agent</h2>
                <p className="text-xs text-muted-foreground">One-time setup. You own it forever.</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="glass rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p>✓ Your own private AetherGuard contract</p>
                <p>✓ Owned by your ENS identity</p>
                <p>✓ No one else can touch your strategy</p>
              </div>

              <div>
                <label className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-2 block">
                  Your ENS Name
                </label>
                <input
                  type="text"
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  placeholder="yourname.eth"
                  disabled={status === "deploying" || status === "done"}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  No ENS? Use any name — e.g. yourname.eth
                </p>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              {status === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-cyber-verified text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Agent deployed! Setting up...
                </motion.div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeploy}
              disabled={status === "deploying" || status === "done"}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display text-sm font-bold glow-border disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "deploying" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</>
              ) : status === "done" ? (
                <><CheckCircle className="w-4 h-4" /> Done!</>
              ) : (
                <><Shield className="w-4 h-4" /> Deploy My Agent</>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;

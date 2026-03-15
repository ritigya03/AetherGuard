
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ShieldCheck, X, ExternalLink, Hash, FileText, Zap, AlertTriangle } from "lucide-react";
import { getEtherscanUrl } from "@/lib/contract";
import { formatHashShort } from "@/lib/proof";
import type { ProofResult } from "@/lib/proof";
import MerkleTreeVisualizer from "./MerkleTreeVisualizer";

interface ProofVerifierProps {
  open: boolean;
  onClose: () => void;
  proof?: {
    trade: string;
    merkleRoot: string;
    txHash: string;
    blockNumber?: number;
    proof?: ProofResult;
    status?: 'verified' | 'rejected';
  };
}

const ProofVerifier = ({ open, onClose, proof }: ProofVerifierProps) => {
  const [verified, setVerified] = useState(false);
  const [viewMode, setViewMode] = useState<"details" | "tree">("tree");

  const handleVerify = () => {
    setVerified(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl w-[90vw] h-[90vh] flex flex-col glow-border overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-border/50 bg-secondary/30">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" /> Proof Verification
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-display">
                  Validating zero-knowledge compliance proof
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                   <button 
                    onClick={() => setViewMode("tree")}
                    className={`px-3 py-1.5 rounded-md text-xs font-display transition-all ${viewMode === "tree" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                   >
                     Visual Tree
                   </button>
                   <button 
                    onClick={() => setViewMode("details")}
                    className={`px-3 py-1.5 rounded-md text-xs font-display transition-all ${viewMode === "details" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                   >
                     Raw Details
                   </button>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary/80 transition-colors">
                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {viewMode === "tree" ? (
                <div className="py-4">
                  <div className="text-center mb-8">
                     <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-2 px-4 py-1 rounded-full bg-primary/5 inline-block border border-primary/10">
                       Cryptographic Path
                     </p>
                  </div>
                  <MerkleTreeVisualizer proofResult={proof?.proof} trade={proof?.trade || ""} />
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass rounded-xl p-4 border border-border/50">
                      <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Decision
                      </p>
                      <p className="text-sm text-foreground font-mono font-bold">{proof?.trade || "No trade data"}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-border/50">
                      <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Status
                      </p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${proof?.status === 'verified' ? 'bg-cyber-verified' : 'bg-destructive'}`} />
                        <p className={`text-sm font-display font-bold uppercase ${proof?.status === 'verified' ? 'text-cyber-verified' : 'text-destructive'}`}>
                          {proof?.status === 'verified' ? 'Compliance Verified' : 'Rule Violation Logged'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-5 border border-border/50">
                    <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Merkle Root Hash
                    </p>
                    <p className="text-xs text-primary font-mono break-all bg-background/50 rounded-lg p-3 border border-primary/10">
                      {proof?.merkleRoot || "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 px-1">
                      This root commit represents all your private rules combined.
                    </p>
                  </div>

                  <div className="glass rounded-xl p-5 border border-border/50">
                    <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Transaction Hash
                    </p>
                    <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3 border border-border/30">
                      <p className="text-xs text-foreground font-mono break-all flex-1">
                        {proof?.txHash || "—"}
                      </p>
                      {proof?.txHash && (
                        <a href={getEtherscanUrl(proof.txHash)} target="_blank" rel="noopener noreferrer" 
                          className="p-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-sm border border-primary/20">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {proof?.blockNumber && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-muted-foreground font-display">Block Confirmation</span>
                      <span className="text-xs text-foreground font-mono font-bold bg-secondary/50 px-2 py-0.5 rounded border border-border/50">
                        #{proof.blockNumber.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 border-t border-border/50 bg-secondary/30 flex flex-col sm:flex-row gap-4">
              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                onClick={handleVerify} 
                disabled={verified}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-display text-sm font-bold transition-all shadow-lg ${
                  verified 
                    ? "bg-cyber-verified/20 text-cyber-verified border border-cyber-verified/50" 
                    : "bg-primary text-primary-foreground hover:shadow-primary/20 hover:scale-[1.01]"
                }`}
              >
                {verified ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Proof Verified & Validated
                  </>
                ) : (
                  "Confirm Cryptographic Proof"
                )}
              </motion.button>
              
              {proof?.txHash && (
                <a href={getEtherscanUrl(proof.txHash)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-background/50 text-muted-foreground hover:text-foreground font-display text-sm font-bold transition-all hover:bg-background">
                  <ExternalLink className="w-4 h-4" /> View on Explorer
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProofVerifier;

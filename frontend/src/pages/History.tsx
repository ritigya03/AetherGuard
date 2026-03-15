import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Shield, ExternalLink, Trash2 } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import ProofVerifier from "@/components/ProofVerifier";
import { getDecisions, clearDecisions, type DecisionRecord } from "@/lib/historyStore";
import { getEtherscanUrl } from "@/lib/contract";
import { formatHashShort } from "@/lib/proof";
import { useWallet } from "@/context/WalletContext";

const History = () => {
  const { address } = useWallet();
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<{
    trade: string;
    merkleRoot: string;
    txHash: string;
    blockNumber: number;
  } | undefined>();

  useEffect(() => {
    setDecisions(getDecisions(address?.toLowerCase()));
  }, [address]);

  const handleVerify = (d: DecisionRecord) => {
    setSelectedProof({
      trade: d.trade,
      merkleRoot: d.merkleRoot,
      txHash: d.txHash,
      blockNumber: d.blockNumber,
    });
    setModalOpen(true);
  };

  const handleClear = () => {
    clearDecisions(address?.toLowerCase());
    setDecisions([]);
  };

  return (
    <div className="relative min-h-screen pt-24 pb-12">
      <ParticleBackground />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">History and Proofs</h1>
          {decisions.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive font-display text-xs font-semibold border border-destructive/20 hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </motion.button>
          )}
        </motion.div>

        {decisions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-16 text-center"
          >
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="font-display text-lg text-muted-foreground">No decisions yet</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              {address
                ? "Approve or reject a trade in the Strategy Editor to see it here."
                : "Connect your wallet to see your decision history."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Timestamp", "Trade", "Reasoning", "Tx Hash", "Block", "Status", ""].map((h) => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-display font-semibold text-primary uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d, i) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(d.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground font-display font-semibold whitespace-nowrap">
                        {d.trade}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                        {d.reasoning}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={getEtherscanUrl(d.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary font-mono hover:underline"
                        >
                          {formatHashShort(d.txHash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                        #{d.blockNumber.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-semibold ${
                          d.status === "rejected"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-cyber-verified/20 text-cyber-verified"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            d.status === "rejected" ? "bg-yellow-400" : "bg-cyber-verified"
                          }`} />
                          {d.status === "rejected" ? "rejected" : "verified"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleVerify(d)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-display text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          Verify
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
      <ProofVerifier open={modalOpen} onClose={() => setModalOpen(false)} proof={selectedProof} />
    </div>
  );
};

export default History;
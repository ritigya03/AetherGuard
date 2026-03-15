import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Shield, Lock, FileText, Cpu, Binary, CheckCircle2, ArrowRight } from "lucide-react";
import type { ProofResult } from "@/lib/proof";
import { formatHashShort } from "@/lib/proof";

interface MerkleTreeVisualizerProps {
  proofResult?: ProofResult;
  trade: string;
}

const MerkleTreeVisualizer = ({ proofResult }: MerkleTreeVisualizerProps) => {
  const [activeLayer, setActiveLayer] = useState(-1);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!proofResult || !proofResult.layers) return null;

  const totalLayers = proofResult.layers.length;

  const startVerification = () => {
    setIsVerifying(true);
    setActiveLayer(0);
  };

  useEffect(() => {
    if (isVerifying && activeLayer < totalLayers - 1) {
      const timer = setTimeout(() => {
        setActiveLayer(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeLayer, isVerifying, totalLayers]);

  // Layout Constants
  const nodeWidth = 140;
  const nodeHeight = 60;
  const horizontalGap = 40;
  const verticalGap = 100;

  /**
   * Get the X position for a node.
   * We base the total width on the LEAF layer (layer 0), which is the widest.
   * Every layer is centered within that same total width so the tree looks balanced.
   */
  const getXPos = (lIdx: number, nIdx: number) => {
    const leafCount = proofResult.layers[0].length;
    const totalWidth = leafCount * (nodeWidth + horizontalGap) - horizontalGap;

    const layerNodeCount = proofResult.layers[lIdx].length;
    // Width allocated per slot in this layer
    const slotWidth = totalWidth / layerNodeCount;
    return nIdx * slotWidth + slotWidth / 2 - nodeWidth / 2;
  };

  /**
   * Determine whether a node is the lone odd node in its layer.
   * A lone odd node is the last node in a layer with an odd number of nodes.
   * Per standard Merkle tree spec (Bitcoin-style), this node is duplicated and
   * hashed with itself: hash(node || node) → parent.
   *
   * IMPORTANT: The root layer (lIdx === totalLayers - 1) always has exactly 1
   * node by definition — that is NOT an odd node, it's just the root. We
   * explicitly exclude it so the root never gets the "duplicated ×2" treatment.
   */
  const isLoneOddNode = (lIdx: number, nIdx: number): boolean => {
    if (lIdx === totalLayers - 1) return false; // root is never a lone odd node
    const layer = proofResult.layers[lIdx];
    return layer.length % 2 === 1 && nIdx === layer.length - 1;
  };

  return (
    <div className="relative min-h-[600px] w-full bg-slate-950/50 rounded-3xl border border-white/5 p-8 flex flex-col items-center overflow-x-auto custom-scrollbar shadow-2xl">

      {!isVerifying ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startVerification}
            className="cursor-pointer group relative"
          >
            <div className="absolute -inset-8 bg-blue-500/20 blur-3xl group-hover:bg-blue-500/30 transition-all rounded-full" />
            <div className="relative glass p-8 rounded-full border border-blue-500/50 shadow-2xl bg-slate-900">
              <Binary className="w-16 h-16 text-blue-400 animate-pulse" />
            </div>
          </motion.div>
          <div className="mt-10">
            <h3 className="font-display text-2xl font-black text-white tracking-tight">Binary Merkle Construction</h3>
            <p className="mt-4 text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Experience the true mathematical verification. Watch as we hash your{" "}
              <span className="text-blue-400 font-bold">Proposal</span> with your{" "}
              <span className="text-slate-200">Private Rules</span> to reach the On-Chain Root.
            </p>
          </div>
          <button
            onClick={startVerification}
            className="mt-10 px-8 py-3 rounded-xl bg-blue-500 text-white font-display text-sm font-black hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
          >
            Run Real-Time Proof
          </button>
        </div>
      ) : (
        <div className="relative w-full flex flex-col items-center">
          <div
            className="relative mt-16 mb-24"
            style={{
              height: (totalLayers - 1) * verticalGap + nodeHeight,
              width: proofResult.layers[0].length * (nodeWidth + horizontalGap),
            }}
          >
            {/* ── SVG Connections ─────────────────────────────────────── */}
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {proofResult.layers.map((layer, lIdx) => {
                // Don't draw edges from the root layer (nothing above it)
                if (lIdx >= totalLayers - 1) return null;
                // Only draw edges for layers that have been animated in,
                // and only when the PARENT layer is also visible.
                if (lIdx >= activeLayer) return null;

                return layer.map((_, nIdx) => {
                  const x1 = getXPos(lIdx, nIdx) + nodeWidth / 2;
                  const y1 = (totalLayers - 1 - lIdx) * verticalGap + nodeHeight / 2;

                  const pIdx = Math.floor(nIdx / 2);
                  const x2 = getXPos(lIdx + 1, pIdx) + nodeWidth / 2;
                  const y2 = (totalLayers - 1 - (lIdx + 1)) * verticalGap + nodeHeight / 2;

                  const loneOdd = isLoneOddNode(lIdx, nIdx);

                  return (
                    <g key={`edge-${lIdx}-${nIdx}`}>
                      {/* ── Main edge: node → parent ── */}
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        d={`M ${x1} ${y1} C ${x1} ${y1 - verticalGap / 2}, ${x2} ${y2 + verticalGap / 2}, ${x2} ${y2}`}
                        stroke="url(#lineGrad)"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5 3"
                      />

                      {/*
                       * ── Self-loop edge for lone odd node ──
                       * Standard Merkle spec: the unpaired leaf is hashed with
                       * itself  →  hash(node ∥ node).  We draw a small amber
                       * arc looping back to the same node so the viewer can
                       * see that this node acts as BOTH left and right child.
                       */}
                      {loneOdd && (
                        <motion.path
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.7 }}
                          transition={{ duration: 0.7, ease: "easeInOut", delay: 0.4 }}
                          d={`
                            M ${x1 + 12} ${y1 - 8}
                            C ${x1 + 60} ${y1 - 50},
                              ${x1 + 60} ${y1 + 50},
                              ${x1 + 12} ${y1 + 8}
                          `}
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          fill="none"
                          strokeDasharray="3 3"
                          markerEnd="url(#arrowAmber)"
                        />
                      )}
                    </g>
                  );
                });
              })}

              {/* Arrowhead marker for the self-loop */}
              <defs>
                <marker
                  id="arrowAmber"
                  markerWidth="6"
                  markerHeight="6"
                  refX="3"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" opacity="0.7" />
                </marker>
              </defs>
            </svg>

            {/* ── Nodes ───────────────────────────────────────────────── */}
            {proofResult.layers.map((layer, lIdx) => {
              if (lIdx > activeLayer) return null;

              const layerY = (totalLayers - 1 - lIdx) * verticalGap;
              const isRoot = lIdx === totalLayers - 1;
              const isLeafLayer = lIdx === 0;

              return (
                <div key={`layer-${lIdx}`} className="absolute inset-0 pointer-events-none">
                  {layer.map((hash, nIdx) => {
                    const xPos = getXPos(lIdx, nIdx);
                    const isDecisionLeaf = isLeafLayer && hash === proofResult.leaf;
                    const loneOdd = isLoneOddNode(lIdx, nIdx);

                    return (
                      <motion.div
                        key={`node-${lIdx}-${nIdx}`}
                        initial={{ scale: 0, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="absolute pointer-events-auto"
                        style={{ left: xPos, top: layerY, width: nodeWidth, height: nodeHeight }}
                      >
                        {/*
                         * "DUPLICATED ×2" badge — shown above the lone odd node
                         * so the user understands it will be hashed with itself.
                         */}
                        {loneOdd && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="absolute -top-6 left-0 right-0 flex justify-center"
                          >
                            <span className="text-[7px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                              duplicated ×2
                            </span>
                          </motion.div>
                        )}

                        <div
                          className={`w-full h-full glass rounded-xl border-2 flex flex-col items-center justify-center p-3 text-center transition-all duration-700 shadow-2xl ${
                            isDecisionLeaf
                              ? "border-blue-500 bg-blue-500/10 scale-110 z-30"
                              : isRoot
                              ? "border-green-500 bg-green-500/10 scale-125 z-40"
                              : loneOdd
                              ? "border-amber-500/60 bg-amber-500/5"
                              : lIdx > 0
                              ? "border-green-500/30 bg-slate-900/40"
                              : "border-slate-700/50 bg-slate-900/60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {isRoot ? (
                              <Shield className="w-3 h-3 text-green-400" />
                            ) : isDecisionLeaf ? (
                              <FileText className="w-3 h-3 text-blue-400" />
                            ) : loneOdd ? (
                              // Distinct icon for lone odd node
                              <span className="text-[10px]">⟳</span>
                            ) : lIdx === 0 ? (
                              <Lock className="w-3 h-3 text-slate-400" />
                            ) : (
                              <Binary className="w-3 h-3 text-green-400/60" />
                            )}
                            <span className="text-[8px] font-black uppercase tracking-tighter opacity-80 text-white">
                              {isRoot
                                ? "On-Chain Root"
                                : isLeafLayer
                                ? isDecisionLeaf
                                  ? "Proposal"
                                  : loneOdd
                                  ? "Private Rule (self-paired)"
                                  : "Private Rule"
                                : `Internal H${lIdx}`}
                            </span>
                          </div>

                          <div className="w-full bg-black/40 rounded px-1.5 py-1 border border-white/5">
                            <code className="text-[9px] font-mono text-blue-300/90 font-bold block truncate">
                              {formatHashShort(hash)}
                            </code>
                          </div>
                        </div>

                        {/* "Stored On-Chain" banner next to the root */}
                        {isRoot && (
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 }}
                            className="absolute left-full ml-4 top-1/2 -translate-y-1/2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-px bg-green-500/50" />
                              <div className="glass px-2 py-1 rounded border border-green-500/40 bg-green-500/20 whitespace-nowrap">
                                <span className="text-[7px] font-black text-green-400 uppercase tracking-widest">
                                  L2 STATE STORED
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ── Explainer Card ──────────────────────────────────────── */}
          <div className="mt-12 w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {activeLayer < totalLayers - 1 ? (
                <motion.div
                  key="computing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-strong border-blue-500/20 p-8 rounded-3xl"
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <Cpu className="absolute inset-0 m-auto w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-display font-black text-white italic">
                        {activeLayer === 0 ? "Hashing Physical Data" : `Compressing Layer ${activeLayer}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono text-blue-400 uppercase">
                          Step {activeLayer + 1} of {totalLayers}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <p className="text-xs text-slate-400">
                          {proofResult.layers[activeLayer]?.length % 2 === 1
                            ? "Odd layer detected — lone node duplicated and self-paired (Bitcoin spec)"
                            : "Pairing sibling hashes using 256-bit Keccak"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-strong border-green-500/30 p-8 rounded-3xl bg-green-500/5 shadow-2xl shadow-green-500/5"
                >
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/30 shadow-inner">
                      <Shield className="w-10 h-10 text-green-400" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="text-xl font-display font-black text-white uppercase tracking-tighter">
                        Cryptographic Integrity Sealed
                      </h4>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed font-bold">
                        Your rules have been reduced to a single 32-byte root. This root is an immutable fingerprint
                        of your strategy. The AI's proposal is now mathematically proven to satisfy your conditions,
                        verified by the Merkle proof path.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Leaves</span>
                      <p className="text-lg font-mono font-bold text-white">{proofResult.allLeaves.length}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Depth</span>
                      <p className="text-lg font-mono font-bold text-white">{totalLayers}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Algorithm</span>
                      <p className="text-lg font-mono font-bold text-blue-400">Keccak256</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Security</span>
                      <p className="text-lg font-mono font-bold text-green-400">SHA-3 🔒</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerkleTreeVisualizer;
import { motion } from "framer-motion";
import { ExternalLink, Database, Shield, BookOpen, List, RefreshCw } from "lucide-react";
import { getMasterDocLink, getStrategyDocLinks, forceResyncAll, type Strategy } from "@/lib/fileverseStore";
import { useState, useEffect } from "react";

interface DataVaultProps {
  refreshTrigger?: number;
  strategies?: Strategy[];
}

const DataVault = ({ refreshTrigger, strategies = [] }: DataVaultProps) => {
  const [masterLink, setMasterLink] = useState(getMasterDocLink());
  const [strategyLinks, setStrategyLinks] = useState(getStrategyDocLinks());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const accounts = await (window as any).ethereum?.request({ method: "eth_accounts" });
      const wallet = accounts?.[0] || "";
      await forceResyncAll(wallet);
      setMasterLink(getMasterDocLink());
      setStrategyLinks(getStrategyDocLinks());
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setMasterLink(getMasterDocLink());
    setStrategyLinks(getStrategyDocLinks());
    // Auto-sync on mount and after each trade to keep Fileverse docs fresh
    handleSync();
  }, [refreshTrigger]);

  const hasData = masterLink || strategyLinks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 glass rounded-2xl p-8 border border-white/10"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            Decentralized Data Vault
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-display">
            Every strategy, trade, and decision — on Fileverse. Only you hold the keys.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {!hasData ? (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No documents yet. Create a strategy to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Master Index */}
          {masterLink && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Master Strategy Index</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Table of all strategies with links — {strategies.length} total
                    </p>
                  </div>
                </div>
                <a
                  href={masterLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Open Index <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Strategy Docs Table */}
          {strategyLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary/60" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Strategy Report Docs
                </span>
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-bold uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-bold uppercase tracking-wider">Strategy Name</th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-bold uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-bold uppercase tracking-wider">Trades</th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-bold uppercase tracking-wider">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(strategies.length > 0 ? strategies : strategyLinks.map(sl => ({
                      number: sl.number, name: sl.name, status: "active",
                      tradeRecords: [], docLink: sl.link,
                    }))).map((s: any) => (
                      <tr key={s.number} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-primary font-bold">#{s.number}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.status === "active"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-white/5 text-muted-foreground border-white/10"
                          }`}>
                            {s.status === "active" ? "🟢 Active" : "⏸ Paused"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.tradeRecords
                            ? `${s.tradeRecords.filter((r: any) => r.status === "executed").length} executed, ${s.tradeRecords.filter((r: any) => r.status?.startsWith("rejected")).length} rejected`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(s.docLink || strategyLinks.find(sl => sl.number === s.number)?.link) ? (
                            <a
                              href={s.docLink || strategyLinks.find(sl => sl.number === s.number)?.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-foreground/80 font-bold transition-colors border border-white/10"
                            >
                              View Report <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50 text-[10px]">Syncing…</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy Wall Notice */}
      <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
        <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h5 className="text-sm font-bold text-foreground">AetherGuard Privacy Wall</h5>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your private guardrail rules are <span className="text-primary font-bold">never stored</span> in any Fileverse document.
            Only trade outcomes (approved, rejected, executed) are recorded — not the rules that produced them.
            Your strategy logic stays 100% private.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DataVault;

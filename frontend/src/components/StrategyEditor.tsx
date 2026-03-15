import { motion } from "framer-motion";
import { Zap, Lock, Eye, EyeOff, Users, Plus, Trash2, BookOpen, RefreshCw, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  fetchCollaborativeState, 
  getActiveStrategy, 
  proposeRuleToTeam, 
  suggestTradeToTeam, 
  type MultiSigConfig, 
  type CollaborativeState 
} from "@/lib/fileverseStore";

interface StrategyEditorProps {
  goal: string;
  rules: string;
  multiSig: { multiSig?: MultiSigConfig };
  docLink?: string;
  onGoalChange: (value: string) => void;
  onRulesChange: (value: string) => void;
  onMultiSigChange: (config: { multiSig?: MultiSigConfig }) => void;
  strategyNumber?: number;
  strategyName?: string;
}

const StrategyEditor = ({ goal, rules, multiSig, docLink, onGoalChange, onRulesChange, onMultiSigChange, strategyNumber, strategyName }: StrategyEditorProps) => {
  const [rulesVisible, setRulesVisible] = useState(true);

  const activeRulesCount = rules
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("//")).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="h-full flex flex-col gap-4"
    >
      {/* ── Strategy Badge ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        {strategyNumber && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
              Personal Strategy #{strategyNumber}{strategyName ? ` — ${strategyName}` : ""}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Collaborative Tools</span>
          <a
            href="/boardroom"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-display text-[10px] font-bold border border-primary/30 hover:bg-primary/20 transition-all"
          >
            <Users className="w-3 h-3" />
            Open Boardroom
          </a>
        </div>
      </div>

      {/* ── Goal Panel ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 px-5 py-3 border-b border-primary/20 bg-primary/5">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-display text-xs font-bold text-primary tracking-wider uppercase">
            Shared Goal (Visible to AI)
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-display px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            <Zap className="w-2.5 h-2.5" /> Sent to AI
          </span>
        </div>

        <div className="relative z-10 p-4">
          <textarea
            value={goal}
            onChange={(e) => onGoalChange(e.target.value)}
            placeholder="e.g. I want to invest in ETH for long-term growth"
            spellCheck={false}
            rows={4}
            className="w-full resize-none bg-transparent font-mono text-sm text-foreground leading-6 focus:outline-none placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="relative z-10 px-5 py-2 border-t border-primary/20 flex items-center justify-between">
          <span className="text-[10px] text-primary/60 font-display">
            This goal is the primary context for the AI agent.
          </span>
          <span className="text-xs text-primary animate-pulse font-display">● Active</span>
        </div>
      </div>

      {/* ── Rules Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 rounded-xl border border-destructive/20 bg-secondary/50 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-destructive/5">
          <Lock className="w-4 h-4 text-destructive" />
          <span className="font-display text-xs font-bold text-destructive tracking-wider uppercase">
            Private Safety Rules (Local Only)
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-display px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
            <Lock className="w-2.5 h-2.5" /> Private — Never sent to AI
          </span>
          <button
            onClick={() => setRulesVisible((v) => !v)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title={rulesVisible ? "Hide rules" : "Show rules"}
          >
            {rulesVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        {rulesVisible && (
          <div className="relative z-10 flex flex-1 overflow-hidden">
            <div className="select-none px-3 py-4 text-right font-mono text-xs text-muted-foreground/40 min-w-[2.5rem] border-r border-border/30">
              {(rules || "").split("\n").map((_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>
            <textarea
              value={rules}
              onChange={(e) => onRulesChange(e.target.value)}
              placeholder={`// Guardrail Rules — AI never sees these\nmax allocation per token: 10%\navoid memecoins\nonly top 20 by market cap\nnever trade more than $500 at once`}
              spellCheck={false}
              className="flex-1 resize-none bg-transparent font-mono text-sm text-foreground px-4 py-4 leading-6 focus:outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {!rulesVisible && (
          <div className="relative z-10 flex-1 flex items-center justify-center gap-2 text-muted-foreground/40">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm font-display">Rules hidden for privacy</span>
          </div>
        )}

        <div className="relative z-10 px-5 py-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-display">
            {activeRulesCount} private constraints
          </span>
          <span className="text-xs text-destructive font-bold font-display flex items-center gap-1">
            <Lock className="w-3 h-3" /> Never Leaves Browser
          </span>
        </div>
      </div>

      <div className="relative z-10 px-5 py-3 rounded-xl border border-white/10 bg-black/20 text-center">
        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
          The <strong>AetherGuard Local Engine</strong> verifies every AI proposal against these rules using a Merkle tree.
          Compliant trades generate a proof that is logged in your <a href={docLink || "#"} target="_blank" rel="noopener" className="text-primary hover:underline">Private Audit Report</a>.
        </p>
      </div>
    </motion.div>
  );
};

export default StrategyEditor;

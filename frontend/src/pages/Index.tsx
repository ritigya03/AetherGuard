import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Shield, Wallet, Sparkles, ShieldCheck, Lock, Eye, Zap, 
  FileText, Users, BarChart3, Binary, Layers, Server, Activity, 
  ChevronRight, ArrowDownRight, ArrowUpRight, Share2
} from "lucide-react";
import { Link } from "react-router-dom";
import ParticleBackground from "@/components/ParticleBackground";
import HeroScene from "@/components/HeroScene";
import { useWallet } from "@/context/WalletContext";

// ── How It Works Steps ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Write Your Strategy",
    desc: "Define your rules in plain English — max allocation, allowed tokens, risk limits. Rules are hashed into a Merkle Tree and stay in your browser. Nothing leaves.",
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    step: "02",
    title: "AI Proposes, Blind",
    desc: "A Groq-powered AI analyzes market conditions and suggests trades. It never sees your private rules, ensuring your edge remains yours alone.",
    icon: Zap,
    color: "text-cyber-verified",
    bg: "bg-cyber-verified/10 border-cyber-verified/20",
  },
  {
    step: "03",
    title: "Multi-Sig Collaboration",
    desc: "Coordinate with your team. Every trade must be approved by the multi-sig group, enforced by the AetherGuard smart contract.",
    icon: ShieldCheck,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    step: "04",
    title: "Privacy-Preserved Execution",
    desc: "Approved trades execute via stealth addresses. Your strategy, alpha, and on-chain behaviour stay completely private from third parties.",
    icon: Eye,
    color: "text-cyber-verified",
    bg: "bg-cyber-verified/10 border-cyber-verified/20",
  },
];

// ── Tech Stack ─────────────────────────────────────────────────────────────────
const TECH = [
  {
    name: "Fileverse dDocs",
    role: "Build what big tech won't",
    desc: "Strategy audit logs and coordination stored as E2E encrypted decentralised documents. Not even Fileverse can read your rules.",
    color: "border-blue-500/30 bg-blue-500/5",
    tag: "Privacy",
  },
  {
    name: "Stealth Multi-Sig",
    role: "Collaborative Trading",
    desc: "Coordinate portfolio management with trusted partners. Privacy-preserving multi-sig ensures only authorized members see the strategy.",
    color: "border-purple-500/30 bg-purple-500/5",
    tag: "Collaboration",
  },
  {
    name: "L2 Smart Contracts",
    role: "On-chain Policy Enforcement",
    desc: "Merkle proof verification ensures compliance at minimal cost. The smart contract is the impartial judge — no human or AI override.",
    color: "border-cyan-500/30 bg-cyan-500/5",
    tag: "Enforcement",
  },
  {
    name: "ENS",
    role: "Human-Readable Identity",
    desc: "Your guardrail contract is owned by your ENS name. Readable, verifiable, and completely self-sovereign.",
    color: "border-primary/30 bg-primary/5",
    tag: "Identity",
  },
  {
    name: "Merkle Proofs",
    role: "Zero-Knowledge Compliance",
    desc: "Prove a trade is compliant without revealing the full ruleset. On-chain root = public commitment, strategy = private.",
    color: "border-green-500/30 bg-green-500/5",
    tag: "ZK",
  },
  {
    name: "Groq (Blind AI)",
    role: "Market Analysis",
    desc: "Proposes trades based on market data only — never sees your rules. AI works for you, but can never act without you.",
    color: "border-orange-500/30 bg-orange-500/5",
    tag: "AI",
  },
];

const FLOW_STEPS = [
  { title: "Privacy First", desc: "Strategy Hashed Locally", icon: Lock },
  { title: "Fileverse Hub", desc: "E2E Encrypted dDocs", icon: Share2 },
  { title: "Blind AI", desc: "Groq Market Analysis", icon: Zap },
  { title: "Policy Guard", desc: "On-chain Merkle Check", icon: ShieldCheck },
  { title: "Stealth Action", desc: "Private Execution", icon: Eye },
];

const FEATURES = [
  {
    title: "Trade Simulation Hub",
    desc: "A fully dynamic portal for your trading edge. Track cross-chain holdings in real-time, backed by AI market analysis and Merkle-protected policy enforcement.",
    icon: BarChart3,
    preview: (
      <div className="space-y-3 mt-4 p-4 rounded-xl glass border border-white/5 bg-black/40">
        <div className="flex justify-between items-center text-[10px] font-mono opacity-60">
          <span>GROQ_MARKET_SCAN</span>
          <span className="text-primary pulse">ANALYZING</span>
        </div>
        <div className="p-2 rounded bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-foreground">Draft Proposal</span>
            <span className="text-[10px] font-mono text-green-400">#8241</span>
          </div>
          <div className="text-[11px] font-bold text-white mb-1">Buy 0.5 ETH @ $2,450.00</div>
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-bold uppercase tracking-widest">Simulation</div>
            <div className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[8px] font-bold uppercase tracking-widest">Verified</div>
          </div>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="opacity-60 uppercase font-bold tracking-widest">Projected ROI</span>
          <span className="text-green-400 font-mono font-bold">+4.2% (24h)</span>
        </div>
      </div>
    )
  },
  {
    title: "Fileverse: Privacy Core",
    desc: "We build what Big Tech won't. AetherGuard uses Fileverse dDocs for E2E encrypted coordination. Decentralized, private, and essential for secure team-based alpha management.",
    icon: Share2,
    preview: (
      <div className="space-y-3 mt-4 p-4 rounded-xl glass border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Powered by Fileverse dDocs</span>
        </div>
        <div className="p-2 rounded bg-white/5 border border-white/10 text-[9px] text-blue-100/70 leading-relaxed font-mono">
          // Private dDoc Strategies<br/>
          // Team Consensus Drafts<br/>
          // E2E Encrypted Audit Logs<br/>
          // Non-Repudiation Guaranteed
        </div>
        <div className="flex justify-center">
          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-[8px] font-bold text-blue-400 border border-blue-500/30">
            DECENTRALIZED COORDINATION
          </div>
        </div>
      </div>
    )
  },
  {
    title: "The Boardroom",
    desc: "Consensus-driven trading for teams. Multi-signer thresholds and decentralized audit logs ensure the AI can never act without your explicit, team-wide approval.",
    icon: Users,
    preview: (
      <div className="space-y-2 mt-4 p-4 rounded-xl glass border border-white/5 bg-black/40">
        <div className="text-[10px] font-bold text-primary uppercase mb-2">Team Consensus Threshold</div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[1,2,3].map(i => (
              <div key={i} className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[8px] font-mono text-primary uppercase">U{i}</div>
            ))}
          </div>
          <div className="h-0.5 flex-1 bg-white/10 rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-primary w-3/4" />
          </div>
          <span className="text-[9px] font-bold">3/4</span>
        </div>
        <div className="mt-3 text-[8px] text-muted-foreground uppercase tracking-widest text-center border-t border-white/5 pt-2">
          Encrypted Audit Log via dDocs
        </div>
      </div>
    )
  }
];

// ─────────────────────────────────────────────────────────────────────────────

const Index = () => {
  const { isConnected, shortAddress, connect } = useWallet();

  return (
    <div className="relative overflow-hidden">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <ParticleBackground />
        <HeroScene />
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                <Shield className="w-10 h-10 text-primary drop-shadow-[0_0_12px_hsl(50_100%_50%/0.6)]" />
              </motion.div>
              <span className="font-display text-2xl font-bold tracking-widest text-foreground">AETHERGUARD</span>
            </div>
            <motion.div
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.3 }}
              className="mx-auto w-24 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mb-8"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight"
          >
            AI that works for you
            <br />
            <span className="text-primary glow-text relative">
              but can never act without you.
              <motion.span
                className="absolute -right-8 -top-4"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.span>
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto font-body"
          >
            Collaborative Portfolio Management. Pure Privacy. On-chain Security.
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex justify-center mb-12"
          >
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary animate-pulse">
              100% DYNAMIC DASHBOARD • TRADE SIMULATION ACTIVE
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px hsl(50 100% 50% / 0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={isConnected ? undefined : connect}
              className="flex items-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-display text-sm font-bold glow-border hover:glow-border-strong transition-all"
            >
              <Wallet className="w-4 h-4" />
              {isConnected ? <span className="font-mono">{shortAddress}</span> : "Connect Wallet"}
            </motion.button>
            <Link to="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05, borderColor: "hsl(50 100% 50% / 0.5)" }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-8 py-3.5 rounded-lg glass font-display text-sm font-semibold text-foreground hover:border-primary/50 transition-all group"
              >
                Launch Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}
            className="mt-20 flex items-center justify-center gap-8 md:gap-16"
          >
            {[
              { label: "Privacy Layer", value: "E2E" },
              { label: "Enforcement", value: "On-chain" },
              { label: "AI Knowledge of Rules", value: "Zero" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + i * 0.15 }} className="text-center">
                <p className="font-display text-2xl md:text-3xl font-bold text-primary glow-text">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-display tracking-wider uppercase">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating accent elements */}
          <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary/40 shadow-[0_0_8px_hsl(50_100%_50%/0.4)]" />
          <motion.div animate={{ y: [10, -10, 10] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-16 w-1.5 h-1.5 rounded-full bg-primary/30 shadow-[0_0_6px_hsl(50_100%_50%/0.3)]" />
          <motion.div animate={{ x: [-8, 8, -8], y: [5, -5, 5] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-20 w-1 h-1 rounded-full bg-primary/50 shadow-[0_0_10px_hsl(50_100%_50%/0.5)]" />
        </div>
      </div>

      {/* ── Architectural Flow ────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 border-y border-white/5 bg-black/20 overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-10" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-display uppercase tracking-widest text-primary mb-3">System Architecture</p>
            <h2 className="font-display text-4xl font-bold text-foreground">The Privacy-Safety Flow</h2>
          </motion.div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
            {/* Connection Lines (Desktop) */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden md:block -translate-y-1/2" />
            
            {FLOW_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative z-10 flex flex-col items-center text-center w-full md:w-auto"
              >
                <div className="w-16 h-16 rounded-2xl glass border border-primary/30 bg-primary/5 flex items-center justify-center mb-4 relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <step.icon className="w-8 h-8 text-primary relative z-10" />
                  {i < FLOW_STEPS.length - 1 && (
                    <motion.div 
                      animate={{ x: [0, 10, 0], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -right-6 top-1/2 -translate-y-1/2 hidden md:block"
                    >
                      <ChevronRight className="w-4 h-4 text-primary/40" />
                    </motion.div>
                  )}
                </div>
                <h4 className="font-display text-xs font-bold text-foreground mb-1">{step.title}</h4>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Deep Dives ───────────────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col h-full"
              >
                <div className="glass rounded-2xl p-8 border border-white/5 hover:border-primary/20 transition-colors flex-1 flex flex-col group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-4">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{f.desc}</p>
                  
                  {/* Interactive/Demo Preview */}
                  <div className="relative">
                    <div className="absolute -inset-2 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      {f.preview}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 cyber-grid opacity-10" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-display uppercase tracking-widest text-primary mb-3">Architecture</p>
            <h2 className="font-display text-4xl font-bold text-foreground">How AetherGuard Works</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              A four-layer system where AI, privacy, and on-chain enforcement work together — no trust required anywhere.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass rounded-xl p-6 border ${item.bg} relative overflow-hidden hover:scale-[1.01] transition-transform`}
              >
                <div className="absolute top-4 right-4 font-display text-5xl font-bold text-foreground/5 select-none">{item.step}</div>
                <item.icon className={`w-6 h-6 ${item.color} mb-4`} />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 bg-secondary/20">
        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-display uppercase tracking-widest text-primary mb-3">Integrations</p>
            <h2 className="font-display text-4xl font-bold text-foreground">Built With</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`glass rounded-xl p-5 border ${t.color} hover:scale-[1.02] transition-transform`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display font-bold text-foreground">{t.name}</span>
                  <span className="text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">{t.tag}</span>
                </div>
                <p className="text-xs font-display text-muted-foreground font-semibold mb-1">{t.role}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6">
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center glass rounded-2xl p-10 border border-primary/20"
          >
            <Lock className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold text-foreground mb-3">
              AI should never override your financial rules.
            </h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-sm">
              AetherGuard puts the contract in charge — not the AI, not the developer. Your strategy. Your guardrail. Your proof.
            </p>
            <Link to="/editor">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 40px hsl(50 100% 50% / 0.4)" }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 px-10 py-4 rounded-lg bg-primary text-primary-foreground font-display font-bold mx-auto glow-border"
              >
                Set Up Your Guardrail <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
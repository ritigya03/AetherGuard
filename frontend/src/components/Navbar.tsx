import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Wallet, LogOut, Bot } from "lucide-react";
import { useWallet } from "@/context/WalletContext";

const navLinks = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Strategy", path: "/editor" },
  { label: "Boardroom", path: "/boardroom" },
  { label: "History", path: "/history" },
];

const Navbar = () => {
  const location = useLocation();
  const { isConnected, shortAddress, hasAgent, connect, disconnect } = useWallet();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 300 }}>
            <Shield className="w-6 h-6 text-primary drop-shadow-[0_0_8px_hsl(50_100%_50%/0.5)]" />
          </motion.div>
          <span className="font-display text-lg font-bold tracking-wider text-foreground">
            AetherGuard
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`gradient-underline font-display text-sm tracking-wide transition-colors ${
                location.pathname === link.path
                  ? "text-primary glow-text"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <AnimatePresence mode="wait">
            {isConnected ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                {/* Agent status pill */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs font-display">
                  <Bot className="w-3 h-3 text-primary" />
                  <span className={hasAgent ? "text-cyber-verified" : "text-cyber-pending"}>
                    {hasAgent ? "Agent Active" : "No Agent"}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasAgent ? "bg-cyber-verified animate-pulse-dot" : "bg-cyber-pending"
                    }`}
                  />
                </div>

                {/* Address + disconnect */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={disconnect}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg glass font-display text-sm font-semibold text-foreground border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all group"
                  title="Click to disconnect"
                >
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-mono">{shortAddress}</span>
                  <LogOut className="w-3 h-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="disconnected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px hsl(50 100% 50% / 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={connect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-sm font-semibold glow-border transition-all"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;

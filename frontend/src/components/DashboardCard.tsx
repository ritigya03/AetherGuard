import { motion } from "framer-motion";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

const DashboardCard = ({ title, children, className = "", delay = 0 }: DashboardCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, boxShadow: "0 0 30px hsl(50 100% 50% / 0.15)" }}
      className={`glass rounded-xl p-6 transition-colors relative overflow-hidden group ${className}`}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer pointer-events-none" />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="relative z-10">
        <h3 className="font-display text-sm font-semibold tracking-wider text-primary mb-4 uppercase">
          {title}
        </h3>
        {children}
      </div>
    </motion.div>
  );
};

export default DashboardCard;

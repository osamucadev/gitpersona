import { motion } from "framer-motion";
import { GitBranch, Settings, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { activeProfile } = useStore();
  const location = useLocation();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <GitBranch className="h-4 w-4 text-primary" />
        </div>
        <span className="font-display text-sm font-700 tracking-tight">
          Git Persona
        </span>
      </div>

      {/* Active profile status pill */}
      <motion.div
        key={activeProfile?.id ?? "none"}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {activeProfile ? (
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">
              Active: {activeProfile.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">No active profile</span>
          </div>
        )}
      </motion.div>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        <NavButton
          to="/"
          active={location.pathname === "/"}
          icon={<Zap className="h-4 w-4" />}
          label="Profiles"
        />
        <NavButton
          to="/settings"
          active={location.pathname === "/settings"}
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
        />
      </nav>
    </header>
  );
}

function NavButton({
  to,
  active,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

import { useEffect, useState } from "react";
import { RefreshCw, Terminal } from "lucide-react";
import { getGitIdentity } from "@/lib/tauri";
import type { GitIdentityResult } from "@/types";

export function GitIdentityPanel() {
  const [identity, setIdentity] = useState<GitIdentityResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getGitIdentity();
      setIdentity(result);
    } catch {
      // git might not be installed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 10s to stay in sync
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Git Global
          </span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        <ConfigRow label="user.name" value={identity?.userName} />
        <ConfigRow label="user.email" value={identity?.userEmail} />
        <ConfigRow
          label="credential.helper"
          value={identity?.credentialHelper}
          mono
          truncate
        />
      </div>

      <div className="mt-auto pt-6 text-[10px] text-muted-foreground/50 leading-relaxed">
        These values are read from <code className="font-mono">~/.gitconfig</code>
      </div>
    </aside>
  );
}

function ConfigRow({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="font-mono text-[10px] text-muted-foreground/60">{label}</p>
      <p
        className={`text-xs text-foreground/80 ${mono ? "font-mono" : ""} ${
          truncate ? "truncate" : "break-words"
        }`}
      >
        {value ? (
          <span className="selectable">{value}</span>
        ) : (
          <span className="italic text-muted-foreground/40">not set</span>
        )}
      </p>
    </div>
  );
}

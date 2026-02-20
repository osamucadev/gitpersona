import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Copy,
  Monitor,
  Power,
  RefreshCw,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { getDiagnostics, setAutostart } from "@/lib/tauri";
import { useStore } from "@/store/useStore";
import type { Diagnostics } from "@/types";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const loadDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const d = await getDiagnostics();
      setDiagnostics(d);
    } catch (err) {
      toast.error(`${err}`);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  if (!settings) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const handleToggleAutostart = async (enabled: boolean) => {
    try {
      await setAutostart(enabled);
      await updateSettings({ ...settings, autostart: enabled });
      toast.success(enabled ? "Autostart enabled" : "Autostart disabled");
    } catch (err) {
      toast.error(`${err}`);
    }
  };

  const handleToggleAskBrowser = async (enabled: boolean) => {
    await updateSettings({ ...settings, alwaysAskBrowser: enabled });
    toast.success(enabled ? "Will always ask for browser" : "Will use remembered browser");
  };

  const copyDiag = () => {
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    toast.success("Diagnostics copied to clipboard");
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl space-y-8"
      >
        <div>
          <h1 className="font-display text-2xl font-800 tracking-tight text-gradient">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            App preferences and diagnostics
          </p>
        </div>

        {/* System section */}
        <Section title="System" icon={<Monitor className="h-4 w-4" />}>
          <ToggleRow
            label="Launch at Login"
            description="Start Git Persona automatically when you log in"
            checked={settings.autostart}
            onChange={handleToggleAutostart}
          />
        </Section>

        {/* Browser section */}
        <Section title="Browser" icon={<Shield className="h-4 w-4" />}>
          <ToggleRow
            label="Always Ask for Browser"
            description="Show browser picker every time before opening GitHub OAuth URLs. Recommended: ON"
            checked={settings.alwaysAskBrowser}
            onChange={handleToggleAskBrowser}
          />
          {settings.rememberedBrowser && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-sm text-foreground">Remembered Browser</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {settings.rememberedBrowser}
                </p>
              </div>
              <button
                onClick={() =>
                  updateSettings({ ...settings, rememberedBrowser: undefined })
                }
                className="text-xs text-destructive hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </Section>

        {/* Diagnostics section */}
        <Section title="Diagnostics" icon={<Activity className="h-4 w-4" />}>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">System snapshot for troubleshooting</p>
              <div className="flex gap-2">
                <button
                  onClick={loadDiagnostics}
                  disabled={loadingDiag}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingDiag ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                {diagnostics && (
                  <button
                    onClick={copyDiag}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                )}
              </div>
            </div>

            {diagnostics && (
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                <dl className="space-y-2 font-mono text-xs">
                  <DiagRow label="App Version" value={diagnostics.appVersion} />
                  <DiagRow label="Platform" value={diagnostics.platform} />
                  <DiagRow
                    label="Git"
                    value={diagnostics.gitVersion ?? "Not found"}
                    ok={!!diagnostics.gitVersion}
                  />
                  <DiagRow label="git user.name" value={diagnostics.globalUserName} />
                  <DiagRow label="git user.email" value={diagnostics.globalUserEmail} />
                  <DiagRow
                    label="credential.helper"
                    value={diagnostics.credentialHelper}
                    truncate
                  />
                  <DiagRow label="Active Profile ID" value={diagnostics.activeProfileId} />
                </dl>
              </div>
            )}

            {/* Git not found warning */}
            {diagnostics && !diagnostics.gitVersion && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-400">Git not found</p>
                <p className="mt-1 text-xs text-amber-400/80">
                  Git Persona requires git to be installed and on your PATH.
                </p>
                <a
                  href="https://git-scm.com/downloads"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 underline"
                  onClick={(e) => {
                    e.preventDefault();
                    // Open in browser via Tauri shell
                    import("@tauri-apps/plugin-shell").then(({ open }) =>
                      open("https://git-scm.com/downloads"),
                    );
                  }}
                >
                  Download Git
                  <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </Section>

        {/* About */}
        <Section title="About" icon={<Power className="h-4 w-4" />}>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Git Persona is open source.{" "}
              <a
                className="text-primary hover:underline"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  import("@tauri-apps/plugin-shell").then(({ open }) =>
                    open("https://github.com/osamucadev/gitpersona"),
                  );
                }}
              >
                View on GitHub →
              </a>
            </p>
            <p className="text-xs text-muted-foreground/60">
              Made with Tauri, React, and Rust
            </p>
          </div>
        </Section>
      </motion.div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <div className="flex-1 border-t border-border" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function DiagRow({
  label,
  value,
  ok,
  truncate = false,
}: {
  label: string;
  value?: string;
  ok?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-32 shrink-0 text-muted-foreground/70">{label}</dt>
      <dd
        className={cn(
          "flex-1 text-foreground/80",
          truncate ? "truncate" : "break-all",
          ok === false && "text-amber-400",
        )}
      >
        {value ?? (
          <span className="italic text-muted-foreground/40">—</span>
        )}
      </dd>
    </div>
  );
}

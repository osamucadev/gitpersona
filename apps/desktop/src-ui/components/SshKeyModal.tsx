import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  Github,
  Key,
  Loader2,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Profile } from "@/types";
import {
  addSshKeyToGithub,
  generateSshKey,
  removeSshKey,
} from "@/lib/tauri";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

interface SshKeyModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

export function SshKeyModal({ open, onClose, profile }: SshKeyModalProps) {
  const { refreshProfiles } = useStore();
  const [generating, setGenerating] = useState(false);
  const [addingToGithub, setAddingToGithub] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState(false);

  const ssh = profile.ssh;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSshKey(profile.id);
      await refreshProfiles();
      toast.success("SSH key generated");
    } catch (err) {
      toast.error(`${err}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToGithub = async () => {
    if (!profile.github.connected) {
      toast.error("Connect GitHub first to register the SSH key");
      return;
    }
    setAddingToGithub(true);
    try {
      await addSshKeyToGithub(profile.id);
      await refreshProfiles();
      toast.success("SSH key added to GitHub");
    } catch (err) {
      toast.error(`${err}`);
    } finally {
      setAddingToGithub(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeSshKey(profile.id);
      await refreshProfiles();
      toast.success("SSH key removed");
    } catch (err) {
      toast.error(`${err}`);
    } finally {
      setRemoving(false);
    }
  };

  const handleCopy = () => {
    if (ssh.publicKey) {
      navigator.clipboard.writeText(ssh.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Public key copied");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-primary" />
                <Dialog.Title className="font-display text-base font-700">
                  SSH Key — {profile.label}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-5 p-6">
              {!ssh.configured ? (
                /* No key yet */
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Generate an <strong className="text-foreground">ed25519 SSH key</strong> for
                      this profile. When you activate the profile, Git Persona automatically
                      configures <code className="text-primary text-xs">~/.ssh/config</code> to use
                      this key for GitHub.
                    </p>
                    <p className="mt-2">
                      You can then register the public key on GitHub to clone private repos
                      without OAuth restrictions.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Terminal className="h-4 w-4" />
                    )}
                    {generating ? "Generating…" : "Generate SSH Key"}
                  </button>
                </div>
              ) : (
                /* Key exists */
                <div className="space-y-4">
                  {/* Status badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Key generated
                    </span>
                    {ssh.githubKeyId ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-400">
                        <Github className="h-3 w-3" />
                        Registered on GitHub
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
                        Not on GitHub
                      </span>
                    )}
                  </div>

                  {/* Public key display */}
                  {ssh.publicKey && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Public Key
                      </label>
                      <div className="relative rounded-xl border border-border bg-muted/30 p-3">
                        <p className="break-all font-mono text-[10px] text-foreground/70 leading-relaxed pr-8">
                          {ssh.publicKey}
                        </p>
                        <button
                          onClick={handleCopy}
                          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Copy public key"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Key path */}
                  {ssh.keyPath && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Key Path
                      </label>
                      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-[10px] text-muted-foreground break-all">
                        {ssh.keyPath}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    {!ssh.githubKeyId && (
                      <button
                        onClick={handleAddToGithub}
                        disabled={addingToGithub || !profile.github.connected}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                          profile.github.connected
                            ? "bg-secondary text-foreground hover:bg-secondary/80"
                            : "cursor-not-allowed bg-secondary/40 text-muted-foreground",
                        )}
                        title={
                          !profile.github.connected
                            ? "Connect GitHub first"
                            : "Add key to your GitHub account"
                        }
                      >
                        {addingToGithub ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Github className="h-4 w-4" />
                        )}
                        {addingToGithub ? "Adding to GitHub…" : "Add to GitHub"}
                      </button>
                    )}

                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive/80 transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      {removing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {removing ? "Removing…" : "Remove Key"}
                    </button>
                  </div>

                  {/* Info note */}
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    When this profile is <strong className="text-muted-foreground">activated</strong>,
                    Git Persona updates <code className="text-primary/70">~/.ssh/config</code> to use
                    this key for <code className="text-primary/70">github.com</code>.
                    Clone repos with <code className="text-primary/70">git@github.com:...</code>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

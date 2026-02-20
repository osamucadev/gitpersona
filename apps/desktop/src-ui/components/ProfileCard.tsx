import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  ChevronRight,
  Edit3,
  Github,
  Key,
  Loader2,
  Play,
  Trash2,
  TestTube2,
  Unplug,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Profile } from "@/types";
import { cn, profileColor, profileDotColor, relativeTime } from "@/lib/utils";
import { activateProfile, deleteProfile, githubDisconnect, githubTest } from "@/lib/tauri";
import { useStore } from "@/store/useStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { GitHubConnectModal } from "./GitHubConnectModal";
import { ProfileModal } from "./ProfileModal";
import { SshKeyModal } from "./SshKeyModal";

interface ProfileCardProps {
  profile: Profile;
  isActive: boolean;
}

export function ProfileCard({ profile, isActive }: ProfileCardProps) {
  const { refreshProfiles, setActiveProfile } = useStore();

  const [activating, setActivating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showSsh, setShowSsh] = useState(false);

  const colorClasses = profileColor(profile.label);
  const dotColor = profileDotColor(profile.label);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await activateProfile(profile.id);
      await refreshProfiles();
      // Manually update active profile in store
      setActiveProfile(profile);
      toast.success(`Switched to ${profile.label}`);
    } catch (err) {
      toast.error(`Failed to activate: ${err}`);
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProfile(profile.id);
      await refreshProfiles();
      toast.success(`${profile.label} deleted`);
    } catch (err) {
      toast.error(`Failed to delete: ${err}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await githubDisconnect(profile.id);
      await refreshProfiles();
      toast.success("GitHub disconnected");
    } catch (err) {
      toast.error(`Failed to disconnect: ${err}`);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const user = await githubTest(profile.id);
      toast.success(`✓ Authenticated as @${user.login}`);
    } catch (err) {
      toast.error(`Auth test failed: ${err}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className={cn(
          "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all duration-200",
          colorClasses,
          isActive
            ? "active-glow border-primary/40"
            : "hover:border-border/80 hover:bg-card/80",
        )}
      >
        {/* Active indicator stripe */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
              className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-primary"
            />
          )}
        </AnimatePresence>

        <div className="flex items-start justify-between gap-4">
          {/* Profile info */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Label + active badge */}
            <div className="flex items-center gap-2.5">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor)} />
              <span className="font-display text-base font-700 tracking-tight truncate">
                {profile.label}
              </span>
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <CheckCircle className="h-2.5 w-2.5" />
                  Active
                </span>
              )}
            </div>

            {/* Git identity */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-foreground/90">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-mono text-xs">{profile.gitName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {profile.gitEmail}
                </span>
              </div>
            </div>

            {/* GitHub status */}
            <div className="flex items-center gap-2">
              {profile.github.connected ? (
                <div className="flex items-center gap-1.5">
                  <Github className="h-3.5 w-3.5 text-foreground/70" />
                  <span className="text-xs text-foreground/70">
                    @{profile.github.username}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Github className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">Not connected</span>
                </div>
              )}
            </div>

            {/* SSH status */}
            <div className="flex items-center gap-2">
              {profile.ssh?.configured ? (
                <div className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-foreground/70" />
                  <span className="text-xs text-foreground/70">SSH key</span>
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    profile.ssh.githubKeyId
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-amber-500/20 text-amber-400"
                  )}>
                    {profile.ssh.githubKeyId ? "On GitHub" : "Local only"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">No SSH key</span>
                </div>
              )}
            </div>

            {/* Updated at */}
            <p className="text-[10px] text-muted-foreground/50">
              Updated {relativeTime(profile.updatedAt)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {/* Edit */}
            <ActionButton
              onClick={() => setShowEdit(true)}
              title="Edit profile"
              variant="ghost"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </ActionButton>

            {/* Delete */}
            <ActionButton
              onClick={() => setShowDelete(true)}
              title="Delete profile"
              variant="destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ActionButton>
          </div>
        </div>

        {/* Bottom action row */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-4">
          {/* Activate */}
          {!isActive && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/30 transition-all hover:bg-primary/25 hover:ring-primary/50 disabled:opacity-50"
            >
              {activating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Activate
            </button>
          )}

          {/* Connect / Disconnect GitHub */}
          {profile.github.connected ? (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-all hover:bg-secondary/80 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <TestTube2 className="h-3.5 w-3.5" />
                )}
                Test Auth
              </button>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-all hover:bg-secondary/80"
            >
              <Github className="h-3.5 w-3.5" />
              Connect GitHub
            </button>
          )}

          {/* SSH Key */}
          <button
            onClick={() => setShowSsh(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground ml-auto"
          >
            <Key className="h-3.5 w-3.5" />
            SSH
            {profile.ssh?.configured && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Modals */}
      {showEdit && (
        <ProfileModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          initialData={{
            label: profile.label,
            gitName: profile.gitName,
            gitEmail: profile.gitEmail,
          }}
          profileId={profile.id}
          mode="edit"
        />
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete profile?"
        description={`This will permanently remove "${profile.label}" and its GitHub connection. Git global config will not be changed.`}
        confirmLabel="Delete"
        destructive
      />

      {showConnect && (
        <GitHubConnectModal
          open={showConnect}
          onClose={() => setShowConnect(false)}
          profile={profile}
        />
      )}

      {showSsh && (
        <SshKeyModal
          open={showSsh}
          onClose={() => setShowSsh(false)}
          profile={profile}
        />
      )}
    </>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  variant: "ghost" | "destructive";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        variant === "ghost"
          ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
          : "text-destructive/60 hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

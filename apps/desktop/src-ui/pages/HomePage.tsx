import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GitBranch, Plus } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ProfileCard } from "@/components/ProfileCard";
import { ProfileModal } from "@/components/ProfileModal";
import { GitIdentityPanel } from "@/components/GitIdentityPanel";

export function HomePage() {
  const { profiles, activeProfile } = useStore();
  const [showCreate, setShowCreate] = useState(false);

  const sorted = [...profiles].sort((a, b) => {
    // Active profile always first
    if (a.id === activeProfile?.id) return -1;
    if (b.id === activeProfile?.id) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-800 tracking-tight text-gradient">
              Profiles
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""} configured
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Profile
          </motion.button>
        </div>

        {/* Profile grid */}
        {profiles.length === 0 ? (
          <EmptyState onAdd={() => setShowCreate(true)} />
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            <AnimatePresence>
              {sorted.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isActive={profile.id === activeProfile?.id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Right sidebar: Git identity */}
      <GitIdentityPanel />

      {showCreate && (
        <ProfileModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          mode="create"
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center gap-5 py-20"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
        <GitBranch className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">No profiles yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first profile to get started
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create Profile
      </button>
    </motion.div>
  );
}

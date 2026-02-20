import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { profileSchema, type ProfileFormData } from "@/lib/schemas";
import { createProfile, updateProfile } from "@/lib/tauri";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  profileId?: string;
  initialData?: ProfileFormData;
}

export function ProfileModal({
  open,
  onClose,
  mode,
  profileId,
  initialData,
}: ProfileModalProps) {
  const { refreshProfiles } = useStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData ?? { label: "", gitName: "", gitEmail: "" },
  });

  useEffect(() => {
    if (open) reset(initialData ?? { label: "", gitName: "", gitEmail: "" });
  }, [open, initialData, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      if (mode === "create") {
        await createProfile(data.label, data.gitName, data.gitEmail);
        toast.success(`Profile "${data.label}" created`);
      } else if (profileId) {
        await updateProfile(profileId, data.label, data.gitName, data.gitEmail);
        toast.success(`Profile updated`);
      }
      await refreshProfiles();
      onClose();
    } catch (err) {
      toast.error(`${err}`);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <Dialog.Title className="font-display text-lg font-700">
                    {mode === "create" ? "New Profile" : "Edit Profile"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Field label="Label" hint="e.g. WORK, PERSONAL, FREELANCE">
                    <input
                      {...register("label")}
                      placeholder="WORK"
                      className={inputClass(!!errors.label)}
                    />
                    {errors.label && <FieldError>{errors.label.message}</FieldError>}
                  </Field>

                  <Field label="Git Name" hint="Your full name for commits">
                    <input
                      {...register("gitName")}
                      placeholder="Jane Doe"
                      className={inputClass(!!errors.gitName)}
                    />
                    {errors.gitName && <FieldError>{errors.gitName.message}</FieldError>}
                  </Field>

                  <Field label="Git Email" hint="Email shown in commit history">
                    <input
                      {...register("gitEmail")}
                      type="email"
                      placeholder="jane@work.com"
                      className={inputClass(!!errors.gitEmail)}
                    />
                    {errors.gitEmail && <FieldError>{errors.gitEmail.message}</FieldError>}
                  </Field>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {mode === "create" ? "Create" : "Save"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50",
    hasError
      ? "border-destructive focus:ring-1 focus:ring-destructive"
      : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30",
  );
}

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { GitBranch, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { type ProfileFormData } from "@/lib/schemas";
import { createProfile } from "@/lib/tauri";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { loadAll } = useStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    defaultValues: { label: "PERSONAL", gitName: "", gitEmail: "" },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await createProfile(data.label, data.gitName, data.gitEmail);
      await loadAll();
      toast.success(`Profile "${data.label}" created!`);
      navigate("/");
    } catch (err) {
      toast.error(`${err}`);
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Logo + title */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30"
          >
            <GitBranch className="h-7 w-7 text-primary" />
          </motion.div>

          <h1 className="font-display text-3xl font-800 tracking-tight">
            Welcome to <span className="text-gradient">Git Persona</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage multiple Git identities without touching the terminal. Let's create
            your first profile.
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/20"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field
              label="Profile Label"
              hint="A short name for this identity. E.g. PERSONAL, WORK."
              error={errors.label?.message}
            >
              <input
                {...register("label", { required: "Required" })}
                placeholder="PERSONAL"
                className={inputClass(!!errors.label)}
              />
            </Field>

            <Field
              label="Your Name"
              hint="This appears in your git commits."
              error={errors.gitName?.message}
            >
              <input
                {...register("gitName", { required: "Required" })}
                placeholder="Jane Doe"
                className={inputClass(!!errors.gitName)}
              />
            </Field>

            <Field
              label="Your Email"
              hint="Email used in commit history."
              error={errors.gitEmail?.message}
            >
              <input
                {...register("gitEmail", {
                  required: "Required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
                })}
                type="email"
                placeholder="jane@example.com"
                className={inputClass(!!errors.gitEmail)}
              />
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Create Profile & Get Started
            </button>
          </form>
        </motion.div>

        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          You can create more profiles and connect GitHub accounts afterwards.
        </p>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40",
    hasError
      ? "border-destructive focus:ring-1 focus:ring-destructive"
      : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30",
  );
}

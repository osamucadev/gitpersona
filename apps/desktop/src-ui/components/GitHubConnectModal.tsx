import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ClipboardCopy, Github, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import * as Dialog from "@radix-ui/react-dialog";
import type { BrowserEntry, Profile } from "@/types";
import {
  detectBrowsers,
  githubPollDeviceFlow,
  githubStartDeviceFlow,
  openUrlInBrowser,
} from "@/lib/tauri";
import { useStore } from "@/store/useStore";
import { BrowserPickerModal } from "./BrowserPickerModal";

type Step = "idle" | "loading" | "waiting" | "polling" | "success" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

export function GitHubConnectModal({ open, onClose, profile }: Props) {
  const { refreshProfiles } = useStore();

  const [step, setStep] = useState<Step>("idle");
  const [userCode, setUserCode] = useState("");
  const [verificationUri, setVerificationUri] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [interval, setInterval_] = useState(5);
  const [error, setError] = useState("");

  const [showBrowserPicker, setShowBrowserPicker] = useState(false);
  const [browsers, setBrowsers] = useState<BrowserEntry[]>([]);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startFlow = useCallback(async () => {
    setStep("loading");
    setError("");
    try {
      const flow = await githubStartDeviceFlow(profile.id);
      setUserCode(flow.userCode);
      setVerificationUri(flow.verificationUri);
      setDeviceCode(flow.deviceCode);
      setInterval_(flow.interval);
      setStep("waiting");

      // Load browsers before showing picker
      const detected = await detectBrowsers();
      setBrowsers(detected);

      // Always ask for browser per spec
      setShowBrowserPicker(true);
    } catch (err) {
      setError(`${err}`);
      setStep("error");
    }
  }, [profile.id]);

  const handleBrowserChosen = useCallback(
    async (browser: BrowserEntry) => {
      setShowBrowserPicker(false);
      try {
        await openUrlInBrowser(verificationUri, browser.executable);
        setStep("polling");
        startPolling();
      } catch (err) {
        toast.error(`Failed to open browser: ${err}`);
      }
    },
    [verificationUri],
  );

  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const done = await githubPollDeviceFlow(profile.id, deviceCode);
        if (done) {
          setStep("success");
          stopPolling();
          await refreshProfiles();
          setTimeout(onClose, 1800);
        } else {
          pollingRef.current = setTimeout(poll, interval * 1000);
        }
      } catch (err) {
        setError(`${err}`);
        setStep("error");
        stopPolling();
      }
    };
    pollingRef.current = setTimeout(poll, interval * 1000);
  }, [profile.id, deviceCode, interval, refreshProfiles, onClose]);

  // Restart polling after browser is chosen
  useEffect(() => {
    if (step === "polling") startPolling();
    return stopPolling;
  }, [step]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      stopPolling();
      setStep("idle");
      setUserCode("");
      setVerificationUri("");
      setDeviceCode("");
      setError("");
    }
  }, [open]);

  const copyCode = () => {
    navigator.clipboard.writeText(userCode);
    toast.success("Code copied!");
  };

  return (
    <>
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
                    <Dialog.Title className="flex items-center gap-2 font-display text-lg font-700">
                      <Github className="h-5 w-5" />
                      Connect GitHub
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-h-[160px]">
                    <AnimatePresence mode="wait">
                      {step === "idle" && (
                        <StepIdle key="idle" onStart={startFlow} profile={profile} />
                      )}
                      {step === "loading" && <StepLoading key="loading" />}
                      {(step === "waiting" || step === "polling") && (
                        <StepWaiting
                          key="waiting"
                          userCode={userCode}
                          uri={verificationUri}
                          polling={step === "polling"}
                          onCopy={copyCode}
                          onReopen={() => setShowBrowserPicker(true)}
                        />
                      )}
                      {step === "success" && <StepSuccess key="success" />}
                      {step === "error" && (
                        <StepError key="error" error={error} onRetry={startFlow} />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {showBrowserPicker && (
        <BrowserPickerModal
          open={showBrowserPicker}
          onClose={() => setShowBrowserPicker(false)}
          browsers={browsers}
          url={verificationUri}
          onChoose={handleBrowserChosen}
        />
      )}
    </>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
}

function StepIdle({ onStart, profile }: { onStart: () => void; profile: Profile }) {
  return (
    <Fade>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Connect a GitHub account to <strong className="text-foreground">{profile.label}</strong>.
        Git Persona uses the secure Device Flow — no passwords are stored.
      </p>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 text-center text-[9px] font-bold leading-4 text-primary">1</span>
          A code will be generated
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 text-center text-[9px] font-bold leading-4 text-primary">2</span>
          You choose which browser to open
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 text-center text-[9px] font-bold leading-4 text-primary">3</span>
          Enter the code on GitHub and authorize
        </li>
      </ul>
      <button
        onClick={onStart}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Begin Authorization
      </button>
    </Fade>
  );
}

function StepLoading() {
  return (
    <Fade>
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Contacting GitHub…</p>
      </div>
    </Fade>
  );
}

function StepWaiting({
  userCode,
  uri,
  polling,
  onCopy,
  onReopen,
}: {
  userCode: string;
  uri: string;
  polling: boolean;
  onCopy: () => void;
  onReopen: () => void;
}) {
  return (
    <Fade>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter this code on GitHub to authorize:
        </p>

        {/* Code display */}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-primary/30 bg-primary/5 py-3 text-center">
            <span className="font-mono text-2xl font-bold tracking-[0.25em] text-primary">
              {userCode}
            </span>
          </div>
          <button
            onClick={onCopy}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ClipboardCopy className="h-4 w-4" />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          at{" "}
          <span className="font-mono text-foreground">{uri}</span>
        </p>
      </div>

      {polling ? (
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Waiting for authorization…
        </div>
      ) : (
        <button
          onClick={onReopen}
          className="w-full rounded-lg border border-border py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          Re-open browser picker
        </button>
      )}
    </Fade>
  );
}

function StepSuccess() {
  return (
    <Fade>
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle className="h-10 w-10 text-primary" />
        <div className="text-center">
          <p className="font-semibold text-foreground">Connected!</p>
          <p className="text-sm text-muted-foreground">GitHub account linked successfully.</p>
        </div>
      </div>
    </Fade>
  );
}

function StepError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Fade>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
      <button
        onClick={onRetry}
        className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
      >
        Try Again
      </button>
    </Fade>
  );
}

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import type { BrowserEntry } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  browsers: BrowserEntry[];
  url: string;
  onChoose: (browser: BrowserEntry) => void;
}

// Simple browser icons via emoji/initials
const BROWSER_ICONS: Record<string, string> = {
  "Google Chrome": "🟡",
  "Microsoft Edge": "🔵",
  "Mozilla Firefox": "🦊",
  "Brave Browser": "🦁",
  Opera: "🔴",
  Vivaldi: "🔴",
  Safari: "🧭",
  Arc: "🌈",
  "System Open With": "📂",
};

export function BrowserPickerModal({ open, onClose, browsers, url, onChoose }: Props) {
  const [selected, setSelected] = useState<string | null>(
    browsers.length > 0 ? browsers[0].name : null,
  );

  const selectedBrowser = browsers.find((b) => b.name === selected) ?? browsers[0];

  const handleOpen = () => {
    if (!selectedBrowser) return;
    onChoose(selectedBrowser);
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
                className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="font-display text-base font-700">
                    Choose Browser
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="mb-3 text-xs text-muted-foreground line-clamp-2 font-mono">
                  {url}
                </p>

                {/* Browser list */}
                <div className="space-y-1.5 mb-4">
                  {browsers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No browsers detected — only System Open With is available.
                    </p>
                  )}
                  {browsers.map((browser) => (
                    <BrowserOption
                      key={browser.name}
                      browser={browser}
                      selected={selected === browser.name}
                      onSelect={() => setSelected(browser.name)}
                    />
                  ))}
                </div>

                <button
                  onClick={handleOpen}
                  disabled={!selectedBrowser}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  Open in {selectedBrowser?.name ?? "Browser"}
                </button>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function BrowserOption({
  browser,
  selected,
  onSelect,
}: {
  browser: BrowserEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const icon = BROWSER_ICONS[browser.name] ?? "🌐";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        selected
          ? "border-primary/50 bg-primary/10"
          : "border-border hover:border-border/80 hover:bg-secondary/50",
      )}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{browser.name}</p>
        {browser.executable && (
          <p className="text-[10px] text-muted-foreground truncate font-mono">
            {browser.executable}
          </p>
        )}
        {!browser.executable && (
          <p className="text-[10px] text-muted-foreground">Shows the OS file picker</p>
        )}
      </div>
      {selected && <CheckCircle className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

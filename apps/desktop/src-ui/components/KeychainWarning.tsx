import { ShieldAlert } from "lucide-react";

export function KeychainWarning() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/30">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="font-display text-xl font-700">Keychain Unavailable</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Git Persona requires access to the OS secure keychain to store GitHub tokens.
          Storing tokens in plain text is not allowed.
        </p>
      </div>

      <div className="max-w-md rounded-xl border border-border bg-card p-4 text-left text-xs font-mono text-muted-foreground space-y-1">
        <p className="text-foreground font-semibold font-sans text-sm mb-2">Troubleshooting</p>
        <p>• Windows: Ensure the "Credential Manager" service is running.</p>
        <p>• macOS: Ensure Keychain Access is unlocked.</p>
        <p>• Linux: Install and configure libsecret / GNOME Keyring.</p>
      </div>
    </div>
  );
}

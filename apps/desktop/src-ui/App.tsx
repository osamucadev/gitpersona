import { useEffect, useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "@/store/useStore";
import { HomePage } from "@/pages/HomePage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TopBar } from "@/components/TopBar";
import { KeychainWarning } from "@/components/KeychainWarning";
import { checkKeychainAvailable } from "@/lib/tauri";

function App() {
  const { loadAll, profiles, loading } = useStore();
  const [keychainOk, setKeychainOk] = useState(true);
  const [keychainChecked, setKeychainChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Check keychain before anything else
      const ok = await checkKeychainAvailable().catch(() => false);
      setKeychainOk(ok);
      setKeychainChecked(true);

      await loadAll();
    };
    init();

    // Listen for backend events to refresh state
    const unlistenActivated = listen("profile-activated", () => {
      loadAll();
    });

    return () => {
      unlistenActivated.then((f) => f());
    };
  }, [loadAll]);

  if (!keychainChecked || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  if (!keychainOk) {
    return <KeychainWarning />;
  }

  const isFirstRun = profiles.length === 0;

  return (
    <MemoryRouter initialEntries={[isFirstRun ? "/onboarding" : "/"]}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Routes>
          <Route
            path="/onboarding"
            element={<OnboardingPage />}
          />
          <Route
            path="/*"
            element={
              <>
                <TopBar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </div>
    </MemoryRouter>
  );
}

export default App;

import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  BrowserEntry,
  DeviceFlowStart,
  Diagnostics,
  GitHubUser,
  GitIdentityResult,
  Profile,
} from "@/types";

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const listProfiles = (): Promise<Profile[]> => invoke("list_profiles");

export const createProfile = (
  label: string,
  gitName: string,
  gitEmail: string,
): Promise<Profile> => invoke("create_profile", { label, gitName, gitEmail });

export const updateProfile = (
  id: string,
  label: string,
  gitName: string,
  gitEmail: string,
): Promise<Profile> => invoke("update_profile", { id, label, gitName, gitEmail });

export const deleteProfile = (id: string): Promise<void> =>
  invoke("delete_profile", { id });

export const getActiveProfile = (): Promise<Profile | null> =>
  invoke("get_active_profile");

// ─── Git ──────────────────────────────────────────────────────────────────────

export const activateProfile = (id: string): Promise<void> =>
  invoke("activate_profile", { id });

export const getGitIdentity = (): Promise<GitIdentityResult> =>
  invoke("get_git_identity");

// ─── Auth (GitHub Device Flow) ────────────────────────────────────────────────

export const githubStartDeviceFlow = (profileId: string): Promise<DeviceFlowStart> =>
  invoke("github_start_device_flow", { profileId });

export const githubPollDeviceFlow = (
  profileId: string,
  deviceCode: string,
): Promise<boolean> => invoke("github_poll_device_flow", { profileId, deviceCode });

export const githubDisconnect = (profileId: string): Promise<void> =>
  invoke("github_disconnect", { profileId });

export const githubTest = (profileId: string): Promise<GitHubUser> =>
  invoke("github_test", { profileId });

// ─── Browser ──────────────────────────────────────────────────────────────────

export const detectBrowsers = (): Promise<BrowserEntry[]> =>
  invoke("detect_browsers");

export const openUrlInBrowser = (url: string, executable?: string): Promise<void> =>
  invoke("open_url_in_browser", { url, executable: executable ?? null });

// ─── System ───────────────────────────────────────────────────────────────────

export const getSettings = (): Promise<AppSettings> => invoke("get_settings");

export const updateSettings = (settings: AppSettings): Promise<void> =>
  invoke("update_settings", { settings });

export const setAutostart = (enabled: boolean): Promise<void> =>
  invoke("set_autostart", { enabled });

export const getDiagnostics = (): Promise<Diagnostics> => invoke("get_diagnostics");

export const checkKeychainAvailable = (): Promise<boolean> =>
  invoke("check_keychain_available");

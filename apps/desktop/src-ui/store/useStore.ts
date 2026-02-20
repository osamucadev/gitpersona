import { create } from "zustand";
import type { AppSettings, Profile } from "@/types";
import * as api from "@/lib/tauri";

interface AppStore {
  profiles: Profile[];
  activeProfile: Profile | null;
  settings: AppSettings | null;
  loading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  setActiveProfile: (profile: Profile | null) => void;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  profiles: [],
  activeProfile: null,
  settings: null,
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    try {
      const [profiles, activeProfile, settings] = await Promise.all([
        api.listProfiles(),
        api.getActiveProfile(),
        api.getSettings(),
      ]);
      set({ profiles, activeProfile, settings });
    } finally {
      set({ loading: false });
    }
  },

  refreshProfiles: async () => {
    const [profiles, activeProfile] = await Promise.all([
      api.listProfiles(),
      api.getActiveProfile(),
    ]);
    set({ profiles, activeProfile });
  },

  setActiveProfile: (profile) => set({ activeProfile: profile }),

  updateSettings: async (settings) => {
    await api.updateSettings(settings);
    set({ settings });
  },
}));

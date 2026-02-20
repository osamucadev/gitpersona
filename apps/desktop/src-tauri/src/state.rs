use gitpersona_core::{AppSettings, AppStore, Profile};
use std::sync::Mutex;
use tauri::{App, Manager};
use uuid::Uuid;

const STORE_FILE: &str = "store.json";

/// Shared mutable application state, protected by a Mutex.
#[derive(Default)]
pub struct AppState {
    pub inner: Mutex<AppStateInner>,
}

#[derive(Default)]
pub struct AppStateInner {
    pub store: AppStore,
}

impl AppStateInner {
    pub fn find_profile(&self, id: &Uuid) -> Option<&Profile> {
        self.store.profiles.iter().find(|p| p.id == *id)
    }

    pub fn find_profile_mut(&mut self, id: &Uuid) -> Option<&mut Profile> {
        self.store.profiles.iter_mut().find(|p| p.id == *id)
    }
}

/// Initialize the AppState by loading the persisted store from disk.
pub fn init_state(app: &App) -> anyhow::Result<()> {
    let store_path = app
        .path()
        .app_local_data_dir()?
        .join(STORE_FILE);

    let state = app.state::<AppState>();
    let mut inner = state.inner.lock().unwrap();

    if store_path.exists() {
        let content = std::fs::read_to_string(&store_path)?;
        match serde_json::from_str::<AppStore>(&content) {
            Ok(loaded) => inner.store = loaded,
            Err(e) => {
                tracing::warn!("Failed to load store, starting fresh: {}", e);
            }
        }
    }

    // Ensure settings have defaults for missing fields
    if !inner.store.settings.always_ask_browser {
        // Keep as-is — user explicitly disabled it
    }

    Ok(())
}

/// Persist the current in-memory store to disk.
pub fn persist_store(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let data_dir = app.path().app_local_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;

    let store_path = data_dir.join(STORE_FILE);
    let state = app.state::<AppState>();
    let inner = state.inner.lock().unwrap();

    let content = serde_json::to_string_pretty(&inner.store)?;
    std::fs::write(&store_path, content)?;
    Ok(())
}

pub fn get_settings_clone(app: &tauri::AppHandle) -> AppSettings {
    let state = app.state::<AppState>();
    let inner = state.inner.lock().unwrap();
    inner.store.settings.clone()
}

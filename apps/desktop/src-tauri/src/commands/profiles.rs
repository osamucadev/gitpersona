use crate::state::{persist_store, AppState};
use chrono::Utc;
use gitpersona_core::Profile;
use tauri::{AppHandle, State};
use uuid::Uuid;

/// Return all profiles.
#[tauri::command]
pub async fn list_profiles(state: State<'_, AppState>) -> Result<Vec<Profile>, String> {
    let inner = state.inner.lock().unwrap();
    Ok(inner.store.profiles.clone())
}

/// Create a new profile and persist it.
#[tauri::command]
pub async fn create_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    label: String,
    git_name: String,
    git_email: String,
) -> Result<Profile, String> {
    let profile = Profile::new(label, git_name, git_email);

    {
        let mut inner = state.inner.lock().unwrap();
        inner.store.profiles.push(profile.clone());
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    Ok(profile)
}

/// Update label, name, or email of an existing profile.
#[tauri::command]
pub async fn update_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
    label: String,
    git_name: String,
    git_email: String,
) -> Result<Profile, String> {
    let updated = {
        let mut inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile_mut(&id)
            .ok_or_else(|| format!("Profile {} not found", id))?;

        profile.label = label;
        profile.git_name = git_name;
        profile.git_email = git_email;
        profile.updated_at = Utc::now();
        profile.clone()
    };

    persist_store(&app).map_err(|e| e.to_string())?;
    Ok(updated)
}

/// Delete a profile and clean up its keychain token if present.
#[tauri::command]
pub async fn delete_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    let token_ref = {
        let mut inner = state.inner.lock().unwrap();
        let idx = inner
            .store
            .profiles
            .iter()
            .position(|p| p.id == id)
            .ok_or_else(|| format!("Profile {} not found", id))?;

        let token_ref = inner.store.profiles[idx].github.token_ref.clone();

        // If this was the active profile, clear the active setting
        if inner.store.settings.active_profile_id == Some(id) {
            inner.store.settings.active_profile_id = None;
        }

        inner.store.profiles.remove(idx);
        token_ref
    };

    // Clean up keychain token if it exists
    if let Some(ref key) = token_ref {
        if let Ok(entry) = keyring::Entry::new("gitpersona", key) {
            let _ = entry.delete_password();
        }
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    crate::tray::refresh_tray(&app);
    Ok(())
}

/// Return the currently active profile.
#[tauri::command]
pub async fn get_active_profile(state: State<'_, AppState>) -> Result<Option<Profile>, String> {
    let inner = state.inner.lock().unwrap();
    let Some(id) = inner.store.settings.active_profile_id else {
        return Ok(None);
    };
    Ok(inner.find_profile(&id).cloned())
}

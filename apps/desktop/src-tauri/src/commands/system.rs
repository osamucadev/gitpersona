use crate::state::{persist_store, AppState};
use gitpersona_core::{AppSettings, Diagnostics};
use tauri::{AppHandle, State};

/// Get current app settings.
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let inner = state.inner.lock().unwrap();
    Ok(inner.store.settings.clone())
}

/// Update app settings.
#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().unwrap();
        inner.store.settings = settings;
    }
    persist_store(&app).map_err(|e| e.to_string())?;
    Ok(())
}

/// Enable or disable autostart on login.
#[tauri::command]
pub async fn set_autostart(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().unwrap();
        inner.store.settings.autostart = enabled;
    }

    // Use the autostart plugin
    #[cfg(target_os = "windows")]
    {
        use tauri_plugin_autostart::ManagerExt;
        if enabled {
            app.autolaunch().enable().map_err(|e| e.to_string())?;
        } else {
            app.autolaunch().disable().map_err(|e| e.to_string())?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use tauri_plugin_autostart::ManagerExt;
        if enabled {
            let _ = app.autolaunch().enable();
        } else {
            let _ = app.autolaunch().disable();
        }
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    Ok(())
}

/// Build a diagnostics snapshot for troubleshooting.
#[tauri::command]
pub async fn get_diagnostics(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Diagnostics, String> {
    let (name, email, helper) = gitpersona_git::read_identity();
    let active_id = {
        let inner = state.inner.lock().unwrap();
        inner
            .store
            .settings
            .active_profile_id
            .map(|id| id.to_string())
    };

    Ok(Diagnostics {
        git_version: gitpersona_git::git_version(),
        global_user_name: name,
        global_user_email: email,
        credential_helper: helper,
        active_profile_id: active_id,
        platform: std::env::consts::OS.to_string(),
        app_version: app.package_info().version.to_string(),
    })
}

/// Check whether the OS keychain is available.
/// Returns true if a test write+delete succeeds.
#[tauri::command]
pub async fn check_keychain_available() -> Result<bool, String> {
    let entry = keyring::Entry::new("gitpersona", "__keychain_test__")
        .map_err(|e| e.to_string())?;

    match entry.set_password("test") {
        Ok(_) => {
            let _ = entry.delete_password();
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

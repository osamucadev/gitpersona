use crate::state::{persist_store, AppState};
use chrono::Utc;
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

/// Git identity snapshot shown in the UI.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitIdentityResult {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub credential_helper: Option<String>,
}

/// Read the current global git identity directly from git config.
#[tauri::command]
pub async fn get_git_identity() -> Result<GitIdentityResult, String> {
    let (name, email, helper) = gitpersona_git::read_identity();
    Ok(GitIdentityResult {
        user_name: name,
        user_email: email,
        credential_helper: helper,
    })
}

/// Activate a profile: set git global identity and configure the credential helper.
#[tauri::command]
pub async fn activate_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    activate_profile_impl(&app, id)
        .await
        .map_err(|e| e.to_string())?;

    // Update state and persist
    {
        let mut inner = state.inner.lock().unwrap();
        if let Some(p) = inner.find_profile_mut(&id) {
            p.updated_at = Utc::now();
        }
        inner.store.settings.active_profile_id = Some(id);
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    crate::tray::refresh_tray(&app);
    Ok(())
}

/// Internal implementation, also called by tray quick-switch.
pub async fn activate_profile_impl(app: &AppHandle, id: Uuid) -> anyhow::Result<()> {
    let (git_name, git_email) = {
        let state = app.state::<AppState>();
        let inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile(&id)
            .ok_or_else(|| anyhow::anyhow!("Profile not found: {}", id))?;
        (profile.git_name.clone(), profile.git_email.clone())
    };

    // Resolve the path to the bundled credential helper binary
    let helper_path = resolve_helper_path(app)?;

    gitpersona_git::apply_identity(&git_name, &git_email, &helper_path)?;

    // Update the active profile ID in the data directory so the helper can read it
    {
        let state = app.state::<AppState>();
        let mut inner = state.inner.lock().unwrap();
        inner.store.settings.active_profile_id = Some(id);
    }

    persist_store(app)?;

    // Emit event so the UI can refresh
    let _ = app.emit("profile-activated", id.to_string());

    Ok(())
}

/// Find the credential helper binary path (bundled with the app).
fn resolve_helper_path(app: &AppHandle) -> anyhow::Result<String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| anyhow::anyhow!("Cannot resolve resource dir: {}", e))?;

    #[cfg(target_os = "windows")]
    let helper_name = "gitpersona-helper.exe";
    #[cfg(not(target_os = "windows"))]
    let helper_name = "gitpersona-helper";

    let helper = resource_path.join(helper_name);

    if helper.exists() {
        Ok(helper.to_string_lossy().to_string())
    } else {
        // Fallback: try executable directory (useful in dev)
        let exe_dir = std::env::current_exe()?
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_default();
        let dev_helper = exe_dir.join(helper_name);
        if dev_helper.exists() {
            Ok(dev_helper.to_string_lossy().to_string())
        } else {
            // Last resort: assume it's on PATH
            Ok(format!("gitpersona-helper"))
        }
    }
}

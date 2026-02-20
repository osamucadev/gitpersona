use crate::state::{persist_store, AppState};
use chrono::Utc;
use gitpersona_core::{keychain_key, DeviceFlowStart, GitHubUser};
use keyring::Entry;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

fn get_client_id() -> String {
    // Use env var first (dev/CI), fall back to embedded value for releases.
    std::env::var("GITHUB_CLIENT_ID")
        .unwrap_or_else(|_| "YOUR_GITHUB_CLIENT_ID_HERE".to_string())
}

/// Begin the GitHub Device Flow for a profile.
/// Returns the user_code and verification_uri to show the user.
#[tauri::command]
pub async fn github_start_device_flow(
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<DeviceFlowStart, String> {
    // Validate profile exists
    {
        let inner = state.inner.lock().unwrap();
        inner
            .find_profile(&profile_id)
            .ok_or_else(|| format!("Profile {} not found", profile_id))?;
    }

    let client_id = get_client_id();
    let result = gitpersona_auth::start_device_flow(&client_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

/// Poll for the access token. Call repeatedly until success or error.
#[tauri::command]
pub async fn github_poll_device_flow(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: Uuid,
    device_code: String,
) -> Result<bool, String> {
    let client_id = get_client_id();

    let token_opt: Option<String> = gitpersona_auth::poll_device_flow(&client_id, &device_code)
        .await
        .map_err(|e: anyhow::Error| e.to_string())?;

    let token: String = match token_opt {
        Some(t) => t,
        None => return Ok(false),
    };

    // Fetch the GitHub user to get the username
    let user = gitpersona_auth::get_user_info(&token)
        .await
        .map_err(|e: anyhow::Error| e.to_string())?;

    // Store token securely in keychain
    let key = keychain_key(&profile_id);
    let entry = Entry::new("gitpersona", &key).map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| {
        format!(
            "Failed to store token in keychain: {}. \
            This app requires a system keychain to store credentials securely.",
            e
        )
    })?;

    // Update profile with GitHub info (no token stored here)
    {
        let mut inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile_mut(&profile_id)
            .ok_or_else(|| "Profile not found".to_string())?;

        profile.github.connected = true;
        profile.github.username = Some(user.login);
        profile.github.token_ref = Some(key);
        profile.updated_at = Utc::now();
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Remove GitHub connection from a profile.
#[tauri::command]
pub async fn github_disconnect(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<(), String> {
    let token_ref = {
        let mut inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile_mut(&profile_id)
            .ok_or_else(|| "Profile not found".to_string())?;

        let r = profile.github.token_ref.take();
        profile.github.connected = false;
        profile.github.username = None;
        profile.updated_at = Utc::now();
        r
    };

    if let Some(ref key) = token_ref {
        if let Ok(entry) = Entry::new("gitpersona", key) {
            let _ = entry.delete_password();
        }
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    Ok(())
}

/// Test the GitHub token for a profile by calling GET /user.
#[tauri::command]
pub async fn github_test(
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<GitHubUser, String> {
    let token_ref = {
        let inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile(&profile_id)
            .ok_or_else(|| "Profile not found".to_string())?;

        profile
            .github
            .token_ref
            .clone()
            .ok_or_else(|| "No GitHub token for this profile".to_string())?
    };

    let entry = Entry::new("gitpersona", &token_ref).map_err(|e| e.to_string())?;
    let token = entry
        .get_password()
        .map_err(|_| "Token not found in keychain — please reconnect GitHub".to_string())?;

    let user = gitpersona_auth::get_user_info(&token)
        .await
        .map_err(|e: anyhow::Error| format!("GitHub API error: {}", e))?;

    Ok(GitHubUser {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
    })
}

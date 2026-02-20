use crate::state::{persist_store, AppState};
use chrono::Utc;
use gitpersona_core::SshInfo;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

/// Returns the directory where SSH keys for this app are stored.
fn ssh_keys_dir(app: &AppHandle) -> anyhow::Result<PathBuf> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| anyhow::anyhow!("{}", e))?;
    let dir = data_dir.join("ssh");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Returns the private key path for a given profile.
fn key_path_for_profile(app: &AppHandle, profile_id: &Uuid) -> anyhow::Result<PathBuf> {
    Ok(ssh_keys_dir(app)?.join(format!("gitpersona_{}", profile_id)))
}

/// Generate an ed25519 SSH key pair for a profile.
/// Stores the key in the app's data directory and saves metadata to the profile.
#[tauri::command]
pub async fn generate_ssh_key(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<SshInfo, String> {
    let key_path = key_path_for_profile(&app, &profile_id).map_err(|e| e.to_string())?;
    let pub_path = PathBuf::from(format!("{}.pub", key_path.to_string_lossy()));

    // Remove existing keys if present
    let _ = std::fs::remove_file(&key_path);
    let _ = std::fs::remove_file(&pub_path);

    // Get profile label for the key comment
    let label = {
        let inner = state.inner.lock().unwrap();
        inner
            .find_profile(&profile_id)
            .map(|p| p.label.clone())
            .unwrap_or_else(|| "git-persona".to_string())
    };

    let comment = format!("gitpersona/{}", label.to_lowercase().replace(' ', "-"));

    // Run ssh-keygen
    let output = std::process::Command::new("ssh-keygen")
        .args([
            "-t", "ed25519",
            "-C", &comment,
            "-f", &key_path.to_string_lossy(),
            "-N", "", // no passphrase
            "-q",
        ])
        .output()
        .map_err(|e| format!("ssh-keygen not found. Make sure Git for Windows is installed: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "ssh-keygen failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Read the public key
    let public_key = std::fs::read_to_string(&pub_path)
        .map_err(|e| format!("Failed to read public key: {}", e))?
        .trim()
        .to_string();

    let ssh_info = SshInfo {
        configured: true,
        key_path: Some(key_path.to_string_lossy().to_string()),
        public_key: Some(public_key.clone()),
        github_key_id: None,
    };

    // Save to profile
    {
        let mut inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile_mut(&profile_id)
            .ok_or("Profile not found")?;
        profile.ssh = ssh_info.clone();
        profile.updated_at = Utc::now();
    }

    persist_store(&app).map_err(|e| e.to_string())?;

    // Update SSH config
    write_ssh_config(&app).map_err(|e| e.to_string())?;

    Ok(ssh_info)
}

/// Get the public key content for a profile (for display/copy).
#[tauri::command]
pub async fn get_ssh_public_key(
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<Option<String>, String> {
    let inner = state.inner.lock().unwrap();
    let profile = inner
        .find_profile(&profile_id)
        .ok_or("Profile not found")?;
    Ok(profile.ssh.public_key.clone())
}

/// Remove the SSH key for a profile (deletes key files and GitHub key if registered).
#[tauri::command]
pub async fn remove_ssh_key(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<(), String> {
    let (key_path, github_key_id, token_ref) = {
        let inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile(&profile_id)
            .ok_or("Profile not found")?;
        (
            profile.ssh.key_path.clone(),
            profile.ssh.github_key_id,
            profile.github.token_ref.clone(),
        )
    };

    // Delete from GitHub if registered
    if let (Some(key_id), Some(ref token_ref)) = (github_key_id, &token_ref) {
        if let Ok(entry) = keyring::Entry::new("gitpersona", token_ref) {
            if let Ok(token) = entry.get_password() {
                let client = reqwest::Client::new();
                let _ = client
                    .delete(format!("https://api.github.com/user/keys/{}", key_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .header("User-Agent", "git-persona")
                    .send()
                    .await;
            }
        }
    }

    // Delete key files
    if let Some(ref path) = key_path {
        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_file(format!("{}.pub", path));
    }

    // Clear from profile
    {
        let mut inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile_mut(&profile_id)
            .ok_or("Profile not found")?;
        profile.ssh = gitpersona_core::SshInfo::default();
        profile.updated_at = Utc::now();
    }

    persist_store(&app).map_err(|e| e.to_string())?;
    write_ssh_config(&app).map_err(|e| e.to_string())?;

    Ok(())
}

/// Register the profile's SSH public key with GitHub.
#[tauri::command]
pub async fn add_ssh_key_to_github(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: Uuid,
) -> Result<u64, String> {
    let (public_key, token_ref, label) = {
        let inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile(&profile_id)
            .ok_or("Profile not found")?;
        let pub_key = profile
            .ssh
            .public_key
            .clone()
            .ok_or("No SSH key generated for this profile")?;
        let tr = profile
            .github
            .token_ref
            .clone()
            .ok_or("GitHub not connected — connect GitHub first")?;
        (pub_key, tr, profile.label.clone())
    };

    let entry = keyring::Entry::new("gitpersona", &token_ref).map_err(|e| e.to_string())?;
    let token = entry
        .get_password()
        .map_err(|_| "GitHub token not found in keychain — please reconnect")?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.github.com/user/keys")
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "git-persona")
        .header("Accept", "application/vnd.github+json")
        .json(&serde_json::json!({
            "title": format!("Git Persona — {}", label),
            "key": public_key,
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error: {}", body));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let key_id = json["id"]
        .as_u64()
        .ok_or("Unexpected response from GitHub")?;

    // Save the key ID to profile
    {
        let mut inner = state.inner.lock().unwrap();
        let profile = inner
            .find_profile_mut(&profile_id)
            .ok_or("Profile not found")?;
        profile.ssh.github_key_id = Some(key_id);
        profile.updated_at = Utc::now();
    }

    persist_store(&app).map_err(|e| e.to_string())?;

    Ok(key_id)
}

/// Write ~/.ssh/config with a block for each profile that has an SSH key.
/// This is called automatically when a profile is activated.
pub fn write_ssh_config(app: &AppHandle) -> anyhow::Result<()> {
    let profiles = {
        let state = app.state::<AppState>();
        let inner = state.inner.lock().unwrap();
        inner.store.profiles.clone()
    };

    let active_id = {
        let state = app.state::<AppState>();
        let inner = state.inner.lock().unwrap();
        inner.store.settings.active_profile_id
    };

    // Get the active profile's SSH key
    let active_ssh = active_id.and_then(|id| {
        profiles.iter().find(|p| p.id == id).and_then(|p| {
            if p.ssh.configured {
                p.ssh.key_path.clone()
            } else {
                None
            }
        })
    });

    let ssh_config_path = get_ssh_config_path()?;

    // Read existing config, stripping our managed block
    let existing = std::fs::read_to_string(&ssh_config_path).unwrap_or_default();
    let cleaned = strip_managed_block(&existing);

    if let Some(key_path) = active_ssh {
        // Normalize path separators for SSH config (forward slashes)
        let key_path_normalized = key_path.replace('\\', "/");

        let block = format!(
            "\n# BEGIN GIT PERSONA MANAGED\nHost github.com\n  HostName github.com\n  User git\n  IdentityFile {}\n  IdentitiesOnly yes\n# END GIT PERSONA MANAGED\n",
            key_path_normalized
        );

        std::fs::write(&ssh_config_path, format!("{}{}", cleaned.trim_end(), block))?;
    } else {
        // No active SSH profile — just write the cleaned config
        let trimmed = cleaned.trim_end();
        if !trimmed.is_empty() {
            std::fs::write(&ssh_config_path, format!("{}\n", trimmed))?;
        }
    }

    Ok(())
}

fn get_ssh_config_path() -> anyhow::Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;
    let ssh_dir = home.join(".ssh");
    std::fs::create_dir_all(&ssh_dir)?;

    // Set correct permissions on .ssh dir (important on Unix)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&ssh_dir, std::fs::Permissions::from_mode(0o700))?;
    }

    Ok(ssh_dir.join("config"))
}

fn strip_managed_block(content: &str) -> String {
    let mut result = String::new();
    let mut inside_block = false;

    for line in content.lines() {
        if line.trim() == "# BEGIN GIT PERSONA MANAGED" {
            inside_block = true;
            continue;
        }
        if line.trim() == "# END GIT PERSONA MANAGED" {
            inside_block = false;
            continue;
        }
        if !inside_block {
            result.push_str(line);
            result.push('\n');
        }
    }

    result
}

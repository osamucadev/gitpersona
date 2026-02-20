use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// SSH key state for a profile.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct SshInfo {
    /// Whether this profile has an SSH key configured
    pub configured: bool,
    /// Absolute path to the private key file
    pub key_path: Option<String>,
    /// The public key content (for display and GitHub registration)
    pub public_key: Option<String>,
    /// GitHub key ID (for deletion via API)
    pub github_key_id: Option<u64>,
}

/// A Git identity profile managed by Git Persona.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: Uuid,
    /// Display label, e.g. "WORK" or "PERSONAL"
    pub label: String,
    /// git config user.name value
    pub git_name: String,
    /// git config user.email value
    pub git_email: String,
    /// GitHub account linked to this profile
    pub github: GitHubInfo,
    /// SSH key linked to this profile
    #[serde(default)]
    pub ssh: SshInfo,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Profile {
    pub fn new(label: String, git_name: String, git_email: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            label,
            git_name,
            git_email,
            github: GitHubInfo::default(),
            ssh: SshInfo::default(),
            created_at: now,
            updated_at: now,
        }
    }
}

/// GitHub connection state for a profile.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct GitHubInfo {
    pub connected: bool,
    /// GitHub login username, e.g. "octocat"
    pub username: Option<String>,
    /// Key used to retrieve the token from the OS keychain.
    /// Never the token itself.
    pub token_ref: Option<String>,
}

/// App-wide persistent settings (non-secret).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub autostart: bool,
    /// If true, always show browser picker before opening OAuth URLs.
    pub always_ask_browser: bool,
    /// Remembered browser choice (executable path or "system")
    pub remembered_browser: Option<String>,
    /// ID of the currently active profile
    pub active_profile_id: Option<Uuid>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            autostart: false,
            always_ask_browser: true, // ON by default per spec
            remembered_browser: None,
            active_profile_id: None,
        }
    }
}

/// The full app store that gets persisted to disk (JSON).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppStore {
    pub profiles: Vec<Profile>,
    pub settings: AppSettings,
}

/// Result of starting a GitHub Device Flow.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowStart {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u32,
    pub interval: u32,
}

/// Detected browser entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserEntry {
    pub name: String,
    /// Absolute path to the executable, None for "System Open With"
    pub executable: Option<String>,
    pub icon: Option<String>,
}

/// Result of the GitHub /user API call for testing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubUser {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
    pub html_url: String,
}

/// Diagnostics snapshot.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostics {
    pub git_version: Option<String>,
    pub global_user_name: Option<String>,
    pub global_user_email: Option<String>,
    pub credential_helper: Option<String>,
    pub active_profile_id: Option<String>,
    pub platform: String,
    pub app_version: String,
}

/// Keychain key prefix to avoid collisions with other apps.
pub const KEYCHAIN_SERVICE: &str = "gitpersona";

/// Build the keychain key for a profile's GitHub token.
pub fn keychain_key(profile_id: &Uuid) -> String {
    format!("github-token-{}", profile_id)
}

/// Redact sensitive values (tokens) from diagnostic strings.
pub fn redact(input: &str) -> String {
    // Redact anything that looks like a GitHub token (ghp_, gho_, etc.)
    let re_patterns = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_"];
    let mut output = input.to_string();
    for prefix in re_patterns {
        if let Some(start) = output.find(prefix) {
            let end = output[start..]
                .find(|c: char| !c.is_alphanumeric() && c != '_')
                .map(|i| start + i)
                .unwrap_or(output.len());
            output.replace_range(start..end, &format!("{}[REDACTED]", prefix));
        }
    }
    output
}

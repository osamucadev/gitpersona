use anyhow::{bail, Context, Result};
use std::process::Command;

/// Get the installed git version string, or None if git is not found.
pub fn git_version() -> Option<String> {
    Command::new("git")
        .args(["--version"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

/// Check whether git is available on PATH.
pub fn is_git_available() -> bool {
    git_version().is_some()
}

/// Read a global git config value.
pub fn get_global_config(key: &str) -> Option<String> {
    Command::new("git")
        .args(["config", "--global", key])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Set a global git config value.
pub fn set_global_config(key: &str, value: &str) -> Result<()> {
    let status = Command::new("git")
        .args(["config", "--global", key, value])
        .status()
        .context("Failed to run git config")?;

    if !status.success() {
        bail!("git config returned non-zero exit code");
    }
    Ok(())
}

/// Apply a profile's git identity globally.
/// Also registers the credential helper that points to our bundled binary.
pub fn apply_identity(name: &str, email: &str, helper_path: &str) -> Result<()> {
    set_global_config("user.name", name).context("Setting user.name")?;
    set_global_config("user.email", email).context("Setting user.email")?;

    // Register the credential helper.
    // We prepend a space so git does not look it up in PATH but treats it as a literal path.
    let helper_value = format!("{}", helper_path);
    set_global_config("credential.helper", &helper_value).context("Setting credential.helper")?;

    Ok(())
}

/// Read current global identity.
pub fn read_identity() -> (Option<String>, Option<String>, Option<String>) {
    let name = get_global_config("user.name");
    let email = get_global_config("user.email");
    let helper = get_global_config("credential.helper");
    (name, email, helper)
}

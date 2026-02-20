/// Git Persona Credential Helper
///
/// This binary is registered as git's credential.helper. When git needs credentials
/// for a remote, it invokes this binary with an action argument ("get", "store", "erase").
///
/// We only respond to "get" for github.com. All other actions and hosts are silently ignored.
///
/// The active profile token is read from the OS keychain using the active profile ID
/// stored in the app's data directory.
use std::{
    env,
    fs,
    io::{self, BufRead, Write},
    path::PathBuf,
};

fn main() {
    let args: Vec<String> = env::args().collect();
    let action = args.get(1).map(|s| s.as_str()).unwrap_or("");

    // We only handle "get" — ignore "store" and "erase"
    if action != "get" {
        return;
    }

    // Parse the key=value pairs git sends on stdin
    let stdin = io::stdin();
    let mut host = String::new();
    let mut protocol = String::new();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if line.is_empty() {
            break;
        }
        if let Some((key, value)) = line.split_once('=') {
            match key {
                "host" => host = value.to_string(),
                "protocol" => protocol = value.to_string(),
                _ => {}
            }
        }
    }

    // Only provide credentials for github.com over https/http
    let is_github = host == "github.com" || host.ends_with(".github.com");
    let is_http = protocol == "https" || protocol == "http";

    if !is_github || !is_http {
        // Credential helper should exit 0 and produce no output to let git continue
        return;
    }

    // Locate the app data directory
    let app_data = resolve_app_data_dir();
    let store_path = app_data.join("com.gitpersona.app").join("store.json");

    let store_content = match fs::read_to_string(&store_path) {
        Ok(c) => c,
        Err(_) => {
            // No store found — output nothing so git falls back to other helpers
            return;
        }
    };

    let store: serde_json::Value = match serde_json::from_str(&store_content) {
        Ok(v) => v,
        Err(_) => return,
    };

    // Find the active profile ID
    let active_id = match store["settings"]["activeProfileId"].as_str() {
        Some(id) => id.to_string(),
        None => return,
    };

    // Find the matching profile
    let profiles = match store["profiles"].as_array() {
        Some(p) => p,
        None => return,
    };

    let active_profile = profiles.iter().find(|p| {
        p["id"].as_str().map(|id| id == active_id).unwrap_or(false)
    });

    let profile = match active_profile {
        Some(p) => p,
        None => return,
    };

    // Check GitHub is connected and get the token ref
    let github_connected = profile["github"]["connected"].as_bool().unwrap_or(false);
    let token_ref = match profile["github"]["tokenRef"].as_str() {
        Some(r) if github_connected => r.to_string(),
        _ => return,
    };

    let github_username = profile["github"]["username"]
        .as_str()
        .unwrap_or("oauth2")
        .to_string();

    // Retrieve token from OS keychain
    let token = match retrieve_token(&token_ref) {
        Some(t) => t,
        None => return,
    };

    // Output credentials in git's expected format
    let stdout = io::stdout();
    let mut out = stdout.lock();
    let _ = writeln!(out, "username={}", github_username);
    let _ = writeln!(out, "password={}", token);
}

/// Retrieve a token from the OS keychain by key.
fn retrieve_token(key: &str) -> Option<String> {
    let entry = keyring::Entry::new("gitpersona", key).ok()?;
    entry.get_password().ok()
}

/// Resolve the platform-specific app data directory.
fn resolve_app_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        env::var("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "macos")]
    {
        dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."))
    }
}

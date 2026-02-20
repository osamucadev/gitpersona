use gitpersona_core::BrowserEntry;
use tauri::AppHandle;

/// Detect installed browsers on the current platform.
#[tauri::command]
pub async fn detect_browsers(_app: AppHandle) -> Result<Vec<BrowserEntry>, String> {
    let mut browsers = platform_detect_browsers();

    // Always append the "System Open With" fallback
    browsers.push(BrowserEntry {
        name: "System Open With".to_string(),
        executable: None,
        icon: None,
    });

    Ok(browsers)
}

/// Open a URL in the specified browser.
#[tauri::command]
pub async fn open_url_in_browser(
    url: String,
    executable: Option<String>,
) -> Result<(), String> {
    match executable {
        Some(exe) => open_with_executable(&exe, &url),
        None => open_with_system_dialog(&url),
    }
}

// ─── Platform implementations ─────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn platform_detect_browsers() -> Vec<BrowserEntry> {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let known = vec![
        ("Google Chrome", r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"),
        ("Microsoft Edge", r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"),
        ("Mozilla Firefox", r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe"),
        ("Brave Browser", r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\brave.exe"),
        ("Opera", r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe"),
        ("Vivaldi", r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vivaldi.exe"),
    ];

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let mut result = Vec::new();

    for (name, reg_path) in known {
        if let Ok(key) = hklm.open_subkey(reg_path) {
            if let Ok(exe_path) = key.get_value::<String, _>("") {
                if std::path::Path::new(&exe_path).exists() {
                    result.push(BrowserEntry {
                        name: name.to_string(),
                        executable: Some(exe_path),
                        icon: None,
                    });
                }
            }
        }
    }

    result
}

#[cfg(target_os = "macos")]
fn platform_detect_browsers() -> Vec<BrowserEntry> {
    let known = vec![
        ("Google Chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        ("Safari", "/Applications/Safari.app/Contents/MacOS/Safari"),
        ("Firefox", "/Applications/Firefox.app/Contents/MacOS/firefox"),
        ("Brave Browser", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
        ("Arc", "/Applications/Arc.app/Contents/MacOS/Arc"),
    ];

    known
        .into_iter()
        .filter(|(_, path)| std::path::Path::new(path).exists())
        .map(|(name, path)| BrowserEntry {
            name: name.to_string(),
            executable: Some(path.to_string()),
            icon: None,
        })
        .collect()
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn platform_detect_browsers() -> Vec<BrowserEntry> {
    // Linux: check common browser names in PATH
    let known = ["google-chrome", "chromium-browser", "firefox", "brave-browser", "opera"];
    known
        .iter()
        .filter(|&&name| which_exists(name))
        .map(|&name| BrowserEntry {
            name: name.to_string(),
            executable: Some(name.to_string()),
            icon: None,
        })
        .collect()
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn which_exists(cmd: &str) -> bool {
    std::process::Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn open_with_executable(exe: &str, url: &str) -> Result<(), String> {
    std::process::Command::new(exe)
        .arg(url)
        .spawn()
        .map_err(|e| format!("Failed to open browser '{}': {}", exe, e))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_with_system_dialog(url: &str) -> Result<(), String> {
    // Use OpenAs_RunDLL to show the Windows "Open With" dialog
    std::process::Command::new("rundll32.exe")
        .args(["shell32.dll,OpenAs_RunDLL", url])
        .spawn()
        .map_err(|e| format!("Failed to open system dialog: {}", e))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn open_with_system_dialog(url: &str) -> Result<(), String> {
    // macOS / Linux: use the system open command
    let cmd = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
    std::process::Command::new(cmd)
        .arg(url)
        .spawn()
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    Ok(())
}

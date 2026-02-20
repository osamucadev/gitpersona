// Prevents a terminal window from appearing on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod state;
mod tray;

use state::AppState;
use tauri::Manager;
use tracing_subscriber::EnvFilter;

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::default())
        .setup(|app| {
            // Initialize app state from persisted store
            state::init_state(app)?;

            // Set up system tray
            tray::setup_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::profiles::list_profiles,
            commands::profiles::create_profile,
            commands::profiles::update_profile,
            commands::profiles::delete_profile,
            commands::profiles::get_active_profile,
            commands::git::activate_profile,
            commands::git::get_git_identity,
            commands::auth::github_start_device_flow,
            commands::auth::github_poll_device_flow,
            commands::auth::github_disconnect,
            commands::auth::github_test,
            commands::browser::detect_browsers,
            commands::browser::open_url_in_browser,
            commands::ssh::generate_ssh_key,
            commands::ssh::get_ssh_public_key,
            commands::ssh::remove_ssh_key,
            commands::ssh::add_ssh_key_to_github,
            commands::system::set_autostart,
            commands::system::get_settings,
            commands::system::update_settings,
            commands::system::get_diagnostics,
            commands::system::check_keychain_available,
        ])
        .build(tauri::generate_context!())
        .expect("Error building Tauri application")
        .run(|app, event| {
            // Keep app running when the window is closed (tray icon stays)
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
                // Hide window instead of quitting
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
        });
}

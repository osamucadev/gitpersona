use crate::state::AppState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager,
};

pub fn setup_tray(app: &App) -> anyhow::Result<()> {
    let menu = build_tray_menu(app.handle())?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Git Persona")
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn build_tray_menu(app: &AppHandle) -> anyhow::Result<Menu<tauri::Wry>> {
    let state = app.state::<AppState>();
    let inner = state.inner.lock().unwrap();

    let menu = Menu::new(app)?;

    // Show active profile
    let active_label = inner
        .store
        .settings
        .active_profile_id
        .and_then(|id| inner.store.profiles.iter().find(|p| p.id == id))
        .map(|p| format!("Active: {}", p.label))
        .unwrap_or_else(|| "No active profile".to_string());

    let active_item = MenuItem::with_id(app, "active_display", &active_label, false, None::<&str>)?;
    menu.append(&active_item)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    // Profile list for quick switch
    for profile in &inner.store.profiles {
        let id = format!("switch_{}", profile.id);
        let label = format!("Switch to {}", profile.label);
        let item = MenuItem::with_id(app, &id, &label, true, None::<&str>)?;
        menu.append(&item)?;
    }

    menu.append(&PredefinedMenuItem::separator(app)?)?;

    let open = MenuItem::with_id(app, "open", "Open Git Persona", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    menu.append(&open)?;
    menu.append(&quit)?;

    Ok(menu)
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "open" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => {
            app.exit(0);
        }
        id if id.starts_with("switch_") => {
            let profile_id_str = &id["switch_".len()..];
            if let Ok(profile_id) = profile_id_str.parse::<uuid::Uuid>() {
                let app_clone = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = crate::commands::git::activate_profile_impl(
                        &app_clone,
                        profile_id,
                    )
                    .await;
                });
            }
        }
        _ => {}
    }
}

/// Rebuild the tray menu (call after profile changes).
pub fn refresh_tray(app: &AppHandle) {
    // Tauri v2 tray menus are rebuilt by getting the tray and setting a new menu
    // For simplicity we emit an event and let the UI handle it
    let _ = app.emit("tray-refresh", ());
}

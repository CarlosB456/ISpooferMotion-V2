use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
#[specta::specta]
pub async fn close_splashscreen(app: AppHandle) {
    // Dynamically create main window only after splash is done
    if app.get_webview_window("main").is_none() {
        let main_window = tauri::WebviewWindowBuilder::new(
            &app,
            "main",
            tauri::WebviewUrl::App("index.html".into()),
        )
        .title("ISpooferMotion")
        .inner_size(1100.0, 620.0)
        .resizable(true)
        .fullscreen(false)
        .decorations(false)
        .center()
        .build()
        .unwrap_or_else(|_| {
            app.get_webview_window("main").expect("main window should exist if build fails")
        });

        let _ = main_window.show();
    }

    if let Some(splashscreen) = app.get_webview_window("splashscreen") {
        let _ = splashscreen.close();
    }
}

#[tauri::command]
#[specta::specta]
pub async fn sync_roblox_plugin(app: AppHandle) -> crate::error::Result<bool> {
    log::info!("Starting Roblox plugin sync...");

    // Resolve bundled resource path
    let resource_path = app
        .path()
        .resolve("dist-plugin/ISpooferMotion.rbxmx", tauri::path::BaseDirectory::Resource)?;

    if !resource_path.exists() {
        log::warn!("Bundled plugin resource not found at {:?}", resource_path);
        return Ok(false);
    }

    // Determine Roblox plugins directory based on OS
    let roblox_plugins_dir: Option<PathBuf> = {
        #[cfg(target_os = "windows")]
        {
            std::env::var("LOCALAPPDATA")
                .ok()
                .map(|local_app_data| PathBuf::from(local_app_data).join("Roblox").join("Plugins"))
        }

        #[cfg(target_os = "macos")]
        {
            std::env::var("HOME")
                .ok()
                .map(|home| PathBuf::from(home).join("Documents").join("Roblox").join("Plugins"))
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            None
        }
    };

    if let Some(dest_dir) = roblox_plugins_dir {
        // Create directory if it doesn't exist
        if !dest_dir.exists() {
            let _ = std::fs::create_dir_all(&dest_dir);
        }

        let dest_path = dest_dir.join("ISpooferMotion.rbxmx");

        match std::fs::copy(&resource_path, &dest_path) {
            Ok(_) => {
                log::info!("Successfully copied plugin to {:?}", dest_path);
                return Ok(true);
            }
            Err(e) => {
                log::error!("Failed to copy plugin: {}", e);
                return Err(crate::error::AppError::Io(e));
            }
        }
    }

    log::warn!("Could not determine Roblox plugins directory for this OS.");
    Ok(false)
}

//! Provides persistence for the UI state so it survives app restarts.

use crate::commands::AnyValue;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Derives the path to the `ispoofer_session.json` file inside the local app data folder.
pub fn get_session_path(app_handle: &AppHandle) -> crate::error::Result<PathBuf> {
    // Persist basic session state to retain user inputs across restarts.
    app_handle
        .path()
        .app_data_dir()
        .map(|dir| dir.join("ispoofer_session.json"))
        .map_err(|e| crate::error::AppError::Custom(format!("Failed to get app data dir: {e}")))
}

/// Writes the React frontend's current state to disk.
#[tauri::command]
#[specta::specta]
pub async fn save_session(app_handle: AppHandle, session: AnyValue) -> crate::error::Result<()> {
    let session = session.0;
    let path = get_session_path(&app_handle)?;

    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| {
            crate::error::AppError::Custom(format!("Failed to create session directory: {e}"))
        })?;
    }
    let json_str = serde_json::to_string_pretty(&session)?;
    tokio::fs::write(path, json_str)
        .await
        .map_err(|e| crate::error::AppError::Custom(format!("Failed to write session file: {e}")))
}

/// Reads the previously saved UI state from disk.
#[tauri::command]
#[specta::specta]
pub async fn load_session(app_handle: AppHandle) -> crate::error::Result<Option<AnyValue>> {
    let path = get_session_path(&app_handle)?;
    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => {
            return Err(crate::error::AppError::Custom(format!("Failed to read session file: {e}")))
        }
    };

    match serde_json::from_str(&content) {
        Ok(v) => Ok(Some(AnyValue(v))),
        Err(_) => Ok(None),
    }
}

/// Wipes the saved UI state, usually called during logout or when the user resets the app.
#[tauri::command]
#[specta::specta]
pub async fn clear_session(app_handle: AppHandle) -> crate::error::Result<()> {
    let path = get_session_path(&app_handle)?;
    let _ = tokio::fs::remove_file(&path).await;
    Ok(())
}

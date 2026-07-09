// Suppress console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Tauri entrypoint. Implementation located in lib.rs.
fn main() {
    app_lib::run();
}

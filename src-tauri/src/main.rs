//! Suppress console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// The main Tauri entrypoint.
///
/// Actual setup and execution are deferred to `lib.rs` to allow integration
/// tests to import the application logic without starting the UI.
fn main() {
    app_lib::run();
}

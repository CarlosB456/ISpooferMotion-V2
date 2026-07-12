//! Monitors the OS for screenshot tools and screen recording software.
//!
//! Because ISpooferMotion operates in a grey area, we want to proactively warn
//! users if they are inadvertently capturing the app window while screen sharing
//! or recording (like on Discord or OBS).

use aho_corasick::AhoCorasick;
use std::sync::OnceLock;
use std::thread;
use sysinfo::System;
use tauri::{AppHandle, Emitter};
use tokio::time::{sleep, Duration};

const CAPTURE_PROCESSES: &[&str] = &[
    "obs64",
    "obs",
    "snippingtool",
    "screenclippinghost",
    "discord",
    "sharex",
    "gyazo",
    "lightshot",
    "greenshot",
    "snagit",
    "camtasia",
    "bdcam",
    "fraps",
    "xsplit",
    "action",
    "dxtory",
    "playclaw",
    "screencast",
    "prl_cc",  // Parallels capture
    "gamebar", // Windows Game Bar
];

fn capture_matcher() -> &'static AhoCorasick {
    static MATCHER: OnceLock<AhoCorasick> = OnceLock::new();
    MATCHER.get_or_init(|| {
        AhoCorasick::new(CAPTURE_PROCESSES).expect("static capture patterns are valid")
    })
}

/// Spawns two background threads to detect potential screen captures.
///
/// 1. A polling loop checking running process names against a known blacklist.
/// 2. A global keyboard hook listening for Print Screen or Win+Shift+S.
pub fn spawn_capture_monitor(app_handle: AppHandle) {
    let app_handle_poller = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let mut sys = System::new();
        let mut high_risk_was_active = false;
        let matcher = capture_matcher();

        loop {
            sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

            let risk_active = sys.processes().values().any(|process| {
                let name = process.name().to_string_lossy().to_ascii_lowercase();
                matcher.is_match(&name)
            });

            if risk_active && !high_risk_was_active {
                let _ = app_handle_poller.emit("capture-risk-high", ());
                high_risk_was_active = true;
            } else if !risk_active && high_risk_was_active {
                let _ = app_handle_poller.emit("capture-risk-low", ());
                high_risk_was_active = false;
            }

            sleep(Duration::from_secs(2)).await;
        }
    });

    let app_handle_hook = app_handle;
    thread::spawn(move || {
        let mut meta_pressed = false;
        let mut shift_pressed = false;

        let callback = move |event: rdev::Event| match event.event_type {
            rdev::EventType::KeyPress(key) => match key {
                rdev::Key::MetaLeft | rdev::Key::MetaRight => meta_pressed = true,
                rdev::Key::ShiftLeft | rdev::Key::ShiftRight => shift_pressed = true,
                rdev::Key::PrintScreen => {
                    let _ = app_handle_hook.emit("capture-instant", ());
                }
                rdev::Key::KeyS if meta_pressed && shift_pressed => {
                    let _ = app_handle_hook.emit("capture-instant", ());
                }
                _ => {}
            },
            rdev::EventType::KeyRelease(key) => match key {
                rdev::Key::MetaLeft | rdev::Key::MetaRight => meta_pressed = false,
                rdev::Key::ShiftLeft | rdev::Key::ShiftRight => shift_pressed = false,
                _ => {}
            },
            _ => {}
        };

        if let Err(error) = rdev::listen(callback) {
            log::error!("Error initializing global keyboard hook: {:?}", error);
        }
    });
}

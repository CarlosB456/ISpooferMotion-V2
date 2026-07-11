use rdev::{listen, EventType, Key};
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

pub fn spawn_capture_monitor(app_handle: AppHandle) {
    let app_handle_poller = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let mut sys = System::new();
        let mut high_risk_was_active = false;

        loop {
            sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

            let mut risk_active = false;
            for process in sys.processes().values() {
                let name = process.name().to_string_lossy().to_lowercase();
                for &target in CAPTURE_PROCESSES {
                    if name.contains(target) {
                        risk_active = true;
                        break;
                    }
                }
                if risk_active {
                    break;
                }
            }

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
            EventType::KeyPress(key) => match key {
                Key::MetaLeft | Key::MetaRight => meta_pressed = true,
                Key::ShiftLeft | Key::ShiftRight => shift_pressed = true,
                Key::PrintScreen => {
                    let _ = app_handle_hook.emit("capture-instant", ());
                }
                Key::KeyS if meta_pressed && shift_pressed => {
                    let _ = app_handle_hook.emit("capture-instant", ());
                }
                _ => {}
            },
            EventType::KeyRelease(key) => match key {
                Key::MetaLeft | Key::MetaRight => meta_pressed = false,
                Key::ShiftLeft | Key::ShiftRight => shift_pressed = false,
                _ => {}
            },
            _ => {}
        };

        if let Err(error) = listen(callback) {
            log::error!("Error initializing global keyboard hook: {:?}", error);
        }
    });
}

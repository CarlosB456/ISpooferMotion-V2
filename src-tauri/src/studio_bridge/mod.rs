// Initialize the HTTP server interfacing locally with the Roblox Studio plugin.
pub mod messages;
pub mod middleware;
pub mod server;

use crate::commands::AnyValue;
use axum::{
    extract::{DefaultBodyLimit, State},
    http::{HeaderValue, Method},
    middleware as axum_middleware,
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use std::sync::{Arc, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio::sync::RwLock;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    limit::RequestBodyLimitLayer,
};

use messages::plan_patches;
use middleware::require_json_for_post;
use server::{
    get_last_animations, get_last_images, get_last_meshes, get_last_script_refs, get_last_sounds,
    handle_animations_complete, handle_api_dump, handle_assets_animations, handle_assets_images,
    handle_assets_meshes, handle_assets_script_refs, handle_assets_sounds, handle_images_complete,
    handle_meshes_complete, handle_poll, handle_poll_animations, handle_poll_images,
    handle_poll_replacements, handle_poll_sounds, handle_replace_ids, handle_scan_abort,
    handle_scan_complete, handle_scan_progress, handle_scan_records, handle_scan_start,
    handle_script_refs_complete, handle_sounds_complete, handle_studio_health, request_animations,
    request_images, request_meshes, request_script_refs, request_sounds,
};

const PLUGIN_PORT_START: u16 = 14285;
const PLUGIN_PORT_END: u16 = 14289;
const STUDIO_PROTOCOL_VERSION: u8 = 3;
const MAX_STUDIO_RECORDS: usize = 2_000_000;
const MAX_SCRIPT_SOURCE_BYTES: usize = 8_000_000;

static ACTIVE_BRIDGE_PORT: OnceLock<RwLock<Option<u16>>> = OnceLock::new();
static BRIDGE_DATA: OnceLock<Arc<RwLock<AssetServerStateData>>> = OnceLock::new();

pub fn bridge_data() -> Option<Arc<RwLock<AssetServerStateData>>> {
    BRIDGE_DATA.get().cloned()
}

pub(crate) fn active_bridge_port() -> &'static RwLock<Option<u16>> {
    ACTIVE_BRIDGE_PORT.get_or_init(|| RwLock::new(None))
}

#[tauri::command]
#[specta::specta]
#[must_use]
pub async fn set_bridge_skip_owned_check(skip_owned: bool) -> bool {
    if let Some(data) = bridge_data() {
        data.write().await.skip_owned_check = skip_owned;
        return true;
    }
    false
}

#[must_use]
pub async fn queue_replace_mappings_internal(mappings: Vec<Value>) -> bool {
    let Some(data) = bridge_data() else {
        return false;
    };
    if mappings.is_empty() {
        return false;
    }
    let records = std::sync::Arc::clone(&data.read().await.studio_records);
    // Generate patches from scan records if available; otherwise rely on Studio ID mapping substitution.
    let patches = if records.is_empty() { Vec::new() } else { plan_patches(&records, &mappings) };
    let mut guard = data.write().await;
    guard.stored_mappings = mappings;
    guard.stored_patches = patches;
    true
}

use messages::AssetServerStateData;

#[derive(Clone)]
pub struct AppState {
    pub data: Arc<RwLock<AssetServerStateData>>,
    pub bridge_port: u16,
    pub started_at: u128,
    pub app_handle: AppHandle,
}

pub async fn start_server(_app_handle: AppHandle) {
    let data = Arc::new(RwLock::new(AssetServerStateData::default()));
    let _ = BRIDGE_DATA.set(Arc::clone(&data));
    let Some((listener, addr)) = bind_available_listener().await else {
        log::error!("Could not start plugin HTTP server: no available TCP ports found");
        return;
    };
    let state = AppState {
        data: Arc::clone(&data),
        bridge_port: addr.port(),
        started_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        app_handle: _app_handle.clone(),
    };
    *active_bridge_port().write().await = Some(addr.port());

    // Allow localhost/tauri origins to enable web frontend access.
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(
            |origin: &HeaderValue, _req_parts: &axum::http::request::Parts| {
                let bytes = origin.as_bytes();
                // Allow null/empty origins.
                if bytes.is_empty() || bytes == b"null" {
                    return true;
                }
                matches!(
                    origin.to_str().unwrap_or(""),
                    "http://localhost:5173"
                        | "http://127.0.0.1:5173"
                        | "http://localhost:3000"
                        | "http://127.0.0.1:3000"
                        | "https://ispoofermotion.com"
                        | "tauri://localhost"
                        | "http://tauri.localhost"
                        | "https://tauri.localhost"
                )
            },
        ))
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([axum::http::header::CONTENT_TYPE, axum::http::header::AUTHORIZATION])
        .allow_private_network(true);

    let app = Router::new()
        .route(
            "/health",
            get(|State(state): State<AppState>| async move {
                let port = *active_bridge_port().read().await;
                Json(json!({
                    "app": "ISpooferMotion",
                    "port": port.unwrap_or(14285),
                    "startedAt": state.started_at,
                    "allowStudioPairing": true
                }))
            }),
        )
        .route("/studio-health", get(handle_studio_health))
        .route("/api-dump", get(handle_api_dump))
        .route("/poll", get(handle_poll))
        .route("/scan-start", post(handle_scan_start))
        .route("/scan-progress", post(handle_scan_progress))
        .route("/scan-records", post(handle_scan_records))
        .route("/scan-complete", post(handle_scan_complete))
        .route("/scan-abort", post(handle_scan_abort))
        .route("/poll-sounds", get(handle_poll_sounds))
        .route("/assets-sounds", post(handle_assets_sounds))
        .route("/sounds-complete", post(handle_sounds_complete))
        .route("/poll-animations", get(handle_poll_animations))
        .route("/assets-animations", post(handle_assets_animations))
        .route("/animations-complete", post(handle_animations_complete))
        .route("/poll-images", get(handle_poll_images))
        .route("/assets-images", post(handle_assets_images))
        .route("/images-complete", post(handle_images_complete))
        .route("/assets-meshes", post(handle_assets_meshes))
        .route("/meshes-complete", post(handle_meshes_complete))
        .route("/assets-script-refs", post(handle_assets_script_refs))
        .route("/script-refs-complete", post(handle_script_refs_complete))
        .route("/poll-replacements", get(handle_poll_replacements))
        .route("/replace-ids", post(handle_replace_ids))
        .route("/last-sounds", get(get_last_sounds))
        .route("/last-animations", get(get_last_animations))
        .route("/last-images", get(get_last_images))
        .route("/last-meshes", get(get_last_meshes))
        .route("/last-script-refs", get(get_last_script_refs))
        .route("/request-sounds", post(request_sounds))
        .route("/request-animations", post(request_animations))
        .route("/request-images", post(request_images))
        .route("/request-meshes", post(request_meshes))
        .route("/request-script-refs", post(request_script_refs))
        .layer(axum_middleware::from_fn(require_json_for_post))
        .layer(RequestBodyLimitLayer::new(64 * 1024 * 1024))
        .layer(DefaultBodyLimit::disable())
        .layer(cors)
        .with_state(state);

    tokio::spawn(async move {
        log::info!("Plugin HTTP server listening on {addr}");
        let _ = axum::serve(listener, app).await;
        let mut active_port = active_bridge_port().write().await;
        if *active_port == Some(addr.port()) {
            *active_port = None;
        }
    });
}

#[tauri::command]
#[specta::specta]
#[must_use]
pub async fn get_plugin_bridge_port() -> Option<u16> {
    *active_bridge_port().read().await
}

// Iterate over a small port range to accommodate multiple Studio instances.
async fn bind_available_listener() -> Option<(tokio::net::TcpListener, SocketAddr)> {
    for port in PLUGIN_PORT_START..=PLUGIN_PORT_END {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
            return Some((listener, addr));
        }
    }
    let addr = SocketAddr::from(([127, 0, 0, 1], 0));
    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        if let Ok(local_addr) = listener.local_addr() {
            return Some((listener, local_addr));
        }
    }
    None
}

#[tauri::command]
#[specta::specta]
#[must_use]
pub async fn get_studio_health_status() -> AnyValue {
    let Some(data) = bridge_data() else {
        return AnyValue(
            json!({ "synced": false, "protocolVersion": STUDIO_PROTOCOL_VERSION, "scanStatus": null, "studioPlaceId": null }),
        );
    };
    let guard = data.read().await;
    let synced = guard
        .last_plugin_poll_time
        // The plugin uses a 25-second long-poll on /poll, so the timestamp is only
        // refreshed at the START of each poll iteration - not while it's waiting.
        // A 3-second window causes the frontend to flash "disconnected" mid-poll.
        // 30s gives one full poll cycle + a safety margin.
        .is_some_and(|t| t.elapsed() < std::time::Duration::from_secs(30));
    AnyValue(json!({
        "synced": synced,
        "protocolVersion": STUDIO_PROTOCOL_VERSION,
        "scanStatus": guard.scan_status,
        "studioPlaceId": guard.studio_place_id
    }))
}

#[tauri::command]
#[specta::specta]
#[must_use]
pub async fn get_studio_asset_snapshots() -> AnyValue {
    let Some(data) = bridge_data() else {
        return AnyValue(json!({
            "anims": { "assets": [], "scanning": false, "complete": false },
            "sounds": { "assets": [], "scanning": false, "complete": false },
            "images": { "assets": [], "scanning": false, "complete": false },
            "meshes": { "assets": [], "scanning": false, "complete": false },
            "scriptRefs": { "assets": [], "scanning": false, "complete": false }
        }));
    };
    let guard = data.read().await;
    AnyValue(json!({
        "anims": guard.last_animations,
        "sounds": guard.last_sounds,
        "images": guard.last_images,
        "meshes": guard.last_meshes,
        "scriptRefs": guard.last_script_refs
    }))
}

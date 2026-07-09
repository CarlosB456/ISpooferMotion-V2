use dashmap::DashMap;
use serde::{Deserialize, Deserializer, Serialize};
use std::sync::OnceLock;

#[derive(Clone, Debug)]
pub struct CachedContext {
    pub place_id: String,
    pub is_invalidated: bool,
}

static PUSH_URL: OnceLock<std::sync::RwLock<Option<String>>> = OnceLock::new();

fn get_push_url_lock() -> &'static std::sync::RwLock<Option<String>> {
    PUSH_URL.get_or_init(|| std::sync::RwLock::new(None))
}

pub fn get_push_url() -> Option<String> {
    get_push_url_lock().read().unwrap_or_else(std::sync::PoisonError::into_inner).clone()
}

static REMOTE_CACHE: OnceLock<DashMap<String, CachedContext>> = OnceLock::new();

fn get_remote_cache() -> &'static DashMap<String, CachedContext> {
    REMOTE_CACHE.get_or_init(DashMap::new)
}

// Query local cache for recently discovered Place IDs.
pub fn get_context(asset_id: &str) -> Option<String> {
    let cache = get_remote_cache();
    if let Some(entry) = cache.get(asset_id) {
        if !entry.is_invalidated {
            return Some(entry.place_id.clone());
        }
    }
    None
}

pub fn invalidate_context(asset_id: &str) {
    let cache = get_remote_cache();
    if let Some(mut entry) = cache.get_mut(asset_id) {
        entry.is_invalidated = true;
    }
}

fn deserialize_id<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::String(s) => Ok(s),
        serde_json::Value::Number(n) => Ok(n.to_string()),
        _ => Err(serde::de::Error::custom("ID must be a string or number")),
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RemoteAssetContext {
    #[serde(deserialize_with = "deserialize_id")]
    pub asset_id: String,
    #[serde(deserialize_with = "deserialize_id")]
    pub place_id: String,
}

fn validate_cache_url(url: &str) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.starts_with("https://")
        || trimmed.starts_with("http://localhost")
        || trimmed.starts_with("http://127.0.0.1")
    {
        Ok(())
    } else {
        Err(format!(
            "Cache URL must use HTTPS (got: {}). HTTP URLs are only allowed for localhost.",
            &trimmed[..trimmed.len().min(60)]
        ))
    }
}

// Persist discovered Place ID locally and broadcast to the remote backend.
pub fn push_discovery(asset_id: String, place_id: String) {
    let cache = get_remote_cache();
    cache.insert(
        asset_id.clone(),
        CachedContext { place_id: place_id.clone(), is_invalidated: false },
    );

    if cache.len() > 50_000 {
        let to_remove: Vec<String> = cache.iter().take(10_000).map(|e| e.key().clone()).collect();
        for key in to_remove {
            cache.remove(&key);
        }
    }

    if let Some(url) = get_push_url() {
        if !url.trim().is_empty() {
            tokio::spawn(async move {
                let client = crate::utils::get_http_client();
                let payload = serde_json::json!({
                    "asset_id": asset_id,
                    "place_id": place_id
                });
                let _ = client.post(&url).json(&payload).send().await;
            });
        }
    }
}

#[tauri::command]
#[specta::specta]
// Fetch initial asset-to-place mappings from the community backend.
pub async fn initialize_remote_cache(
    _url: String,
    push_url: Option<String>,
) -> Result<usize, String> {
    if let Some(ref pu) = push_url {
        if !pu.trim().is_empty() {
            validate_cache_url(pu)?;
        }
    }

    get_remote_cache().clear();

    if let Ok(mut guard) = get_push_url_lock().write() {
        *guard = push_url;
    }

    Ok(0)
}

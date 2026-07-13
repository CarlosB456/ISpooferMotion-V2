use dashmap::DashMap;
use serde::{Deserialize, Deserializer, Serialize};
use std::sync::OnceLock;

#[derive(Clone, Debug)]
pub struct CachedContext {
    pub place_id: String,
    pub is_invalidated: bool,
}

// The push URL is write-only: we POST discoveries to it, we never GET from it.
static PUSH_URL: OnceLock<std::sync::RwLock<Option<String>>> = OnceLock::new();

fn get_push_url_lock() -> &'static std::sync::RwLock<Option<String>> {
    PUSH_URL.get_or_init(|| std::sync::RwLock::new(None))
}

// Internal-only: exposes the configured push URL for use within push_discovery.
// Not pub - nothing outside this module should ever branch on the remote URL value.
fn read_push_url() -> Option<String> {
    get_push_url_lock().read().unwrap_or_else(std::sync::PoisonError::into_inner).clone()
}

// The local in-process cache. This is the ONLY data source for read lookups.
static LOCAL_CACHE: OnceLock<DashMap<String, CachedContext>> = OnceLock::new();

fn get_local_cache() -> &'static DashMap<String, CachedContext> {
    LOCAL_CACHE.get_or_init(DashMap::new)
}

/// Read a place ID from the **local** session cache only.
/// Never reads from the remote community API - see module-level comment.
pub fn get_local_context(asset_id: &str) -> Option<String> {
    let cache = get_local_cache();
    if let Some(entry) = cache.get(asset_id) {
        if !entry.is_invalidated {
            return Some(entry.place_id.clone());
        }
    }
    None
}

pub fn invalidate_context(asset_id: &str) {
    let cache = get_local_cache();
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

pub fn push_discovery(_app: tauri::AppHandle, asset_id: String, place_id: String) {
    let cache = get_local_cache();
    cache.insert(
        asset_id.clone(),
        CachedContext { place_id: place_id.clone(), is_invalidated: false },
    );

    // Simple eviction: if the cache grows above 50k entries, drop the oldest-iterated 10k.
    // Note: DashMap iteration order is unspecified, so this is not true LRU.
    if cache.len() > 50_000 {
        let to_remove: Vec<String> = cache.iter().take(10_000).map(|e| e.key().clone()).collect();
        for key in to_remove {
            cache.remove(&key);
        }
    }

    // Fire-and-forget POST to the community backend only
    tokio::spawn(async move {
        if let Some(url) = read_push_url() {
            if !url.trim().is_empty() {
                let client = crate::utils::get_http_client();
                let payload = serde_json::json!({
                    "asset_id": asset_id,
                    "place_id": place_id
                });
                let _ = client.post(&url).json(&payload).send().await;
            }
        }
    });
}

#[tauri::command]
#[specta::specta]
/// Configure the push URL for the community asset cache.
///
/// This sets the endpoint that newly discovered (asset_id, place_id) pairs are POSTed to.
/// Reading from the community cache is explicitly NOT supported - users resolve assets
/// from their own local session cache only.
pub async fn initialize_remote_cache(
    app: tauri::AppHandle,
    push_url: Option<String>,
) -> Result<(), String> {
    if let Some(ref pu) = push_url {
        if !pu.trim().is_empty() {
            validate_cache_url(pu)?;

            use tauri::Manager;
            if let Ok(app_dir) = app.path().app_data_dir() {
                let cache_path = app_dir.join("local_remote_cache.json");
                let migrated_lock_path = app_dir.join("local_remote_cache_migrated.lock");

                // Only process the historical cache ONCE. If the lock file exists, skip.
                if !migrated_lock_path.exists() {
                    if let Ok(content) = tokio::fs::read_to_string(&cache_path).await {
                        if let Ok(existing) = serde_json::from_str::<
                            std::collections::HashMap<String, String>,
                        >(&content)
                        {
                            let pu_clone = pu.clone();
                            tokio::spawn(async move {
                                let client = crate::utils::get_http_client();
                                for (asset_id, place_id) in existing {
                                    let payload = serde_json::json!({
                                        "asset_id": asset_id,
                                        "place_id": place_id
                                    });
                                    let _ = client.post(&pu_clone).json(&payload).send().await;
                                }
                                // Create a lock file so we never read their old local cache on startup again
                                let _ = tokio::fs::write(&migrated_lock_path, "migrated").await;
                            });
                        }
                    }
                } // End of migrated_lock_path.exists()
            }
        }
    }

    // Clear local session cache so stale entries from a previous session don't persist.
    get_local_cache().clear();

    if let Ok(mut guard) = get_push_url_lock().write() {
        *guard = push_url;
    }

    Ok(())
}

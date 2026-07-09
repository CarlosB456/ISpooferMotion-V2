#[tauri::command]
#[specta::specta]
// Send finalized asset mappings to the Roblox Studio plugin. Returns "ok" or an error string.
pub async fn push_to_studio(
    replacements_map: crate::commands::AnyValue,
    plugin_port: Option<String>,
) -> crate::error::Result<String> {
    log::info!("push_to_studio called with replacements_map: {:?}", replacements_map);
    let mappings = replacements_map
        .0
        .as_object()
        .cloned()
        .map(|replacements| {
            replacements
                .into_iter()
                .filter_map(|(original_id, new_id)| {
                    let new_id_str = if let Some(s) = new_id.as_str() {
                        s.to_string()
                    } else if let Some(n) = new_id.as_u64() {
                        n.to_string()
                    } else if let Some(n) = new_id.as_i64() {
                        n.to_string()
                    } else {
                        return None;
                    };
                    if new_id_str.is_empty() || new_id_str == original_id {
                        return None;
                    }
                    Some(serde_json::json!({
                        "originalId": original_id,
                        "newId": new_id_str,
                    }))
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    if mappings.is_empty() {
        log::error!("push_to_studio: no valid mappings after parsing");
        return Ok("empty_mappings".into());
    }

    if crate::studio_bridge::queue_replace_mappings_internal(mappings.clone()).await {
        log::info!("push_to_studio: queued {} mappings via internal bridge", mappings.len());
        return Ok("ok".into());
    }

    log::warn!("push_to_studio: internal bridge unavailable, trying direct HTTP fallback");
    let port = plugin_port.and_then(|value| value.parse::<u16>().ok()).unwrap_or(14285);
    let url = format!("http://127.0.0.1:{port}/replace-ids");
    let send_result = reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({ "mappings": mappings }))
        .send()
        .await;

    match send_result {
        Ok(response) if response.status().is_success() => Ok("ok".into()),
        Ok(response) => {
            log::error!("push_to_studio: fallback returned HTTP {}", response.status());
            Ok("bridge_unavailable".into())
        }
        Err(e) => {
            log::error!("push_to_studio: fallback HTTP failed: {}", e);
            Ok("plugin_not_connected".into())
        }
    }
}

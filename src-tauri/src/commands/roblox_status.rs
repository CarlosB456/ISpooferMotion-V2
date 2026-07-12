//! Simple health check to ensure Roblox isn't down before we attempt spoofing.

#[tauri::command]
#[specta::specta]
/// Pings Roblox to check for availability before proceeding with API calls.
pub async fn check_roblox_api_status() -> crate::error::Result<bool> {
    let client = crate::utils::get_http_client();

    match client.get("https://users.roblox.com/v1/health").send().await {
        Ok(resp) => Ok(!resp.status().is_server_error()),
        Err(_) => Ok(false),
    }
}

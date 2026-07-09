use reqwest::Client;

#[tauri::command]
#[specta::specta]
// Ping Roblox to check for availability before proceeding with API calls.
pub async fn check_roblox_api_status() -> crate::error::Result<bool> {
    let client = Client::builder().timeout(std::time::Duration::from_secs(10)).build()?;

    match client.get("https://users.roblox.com/v1/health").send().await {
        Ok(resp) => Ok(!resp.status().is_server_error()),
        Err(_) => Ok(false),
    }
}

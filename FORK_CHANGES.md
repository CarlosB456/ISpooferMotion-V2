# 🍴 CarlosB456 Fork Changes

This repository is a fork of [ISpooferMotion/ISpooferMotion-V2](https://github.com/ISpooferMotion/ISpooferMotion-V2). It contains custom enhancements to improve Roblox Studio log visibility, asset filtering precision, animation preview reliability, and overall responsiveness.

---

## 📋 Summary of Fork Enhancements

### 1. 📝 Roblox Studio Replacement Logging
* **Enhanced Real-time Output:** Updated the Roblox Studio plugin patcher (`patcher.luau`) to log a clear output message in the Studio console whenever a replacement is performed.
* **Covered Categories:** Logs property replacements, attribute changes, emotes, accessories, CollectionService tags, script source modifications, and MeshPart/Texture updates.
* **Sample Output:** `[ISpooferMotion] Replaced property 'AnimationId' on Workspace.NPC.Animate.walk.WalkAnim -> 'http://www.roblox.com/asset/?id=...'`

### 2. 📊 Detailed Scan & Exclusion Logs in Desktop App
* **Debounced Logging:** Added a 2-second debouncing window in the frontend (`AssetExplorer.tsx`) to let asynchronous asset ownership resolution complete fully before printing statistics. This prevents duplicate and confusing partial log lines.
* **Descriptive Logs:** The desktop app console now outputs precise logs detailing how many assets were filtered because you already own them, broken down by type:
  `[INFO] Filtered 6505 assets you already own (1375 animations, 894 sounds, 1495 images, 2741 meshes). Showing 15821 remaining.`
* **Descriptive Totals:** The backend scan-complete notification (`server.rs`) and plugin log (`scanner.luau`) now report a breakdown of all discovered assets.

### 3. 🎬 Resilient Animation Previews
* **API Redirect Resolution:** Upgraded the Tauri Rust backend (`assets.rs`) to inspect Roblox API JSON payloads for direct asset location URLs (including `locations` array objects), resolving issues where animation preview asset retrievals would intermittently fail.

### 4. ⚡ Snippy Synchronization
* **Reduced Polling Latence:** Decreased the Studio asset poll interval from 10 seconds to 1.5 seconds (`useStudioAssetPoll.ts`) and lowered the connection check maximum backoff delay from 10 seconds to 3 seconds (`useStudioConnection.ts`), making connection states and live asset tree sync significantly faster.

### 5. 🏃 Expanded Animation Instance Scanner
* **Movement & Mood Animation support:** Expanded the special Roblox instance scanner (`properties.luau`) to inspect and capture properties like `ClimbAnimation`, `FallAnimation`, `IdleAnimation`, `JumpAnimation`, `RunAnimation`, `SwimAnimation`, `WalkAnimation`, and `MoodAnimation` on Humanoid/character assets.

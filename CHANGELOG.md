# Changelog

All notable changes to this project will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.2] - 2026-07-08

### ✨ What's New & Improved

- **CI Enhancements**: Updated GitHub Actions runner from `windows-2025` to `windows-latest` to fix CI scheduling issues and ensure reliable builds.
- **CI Speed Optimization**: Refactored the CI pipeline by merging JS checks into a single step and implementing Rust caching for the release matrix, significantly reducing total compilation and build times.
- **Submodule Initialization Script**: Added `scripts/init-submodules.sh` to make initializing recursive git submodules frictionless.
- **Documentation**: Updated `README.md` with a new Quick Setup section that explicitly outlines the exact commands for cloning with submodules, installing dependencies via `bun`, and building the UI library locally.
- **Dependency Bumps**: Updated internal dependencies across `framer-motion`, `lucide-react`, and various Tauri plugins to their latest compatible versions.
- **Strict Type Cleanup**: Removed scattered `any` casts within the UI layer (App.tsx, bindings.ts, and place parsers), replacing them with explicit runtime type checks and TypeScript boundaries.
- **Theme Cleanups**: Fully purged the codebase of obsolete "Custom Background" and "Cloud Theme" properties, reducing memory footprint and cleaning up the `Titlebar` and `App` components.

### 🐛 Bug Fixes & Improvements

- **Place ID Resolution**: Fixed a critical issue where the spoofer would only check the "Root Place" of a universe and fail to spoof assets located in subplaces. The backend now recursively crawls `develop.roblox.com` to check all subplaces for a creator.
- **Persistent Place ID Caching**: Implemented a JSON-based disk cache (`place_id_cache.json`) to persist resolved Place IDs across app restarts. This perfectly mimics the V1 engine's behavior, dramatically speeding up spoofing and eliminating redundant Roblox API rate limits when the app is relaunched.
- **Place ID Fallback**: Added a failsafe for creators who have absolutely 0 games on their profile (e.g., clothing groups). The system now injects a generic public Place ID (`1818`, Classic: Crossroads) as a last resort, allowing public assets to be spoofed successfully instead of immediately crashing with a "No candidate place IDs found" error.

_Special thanks to [@diogo599](https://github.com/diogo599) for diagnosing the initial CI and submodule issues!_

---

## [2.1.1] - 2026-07-08

> _Developer Note: I apologize for the lackluster update this time around-I've primarily focused on under-the-hood optimizations and bug fixes. Better and more exciting updates will be coming soon!_

### ✨ What's New & Improved

- **Codebase Optimization:** Streamlined exports and refactored core utilities, dropping the overall bundle size and improving maintainability.
- **Binary Size Reduction:** Implemented panic aborting in the Rust release profile, significantly reducing the final compiled binary size.
- **Logging Performance:** Optimized the internal debug logger to use cached time formatters, drastically reducing garbage collection overhead during high-frequency logging.
- **UI Rendering Performance:** Extracted heavy state nodes (such as the live spoofing progress bar) into isolated React components and eliminated array index-based keys in the Asset Explorer. This stops the app from re-rendering the entire DOM tree up to 100 times per job and significantly reduces CPU usage.
- **Bundle Size Optimization:** Implemented React Code Splitting via lazy loading across all major UI views. `AssetExplorer`, `SettingsView`, and other heavy components are now completely detached from the main initial application bundle and only fetched into memory when you actively switch to their respective tabs, drastically reducing initial startup time.
- **Context Polling Optimization:** Updated the Studio Connection context to perform shallow comparisons on scan statuses, preventing continuous re-renders across multiple views when the Studio plugin bridge is idle.
- **Type Safety Enhancements:** Replaced multiple `any` types and implicit `catch (err)` blocks with explicit TS interfaces (e.g., `PluginAsset`) and proper React event types.
- **CI/CD Enhancements:** Significant upgrades to GitHub Actions workflows, optimizing the CI build processes.

### 🐛 Bug Fixes

- **Module Exports:** Restored missing utility exports that were previously causing failures for tests and the UI layer.
- **Studio Replacement - Incomplete Scan Request:** When asset replacements were pushed to Studio before a scan had been run, the backend only requested a re-scan for sounds. Animations, images, meshes, and script references were never scanned, so replacements for those types would silently fail.
- **Studio Replacement - Repeated Mapping Delivery:** When Studio polled for replacements before patches were fully computed, the server returned the mappings without consuming them. This caused the plugin to receive the same mappings on every subsequent poll until patches arrived, producing duplicate replacement work.
- **Studio Replacement - Silent Failure:** When pushing replacements to Studio failed (plugin not connected, bridge unavailable), the error was swallowed and the user still saw a success message in the log. Failures now surface a clear error message.
- **Studio Scan - Non-Error Swallowing:** When the Studio scan health check returned a non-`Error` rejection (e.g. a raw string from a failed Tauri invoke), the error was silently discarded and the scan loop continued for up to 5 minutes before timing out. It now throws immediately with a proper error message.

## 🗑️ Removed & Cleaned Up

- **Removed Cloud/Custom Themes:** Stripped out cloud theme synchronization and custom JSON theme injection. Removed this feature because it was causing stability issues and the maintenance overhead was more work than it was worth.
- **Removed Unused Code:** Removed unused TypeScript exports, stale dependencies (like local unused library components, though preserved in their packages), and cleaned up redundant types, making the codebase leaner and preventing dead code buildup.

---

## [2.1.0] - 2026-07-07

### ✨ What's New & Improved

- **Smarter Error Handling:** No more vague error messages. We overhauled our network parsers to surface clear, actionable feedback directly from Roblox so you always know exactly what went wrong.
- **Improved Rate Limit Handling:** Introduced a centralized rate-limiting engine. With exponential backoff and random jitter, your requests will safely navigate Roblox's throttling limits.
- **Enhanced Place Resolution:** Updated the Universe-to-Place lookup engine to actively query both Ascending and Descending sorts, making place ID resolution much more reliable.
- **Pre-Flight Upload Checks:** To save time and bandwidth, we now validate file signatures (PNG, RBXM, RBXMX) locally before your upload even begins.
- **Crash Diagnostics:** We've introduced robust file logging. If the app encounters an issue, diagnostic logs are now automatically saved to your local app data folder.
- **Native Panic Guards:** If the application ever hits a fatal error, it will no longer close silently. You'll now receive a native OS dialog box explaining exactly what went wrong.
- **Auto-Updates:** Integrated the built-in auto-updater to keep you synced with our latest features and patches.

### 🐛 Bug Fixes

- **Upload Reliability:** Fixed an issue where uploads would fail due to incorrect payload structures. We now dynamically inspect file bytes instead of relying on hardcoded types.
- **Rate Limit Lockouts:** Fixed a bug where hitting a 429 rate limit would cause the app to spam the API without sleeping. It now properly reads the `Retry-After` header and waits.
- **Place Lookup Failures:** Fixed an edge case where place resolution would fail if Roblox returned results in an unexpected sorting order.

### 🗑️ Removed & Cleaned Up

- **Generic Errors:** Removed the unhelpful fallback errors (like "Failed to parse API response"). If something breaks, the app will tell you exactly why.
- **Hardcoded Payloads:** Stripped out old hardcoded audio/video type checks during uploads in favor of proper dynamic file inspection.

---

## [2.0.0] - 2026-07-06

First stable release of V2. Complete rewrite of the original ISpooferMotion built on Tauri instead of Electron.

---

## [1.x] - Legacy

The original ISpooferMotion is no longer maintained.

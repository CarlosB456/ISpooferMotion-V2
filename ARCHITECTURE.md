# ISpooferMotion Architecture

ISpooferMotion connects a desktop application (built with Tauri, Rust, and React) directly to a running Roblox Studio session (via a Luau plugin) to synchronize and spoof game assets in real time.

## High-Level Architecture

The system consists of three main components:

1. **Desktop App (Frontend)**
   - Built with React 19, Tailwind CSS v4, and Zustand.
   - Provides the visual interface for configuring asset spoofing, managing profiles, and exploring the place.
   - Communicates with the Rust backend via Tauri IPC (`invoke`).

2. **Desktop App (Backend)**
   - Built with Rust and Tauri.
   - **Local Server (`studio_bridge`)**: Runs an embedded HTTP server (using `axum`) on a localhost port (14285-14289) that Roblox Studio can communicate with.
   - **Asset Resolution**: Handles downloading, parsing, and caching Roblox assets (Animations, Sounds, Images) directly from Roblox APIs.
   - **Security**: Manages the user's `.ROBLOSECURITY` cookie via the OS credential store (keyring).

3. **Roblox Studio Plugin**
   - Written in Luau (compiled into an `.rbxmx` file).
   - Polls the desktop application's local HTTP server.
   - Scans the open Roblox place for assets and applies spoofed IDs recursively when the desktop app commands it.

## Data Flow (Spoofing Lifecycle)

1. The Luau plugin connects to the desktop app's embedded HTTP server.
2. The user initiates an "Asset Scan" from the frontend.
3. The frontend sends an IPC command to the Rust backend, which exposes a command to the Luau plugin on the next poll.
4. The Luau plugin recursively traverses the `DataModel`, extracts all asset IDs, and HTTP POSTs them to the Rust server.
5. The Rust server receives the IDs, resolves them against Roblox web APIs (fetching real-world names, durations, etc.), and sends the structured data to the frontend via Tauri Events.
6. The user selects a replacement ID for a specific asset and confirms.
7. The Rust server calculates "patches" and queues them.
8. The Luau plugin polls, receives the patches, and applies them to the `DataModel` in Studio.

## Startup & Shutdown Flows

### Startup

1. **Frontend Boot**: The React application mounts and initializes `zustand` stores. It establishes the Tauri IPC channel.
2. **Backend Boot**: Tauri starts the Rust backend.
3. **HTTP Bridge Initialization**: During Tauri's setup phase, `studio_bridge::start_server` is invoked asynchronously. It attempts to bind to a TCP port between 14285 and 14289. Once bound, it writes a `.lock` file (or relies on internal state) so the frontend knows the active port.
4. **Auth Resolution**: The backend attempts to read the `.ROBLOSECURITY` cookie from the OS keyring and validates it.

### Shutdown

1. **Graceful Exit**: When the Tauri application is closed, all Tokio async tasks attached to the `studio_bridge` are dropped.
2. **Resource Cleanup**: The HTTP server shuts down automatically as its Tokio runtime drops. Any pending patches or scan states are discarded.

## Sync & Async Boundaries

- **Frontend**: React components run synchronously, interacting with asynchronous Tauri `invoke` commands.
- **Backend (Rust)**:
  - Tauri command handlers are mostly `async fn` and run on the Tauri-provided Tokio runtime.
  - The `studio_bridge` (Axum server) runs on a dedicated async Tokio thread.
  - State between the Tauri commands and the Axum server is shared via `Arc<RwLock<AssetServerStateData>>`. This is the primary sync/async boundary where lock contention is carefully managed to prevent blocking the UI thread or the HTTP server.
  - HTTP requests to external Roblox APIs are made using the async `reqwest` client.
- **Studio (Luau)**: Luau runs synchronously within the Roblox Studio thread, but uses asynchronous `HttpService:RequestAsync` calls (which yield the thread but don't block the engine) to communicate with the Rust backend.

## Dependency Rules

- **Frontend -> Backend**: The frontend may only call backend functions via explicit Tauri commands (exported via Specta to `src/bindings.ts`).
- **Backend -> Studio**: The backend does NOT push to Studio. Studio _polls_ the backend HTTP server to bypass local network security constraints in the Roblox engine.
- **Studio -> Backend**: Studio sends telemetry and asset records via standard `HttpService:PostAsync` calls to `http://localhost:<PORT>`.

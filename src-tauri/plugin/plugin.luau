--!nocheck
--!nolint
--# selene: allow(unused_variable, global_usage)
local ASSET_PROPERTIES: { [string]: { string } } = {}
local STRING_SCAN_PROPERTIES: { [string]: { string } } = {}

-- Dummy declarations to satisfy IDE Luau Language Server (shadowed by includes)
local startPolling: any
local hidePluginGui: any
local togglePluginGui: any
local logToPlugin: any
local polling: any
local BASE_URL: any

--#include "src/version/version.luau"
--#include "src/config/runtime.luau"
--#include "src/ui/gui.luau"
--#include "src/types/assets.luau"
--#include "src/state/registry.luau"
--#include "src/util/assets.luau"
--#include "src/net/http.luau"
--#include "src/scan/properties.luau"
--#include "src/scan/scanner.luau"
--#include "src/patch/mesh.luau"
--#include "src/patch/patcher.luau"
--#include "src/bridge/discovery.luau"
--#include "src/bridge/polling.luau"

-- Runtime assertions to validate the build step included modules in the correct order
assert(
	MAX_SCRIPT_SOURCE_BYTES ~= nil,
	"Include order violation: config/runtime.luau not loaded early"
)
assert(normalizeAssetId ~= nil, "Include order violation: util/assets.luau not loaded")
assert(getMaxRecordValueBytes ~= nil, "Include order violation: scan/properties.luau not loaded")
assert(applyPatch ~= nil, "Include order violation: patch/patcher.luau not loaded")

print("[ISpooferMotion] Plugin loaded. Starting background connection to Desktop App...")
startPolling()

local toolbar = plugin:CreateToolbar("ISpooferMotion")
local toggleButton =
	toolbar:CreateButton("Toggle UI", "Show/Hide ISpooferMotion UI", "rbxassetid://137844667859456")

toggleButton.Click:Connect(function()
	togglePluginGui()
end)

plugin.Unloading:Connect(function()
	polling = false
	BASE_URL = nil
	hidePluginGui()
end)

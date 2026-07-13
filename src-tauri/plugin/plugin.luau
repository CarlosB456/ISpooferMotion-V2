--// Hello from cody.
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

--- Manual Replacement Handler
local function runManualReplacements(text: string)
	local mappings = {}
	local count = 0
	for line in string.gmatch(text, "[^\n\r]+") do
		local oldId, newId = string.match(line, "(%d+)%s*[-=]>%s*(%d+)")
		if not oldId then
			oldId, newId = string.match(line, "(%d+)%s*:%s*(%d+)")
		end
		if oldId and newId then
			mappings[oldId] = newId
			count += 1
		end
	end

	if count == 0 then
		warn("[ISpooferMotion] No valid mappings found. Format should be: 1234 -> 5678")
		return
	end

	print(string.format("[ISpooferMotion] Starting manual replacement with %d mappings...", count))
	local replacedCount = 0

	local function checkAndReplaceProperty(obj: Instance, prop: string)
		local ok, val = pcall(function()
			return (obj :: any)[prop]
		end)
		if not ok or val == nil then
			return
		end

		local strVal = nil
		if type(val) == "string" then
			strVal = val
		elseif typeof(val) == "Content" then
			local ok2, uri = pcall(function()
				return (val :: any).Uri
			end)
			if ok2 then
				strVal = uri
			end
		elseif type(val) == "number" then
			strVal = tostring(val)
		end

		if not strVal then
			return
		end

		for oldId, newId in pairs(mappings) do
			if string.find(strVal, oldId, 1, true) then
				local newVal = string.gsub(strVal, oldId, newId)
				local assignOk, err = pcall(function()
					(obj :: any)[prop] = newVal
				end)
				if assignOk then
					replacedCount += 1
					print(
						string.format(
							"[ISpooferMotion] Manual Swap: %s.%s (%s -> %s)",
							obj.Name,
							prop,
							oldId,
							newId
						)
					)
				end
			end
		end
	end

	local function processInstance(obj: Instance)
		if obj:IsA("Decal") or obj:IsA("Texture") then
			checkAndReplaceProperty(obj, "Texture")
		end
		if obj:IsA("Animation") then
			checkAndReplaceProperty(obj, "AnimationId")
		end
		if obj:IsA("Sound") then
			checkAndReplaceProperty(obj, "SoundId")
		end
		if obj:IsA("MeshPart") then
			checkAndReplaceProperty(obj, "TextureID")
			checkAndReplaceProperty(obj, "MeshId")
		end
		if obj:IsA("SpecialMesh") or obj:IsA("FileMesh") then
			checkAndReplaceProperty(obj, "TextureId")
			checkAndReplaceProperty(obj, "MeshId")
		end
		if obj:IsA("SurfaceAppearance") then
			checkAndReplaceProperty(obj, "ColorMap")
			checkAndReplaceProperty(obj, "MetalnessMap")
			checkAndReplaceProperty(obj, "NormalMap")
			checkAndReplaceProperty(obj, "RoughnessMap")
		end
		if obj:IsA("ImageLabel") or obj:IsA("ImageButton") then
			checkAndReplaceProperty(obj, "Image")
		end
		if obj:IsA("Shirt") then
			checkAndReplaceProperty(obj, "ShirtTemplate")
		end
		if obj:IsA("Pants") then
			checkAndReplaceProperty(obj, "PantsTemplate")
		end
		if obj:IsA("ShirtGraphic") then
			checkAndReplaceProperty(obj, "Graphic")
		end
		if obj:IsA("CharacterMesh") then
			checkAndReplaceProperty(obj, "MeshId")
			checkAndReplaceProperty(obj, "BaseTextureId")
			checkAndReplaceProperty(obj, "OverlayTextureId")
		end
	end

	local roots = {
		workspace,
		game:GetService("StarterPlayer"),
		game:GetService("StarterGui"),
		game:GetService("ReplicatedStorage"),
		game:GetService("Lighting"),
	}

	for _, root in ipairs(roots) do
		for _, descendant in ipairs(root:GetDescendants()) do
			processInstance(descendant)
		end
	end

	print(
		string.format(
			"[ISpooferMotion] Manual replacement complete! Modified %d properties.",
			replacedCount
		)
	)
end

_G.ISpooferMotionPlugin = {
	runManualReplacements = runManualReplacements,
}

--!nocheck
--!nolint
-- luacheck: ignore
---@diagnostic disable: undefined-global, unused-local, unused-function, lowercase-global
local function countBundledClasses(propertyMap: { [string]: { string } }): number
	local count = 0
	for _ in pairs(propertyMap) do
		count += 1
	end
	return count
end

local function valueLooksLikePositiveAssetNumber(value: number): boolean
	if value <= 0 or value % 1 ~= 0 then
		return false
	end

	local strVal = tostring(math.floor(value))
	return #strVal >= 3 and #strVal <= 20
end

local function contentValueToString(value: any, allowNumberAssetId: boolean?): string?
	if value == nil then
		return nil
	end

	local valueType = typeof(value)
	if valueType == "Content" then
		local okUri, uri = pcall(function()
			return value.Uri
		end)
		if okUri and type(uri) == "string" and uri ~= "" then
			if string.find(uri, "016666666666666") or string.find(uri, "16666666666666") then
				return nil
			end
			return uri
		end
		return nil
	end

	if type(value) == "string" then
		if string.find(value, "016666666666666") or string.find(value, "16666666666666") then
			return nil
		end
		return if value ~= "" and value ~= "nil" then value else nil
	end

	if type(value) == "number" and allowNumberAssetId then
		if not valueLooksLikePositiveAssetNumber(value) then
			return nil
		end
		local strVal = tostring(math.floor(value))
		if string.find(strVal, "016666666666666") or string.find(strVal, "16666666666666") then
			return nil
		end
		return "rbxassetid://" .. strVal
	end

	return nil
end

local function stringContainsAssetReference(val: string): boolean
	local lower = string.lower(val)

	if string.find(lower, "rbxassetid://%d+") then
		return true
	end
	if string.find(lower, "rbxasset://[%w%-%._/%%]+") then
		return true
	end
	if string.find(lower, "rbxthumb://[%w%-%._/%%&=%?]+") then
		return true
	end
	if string.find(lower, "roblox%.com/asset/%?id=%d+") then
		return true
	end
	if string.find(lower, "roblox%.com/library/%d+") then
		return true
	end
	if string.find(lower, "roblox%.com/catalog/%d+") then
		return true
	end
	if string.find(lower, "create%.roblox%.com/marketplace/asset/%d+") then
		return true
	end

	return false
end

local function isAssetFormat(val: any): boolean
	if type(val) == "string" then
		local lower = string.lower(val)
		if string.match(lower, "^%d+$") and #lower >= 3 and #lower <= 20 then
			return true
		end
		return stringContainsAssetReference(lower)
	elseif type(val) == "number" then
		return valueLooksLikePositiveAssetNumber(val)
	elseif typeof(val) == "Content" then
		local okUri, uri = pcall(function()
			return val.Uri
		end)
		if okUri and type(uri) == "string" and uri ~= "" then
			return stringContainsAssetReference(uri) or isAssetFormat(uri)
		end
	end

	return false
end

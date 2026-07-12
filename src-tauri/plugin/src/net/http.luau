--!nocheck
--!nolint
-- luacheck: ignore
---@diagnostic disable: undefined-global, unused-local, unused-function, lowercase-global
--- Network utility wrapper for communicating with the desktop daemon.
---
--- This module handles JSON encoding/decoding and enforces safety limits on
--- payload sizes to prevent the plugin from locking up Studio on massive games.
local function decodeJsonResponseBody(response: any): (boolean, any)
	if not response then
		return false, nil
	end

	local body = response.Body
	if body == nil or body == "" then
		return true, nil
	end

	if type(body) ~= "string" then
		return false, nil
	end

	if #body > MAX_HTTP_RESPONSE_BYTES then
		return false, nil
	end

	local decodedOk, decoded = pcall(function()
		return HttpService:JSONDecode(body)
	end)

	if not decodedOk then
		return false, nil
	end

	return true, decoded
end

--- Performs a POST request against the active daemon.
---
--- Fails early if the encoded JSON body exceeds `MAX_HTTP_BODY_BYTES`.
local function postJson(endpoint: string, payload: any): (boolean, any)
	if not BASE_URL then
		return false, nil
	end

	local encodeOk, body = pcall(function()
		return HttpService:JSONEncode(payload)
	end)

	if not encodeOk or type(body) ~= "string" then
		warn("[ISpooferMotion] Failed to encode POST payload for " .. endpoint)
		return false, nil
	end

	if #body > MAX_HTTP_BODY_BYTES then
		warn("[ISpooferMotion] Refusing oversized POST payload for " .. endpoint)
		return false, nil
	end

	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = BASE_URL .. endpoint,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = body,
		})
	end)

	if not ok or not response or not response.Success then
		warn(
			"[ISpooferMotion] Failed to POST to "
				.. endpoint
				.. ": "
				.. tostring(response and response.StatusCode or response)
		)
		return false, nil
	end

	local decodeOk, decoded = decodeJsonResponseBody(response)
	if not decodeOk then
		warn("[ISpooferMotion] Invalid JSON response from " .. endpoint)
		return false, nil
	end

	return true, decoded
end
